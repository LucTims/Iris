-- Migration: 20260919160000_blueprint_and_project_assets.sql
-- Description:
-- 1. Ajout de la colonne `blueprint_id` à la table `public.projects`
-- 2. Création de la table `public.project_assets` pour le stockage des images et médias de projet
-- 3. Activation du Row Level Security (RLS) sur `public.project_assets`
-- 4. Création des politiques RLS permettant aux auteurs de gérer les assets de leurs projets
-- 5. Création des index de performance sur `public.project_assets`
-- 6. Configuration du bucket Supabase Storage `project-assets` et de ses politiques d'accès

-- =============================================================================
-- 1. AJOUT DE LA COLONNE BLUEPRINT_ID SUR PUBLIC.PROJECTS
-- =============================================================================
-- Associe un gabarit narratif ou blueprint au projet (par exemple 'roman', 'guide', 'polar', etc.).
-- La valeur par défaut est 'roman'.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS blueprint_id TEXT DEFAULT 'roman';

-- Initialisation pour les projets existants sans blueprint défini
UPDATE public.projects
SET blueprint_id = 'roman'
WHERE blueprint_id IS NULL;


-- =============================================================================
-- 2. CRÉATION DE LA TABLE PUBLIC.PROJECT_ASSETS
-- =============================================================================
-- Table stockant les images et médias associés à un projet (upload utilisateur,
-- recherche Pexels, génération IA), avec leur position dans le livre et analyse IA éventuelle.
CREATE TABLE IF NOT EXISTS public.project_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  asset_type TEXT NOT NULL DEFAULT 'user-upload',  -- 'user-upload', 'pexels', 'ai-generated'
  position INTEGER NOT NULL DEFAULT 0,            -- Ordre d'apparition de l'image dans le livre
  ai_analysis TEXT,                                -- Analyse visuelle (ex: Gemini Vision)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- 3. ACTIVATION DU ROW LEVEL SECURITY (RLS) SUR PROJECT_ASSETS
-- =============================================================================
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 4. POLITIQUES RLS SUR PUBLIC.PROJECT_ASSETS
-- =============================================================================
-- Les utilisateurs peuvent gérer (SELECT, INSERT, UPDATE, DELETE) leurs propres assets
-- vérifiés via la liaison sur le projet possédé par l'utilisateur connecté (auth.uid()).
DROP POLICY IF EXISTS "Users can manage own project assets" ON public.project_assets;
CREATE POLICY "Users can manage own project assets"
  ON public.project_assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_assets.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_assets.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- =============================================================================
-- 5. INDEX SUR PUBLIC.PROJECT_ASSETS
-- =============================================================================
-- Index sur project_id pour optimiser les requêtes de récupération et jointures RLS
CREATE INDEX IF NOT EXISTS idx_project_assets_project_id
  ON public.project_assets(project_id);

-- Index composite optionnel pour trier rapidement les assets par ordre de position dans le projet
CREATE INDEX IF NOT EXISTS idx_project_assets_project_position
  ON public.project_assets(project_id, position);


-- =============================================================================
-- 6. CONFIGURATION DU BUCKET SUPABASE STORAGE POUR 'project-assets'
-- =============================================================================
-- Bucket destiné au stockage des fichiers médias associés aux projets.
--
-- NOTE / CONFIGURATION VIA LE DASHBOARD SUPABASE :
-- Si l'exécution de migrations SQL ne dispose pas des privilèges nécessaires sur le
-- schéma `storage` dans votre instance Supabase, vous pouvez configurer ce bucket
-- directement depuis l'interface web Supabase :
--   1. Allez dans "Storage" > "New Bucket".
--   2. Nommez le bucket "project-assets".
--   3. Cochez "Public bucket" pour autoriser l'accès direct aux images (prévisualisations, exports).
--   4. Dans "Configuration" > "Policies", autorisez les opérations SELECT pour le public,
--      ainsi que INSERT/UPDATE/DELETE pour les utilisateurs authentifiés.

-- Création idempotente du bucket 'project-assets' en mode public
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Politique 1 : Lecture publique des objets du bucket 'project-assets'
-- Permet le rendu des balises <img> dans l'éditeur et l'inclusion dans les exports PDF/DOCX
DROP POLICY IF EXISTS "Public read project-assets" ON storage.objects;
CREATE POLICY "Public read project-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-assets');

-- Politique 2 : Insertion autorisée pour les utilisateurs connectés
DROP POLICY IF EXISTS "Authenticated users can upload project-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload project-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-assets'
    AND auth.role() = 'authenticated'
  );

-- Politique 3 : Modification autorisée pour les utilisateurs connectés
DROP POLICY IF EXISTS "Authenticated users can update project-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update project-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND auth.role() = 'authenticated'
  );

-- Politique 4 : Suppression autorisée pour les utilisateurs connectés
DROP POLICY IF EXISTS "Authenticated users can delete project-assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete project-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND auth.role() = 'authenticated'
  );
