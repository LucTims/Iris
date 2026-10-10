-- Séquence d'e-mails d'activation (J+1 / J+3 / J+7).
-- Envoyés par la tâche planifiée /api/cron/lifecycle-emails (service_role).

-- 1. Désinscription des e-mails d'accompagnement (lien en pied de chaque mail).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;

-- 2. Journal des envois : un même e-mail n'est jamais envoyé deux fois.
CREATE TABLE IF NOT EXISTS public.lifecycle_emails (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);
-- RLS sans policy : seul le service_role (tâche planifiée) y accède.
ALTER TABLE public.lifecycle_emails ENABLE ROW LEVEL SECURITY;

-- 3. Candidats : comptes confirmés, non désinscrits, non admin, créés il y a
-- 1 à 60 jours, avec les faits nécessaires pour choisir l'e-mail à envoyer.
CREATE OR REPLACE FUNCTION public.lifecycle_email_candidates()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  has_project BOOLEAN,
  has_written_chapter BOOLEAN,
  last_activity TIMESTAMPTZ,
  balance INTEGER,
  sent_kinds TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    u.created_at,
    EXISTS (SELECT 1 FROM projects pr WHERE pr.user_id = u.id),
    EXISTS (
      SELECT 1 FROM projects pr JOIN chapters c ON c.project_id = pr.id
      WHERE pr.user_id = u.id AND length(coalesce(c.content, '')) > 500
    ),
    (SELECT max(a.created_at) FROM ai_usage a WHERE a.user_id = u.id),
    coalesce(w.balance, 0),
    coalesce((SELECT array_agg(l.kind) FROM lifecycle_emails l WHERE l.user_id = u.id), '{}')
  FROM auth.users u
  JOIN profiles p ON p.id = u.id
  LEFT JOIN wallets w ON w.user_id = u.id
  WHERE u.email_confirmed_at IS NOT NULL
    AND u.email IS NOT NULL
    AND p.email_opt_out = false
    AND coalesce(p.role, 'user') <> 'admin'
    AND u.created_at < now() - interval '1 day'
    AND u.created_at > now() - interval '60 days';
$$;

REVOKE ALL ON FUNCTION public.lifecycle_email_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lifecycle_email_candidates() TO service_role;
