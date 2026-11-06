INSERT INTO public.store_settings(key, value)
SELECT 'wallet_private', jsonb_build_object('approval_email', COALESCE(value->>'approval_email','akangbekamal06@gmail.com'), 'token_hours', 48)
FROM public.store_settings WHERE key = 'wallet'
ON CONFLICT (key) DO NOTHING;
UPDATE public.store_settings SET value = value - 'approval_email' WHERE key = 'wallet';
DROP POLICY "settings public read" ON public.store_settings;
CREATE POLICY "settings public read" ON public.store_settings FOR SELECT USING (key NOT IN ('admin_notify','wallet_private'));