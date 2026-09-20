-- Analyse visuelle mise en CACHE au moment de l'import.
--
-- Sans elle, chaque génération (le plan, puis chaque chapitre, puis chaque
-- reprise) renvoyait les images au modèle : plusieurs mégaoctets re-téléversés
-- à chaque essai, une latence élevée, et l'impossibilité d'écrire le livre avec
-- un modèle non multimodal. En décrivant l'image UNE fois à l'import, tout le
-- reste du pipeline travaille sur du texte.
ALTER TABLE public.project_assets ADD COLUMN IF NOT EXISTS ai_analysis TEXT;

-- État de l'analyse : permet de réessayer les images dont la description a
-- échoué, plutôt que de les traiter comme définitivement sans analyse.
ALTER TABLE public.project_assets ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.project_assets DROP CONSTRAINT IF EXISTS project_assets_analysis_status_check;
ALTER TABLE public.project_assets ADD CONSTRAINT project_assets_analysis_status_check
  CHECK (analysis_status IN ('pending', 'done', 'failed', 'skipped'));
