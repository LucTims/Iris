-- Empêche les doublons (project_id, number) sur la table chapters : nécessaire pour
-- que le nouvel endpoint POST /api/projects/[id]/chapters (insert bulk, utilisé lors
-- d'un split de plan ou d'une régénération relancée après échec partiel) échoue de
-- façon explicite (409) plutôt que de créer silencieusement deux chapitres au même
-- numéro dans un même projet.

-- 1. Résout les doublons déjà présents avant d'ajouter la contrainte : renumérote
--    chaque doublon vers le premier numéro disponible de son projet, un par un
--    (pour éviter qu'un lot de 3+ doublons ne se retrouve simplement décalé vers
--    un même nouveau numéro).
DO $$
DECLARE
  dup RECORD;
  next_number INT;
BEGIN
  FOR dup IN
    SELECT id, project_id
    FROM (
      SELECT id, project_id,
             ROW_NUMBER() OVER (PARTITION BY project_id, number ORDER BY created_at) AS rn
      FROM public.chapters
    ) sub
    WHERE rn > 1
    ORDER BY project_id
  LOOP
    SELECT COALESCE(MAX(number), 0) + 1 INTO next_number
    FROM public.chapters
    WHERE project_id = dup.project_id;

    UPDATE public.chapters SET number = next_number WHERE id = dup.id;
  END LOOP;
END $$;

-- 2. Ajoute la contrainte unique (idempotent : ne recrée pas si déjà présente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_project_chapter_number'
  ) THEN
    ALTER TABLE public.chapters
      ADD CONSTRAINT unique_project_chapter_number UNIQUE (project_id, number);
  END IF;
END $$;
