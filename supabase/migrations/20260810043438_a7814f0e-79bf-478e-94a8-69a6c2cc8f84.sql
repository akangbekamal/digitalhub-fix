-- Guard privileged columns on rows users are allowed to update themselves.

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.is_banned := OLD.is_banned;
  NEW.admin_note := OLD.admin_note;
  NEW.referral_code := OLD.referral_code;
  NEW.referred_by := OLD.referred_by;
  NEW.id := OLD.id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_profile_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_profile_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.guard_review_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  IF TG_OP = 'UPDATE' THEN
    NEW.user_id := OLD.user_id;
    NEW.product_id := OLD.product_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_review_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_review_write ON public.reviews;
CREATE TRIGGER trg_guard_review_write
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.guard_review_write();

CREATE OR REPLACE FUNCTION public.guard_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.assigned_to := OLD.assigned_to;
  NEW.internal_note := OLD.internal_note;
  NEW.user_id := OLD.user_id;
  IF NEW.status NOT IN ('open') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_ticket_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_ticket_update ON public.support_tickets;
CREATE TRIGGER trg_guard_ticket_update
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.guard_ticket_update();

CREATE OR REPLACE FUNCTION public.guard_refund_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE order_total NUMERIC;
BEGIN
  IF public.is_staff(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT o.total INTO order_total FROM public.orders o
    WHERE o.id = NEW.order_id AND o.user_id = auth.uid();
  IF order_total IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  NEW.amount := order_total;
  NEW.status := 'requested';
  NEW.admin_note := NULL;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_refund_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_refund_insert ON public.refunds;
CREATE TRIGGER trg_guard_refund_insert
BEFORE INSERT ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.guard_refund_insert();
