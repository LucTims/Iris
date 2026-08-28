-- Bucket de stockage des couvertures générées (lecture publique pour que les
-- <img> et l'export PDF puissent les charger). Les écritures passent
-- exclusivement par la route serveur /api/generate-cover avec la clé
-- service-role, donc aucune policy d'upload côté utilisateur n'est nécessaire.
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique des objets du bucket "covers".
DROP POLICY IF EXISTS "Public read covers" ON storage.objects;
CREATE POLICY "Public read covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');
