-- 1. Durcit process_ai_cost() : jusqu'ici, N'IMPORTE QUEL appelant muni de la
--    clé anon publique (rôle Postgres "anon", EXECUTE accordé à PUBLIC par
--    défaut) pouvait appeler ce RPC (SECURITY DEFINER, contourne RLS) avec le
--    p_user_id d'un AUTRE utilisateur et lui débiter son wallet directement
--    via l'API REST, sans même passer par l'app. On restreint maintenant à la
--    fois le GRANT Postgres (authenticated + service_role seulement, plus
--    anon) ET la logique interne : un appelant "authenticated" ne peut
--    débiter que SON PROPRE wallet (auth.uid() = p_user_id) ; seul le
--    service_role peut débiter pour un p_user_id arbitraire.
CREATE OR REPLACE FUNCTION public.process_ai_cost(
    p_user_id UUID,
    p_amount INT,
    p_description TEXT,
    p_metadata JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id UUID;
    v_balance INT;
BEGIN
    IF NOT (
        auth.role() = 'service_role'
        OR (auth.role() = 'authenticated' AND auth.uid() = p_user_id)
    ) THEN
        RAISE EXCEPTION 'forbidden: cannot debit another user''s wallet';
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
$$;

-- Supabase accorde EXECUTE à anon/authenticated/service_role par défaut sur
-- toute nouvelle fonction (ALTER DEFAULT PRIVILEGES du projet) : un simple
-- "REVOKE ... FROM PUBLIC" ne retire PAS ces grants nommés. On révoque donc
-- explicitement chaque rôle non désiré (anon), pas seulement PUBLIC.
REVOKE EXECUTE ON FUNCTION public.process_ai_cost(UUID, INT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_ai_cost(UUID, INT, TEXT, JSONB) TO authenticated, service_role;

-- 2. Nouveau RPC atomique pour CRÉDITER un wallet (achat de pièces). Remplace
--    le pattern "lire le solde puis écrire" utilisé côté application
--    (creditWalletCoins, webhooks SebPay/Chariow), qui est sujet à une race
--    condition entre deux crédits concurrents (ex : webhook rejoué en
--    parallèle d'une confirmation manuelle) : les deux lectures voient le
--    même solde de départ et un crédit se perd.
--    Réservé au rôle service_role (jamais appelable depuis une session
--    utilisateur) : c'est le webhook de paiement, jamais le client, qui crée
--    de la monnaie.
CREATE OR REPLACE FUNCTION public.credit_wallet_coins(
    p_user_id UUID,
    p_amount INT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id UUID;
    v_balance INT;
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'forbidden: service-role only';
    END IF;

    IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'invalid arguments';
    END IF;

    SELECT id, balance INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, balance)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING id, balance INTO v_wallet_id, v_balance;
    END IF;

    UPDATE public.wallets
    SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_balance;

    INSERT INTO public.coin_transactions (wallet_id, type, amount, description, metadata)
    VALUES (v_wallet_id, 'credit', p_amount, p_description, p_metadata);

    RETURN v_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet_coins(UUID, INT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet_coins(UUID, INT, TEXT, JSONB) TO service_role;
