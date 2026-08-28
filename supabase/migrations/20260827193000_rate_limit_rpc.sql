-- Rate limiting distribué en base (remplace le Map en mémoire, inutile dès
-- que l'app tourne sur plusieurs instances serverless). Fenêtre fixe (bucket
-- aligné sur l'horloge), incrément atomique via UPSERT.
-- Réservé au service_role : les routes API appellent ceci avec un client
-- admin dédié (jamais exposé aux utilisateurs, pour éviter qu'un utilisateur
-- ne pollue directement le compteur d'un autre en devinant sa clé).
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
    key TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key TEXT, p_limit INT, p_window_seconds INT)
RETURNS TABLE(allowed BOOLEAN, current_count INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INT;
BEGIN
    v_window_start := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);

    INSERT INTO public.rate_limit_counters (key, window_start, count)
    VALUES (p_key, v_window_start, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = public.rate_limit_counters.count + 1
    RETURNING public.rate_limit_counters.count INTO v_count;

    -- Nettoyage opportuniste des vieux buckets (best-effort, non bloquant).
    DELETE FROM public.rate_limit_counters WHERE window_start < now() - interval '1 hour';

    RETURN QUERY SELECT (v_count <= p_limit), v_count, (v_window_start + make_interval(secs => p_window_seconds));
END;
$$;

-- Supabase accorde EXECUTE à anon/authenticated/service_role par défaut sur
-- toute nouvelle fonction (ALTER DEFAULT PRIVILEGES du projet) : on révoque
-- explicitement chaque rôle, pas seulement PUBLIC, sinon le grant nommé reste.
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;
