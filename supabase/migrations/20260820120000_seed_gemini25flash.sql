-- Le modèle par défaut utilisé par generate-chapter/generate-plan/chat/rewrite-chapter/ai-action
-- ("gemini-2.5-flash") était absent de la table ai_models seedée dans
-- 20260818204100_economy_system.sql : deductCost() échouait donc silencieusement
-- (aucun débit de pièces, aucune erreur remontée à l'utilisateur) à chaque génération
-- utilisant ce modèle par défaut.
--
-- Tarifs officiels Gemini 2.5 Flash (Gemini Developer API, palier payant standard,
-- vérifiés sur https://ai.google.dev/gemini-api/docs/pricing le 2026-08-20) :
--   Input  (texte/image/vidéo) : 0.30 $ / 1M tokens
--   Output (y compris tokens de raisonnement) : 2.50 $ / 1M tokens
INSERT INTO public.ai_models (name, provider, model_id, input_cost_per_1m, output_cost_per_1m) VALUES
('Standard (Rapide 2.5)', 'google', 'gemini-2.5-flash', 0.30, 2.50)
ON CONFLICT (model_id) DO UPDATE SET
    input_cost_per_1m = EXCLUDED.input_cost_per_1m,
    output_cost_per_1m = EXCLUDED.output_cost_per_1m;
