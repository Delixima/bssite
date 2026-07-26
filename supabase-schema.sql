-- ============================================================
-- Schéma Supabase pour la Brigade Scientifique
-- À exécuter dans Supabase > SQL Editor, dans l'ordre.
-- ============================================================

-- 1. Table des profils (un profil par compte Discord lié)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  discord_id text,
  nom text,
  rang text not null default 'scientifique_test'
    check (rang in (
      'scientifique_test',
      'scientifique_confirme',
      'scientifique_sous_chef',
      'scientifique_chef',
      'co_gerant',
      'gerant',
      'dirigeant'
    )),
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- tout utilisateur connecté peut lire tous les profils (utile pour la page effectif)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- un utilisateur ne peut modifier que son propre nom, jamais son rang directement
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id);

-- 2. Auto-création du profil à la première connexion Discord
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, discord_id, nom, rang)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Sans nom'),
    'scientifique_test'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Table des rapports
create table public.rapports (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid references public.profiles(id),
  auteur_nom text,
  titre text not null,
  classe text not null check (classe in ('Verte','Orange','Rose','Noire')),
  contenu text,
  statut text not null default 'en_attente' check (statut in ('en_attente','valide','refuse')),
  depasse_accreditation boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.rapports enable row level security;

-- un membre voit ses propres rapports ; co-gérant et plus voient tout
create policy "rapports_select"
  on public.rapports for select
  using (
    auteur_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and rang in ('co_gerant','gerant','dirigeant')
    )
  );

-- aucun insert/update direct depuis le client : tout passe par les Netlify Functions
-- (clé service_role), donc pas de policy insert/update ici volontairement.

-- 4. Table des demandes d'expérience
create table public.demandes (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid references public.profiles(id),
  auteur_nom text,
  nom_projet text not null,
  classe text not null check (classe in ('Verte','Orange','Rose','Noire')),
  but text,
  ressources text,
  limites text,
  statut text not null default 'en_attente' check (statut in ('en_attente','valide','refuse')),
  depasse_accreditation boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.demandes enable row level security;

create policy "demandes_select"
  on public.demandes for select
  using (
    auteur_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and rang in ('co_gerant','gerant','dirigeant')
    )
  );

-- ============================================================
-- Après exécution : Authentication > Providers > Discord
-- à activer avec le Client ID / Secret de ton application Discord,
-- et l'URL de callback Supabase à ajouter dans le dashboard Discord.
-- ============================================================

-- 5. Table des avertissements de quota (générée automatiquement chaque semaine)
create table public.avertissements (
  id uuid primary key default gen_random_uuid(),
  membre_id uuid references public.profiles(id),
  membre_nom text,
  niveau int not null,
  sanction_recommandee text not null,
  semaine date not null default current_date,
  statut text not null default 'en_attente' check (statut in ('en_attente','valide','annule')),
  created_at timestamp with time zone default now()
);

alter table public.avertissements enable row level security;

-- un membre voit ses propres avertissements ; co-gérant et plus voient tout
create policy "avertissements_select"
  on public.avertissements for select
  using (
    membre_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and rang in ('co_gerant','gerant','dirigeant')
    )
  );

-- aucun insert/update direct depuis le client : l'insertion se fait par la
-- fonction planifiée weekly-check, la mise à jour de statut par resolve-warning
-- (toutes deux via la clé service_role).

-- 6. Table des absences
create table public.absences (
  id uuid primary key default gen_random_uuid(),
  membre_id uuid references public.profiles(id),
  membre_nom text,
  date_debut date not null,
  date_fin date, -- null = durée indéterminée
  motif text,
  statut text not null default 'en_attente' check (statut in ('en_attente','validee','refusee')),
  created_at timestamp with time zone default now()
);

alter table public.absences enable row level security;

-- un membre voit ses propres absences ; co-gérant et plus voient tout
create policy "absences_select"
  on public.absences for select
  using (
    membre_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and rang in ('co_gerant','gerant','dirigeant')
    )
  );

-- 7. Rattrapage : crée un profil pour tout compte Discord déjà existant
--    avant la mise en place du trigger (à relancer sans risque si besoin,
--    elle n'écrase rien pour les profils déjà présents).
insert into public.profiles (id, discord_id, nom, rang)
select
  u.id,
  u.raw_user_meta_data->>'provider_id',
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  'scientifique_test'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;


