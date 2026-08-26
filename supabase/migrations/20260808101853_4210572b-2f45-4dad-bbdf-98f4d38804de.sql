
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_product_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

DROP POLICY "categories public read" ON public.categories;
CREATE POLICY "categories public read" ON public.categories FOR SELECT
  USING (is_active OR (auth.uid() IS NOT NULL AND public.is_staff(auth.uid())));

DROP POLICY "products public read" ON public.products;
CREATE POLICY "products public read" ON public.products FOR SELECT
  USING (is_active OR (auth.uid() IS NOT NULL AND public.is_staff(auth.uid())));

DROP POLICY "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT
  USING (status = 'approved' OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR public.is_staff(auth.uid()))));

DROP POLICY "announcements public read" ON public.announcements;
CREATE POLICY "announcements public read" ON public.announcements FOR SELECT USING (
  (is_published AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
  OR (auth.uid() IS NOT NULL AND public.is_staff(auth.uid())));

DROP POLICY "content public read" ON public.site_content;
CREATE POLICY "content public read" ON public.site_content FOR SELECT
  USING (is_published OR (auth.uid() IS NOT NULL AND public.is_staff(auth.uid())));

DROP POLICY "faq public read" ON public.faqs;
CREATE POLICY "faq public read" ON public.faqs FOR SELECT
  USING (is_published OR (auth.uid() IS NOT NULL AND public.is_staff(auth.uid())));
