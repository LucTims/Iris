-- Génération de livre complet en job serveur (au lieu d'une boucle côté
-- client bloquée à l'onglet ouvert). Une ligne = un run de "Générer tout le
-- livre" pour un projet ; la progression et le contenu réel des chapitres
-- restent dans public.chapters (source de vérité), cette table ne porte que
-- l'état d'orchestration.
CREATE TABLE IF NOT EXISTS public.book_generation_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'canceled')),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    current_index INT NOT NULL DEFAULT 0,
    total INT NOT NULL DEFAULT 0,
    chapter_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_project ON public.book_generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_status ON public.book_generation_jobs(status);

ALTER TABLE public.book_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Lecture seule pour l'auteur (pour le polling de progression) ; toutes les
-- écritures passent par les routes serveur avec le client service-role.
CREATE POLICY "Users can view own generation jobs" ON public.book_generation_jobs
  FOR SELECT USING (auth.uid() = user_id);
