-- checkMinimumBalance() passe désormais en fail-CLOSED (une erreur ou un
-- wallet absent bloque la génération au lieu de l'autoriser gratuitement).
-- Cela suppose que tout utilisateur existant possède une ligne wallets, ce que
-- le trigger on_auth_user_created_wallet garantit pour les nouveaux comptes
-- mais pas forcément pour ceux créés avant sa mise en place. On backfill ici
-- pour ne pas bloquer par erreur des comptes légitimes.
-- Solde à 0 (pas de cadeau rétroactif) : l'objectif est juste que la ligne
-- existe, pour que "pas de wallet" ne soit plus jamais confondu avec une
-- erreur d'infra une fois le fail-closed en place.
INSERT INTO public.wallets (user_id, balance)
SELECT u.id, 0
FROM auth.users u
LEFT JOIN public.wallets w ON w.user_id = u.id
WHERE w.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
