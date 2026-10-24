-- Nom d'auteur affiché dans le livre (page de titre, mentions légales, métadonnées
-- PDF/EPUB/DOCX). Distinct du compte utilisateur : un auteur peut publier sous
-- pseudonyme ou au nom d'une maison (ex. « BoomBooks »).
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS author TEXT;
