-- Les clés MCP étaient stockées en clair dans api_keys.key : quiconque a un
-- accès en lecture à la base (service_role, dump, backup) pouvait se faire
-- passer pour n'importe quel utilisateur MCP. On passe au même modèle que
-- les tokens d'API usuels (GitHub, Stripe, ...) : seul un hash SHA-256 est
-- persisté, la clé en clair n'existe que le temps de l'afficher une fois à
-- sa création côté client.

create extension if not exists pgcrypto;

alter table public.api_keys add column if not exists key_hash text;
-- Aperçu tronqué (ex: "lg_ab12...wx9z") pour que l'utilisateur puisse
-- reconnaître sa clé sans que sa valeur complète soit récupérable en base.
alter table public.api_keys add column if not exists key_preview text;

-- Backfill des lignes existantes à partir de la clé en clair, avant de la
-- supprimer.
update public.api_keys
set
  key_hash = encode(digest(key, 'sha256'), 'hex'),
  key_preview = left(key, 6) || '...' || right(key, 4)
where key_hash is null;

alter table public.api_keys alter column key_hash set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'api_keys_key_hash_key'
  ) then
    alter table public.api_keys add constraint api_keys_key_hash_key unique (key_hash);
  end if;
end $$;

drop index if exists idx_api_keys_key;
create index if not exists idx_api_keys_key_hash on public.api_keys(key_hash);

alter table public.api_keys drop column if exists key;
