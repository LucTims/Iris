-- Bucket de stockage des images insérées par l'auteur dans l'éditeur de
-- manuscrit (lecture publique pour que les <img> et l'export PDF/DOCX
-- puissent les charger). Les écritures passent exclusivement par la route
-- serveur /api/upload-image avec la clé service-role, donc aucune policy
-- d'upload côté client n'est nécessaire.
--
-- Remplace l'ancien comportement (image encodée en base64 directement dans
-- le HTML du chapitre) : chaque photo ajoutée gonflait la colonne
-- `chapters.content` de plusieurs Mo, ralentissant l'enregistrement et
-- gonflant inutilement le contexte envoyé à l'IA pour les modifications de
-- chapitre.
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuscript-images', 'manuscript-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique des objets du bucket "manuscript-images".
DROP POLICY IF EXISTS "Public read manuscript-images" ON storage.objects;
CREATE POLICY "Public read manuscript-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'manuscript-images');
