-- Déduplication des livraisons de webhooks de paiement (Chariow "Pulses",
-- et futurs providers). Chaque delivery_id ne doit être traité qu'une seule
-- fois, même si le provider réessaie plusieurs fois la même notification.
-- Accessible uniquement au service_role (RLS activé, aucune policy) : les
-- webhooks tournent avec la clé service-role côté serveur, jamais côté client.
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    delivery_id TEXT NOT NULL,
    event TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, delivery_id)
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at);
