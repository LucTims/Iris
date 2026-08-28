-- Migration pour le popup de bienvenue et le bonus de 500 pièces
-- 1. Ajout du champ has_seen_welcome_modal sur la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_seen_welcome_modal BOOLEAN NOT NULL DEFAULT false;

-- 2. Mise à jour du trigger à l'inscription pour créditer 500 pièces et tracer la transaction de bienvenue
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS TRIGGER AS 
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Création ou récupération du wallet avec solde initial de 500 pièces
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 500)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_wallet_id;

  -- Si un nouveau wallet a été créé, on enregistre la transaction de bienvenue
  IF v_wallet_id IS NOT NULL THEN
    INSERT INTO public.coin_transactions (wallet_id, type, amount, description, metadata)
    VALUES (
      v_wallet_id, 
      'credit', 
      500, 
      'Cadeau de bienvenue (500 pièces offertes)', 
      '{"source": "welcome_gift"}'::jsonb
    );
  END IF;

  RETURN NEW;
END;
 LANGUAGE plpgsql SECURITY DEFINER;
