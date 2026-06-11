create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'client_user' check (role in ('admin', 'client_user', 'collaborator')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  url text not null,
  description text,
  icon text,
  category text not null default 'General',
  area_tags text[] not null default '{}'::text[],
  access_tier text not null default 'included' check (access_tier in ('included', 'premium', 'featured', 'new')),
  availability_status text not null default 'available' check (availability_status in ('available', 'coming_soon', 'disabled')),
  badge_label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.client_memberships (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (client_id, user_id)
);

create table if not exists public.client_application_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  application_id uuid not null references public.applications (id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  unique (client_id, application_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.applications enable row level security;
alter table public.client_memberships enable row level security;
alter table public.client_application_access enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "memberships_select_self_or_admin" on public.client_memberships;
create policy "memberships_select_self_or_admin"
on public.client_memberships
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "clients_select_by_membership_or_admin" on public.clients;
create policy "clients_select_by_membership_or_admin"
on public.clients
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.client_memberships memberships
    where memberships.client_id = clients.id
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
  )
);

drop policy if exists "applications_select_by_access_or_admin" on public.applications;
create policy "applications_select_by_access_or_admin"
on public.applications
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.client_application_access access
    join public.client_memberships memberships
      on memberships.client_id = access.client_id
    where access.application_id = applications.id
      and access.is_enabled = true
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
  )
);

drop policy if exists "access_select_by_membership_or_admin" on public.client_application_access;
create policy "access_select_by_membership_or_admin"
on public.client_application_access
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.client_memberships memberships
    where memberships.client_id = client_application_access.client_id
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
  )
);
