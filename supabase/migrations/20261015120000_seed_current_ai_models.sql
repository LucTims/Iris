-- Le modèle par défaut actuel de l'éditeur ("gemini-3.6-flash" : chat de
-- l'assistant IA, actions contextuelles, plan, GEO, analyse d'image…) était
-- ABSENT de ai_models. deductCost() abandonnait alors le débit sans trace :
-- toute l'IA de l'éditeur tournant sur ce modèle était gratuite. Même bug que
-- 20260820120000_seed_gemini25flash.sql, réapparu au renommage du modèle.
--
-- Le moteur de débit retombe désormais sur les tarifs de référence du code
-- (src/lib/ai/pricing.ts, MODEL_RATES_USD) si une ligne manque ; cette
-- migration remet néanmoins la table à jour pour que le débit utilise les
-- tarifs exacts et que le tableau de bord admin les affiche.
INSERT INTO public.ai_models (name, provider, model_id, input_cost_per_1m, output_cost_per_1m) VALUES
('Standard (Rapide 3.6)', 'google', 'gemini-3.6-flash', 0.30, 2.50),
('Claude Haiku 4.5', 'anthropic', 'claude-haiku-4-5-20251001', 1.00, 5.00)
ON CONFLICT (model_id) DO UPDATE SET
    input_cost_per_1m = EXCLUDED.input_cost_per_1m,
    output_cost_per_1m = EXCLUDED.output_cost_per_1m;
