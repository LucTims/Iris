-- Migration: 20260919190000_chariow_licenses.sql
-- Table pour stocker et dédupliquer les licences Chariow activées

CREATE TABLE IF NOT EXISTS public.redeemed_licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE,
    chariow_license_id TEXT,
    product_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    coins_credited INTEGER NOT NULL CHECK (coins_credited > 0),
    source TEXT NOT NULL DEFAULT 'manual_redeem', -- 'manual_redeem' ou 'pulse_webhook'
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_redeemed_licenses_user_id ON public.redeemed_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_redeemed_licenses_key ON public.redeemed_licenses(license_key);

-- Activer Row Level Security (RLS)
ALTER TABLE public.redeemed_licenses ENABLE ROW LEVEL SECURITY;

-- Politique de consultation pour l'utilisateur propriétaire
DROP POLICY IF EXISTS "Users can view their own redeemed licenses" ON public.redeemed_licenses;
CREATE POLICY "Users can view their own redeemed licenses"
    ON public.redeemed_licenses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Politique complète pour le service_role (webhooks et APIs backend)
DROP POLICY IF EXISTS "Service role full access on redeemed_licenses" ON public.redeemed_licenses;
CREATE POLICY "Service role full access on redeemed_licenses"
    ON public.redeemed_licenses
    FOR ALL
    USING (auth.role() = 'service_role');
