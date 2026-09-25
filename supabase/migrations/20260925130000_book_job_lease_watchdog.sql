-- =====================================================================
-- Rédaction « Générer tout le livre » : reprise automatique des jobs.
--
-- Constat (production, septembre 2026) : chaque job s'enchaînait par un
-- auto-appel HTTP (process → process → …). En production, le 5e appel de la
-- chaîne n'atteint jamais la route : tous les livres de plus de 4 chapitres
-- restaient « running » à current_index = 4, sans erreur et sans reprise.
--
-- Cette migration donne au job un BAIL (lock_token + heartbeat_at) :
--   * un seul worker à la fois écrit un job (claim atomique) ;
--   * le worker actif signale sa présence toutes les 20 s ;
--   * un job dont le worker s'est tu est repris :
--       - par la route de statut interrogée par l'éditeur (20 s après un
--         relais perdu, 2 min après un worker mort) ;
--       - par une tâche pg_cron chaque minute, même onglet fermé
--         (job inactif depuis plus de 2 min) ;
--   * au-delà de 3 reprises sans progrès, ou de 30 min sans signe de vie, le
--     job est clos (failed / 'stalled') : un livre ne reprend jamais des
--     heures plus tard en débitant un auteur passé à autre chose.
--
-- Rétrocompatible avec le code précédent : colonnes ajoutées avec défaut,
-- fonctions nouvelles, aucune colonne existante modifiée.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------------------------------------------------------------
-- 1. Colonnes du bail
-- ---------------------------------------------------------------------
ALTER TABLE public.book_generation_jobs
  ADD COLUMN IF NOT EXISTS heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS lock_token uuid,
  ADD COLUMN IF NOT EXISTS lock_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resume_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stall_index integer,
  ADD COLUMN IF NOT EXISTS stall_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.book_generation_jobs.heartbeat_at IS
  'Dernier signe de vie du worker (claim, battement toutes les 20 s, chapitre écrit, relais).';
COMMENT ON COLUMN public.book_generation_jobs.lock_token IS
  'Bail du worker qui écrit le job ; NULL = libre (entre deux invocations).';
COMMENT ON COLUMN public.book_generation_jobs.lock_pending IS
  'Bail posé par pg_cron, pas encore repris par la route /api/generate-book/process.';
COMMENT ON COLUMN public.book_generation_jobs.stall_count IS
  'Reprises consécutives au même current_index (stall_index) ; au-delà de 3 le job est clos.';

UPDATE public.book_generation_jobs SET heartbeat_at = updated_at WHERE heartbeat_at IS NULL;
ALTER TABLE public.book_generation_jobs ALTER COLUMN heartbeat_at SET DEFAULT now();
ALTER TABLE public.book_generation_jobs ALTER COLUMN heartbeat_at SET NOT NULL;

-- La tâche planifiée ne lit que les jobs en cours.
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_running_heartbeat
  ON public.book_generation_jobs (heartbeat_at)
  WHERE status = 'running';

-- ---------------------------------------------------------------------
-- 2. Nettoyage des jobs restés bloqués (relais perdu au chapitre 4) : clos,
--    jamais repris d'office. L'auteur garde ses chapitres écrits et peut
--    cliquer sur « Continuer la rédaction ».
-- ---------------------------------------------------------------------
UPDATE public.book_generation_jobs
   SET status = 'failed',
       last_error = 'stalled',
       lock_token = NULL,
       lock_pending = false,
       updated_at = now()
 WHERE status = 'running'
   AND GREATEST(heartbeat_at, updated_at) < now() - interval '30 minutes';

-- ---------------------------------------------------------------------
-- 3. Prise du bail.
--   p_mode = 'hop'      : relais normal entre deux invocations du worker ;
--   p_mode = 'watchdog' : route de statut (éditeur ouvert) ;
--   p_mode = 'sweep'    : tâche planifiée (pg_cron).
-- Un bail tenu par un worker vivant (signe de vie < 2 min) n'est jamais pris.
-- Un job libéré se prend tout de suite en relais, après 20 s depuis
-- l'éditeur, après 2 min depuis la tâche planifiée (le relais a la priorité).
-- Dernier signe de vie = le plus récent de heartbeat_at et updated_at : un job
-- lancé par le code d'avant cette migration n'écrit que updated_at, et ne doit
-- pas être « repris » pendant qu'il avance encore.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_book_job(p_job_id uuid, p_mode text)
RETURNS SETOF public.book_generation_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.book_generation_jobs%ROWTYPE;
  v_last_seen timestamptz;
  v_released_grace interval;
  v_dead_after constant interval := interval '2 minutes';
  v_resume boolean;
  v_stalls integer := 0;
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('hop', 'watchdog', 'sweep') THEN
    RAISE EXCEPTION 'claim_book_job : mode inconnu %', p_mode;
  END IF;

  v_released_grace := CASE p_mode
    WHEN 'hop' THEN interval '0 seconds'
    WHEN 'watchdog' THEN interval '20 seconds'
    ELSE interval '2 minutes'
  END;

  SELECT * INTO v_job
    FROM public.book_generation_jobs
   WHERE id = p_job_id
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND OR v_job.status <> 'running' THEN
    RETURN;
  END IF;

  v_last_seen := GREATEST(v_job.heartbeat_at, v_job.updated_at);

  IF v_job.lock_token IS NOT NULL THEN
    -- Tenu par un worker : on ne le lui prend que s'il ne donne plus signe de vie.
    IF v_last_seen > now() - v_dead_after THEN
      RETURN;
    END IF;
    v_resume := true;
  ELSE
    -- Libéré : on laisse au relais normal le temps d'arriver.
    IF v_last_seen > now() - v_released_grace THEN
      RETURN;
    END IF;
    v_resume := p_mode <> 'hop';
  END IF;

  IF v_resume THEN
    v_stalls := CASE
      WHEN v_job.stall_index IS NOT DISTINCT FROM v_job.current_index THEN v_job.stall_count + 1
      ELSE 1
    END;
    IF v_stalls > 3 THEN
      -- Trois reprises au même chapitre sans progrès : on clôt plutôt que de boucler.
      UPDATE public.book_generation_jobs
         SET status = 'failed',
             last_error = 'stalled',
             lock_token = NULL,
             lock_pending = false,
             updated_at = now()
       WHERE id = p_job_id;
      RETURN;
    END IF;
  END IF;

  UPDATE public.book_generation_jobs
     SET lock_token = gen_random_uuid(),
         lock_pending = (p_mode = 'sweep'),
         heartbeat_at = now(),
         stall_index = CASE WHEN v_resume THEN v_job.current_index ELSE stall_index END,
         stall_count = CASE WHEN v_resume THEN v_stalls ELSE stall_count END,
         resume_count = resume_count + CASE WHEN v_resume THEN 1 ELSE 0 END
   WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN NEXT v_job;
END;
$$;

-- Bail posé par la tâche planifiée, repris par la route du worker : le jeton
-- change, il ne sert donc qu'une fois (un rejeu est sans effet).
CREATE OR REPLACE FUNCTION public.adopt_book_job(p_job_id uuid, p_token uuid)
RETURNS SETOF public.book_generation_jobs
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.book_generation_jobs
     SET lock_token = gen_random_uuid(),
         lock_pending = false,
         heartbeat_at = now()
   WHERE id = p_job_id
     AND lock_token = p_token
     AND lock_pending
     AND status = 'running'
  RETURNING *;
$$;

-- Signe de vie. Renvoie le statut du job si le bail est toujours détenu
-- (il peut être 'canceled' : le chapitre en cours s'achève quand même),
-- NULL si un autre worker l'a repris ou si le job a été remplacé.
CREATE OR REPLACE FUNCTION public.heartbeat_book_job(p_job_id uuid, p_token uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.book_generation_jobs
     SET heartbeat_at = now()
   WHERE id = p_job_id
     AND lock_token = p_token
  RETURNING status;
$$;

-- Chapitre écrit : avance d'un cran. Ne touche jamais un statut qui n'est
-- plus 'running' (une annulation pendant l'écriture reste une annulation).
-- Renvoie le nouveau statut, ou NULL si le bail ou l'index ne correspondent plus.
CREATE OR REPLACE FUNCTION public.advance_book_job(
  p_job_id uuid,
  p_token uuid,
  p_index integer,
  p_summaries jsonb
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.book_generation_jobs
     SET current_index = p_index + 1,
         chapter_summaries = COALESCE(p_summaries, chapter_summaries),
         attempt_count = 0,
         last_error = CASE WHEN status = 'running' THEN NULL ELSE last_error END,
         status = CASE WHEN status = 'running' AND p_index + 1 >= total THEN 'completed' ELSE status END,
         lock_token = CASE WHEN status = 'running' AND p_index + 1 < total THEN lock_token ELSE NULL END,
         lock_pending = false,
         heartbeat_at = now(),
         updated_at = now()
   WHERE id = p_job_id
     AND lock_token = p_token
     AND current_index = p_index
  RETURNING status;
$$;

-- Fin du job par le worker (terminé, échec, remplacé). Un job déjà annulé
-- garde son statut. Libère toujours le bail. Renvoie le statut final.
CREATE OR REPLACE FUNCTION public.stop_book_job(
  p_job_id uuid,
  p_token uuid,
  p_status text,
  p_error text
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.book_generation_jobs
     SET status = CASE WHEN status = 'running' THEN p_status ELSE status END,
         last_error = CASE WHEN status = 'running' THEN left(p_error, 500) ELSE last_error END,
         attempt_count = attempt_count + CASE WHEN status = 'running' AND p_status = 'failed' THEN 1 ELSE 0 END,
         lock_token = NULL,
         lock_pending = false,
         heartbeat_at = now(),
         updated_at = now()
   WHERE id = p_job_id
     AND lock_token = p_token
     AND p_status IN ('completed', 'failed', 'canceled')
  RETURNING status;
$$;

-- Fin de la fenêtre d'une invocation : le job est rendu, le relais le reprend.
CREATE OR REPLACE FUNCTION public.release_book_job(p_job_id uuid, p_token uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.book_generation_jobs
     SET lock_token = NULL,
         lock_pending = false,
         heartbeat_at = now()
   WHERE id = p_job_id
     AND lock_token = p_token
  RETURNING true;
$$;

-- ---------------------------------------------------------------------
-- 4. Tâche planifiée (chaque minute) : clôt les jobs abandonnés et relance
--    les jobs inactifs depuis plus de 2 min en appelant la route du worker
--    avec le jeton du bail qu'elle vient de poser. Le jeton est la seule
--    preuve d'autorisation : aucun secret partagé à configurer côté Vercel.
--    Sans URL configurée (Vault : book_jobs_worker_url), seule la clôture
--    s'applique.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.book_jobs_watchdog_tick()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_candidate record;
  v_claimed public.book_generation_jobs%ROWTYPE;
  v_sent integer := 0;
BEGIN
  UPDATE public.book_generation_jobs
     SET status = 'failed',
         last_error = 'stalled',
         lock_token = NULL,
         lock_pending = false,
         updated_at = now()
   WHERE status = 'running'
     AND GREATEST(heartbeat_at, updated_at) < now() - interval '30 minutes';

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
   WHERE name = 'book_jobs_worker_url'
   LIMIT 1;

  IF v_url IS NULL OR btrim(v_url) = '' THEN
    RETURN 0;
  END IF;

  FOR v_candidate IN
    SELECT id
      FROM public.book_generation_jobs
     WHERE status = 'running'
       AND GREATEST(heartbeat_at, updated_at) < now() - interval '2 minutes'
     ORDER BY heartbeat_at
     LIMIT 10
  LOOP
    SELECT * INTO v_claimed FROM public.claim_book_job(v_candidate.id, 'sweep');
    IF FOUND THEN
      PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object('jobId', v_claimed.id, 'lockToken', v_claimed.lock_token),
        headers := jsonb_build_object('Content-Type', 'application/json'),
        timeout_milliseconds := 10000
      );
      v_sent := v_sent + 1;
    END IF;
  END LOOP;

  RETURN v_sent;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Droits : réservé au serveur (service_role). La tâche planifiée tourne
--    sous postgres. Supabase accorde EXECUTE à anon/authenticated par défaut :
--    on révoque explicitement chaque rôle.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.claim_book_job(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adopt_book_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.heartbeat_book_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.advance_book_job(uuid, uuid, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stop_book_job(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_book_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.book_jobs_watchdog_tick() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_book_job(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.adopt_book_job(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.heartbeat_book_job(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.advance_book_job(uuid, uuid, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.stop_book_job(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_book_job(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------
-- 6. Configuration et planification
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'book_jobs_worker_url') THEN
    PERFORM vault.create_secret(
      'https://www.irisboom.online/api/generate-book/process',
      'book_jobs_worker_url',
      'Route du worker de génération de livres, appelée par pg_cron (public.book_jobs_watchdog_tick).'
    );
  END IF;
END;
$$;

SELECT cron.schedule(
  'iris-book-jobs-watchdog',
  '* * * * *',
  'SELECT public.book_jobs_watchdog_tick()'
);

-- Historique pg_cron : une ligne par minute, purgée au-delà de 7 jours.
SELECT cron.schedule(
  'iris-cron-history-cleanup',
  '23 3 * * *',
  $$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$$
);
