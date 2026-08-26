-- Run once in the Supabase SQL editor. Safe/idempotent: adds only missing
-- columns, deletes nothing, and does not touch existing data or policies.

-- 1) Columns the admin Customers page needs (missing on older databases).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- 2) Account status: active | suspended | deactivated.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('active','suspended','deactivated'));
  END IF;
END $$;

-- Backfill from the existing ban flag so nothing changes for current users.
UPDATE public.profiles SET account_status = 'suspended'
WHERE is_banned = true AND account_status = 'active';

-- 3) Customers must never change their own status / ban flag / notes.
--    (Staff still can, through the existing "own profile update" policy.)
CREATE OR REPLACE FUNCTION public.guard_profile_status_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.account_status := OLD.account_status;
    NEW.is_banned := OLD.is_banned;
    NEW.admin_note := OLD.admin_note;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_status_update ON public.profiles;
CREATE TRIGGER trg_guard_profile_status_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_status_update();

-- 4) Keep the private admin notification settings hidden from customers.
DROP POLICY IF EXISTS "settings public read" ON public.store_settings;
CREATE POLICY "settings public read" ON public.store_settings FOR SELECT
  USING (key NOT IN ('admin_notify'));
