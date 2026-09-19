-- =====================================================================
-- 1. Bucket des avatars d'auteur (la page Profil affichait un bouton
--    « Télécharger une image » qui n'était relié à rien).
-- 2. CORRECTIF « Tout marquer comme lu » : la table user_notifications_read
--    n'avait que des policies SELECT et INSERT pour les utilisateurs, alors
--    que la route fait un upsert (INSERT ... ON CONFLICT DO UPDATE). Dès
--    qu'une notification était déjà lue, la branche UPDATE était refusée par
--    RLS et l'opération échouait — silencieusement, la route ne vérifiant pas
--    l'erreur. Seuls les administrateurs n'étaient pas touchés (policy FOR ALL).
-- 3. Performance RLS : auth.uid() réévalué par ligne -> (select auth.uid()).
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users update own read status" ON public.user_notifications_read;
CREATE POLICY "Users update own read status"
  ON public.user_notifications_read FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own read status" ON public.user_notifications_read;
CREATE POLICY "Users can view own read status"
  ON public.user_notifications_read FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.user_notifications_read;
CREATE POLICY "Users can mark notifications as read"
  ON public.user_notifications_read FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view read tracker" ON public.user_notifications_read;
CREATE POLICY "Admins can view read tracker"
  ON public.user_notifications_read FOR ALL
  USING ((select public.is_current_admin()));

DROP POLICY IF EXISTS "Users can view relevant notifications" ON public.notifications;
CREATE POLICY "Users can view relevant notifications"
  ON public.notifications FOR SELECT
  USING (
    (select auth.role()) = 'authenticated'
    AND (target_user_id IS NULL OR target_user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  USING ((select public.is_current_admin()));

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own coin transactions"
  ON public.coin_transactions FOR SELECT
  USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users can view own generation jobs" ON public.book_generation_jobs;
CREATE POLICY "Users can view own generation jobs"
  ON public.book_generation_jobs FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own api keys" ON public.api_keys;
CREATE POLICY "Users can view their own api keys"
  ON public.api_keys FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own api keys" ON public.api_keys;
CREATE POLICY "Users can create their own api keys"
  ON public.api_keys FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own api keys" ON public.api_keys;
CREATE POLICY "Users can update their own api keys"
  ON public.api_keys FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
