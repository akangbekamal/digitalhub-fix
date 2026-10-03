-- Restores schema added in earlier sessions (inventory, Message Center,
-- announcements upgrade, storage areas) that was never saved as a file.
-- Idempotent and additive: safe to re-run, deletes nothing.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 3;

-- ===== Inventory =====
CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id text,
  supplier_name text NOT NULL,
  supplier_contact text,
  supplier_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_sku text,
  product_category text,
  product_type text NOT NULL DEFAULT 'account',
  description text,
  plan_package text,
  subscription_type text,
  account_type text,
  duration text,
  country_region text,
  quantity integer DEFAULT 1,
  account_email text,
  account_username text,
  account_password text,
  recovery_info text,
  two_fa_info text,
  login_url text,
  email_access_url text,
  activation_url text,
  download_url text,
  qr_code text,
  account_notes text,
  customer_delivery_notes text,
  special_instructions text,
  start_date date,
  expiry_date date,
  renewal_date date,
  supplier_id uuid REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  supplier_cost numeric DEFAULT 0,
  supplier_notes text,
  purchase_date date,
  purchase_reference text,
  selling_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  final_selling_price numeric DEFAULT 0,
  profit numeric GENERATED ALWAYS AS (COALESCE(final_selling_price,0) - COALESCE(supplier_cost,0)) STORED,
  status text NOT NULL DEFAULT 'available',
  delivery_status text DEFAULT 'pending',
  payment_status text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid,
  customer_id uuid,
  customer_name text,
  customer_email text,
  customer_phone text,
  date_sold timestamptz,
  warranty_period text,
  warranty_start_date date,
  warranty_expiry_date date,
  warranty_status text,
  replacement_eligible boolean DEFAULT false,
  staff_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS digital_inventory_status_idx ON public.digital_inventory(status);
CREATE INDEX IF NOT EXISTS digital_inventory_product_idx ON public.digital_inventory(product_id);
CREATE INDEX IF NOT EXISTS digital_inventory_order_idx ON public.digital_inventory(order_id);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS inventory_id uuid REFERENCES public.digital_inventory(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.digital_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.digital_inventory(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  product_name text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','reserved','sent','delivered','failed','cancelled')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS digital_deliveries_order_inventory_uidx ON public.digital_deliveries(order_id, inventory_id);

CREATE TABLE IF NOT EXISTS public.inventory_access_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.digital_inventory(id) ON DELETE CASCADE,
  link_name text NOT NULL,
  link_type text NOT NULL DEFAULT 'other',
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.digital_inventory(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  supplier_cost numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT current_date,
  purchase_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES public.digital_inventory(id) ON DELETE CASCADE,
  warranty_period text,
  warranty_start_date date,
  warranty_expiry_date date,
  status text NOT NULL DEFAULT 'active',
  replacement_eligible boolean NOT NULL DEFAULT false,
  claim_reason text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Message Center =====
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  audience text NOT NULL DEFAULT 'customer',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  action text NOT NULL DEFAULT 'send_email',
  audience text NOT NULL DEFAULT 'customer',
  template_key text,
  is_enabled boolean NOT NULL DEFAULT true,
  trigger_count integer NOT NULL DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  template_key text,
  recipient text,
  subject text,
  body text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  customer_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'system',
  sent_by uuid,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS message_logs_dedupe_sent_uidx ON public.message_logs(dedupe_key) WHERE status = 'sent' AND dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS message_logs_created_idx ON public.message_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.message_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  template_key text,
  recipient text,
  sender text NOT NULL DEFAULT 'system',
  subject text,
  body text,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  customer_id uuid,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  reference_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- ===== Announcements upgrade =====
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS priority_level text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS display_scope text NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS placements text[] NOT NULL DEFAULT '{banner}',
  ADD COLUMN IF NOT EXISTS target_product_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_category_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_provider_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dismissible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS popup_frequency text NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS notification_channels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dismiss_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta_click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='announcements_status_check') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT announcements_status_check CHECK (status IN ('draft','published','scheduled','archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='announcements_priority_level_check') THEN
    ALTER TABLE public.announcements ADD CONSTRAINT announcements_priority_level_check CHECK (priority_level IN ('normal','important','urgent'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

-- ===== Grants + RLS =====
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['inventory_suppliers','digital_inventory','digital_deliveries','inventory_access_links','inventory_purchases','inventory_warranties','message_templates','automation_rules','message_logs','message_history','notification_events'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "staff all" ON public.%I', t);
    EXECUTE format('CREATE POLICY "staff all" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, DELETE ON public.announcement_dismissals TO authenticated;
GRANT ALL ON public.announcement_dismissals TO service_role;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own dismissals" ON public.announcement_dismissals;
CREATE POLICY "own dismissals" ON public.announcement_dismissals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "staff read dismissals" ON public.announcement_dismissals;
CREATE POLICY "staff read dismissals" ON public.announcement_dismissals FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

GRANT SELECT ON public.announcements TO anon, authenticated;
DROP POLICY IF EXISTS "public active announcements" ON public.announcements;
CREATE POLICY "public active announcements" ON public.announcements FOR SELECT TO anon, authenticated
  USING (status = 'published' AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));
REVOKE INSERT, UPDATE, DELETE ON public.announcements FROM anon;

-- ===== Functions =====
CREATE OR REPLACE FUNCTION public.track_announcement_event(_announcement_id uuid, _event text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.announcements SET
    view_count = view_count + CASE WHEN _event = 'view' THEN 1 ELSE 0 END,
    dismiss_count = dismiss_count + CASE WHEN _event = 'dismiss' THEN 1 ELSE 0 END,
    cta_click_count = cta_click_count + CASE WHEN _event = 'cta' THEN 1 ELSE 0 END
  WHERE id = _announcement_id AND status = 'published';
END $$;
GRANT EXECUTE ON FUNCTION public.track_announcement_event(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_digital_inventory(p_inventory_id uuid, p_order_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; n int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff access required'; END IF;
  SELECT id, user_id, customer_email, customer_name, customer_phone INTO o FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.digital_inventory SET status = 'reserved', order_id = p_order_id, customer_id = o.user_id,
    customer_email = o.customer_email, customer_name = o.customer_name, customer_phone = o.customer_phone, updated_at = now()
  WHERE id = p_inventory_id AND status = 'available';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN false; END IF;
  INSERT INTO public.digital_deliveries (order_id, inventory_id, customer_email, product_name, delivery_status)
  SELECT p_order_id, i.id, COALESCE(o.customer_email, ''), i.product_name, 'reserved'
  FROM public.digital_inventory i WHERE i.id = p_inventory_id
  ON CONFLICT (order_id, inventory_id) DO NOTHING;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.release_digital_inventory(p_order_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff access required'; END IF;
  UPDATE public.digital_inventory SET status = 'available', order_id = NULL, customer_id = NULL, customer_email = NULL,
    customer_name = NULL, customer_phone = NULL, updated_at = now()
  WHERE order_id = p_order_id AND status = 'reserved';
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.digital_deliveries SET delivery_status = 'cancelled', updated_at = now()
  WHERE order_id = p_order_id AND delivery_status IN ('pending','reserved');
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_digital_deliveries()
RETURNS TABLE (delivery_id uuid, order_id uuid, inventory_id uuid, product_name text, delivery_status text,
  delivered_at timestamptz, created_at timestamptz, account_email text, account_username text, account_password text,
  account_type text, recovery_info text, two_fa_info text, login_url text, email_access_url text, activation_url text,
  download_url text, qr_code text, plan_package text, subscription_type text, duration text, country_region text,
  start_date date, expiry_date date, renewal_date date, warranty_period text, warranty_start_date date,
  warranty_expiry_date date, warranty_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.order_id, i.id, d.product_name, d.delivery_status, d.sent_at, d.created_at,
    i.account_email, i.account_username, i.account_password, i.account_type, i.recovery_info, i.two_fa_info,
    i.login_url, i.email_access_url, i.activation_url, i.download_url, i.qr_code, i.plan_package,
    i.subscription_type, i.duration, i.country_region, i.start_date, i.expiry_date, i.renewal_date,
    i.warranty_period, i.warranty_start_date, i.warranty_expiry_date, i.warranty_status
  FROM public.digital_deliveries d
  JOIN public.digital_inventory i ON i.id = d.inventory_id
  JOIN public.orders o ON o.id = d.order_id
  WHERE o.user_id = auth.uid() AND d.delivery_status IN ('sent','delivered')
  ORDER BY d.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_digital_deliveries() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_digital_deliveries() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_expired_inventory_warranties()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.inventory_warranties SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND warranty_expiry_date < current_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.digital_inventory SET warranty_status = 'expired', updated_at = now()
  WHERE warranty_status = 'active' AND warranty_expiry_date < current_date;
  RETURN n;
END $$;

-- ===== Storage areas (all private; access rules come from the core setup) =====
INSERT INTO storage.buckets (id, name, public) VALUES
  ('payment-proofs','payment-proofs',false),
  ('product-images','product-images',false),
  ('product-files','product-files',false),
  ('avatars','avatars',false),
  ('support-attachments','support-attachments',false)
ON CONFLICT (id) DO NOTHING;

-- ===== Live updates =====
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; EXCEPTION WHEN others THEN NULL; END;
END $$;
