-- =============================================================================
-- Système de pièces (coins) — mise en place complète + idempotente.
--
-- Contexte : les tables de l'économie (wallets / ai_models / coin_transactions)
-- et le RPC process_ai_cost étaient définis dans 20260818204100_economy_system.sql
-- mais n'avaient pas été appliqués sur tous les environnements, et il manquait :
--   1) le backfill des wallets pour les utilisateurs DÉJÀ inscrits (sinon
--      checkMinimumBalance échoue et bloque toute génération avec un 402) ;
--   2) le modèle par défaut gemini-2.5-flash et gemini-2.5-pro dans ai_models
--      (sinon deductCost ne trouve pas le tarif et ne débite jamais).
--
-- Cette migration est entièrement idempotente (IF NOT EXISTS / ON CONFLICT /
-- DROP POLICY IF EXISTS) : elle peut être rejouée sans risque.
-- =============================================================================

-- 1. Tables ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL UNIQUE,
    input_cost_per_1m NUMERIC NOT NULL,
    output_cost_per_1m NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount INT NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_wallet ON public.coin_transactions(wallet_id, created_at DESC);

-- 2. Création automatique du wallet à l'inscription (500 pièces offertes) -----
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 500)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_wallet();

-- 3. RLS + policies ----------------------------------------------------------
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active AI models" ON public.ai_models;
CREATE POLICY "Anyone can view active AI models" ON public.ai_models FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

-- 4. Seed des modèles IA (tarifs USD / 1M tokens) ----------------------------
--    Inclut les modèles réellement utilisés par l'app (gemini-2.5-flash défaut,
--    gemini-2.5-pro, gpt-4o, claude-3-5-sonnet) + variantes économiques.
INSERT INTO public.ai_models (name, provider, model_id, input_cost_per_1m, output_cost_per_1m) VALUES
('Standard (Rapide 2.5)',            'google',    'gemini-2.5-flash',            0.30,  2.50),
('Avancé (Gemini 2.5 Pro)',          'google',    'gemini-2.5-pro',             1.25, 10.00),
('Standard (Rapide 1.5)',            'google',    'gemini-1.5-flash',           0.075, 0.30),
('Avancé (Équilibré)',               'openai',    'gpt-4o',                     5.00, 15.00),
('Standard (Économique)',            'openai',    'gpt-4o-mini',                0.150, 0.600),
('Plume d''Auteur (Haute Qualité)',  'anthropic', 'claude-3-5-sonnet-20240620', 3.00, 15.00)
ON CONFLICT (model_id) DO UPDATE SET
    input_cost_per_1m = EXCLUDED.input_cost_per_1m,
    output_cost_per_1m = EXCLUDED.output_cost_per_1m,
    active = true;

-- 5. RPC de débit atomique ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_ai_cost(
    p_user_id UUID,
    p_amount INT,
    p_description TEXT,
    p_metadata JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
    v_balance INT;
BEGIN
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
    VALUES (v_wallet_id, 'debit', GREATEST(p_amount, 1), p_description, p_metadata);

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_ai_cost(UUID, INT, TEXT, JSONB) TO authenticated, service_role;

-- 6. Backfill des wallets pour les utilisateurs DÉJÀ inscrits -----------------
--    (sans wallet, ils seraient bloqués par checkMinimumBalance). 500 pièces.
INSERT INTO public.wallets (user_id, balance)
SELECT u.id, 500
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;
