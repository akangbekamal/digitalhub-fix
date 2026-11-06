REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.wallets, public.wallet_transactions, public.wallet_deposits FROM anon, authenticated;
REVOKE ALL ON public.wallets, public.wallet_transactions, public.wallet_deposits FROM anon;
REVOKE ALL ON public.wallet_deposit_tokens FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_apply(uuid,numeric,text,text,text,uuid,text,text,uuid), public.expire_wallet_deposits() FROM authenticated;