
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'GHS',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_read_own_or_staff" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('deposit','purchase','refund','adjustment_credit','adjustment_debit')),
  direction text NOT NULL CHECK (direction IN ('credit','debit')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL CHECK (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  idempotency_key text NOT NULL UNIQUE,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_ref ON public.wallet_transactions(reference_type, reference_id);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx_read_own_or_staff" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE OR REPLACE FUNCTION public.block_wallet_tx_change() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Wallet transactions are immutable'; END $$;
CREATE TRIGGER trg_wallet_tx_immutable BEFORE UPDATE OR DELETE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.block_wallet_tx_change();

CREATE TABLE public.wallet_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL DEFAULT 'mobile_money',
  reference text NOT NULL,
  sender_number text,
  sender_name text,
  proof_path text,
  customer_note text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','MORE_INFORMATION_REQUIRED','CANCELLED','EXPIRED')),
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  decision_source text,
  credited_transaction_id uuid REFERENCES public.wallet_transactions(id),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_deposits_user ON public.wallet_deposits(user_id, created_at DESC);
CREATE INDEX idx_wallet_deposits_status ON public.wallet_deposits(status, created_at DESC);
CREATE UNIQUE INDEX uq_wallet_deposit_active_reference ON public.wallet_deposits(lower(reference)) WHERE status IN ('PENDING','MORE_INFORMATION_REQUIRED','APPROVED');
GRANT SELECT ON public.wallet_deposits TO authenticated;
GRANT ALL ON public.wallet_deposits TO service_role;
ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_deposits_read_own_or_staff" ON public.wallet_deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER trg_wallet_deposits_updated BEFORE UPDATE ON public.wallet_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.wallet_deposit_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL REFERENCES public.wallet_deposits(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid,
  used_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wallet_tokens_deposit ON public.wallet_deposit_tokens(deposit_id);
GRANT ALL ON public.wallet_deposit_tokens TO service_role;
ALTER TABLE public.wallet_deposit_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.store_settings(key, value) VALUES ('wallet',
  '{"deposits_enabled": false, "spending_enabled": false, "min_deposit": 5, "max_deposit": 5000, "deposit_expiry_days": 7, "approval_email": "akangbekamal06@gmail.com"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- settings helper
CREATE OR REPLACE FUNCTION public.wallet_setting(_k text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value -> _k FROM public.store_settings WHERE key = 'wallet'
$$;

-- core ledger primitive (internal only)
CREATE OR REPLACE FUNCTION public.wallet_apply(_user uuid, _amount numeric, _direction text, _type text,
  _ref_type text, _ref_id uuid, _idem text, _desc text, _actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets; existing uuid; newbal numeric; txid uuid;
BEGIN
  IF _amount IS NULL OR _amount <= 0 OR round(_amount,2) <> _amount THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT id INTO existing FROM public.wallet_transactions WHERE idempotency_key = _idem;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  INSERT INTO public.wallets(user_id) VALUES (_user) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = _user FOR UPDATE;
  SELECT id INTO existing FROM public.wallet_transactions WHERE idempotency_key = _idem;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  IF _direction = 'debit' THEN
    IF w.status <> 'active' THEN RAISE EXCEPTION 'Wallet is frozen'; END IF;
    IF w.balance < _amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;
    newbal := w.balance - _amount;
  ELSIF _direction = 'credit' THEN
    newbal := w.balance + _amount;
  ELSE RAISE EXCEPTION 'Invalid direction'; END IF;
  UPDATE public.wallets SET balance = newbal WHERE id = w.id;
  INSERT INTO public.wallet_transactions(wallet_id, user_id, type, direction, amount, balance_before, balance_after,
    reference_type, reference_id, idempotency_key, description, created_by)
  VALUES (w.id, _user, _type, _direction, _amount, w.balance, newbal, _ref_type, _ref_id, _idem, _desc, _actor)
  RETURNING id INTO txid;
  RETURN txid;
END $$;
REVOKE ALL ON FUNCTION public.wallet_apply(uuid,numeric,text,text,text,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply(uuid,numeric,text,text,text,uuid,text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_my_wallet() RETURNS public.wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  INSERT INTO public.wallets(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO w FROM public.wallets WHERE user_id = auth.uid();
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.create_wallet_deposit(_amount numeric, _method text, _reference text,
  _sender_number text, _sender_name text, _proof_path text, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); did uuid; mn numeric; mx numeric; days int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF COALESCE((public.wallet_setting('deposits_enabled'))::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Wallet deposits are not enabled yet'; END IF;
  mn := COALESCE((public.wallet_setting('min_deposit'))::numeric, 1);
  mx := COALESCE((public.wallet_setting('max_deposit'))::numeric, 5000);
  days := COALESCE((public.wallet_setting('deposit_expiry_days'))::int, 7);
  IF _amount IS NULL OR _amount < mn OR _amount > mx OR round(_amount,2) <> _amount THEN RAISE EXCEPTION 'Deposit amount must be between % and %', mn, mx; END IF;
  IF length(trim(COALESCE(_reference,''))) < 3 THEN RAISE EXCEPTION 'Transaction reference required'; END IF;
  IF _proof_path IS NULL OR _proof_path NOT LIKE uid::text || '/%' THEN RAISE EXCEPTION 'Payment proof required'; END IF;
  IF (SELECT count(*) FROM public.wallet_deposits WHERE user_id = uid AND status IN ('PENDING','MORE_INFORMATION_REQUIRED')) >= 3 THEN
    RAISE EXCEPTION 'You have too many pending deposits'; END IF;
  INSERT INTO public.wallets(user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.wallet_deposits(user_id, amount, method, reference, sender_number, sender_name, proof_path, customer_note, expires_at)
  VALUES (uid, _amount, COALESCE(NULLIF(trim(_method),''),'mobile_money'), trim(_reference), _sender_number, _sender_name, _proof_path, _note, now() + make_interval(days => days))
  RETURNING id INTO did;
  RETURN did;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'This transaction reference has already been submitted';
END $$;

CREATE OR REPLACE FUNCTION public.cancel_my_wallet_deposit(_deposit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.wallet_deposits SET status = 'CANCELLED'
  WHERE id = _deposit_id AND user_id = auth.uid() AND status IN ('PENDING','MORE_INFORMATION_REQUIRED');
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n = 1;
END $$;

CREATE OR REPLACE FUNCTION public.resubmit_my_wallet_deposit(_deposit_id uuid, _reference text, _proof_path text, _note text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF _proof_path IS NOT NULL AND _proof_path NOT LIKE auth.uid()::text || '/%' THEN RAISE EXCEPTION 'Invalid proof'; END IF;
  UPDATE public.wallet_deposits SET status = 'PENDING', reference = COALESCE(NULLIF(trim(_reference),''), reference),
    proof_path = COALESCE(_proof_path, proof_path), customer_note = COALESCE(_note, customer_note)
  WHERE id = _deposit_id AND user_id = auth.uid() AND status = 'MORE_INFORMATION_REQUIRED' AND expires_at > now();
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n = 1;
END $$;

-- staff decision: exactly-once credit
CREATE OR REPLACE FUNCTION public.admin_decide_wallet_deposit(_deposit_id uuid, _decision text, _note text, _source text DEFAULT 'dashboard')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.wallet_deposits; txid uuid; actor uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(actor,'super_admin') OR public.has_role(actor,'admin') OR public.has_role(actor,'order_admin')) THEN
    RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO d FROM public.wallet_deposits WHERE id = _deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF d.status NOT IN ('PENDING','MORE_INFORMATION_REQUIRED') THEN RETURN 'ALREADY_' || d.status; END IF;
  IF d.expires_at <= now() THEN
    UPDATE public.wallet_deposits SET status = 'EXPIRED' WHERE id = d.id; RETURN 'EXPIRED'; END IF;
  IF _decision = 'approve' THEN
    txid := public.wallet_apply(d.user_id, d.amount, 'credit', 'deposit', 'wallet_deposit', d.id,
      'deposit:' || d.id::text, 'Wallet deposit ' || d.reference, actor);
    UPDATE public.wallet_deposits SET status = 'APPROVED', credited_transaction_id = txid, reviewed_by = actor,
      reviewed_at = now(), admin_note = _note, decision_source = _source WHERE id = d.id;
  ELSIF _decision = 'reject' THEN
    IF length(trim(COALESCE(_note,''))) < 3 THEN RAISE EXCEPTION 'Rejection reason required'; END IF;
    UPDATE public.wallet_deposits SET status = 'REJECTED', reviewed_by = actor, reviewed_at = now(), admin_note = _note, decision_source = _source WHERE id = d.id;
  ELSIF _decision = 'request_info' THEN
    IF length(trim(COALESCE(_note,''))) < 3 THEN RAISE EXCEPTION 'Tell the customer what is needed'; END IF;
    UPDATE public.wallet_deposits SET status = 'MORE_INFORMATION_REQUIRED', reviewed_by = actor, reviewed_at = now(), admin_note = _note, decision_source = _source WHERE id = d.id;
  ELSE RAISE EXCEPTION 'Invalid decision'; END IF;
  INSERT INTO public.admin_activity_logs(admin_id, action, target_type, target_id, description, metadata)
  VALUES (actor, 'wallet_deposit_' || _decision, 'wallet_deposit', d.id::text, 'Wallet deposit ' || _decision,
    jsonb_build_object('amount', d.amount, 'user_id', d.user_id, 'source', _source));
  INSERT INTO public.notifications(user_id, title, body, type, link) VALUES (d.user_id,
    CASE _decision WHEN 'approve' THEN 'Wallet deposit approved' WHEN 'reject' THEN 'Wallet deposit rejected' ELSE 'More information needed for your deposit' END,
    CASE _decision WHEN 'approve' THEN 'GH₵' || d.amount::text || ' has been added to your wallet.' ELSE COALESCE(_note,'') END,
    'wallet', '/dashboard/wallet');
  RETURN upper(_decision);
END $$;

-- wallet checkout
CREATE OR REPLACE FUNCTION public.pay_order_with_wallet(_order_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; txid uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF COALESCE((public.wallet_setting('spending_enabled'))::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'Wallet payments are not enabled yet'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR o.user_id <> uid THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.payment_status = 'verified' THEN
    SELECT id INTO txid FROM public.wallet_transactions WHERE idempotency_key = 'order:' || o.id::text;
    IF txid IS NOT NULL THEN RETURN txid; END IF;
    RAISE EXCEPTION 'This order is already paid'; END IF;
  IF o.status IN ('cancelled','refunded') THEN RAISE EXCEPTION 'Order cannot be paid'; END IF;
  IF o.total <= 0 THEN RAISE EXCEPTION 'Invalid order total'; END IF;
  txid := public.wallet_apply(uid, o.total, 'debit', 'purchase', 'order', o.id, 'order:' || o.id::text, 'Payment for ' || o.order_number, uid);
  UPDATE public.orders SET payment_status = 'verified', status = 'processing' WHERE id = o.id;
  UPDATE public.payments SET method = 'wallet', status = 'verified', reference = 'WALLET-' || txid::text, reviewed_at = now() WHERE order_id = o.id;
  IF NOT FOUND THEN
    INSERT INTO public.payments(order_id, user_id, method, amount, status, reference, reviewed_at)
    VALUES (o.id, uid, 'wallet', o.total, 'verified', 'WALLET-' || txid::text, now());
  END IF;
  INSERT INTO public.order_status_history(order_id, status, note) VALUES (o.id, 'payment_confirmed', 'Paid with wallet balance');
  RETURN txid;
END $$;

-- refund to wallet (cumulative cap = order total)
CREATE OR REPLACE FUNCTION public.admin_refund_order_to_wallet(_order_id uuid, _amount numeric, _reason text, _request_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; refunded numeric; txid uuid; actor uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(actor,'super_admin') OR public.has_role(actor,'admin') OR public.has_role(actor,'order_admin')) THEN
    RAISE EXCEPTION 'Admin access required'; END IF;
  IF length(COALESCE(_request_key,'')) < 8 THEN RAISE EXCEPTION 'Request key required'; END IF;
  SELECT id INTO txid FROM public.wallet_transactions WHERE idempotency_key = 'refund:' || _order_id::text || ':' || _request_key;
  IF txid IS NOT NULL THEN RETURN txid; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.payment_status <> 'verified' THEN RAISE EXCEPTION 'Only paid orders can be refunded'; END IF;
  SELECT COALESCE(sum(amount),0) INTO refunded FROM public.wallet_transactions WHERE type = 'refund' AND reference_type = 'order' AND reference_id = o.id;
  IF _amount IS NULL OR _amount <= 0 OR refunded + _amount > o.total THEN RAISE EXCEPTION 'Refund exceeds the amount paid'; END IF;
  txid := public.wallet_apply(o.user_id, _amount, 'credit', 'refund', 'order', o.id,
    'refund:' || o.id::text || ':' || _request_key, COALESCE(_reason, 'Refund for ' || o.order_number), actor);
  INSERT INTO public.admin_activity_logs(admin_id, action, target_type, target_id, description, metadata)
  VALUES (actor, 'wallet_refund', 'order', o.id::text, 'Refunded to wallet', jsonb_build_object('amount', _amount, 'reason', _reason));
  INSERT INTO public.notifications(user_id, title, body, type, link)
  VALUES (o.user_id, 'Refund added to your wallet', 'GH₵' || _amount::text || ' for ' || o.order_number, 'wallet', '/dashboard/wallet');
  RETURN txid;
END $$;

-- manual adjustment (super admin only)
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user uuid, _amount numeric, _direction text, _reason text, _request_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE txid uuid; actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(actor,'super_admin') THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 3 THEN RAISE EXCEPTION 'Reason required'; END IF;
  IF length(COALESCE(_request_key,'')) < 8 THEN RAISE EXCEPTION 'Request key required'; END IF;
  txid := public.wallet_apply(_user, _amount, _direction, CASE WHEN _direction = 'credit' THEN 'adjustment_credit' ELSE 'adjustment_debit' END,
    'adjustment', NULL, 'adjust:' || _request_key, _reason, actor);
  INSERT INTO public.admin_activity_logs(admin_id, action, target_type, target_id, description, metadata)
  VALUES (actor, 'wallet_adjust', 'wallet', _user::text, _reason, jsonb_build_object('amount', _amount, 'direction', _direction));
  RETURN txid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_wallet_status(_user uuid, _status text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Super admin access required'; END IF;
  IF _status NOT IN ('active','frozen') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  INSERT INTO public.wallets(user_id, status) VALUES (_user, _status) ON CONFLICT (user_id) DO UPDATE SET status = _status;
  INSERT INTO public.admin_activity_logs(admin_id, action, target_type, target_id, description, metadata)
  VALUES (auth.uid(), 'wallet_status', 'wallet', _user::text, 'Wallet ' || _status, '{}'::jsonb);
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.expire_wallet_deposits() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.wallet_deposits SET status = 'EXPIRED' WHERE status IN ('PENDING','MORE_INFORMATION_REQUIRED') AND expires_at <= now();
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.wallet_setting(text), public.ensure_my_wallet(), public.create_wallet_deposit(numeric,text,text,text,text,text,text),
  public.cancel_my_wallet_deposit(uuid), public.resubmit_my_wallet_deposit(uuid,text,text,text), public.admin_decide_wallet_deposit(uuid,text,text,text),
  public.pay_order_with_wallet(uuid), public.admin_refund_order_to_wallet(uuid,numeric,text,text), public.admin_adjust_wallet(uuid,numeric,text,text,text),
  public.admin_set_wallet_status(uuid,text), public.expire_wallet_deposits() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_my_wallet(), public.create_wallet_deposit(numeric,text,text,text,text,text,text),
  public.cancel_my_wallet_deposit(uuid), public.resubmit_my_wallet_deposit(uuid,text,text,text), public.admin_decide_wallet_deposit(uuid,text,text,text),
  public.pay_order_with_wallet(uuid), public.admin_refund_order_to_wallet(uuid,numeric,text,text), public.admin_adjust_wallet(uuid,numeric,text,text,text),
  public.admin_set_wallet_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_setting(text), public.expire_wallet_deposits() TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets, public.wallet_deposits;
