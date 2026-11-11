-- Banque d'idées de l'automatisation TikTok Iris (projet Supabase des automatisations, schéma automatisations).
-- Déjà appliqué ; gardé ici comme référence. Les fonctions ne sont exécutables que par le rôle service (n8n).
create table if not exists automatisations.iris_idees (
  id bigint generated always as identity primary key,
  format text not null default 'devine_metier' check (format = 'devine_metier'),
  titre text not null,
  contenu jsonb not null,          -- épisode, nom, genre, métier, années, public, indices, questions, titre du livre…
  priorite integer not null default 5,
  statut text not null default 'a_faire'
    check (statut in ('a_faire', 'en_generation', 'en_validation', 'programmee', 'rejetee', 'erreur')),
  essais integer not null default 0,
  video_url text,
  buffer_post_id text,
  publication_prevue timestamptz,
  derniere_erreur text,
  created_at timestamptz not null default now(),
  utilisee_le timestamptz
);
alter table automatisations.iris_idees enable row level security;

-- Prend l'idée suivante (priorité la plus basse) et la passe « en génération ».
create or replace function public.iris_prendre_idee() returns setof automatisations.iris_idees
language sql security definer set search_path = '' as $$
  update automatisations.iris_idees set statut = 'en_generation', utilisee_le = now(), essais = essais + 1
  where id = (select id from automatisations.iris_idees where statut = 'a_faire'
              order by priorite, id limit 1 for update skip locked)
  returning *;
$$;

create or replace function public.iris_lire_idee(p_id bigint) returns setof automatisations.iris_idees
language sql security definer set search_path = '' as $$
  select * from automatisations.iris_idees where id = p_id;
$$;

create or replace function public.iris_maj_idee(p_id bigint, p_statut text, p_video_url text default null,
  p_buffer_post_id text default null, p_publication timestamptz default null, p_erreur text default null,
  p_relancer boolean default false) returns setof automatisations.iris_idees
language sql security definer set search_path = '' as $$
  update automatisations.iris_idees set
    statut = p_statut,
    video_url = coalesce(p_video_url, video_url),
    buffer_post_id = coalesce(p_buffer_post_id, buffer_post_id),
    publication_prevue = coalesce(p_publication, publication_prevue),
    derniere_erreur = coalesce(p_erreur, derniere_erreur),
    essais = essais + case when p_relancer then 1 else 0 end
  where id = p_id returning *;
$$;

-- Prochain 12h30 (heure de Cotonou/Lagos) sans vidéo déjà programmée : une vidéo par jour.
create or replace function public.iris_prochain_creneau() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_jour date := (now() at time zone 'Africa/Lagos')::date;
  v_creneau timestamptz;
begin
  for i in 0..60 loop
    v_creneau := ((v_jour + i)::timestamp + time '12:30') at time zone 'Africa/Lagos';
    continue when v_creneau < now() + interval '20 minutes';
    continue when exists (select 1 from automatisations.iris_idees
      where statut = 'programmee' and publication_prevue = v_creneau);
    return jsonb_build_object('creneau', v_creneau);
  end loop;
  return jsonb_build_object('creneau', null);
end;
$$;

create or replace function public.iris_etat_banque() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('a_faire', count(*) filter (where statut = 'a_faire'),
                            'programmees', count(*) filter (where statut = 'programmee'))
  from automatisations.iris_idees;
$$;

do $$ declare f text; begin
  foreach f in array array['iris_prendre_idee()', 'iris_lire_idee(bigint)',
    'iris_maj_idee(bigint,text,text,text,timestamptz,text,boolean)', 'iris_prochain_creneau()', 'iris_etat_banque()'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
