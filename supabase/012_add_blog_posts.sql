create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content text not null,
  cover_image_url text,
  author_name text not null default 'Equipo Technized',
  tags text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc)
  where deleted_at is null;

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_select_published_or_admin" on public.blog_posts;
create policy "blog_posts_select_published_or_admin"
on public.blog_posts
for select
using (
  public.is_admin()
  or (
    auth.uid() is not null
    and status = 'published'
    and deleted_at is null
  )
);

drop policy if exists "blog_posts_insert_admin_only" on public.blog_posts;
create policy "blog_posts_insert_admin_only"
on public.blog_posts
for insert
with check (public.is_admin());

drop policy if exists "blog_posts_update_admin_only" on public.blog_posts;
create policy "blog_posts_update_admin_only"
on public.blog_posts
for update
using (public.is_admin())
with check (public.is_admin());
