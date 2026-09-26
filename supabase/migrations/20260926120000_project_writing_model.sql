-- Modèle de rédaction choisi dans l'assistant de création : l'éditeur le
-- réutilise pour « Générer le livre » sans redemander la longueur ni le modèle.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS writing_model TEXT;
