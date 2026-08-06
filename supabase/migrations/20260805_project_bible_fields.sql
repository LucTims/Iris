-- Le formulaire /projects/new collecte déjà "characters", "length" et "instructions"
-- mais ces champs n'étaient jamais persistés : POST /api/projects les recevait et les
-- jetait silencieusement (aucune colonne pour les stocker). C'est une des causes directes
-- du symptôme "l'IA n'a pas accès à ce que j'ai créé" : ces informations disparaissaient
-- avant même la génération du plan.
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS characters TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS length TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS instructions TEXT;
