-- KKU Maps: initial schema for runtime data + user contributions
--
-- Tables: profiles, places, zones, submissions
-- Auth: handled by Supabase (auth.users); profile auto-created via trigger
-- RLS: places/zones public read + admin write; submissions per-owner + admin
-- Rate limit: max 10 pending submissions per user

------------------------------------------------------------
-- Extensions
------------------------------------------------------------
create extension if not exists "pgcrypto";   -- for gen_random_uuid()

------------------------------------------------------------
-- profiles: 1:1 with auth.users
------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index on public.profiles (is_admin) where is_admin;

------------------------------------------------------------
-- places: replaces data/places.json
------------------------------------------------------------
create table public.places (
  id          text primary key,
  name        text not null,
  name_en     text,
  faculty     text,
  category    text not null,
  lat         double precision not null,
  lng         double precision not null,
  description text,
  image       text,
  aliases     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on public.places (category);

------------------------------------------------------------
-- zones: replaces data/zones.json
------------------------------------------------------------
create table public.zones (
  id         text primary key,
  name       text not null,
  name_en    text,
  color      text not null,
  polygon    jsonb not null,         -- [[lat,lng], ...]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------
-- submissions: review queue + audit trail
------------------------------------------------------------
do $$ begin
  create type public.submission_type as enum ('add', 'edit');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.submission_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  type            public.submission_type not null,
  target_place_id text references public.places(id) on delete set null,
  payload         jsonb not null,
  note            text,
  status          public.submission_status not null default 'pending',
  submitter_id    uuid not null references public.profiles(id) on delete cascade,
  reviewer_id     uuid references public.profiles(id) on delete set null,
  reviewer_note   text,
  final_payload   jsonb,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  check (type = 'add' or target_place_id is not null)
);

create index on public.submissions (status, created_at desc);
create index on public.submissions (submitter_id, created_at desc);

------------------------------------------------------------
-- updated_at maintenance
------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger places_touch before update on public.places
  for each row execute function public.touch_updated_at();

create trigger zones_touch before update on public.zones
  for each row execute function public.touch_updated_at();

------------------------------------------------------------
-- Auto-create profile when a user signs up
------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------
-- Anti-spam rate limit: max 10 pending submissions per user
------------------------------------------------------------
create or replace function public.enforce_submission_limit() returns trigger
language plpgsql as $$
begin
  if (
    select count(*) from public.submissions
    where submitter_id = new.submitter_id and status = 'pending'
  ) >= 10 then
    raise exception 'submission_limit_exceeded'
      using errcode = 'check_violation';
  end if;
  return new;
end; $$;

create trigger limit_pending_submissions
  before insert on public.submissions
  for each row execute function public.enforce_submission_limit();

------------------------------------------------------------
-- Helper: is the caller an admin?
-- security definer so RLS subqueries don't recurse on profiles policies
------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

------------------------------------------------------------
-- RLS
------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.places      enable row level security;
alter table public.zones       enable row level security;
alter table public.submissions enable row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and is_admin = (select p.is_admin from public.profiles p where p.id = auth.uid()));
  -- ^ users may update their own row but cannot flip is_admin

-- places: public read, admin write
create policy "places_select_all"
  on public.places for select
  using (true);

create policy "places_modify_admin"
  on public.places for all
  using (public.is_admin())
  with check (public.is_admin());

-- zones: same as places
create policy "zones_select_all"
  on public.zones for select
  using (true);

create policy "zones_modify_admin"
  on public.zones for all
  using (public.is_admin())
  with check (public.is_admin());

-- submissions
create policy "submissions_insert_own"
  on public.submissions for insert
  with check (auth.uid() = submitter_id);

create policy "submissions_select_own"
  on public.submissions for select
  using (auth.uid() = submitter_id);

create policy "submissions_select_admin"
  on public.submissions for select
  using (public.is_admin());

create policy "submissions_update_admin"
  on public.submissions for update
  using (public.is_admin())
  with check (public.is_admin());

------------------------------------------------------------
-- Realtime: enable replication on tables clients will subscribe to
------------------------------------------------------------
-- These calls are idempotent if the publication exists
do $$ begin
  alter publication supabase_realtime add table public.places;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.zones;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.submissions;
exception when duplicate_object then null; end $$;
