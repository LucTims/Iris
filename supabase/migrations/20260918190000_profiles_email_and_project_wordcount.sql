-- 1. ADD EMAIL TO PROFILES AND BACKFILL FROM AUTH.USERS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 2. UPDATE HANDLE_NEW_USER TRIGGER FUNCTION TO SYNC EMAIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$function$;

-- 3. ADD WORD_COUNT TO PROJECTS AND BACKFILL FROM CHAPTERS
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;

UPDATE public.projects p
SET word_count = COALESCE((
  SELECT SUM(COALESCE(c.word_count, 0))
  FROM public.chapters c
  WHERE c.project_id = p.id
), 0);
