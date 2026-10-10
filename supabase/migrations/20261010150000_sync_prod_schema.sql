-- Rattrapage de colonnes jamais créées en production (migrations du dépôt
-- non appliquées). Appliqué sur iris-app le 10/10/2026 ; idempotent.

-- 20260813182855_author_profile_fields : profil auteur (sinon PATCH /api/profile échoue).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS amazon_url TEXT;

-- 20260828130000_welcome_modal_and_bonus : drapeau de la fenêtre de bienvenue.
-- Les comptes existants sont marqués « déjà vu » pour ne pas leur réafficher
-- le cadeau de bienvenue.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_welcome_modal BOOLEAN NOT NULL DEFAULT false;
UPDATE public.profiles SET has_seen_welcome_modal = true
  WHERE has_seen_welcome_modal = false AND created_at < '2026-10-10T14:30:00Z';

-- 20260919160000_blueprint_and_project_assets : nom de fichier des images
-- (sinon l'ajout d'images à un projet existant échoue).
ALTER TABLE public.project_assets ADD COLUMN IF NOT EXISTS file_name TEXT;
UPDATE public.project_assets
  SET file_name = coalesce(metadata->>'original_name', split_part(storage_path, '/', -1))
  WHERE file_name IS NULL;
