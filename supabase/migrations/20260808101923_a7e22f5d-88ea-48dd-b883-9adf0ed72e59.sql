
-- product-images: signed reads for everyone signed in or not is handled via signed URLs created server-side; staff manage
CREATE POLICY "product images staff manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "product images read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "product files staff manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-files' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'product-files' AND public.is_staff(auth.uid()));

CREATE POLICY "avatars own manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars read auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "proofs own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proofs own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

CREATE POLICY "support att own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "support att read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'support-attachments' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
