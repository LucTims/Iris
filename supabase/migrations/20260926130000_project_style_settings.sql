-- Style du livre choisi par l'auteur : niveau de mise en forme (encadrés,
-- citations), typographie (couple de polices) et « Ma plume » (analyse de ses
-- propres textes, injectée dans chaque chapitre rédigé par Iris).
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS style_settings JSONB NOT NULL DEFAULT '{}'::jsonb;
