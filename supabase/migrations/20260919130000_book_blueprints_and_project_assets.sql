-- Blueprint du projet. `work_type` existe déjà et porte exactement la même
-- information ; `blueprint_id` en est une copie synchronisée pour rester
-- fidèle au vocabulaire produit et permettre plus tard des blueprints qui ne
-- seraient pas des types d'ouvrage.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS blueprint_id TEXT;

-- Rétrocompatibilité : les projets existants gardent leur comportement.
UPDATE public.projects
SET blueprint_id = COALESCE(NULLIF(work_type, ''), 'livre')
WHERE blueprint_id IS NULL;

ALTER TABLE public.projects ALTER COLUMN blueprint_id SET DEFAULT 'livre';

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_blueprint_id_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_blueprint_id_check
  CHECK (blueprint_id IN ('livre', 'guide', 'ebook', 'storybook'));

-- Images/dessins importés par l'auteur, source du flux « Vision-to-Story ».
CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  storage_path TEXT,
  asset_type TEXT NOT NULL DEFAULT 'user-upload',
  -- Ordre d'affichage : il porte la chronologie du conte, l'IA doit le suivre.
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.project_assets DROP CONSTRAINT IF EXISTS project_assets_type_check;
ALTER TABLE public.project_assets ADD CONSTRAINT project_assets_type_check
  CHECK (asset_type IN ('user-upload', 'pexels', 'pollinations', 'ai-generated'));

CREATE INDEX IF NOT EXISTS idx_project_assets_project
  ON public.project_assets (project_id, position);
CREATE INDEX IF NOT EXISTS idx_project_assets_user ON public.project_assets (user_id);

ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own project assets" ON public.project_assets;
CREATE POLICY "Users read own project assets"
  ON public.project_assets FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own project assets" ON public.project_assets;
CREATE POLICY "Users insert own project assets"
  ON public.project_assets FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own project assets" ON public.project_assets;
CREATE POLICY "Users update own project assets"
  ON public.project_assets FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own project assets" ON public.project_assets;
CREATE POLICY "Users delete own project assets"
  ON public.project_assets FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Bucket des visuels importés. Lecture publique, comme `manuscript-images` et
-- `covers` : l'éditeur, l'export PDF et le modèle de vision doivent tous
-- pouvoir charger l'image par URL. Les écritures passent exclusivement par la
-- route serveur en service-role, donc aucune policy d'upload client.
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read project-assets" ON storage.objects;
CREATE POLICY "Public read project-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-assets');

-- Recherche d'utilisateur par e-mail (repli du webhook Chariow).
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles (lower(email));

-- `work_type` et `blueprint_id` portent la même valeur : la contrainte
-- historique de `work_type` refusait 'storybook' et aurait fait échouer la
-- création de tout projet Storybook.
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_work_type_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_work_type_check
  CHECK (work_type IS NULL OR work_type = ANY (ARRAY['livre','guide','ebook','storybook']));
