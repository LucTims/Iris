-- Table pour les modèles IA
CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google'
    model_id TEXT NOT NULL UNIQUE, -- ex: 'gpt-4o', 'claude-3-5-sonnet-20240620'
    input_cost_per_1m NUMERIC NOT NULL, -- en USD
    output_cost_per_1m NUMERIC NOT NULL, -- en USD
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table pour le portefeuille de pièces (coins) de l'utilisateur
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fonction pour créer automatiquement un wallet à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 500); -- 500 pièces offertes à l'inscription
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le wallet quand un user s'inscrit
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_wallet();

-- Table pour l'historique des transactions de pièces
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount INT NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    metadata JSONB, -- Pour stocker quel modèle a été utilisé, combien de tokens, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Tout le monde peut lire les modèles IA actifs
CREATE POLICY "Anyone can view active AI models" ON public.ai_models FOR SELECT USING (active = true);

-- Les users peuvent voir leur propre wallet
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- Les users peuvent voir leurs propres transactions de pièces
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT USING (
    wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

-- Insertions des modèles par défaut
INSERT INTO public.ai_models (name, provider, model_id, input_cost_per_1m, output_cost_per_1m) VALUES
('Standard (Rapide)', 'google', 'gemini-1.5-flash', 0.075, 0.30),
('Avancé (Équilibré)', 'openai', 'gpt-4o', 5.0, 15.0),
('Standard (Économique)', 'openai', 'gpt-4o-mini', 0.150, 0.600),
('Plume d''Auteur (Haute Qualité)', 'anthropic', 'claude-3-5-sonnet-20240620', 3.0, 15.0)
ON CONFLICT (model_id) DO UPDATE SET 
    input_cost_per_1m = EXCLUDED.input_cost_per_1m,
    output_cost_per_1m = EXCLUDED.output_cost_per_1m;

-- RPC pour traiter un coût IA de manière atomique
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
    -- Récupérer le wallet en le verrouillant pour éviter les race conditions
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

    -- Débiter le wallet
    UPDATE public.wallets 
    SET balance = balance - p_amount, updated_at = NOW() 
    WHERE id = v_wallet_id;

    -- Enregistrer la transaction
    INSERT INTO public.coin_transactions (wallet_id, type, amount, description, metadata)
    VALUES (v_wallet_id, 'debit', p_amount, p_description, p_metadata);

    RETURN TRUE;
END;
$$;
