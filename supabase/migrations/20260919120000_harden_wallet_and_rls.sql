-- =====================================================================
-- DURCISSEMENT SÉCURITÉ / PERFORMANCE — production
--
-- 1. FAILLE CRITIQUE : `process_ai_cost` était exécutable par tout
--    utilisateur authentifié sur son PROPRE wallet, sans contrôle du signe
--    de `p_amount`. Un appel direct à /rest/v1/rpc/process_ai_cost avec
--    p_amount = -100000 passait le test `v_balance < p_amount` (500 < -100000
--    est FAUX) puis exécutait `balance = balance - (-100000)` : auto-crédit
--    illimité de pièces. On refuse désormais tout montant non strictement
--    positif, et on ajoute des contraintes CHECK en défense en profondeur.
-- 2. Les RPC d'administration et les triggers n'ont pas à être appelables
--    par `anon` via l'API REST.
-- 3. Index manquants sur les clés étrangères + index de charge.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. process_ai_cost : montant strictement positif obligatoire
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_ai_cost(
    p_user_id uuid,
    p_amount integer,
    p_description text,
    p_metadata jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_wallet_id UUID;
    v_balance INT;
BEGIN
    -- Un appelant ne peut débiter que son propre wallet ; le service_role
    -- (nos routes serveur) peut débiter n'importe quel utilisateur.
    -- NOTE : on conserve volontairement la voie `authenticated` pour rester
    -- compatible avec le code actuellement déployé en production, qui appelle
    -- ce RPC avec le client de session. La faille réelle n'était pas cette
    -- voie mais l'absence de contrôle du SIGNE du montant (cf. ci-dessous).
    IF NOT (
        auth.role() = 'service_role'
        OR (auth.role() = 'authenticated' AND auth.uid() = p_user_id)
    ) THEN
        RAISE EXCEPTION 'forbidden: cannot debit another user''s wallet';
    END IF;

    -- Garde-fou de signe : un montant négatif transformerait un débit en
    -- crédit (faille d'auto-crédit). Un montant nul n'a aucun sens.
    IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'invalid arguments: amount must be a positive integer';
    END IF;

    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Wallet not found for user';
    END IF;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds';
    END IF;

    UPDATE public.wallets
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO public.coin_transactions (wallet_id, type, amount, description, metadata)
    VALUES (v_wallet_id, 'debit', p_amount, p_description, p_metadata);

    RETURN TRUE;
END;
$function$;

-- `anon` n'a jamais rien à débiter.
REVOKE ALL ON FUNCTION public.process_ai_cost(uuid, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_ai_cost(uuid, integer, text, jsonb) TO authenticated, service_role;

-- Le crédit est déjà service-role-only, on s'assure juste des GRANTs.
REVOKE ALL ON FUNCTION public.credit_wallet_coins(uuid, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_coins(uuid, integer, text, jsonb) TO service_role;

-- Contrainte de fond : un solde ne peut jamais devenir négatif, quelle que
-- soit la voie d'écriture (défense en profondeur si un futur code contourne
-- le RPC).
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;
ALTER TABLE public.wallets ADD CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0);

-- Les montants du journal sont toujours positifs (le sens est porté par `type`).
ALTER TABLE public.coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_amount_positive;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_amount_positive CHECK (amount > 0);

-- ---------------------------------------------------------------------
-- 2. RPC d'administration : retirer l'accès `anon`
--    (le contrôle `is_current_admin()` existe déjà à l'intérieur, mais une
--    fonction d'admin n'a aucune raison d'être exposée aux visiteurs.)
-- ---------------------------------------------------------------------
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_admin_stats','get_admin_users','get_admin_projects',
                        'get_admin_transactions','get_admin_ledger','get_admin_activity')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.sig);
  END LOOP;
END $$;

-- Les fonctions de trigger ne doivent pas être exposées via l'API REST,
-- et doivent avoir un search_path figé (sinon détournement possible).
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user_wallet() SET search_path TO 'public';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_wallet() FROM PUBLIC, anon, authenticated;

-- `is_current_admin` n'a de sens que pour un utilisateur connecté.
REVOKE ALL ON FUNCTION public.is_current_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_admin() TO authenticated, service_role;

-- `check_rate_limit` reste service-role-only.
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- ---------------------------------------------------------------------
-- 3. Index manquants sur clés étrangères (jointures/suppressions en cascade)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_book_generation_jobs_user_id ON public.book_generation_jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON public.notifications (created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON public.notifications (target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read_notification_id
  ON public.user_notifications_read (notification_id);

-- Index de charge : lectures les plus fréquentes de l'application.
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created ON public.ai_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_wallet_created
  ON public.coin_transactions (wallet_id, created_at DESC);
