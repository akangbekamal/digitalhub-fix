-- Run this once in the Supabase SQL editor.
-- 1) Keeps the private admin WhatsApp/notification settings unreadable by customers.
-- 2) Notifies all staff when a customer replies to a support ticket.

-- 1. store_settings stays publicly readable EXCEPT the private admin key.
DROP POLICY IF EXISTS "settings public read" ON public.store_settings;
CREATE POLICY "settings public read" ON public.store_settings FOR SELECT
  USING (key NOT IN ('admin_notify'));
-- Staff keep full access through the existing "settings staff" policy.

-- 2. Notify all staff when a CUSTOMER posts a support message.
CREATE OR REPLACE FUNCTION public.notify_staff_on_customer_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_staff_reply THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT DISTINCT ur.user_id,
         'New customer reply',
         'A customer has replied to a support ticket.',
         'support',
         '/admin/support'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'super_admin', 'support_admin', 'product_admin', 'order_admin');

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_staff_on_customer_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_staff_on_customer_message ON public.support_messages;
CREATE TRIGGER trg_notify_staff_on_customer_message
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_on_customer_message();
