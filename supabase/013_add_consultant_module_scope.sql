alter table public.profiles
add column if not exists portal_modules text[] not null default '{consultant}'::text[];

update public.profiles
set portal_modules = '{consultant}'::text[]
where portal_modules is null
   or cardinality(portal_modules) = 0;

alter table public.clients
add column if not exists portal_module text not null default 'consultant';

update public.clients
set portal_module = 'consultant'
where portal_module is null
   or btrim(portal_module) = '';

alter table public.applications
add column if not exists portal_module text not null default 'consultant';

update public.applications
set portal_module = 'consultant'
where portal_module is null
   or btrim(portal_module) = '';

alter table public.blog_posts
add column if not exists portal_module text not null default 'consultant';

update public.blog_posts
set portal_module = 'consultant'
where portal_module is null
   or btrim(portal_module) = '';

alter table public.blog_posts
add column if not exists content_section text not null default 'training';

update public.blog_posts
set content_section = 'training'
where content_section is null
   or btrim(content_section) = '';

alter table public.clients
add column if not exists deleted_at timestamptz;

alter table public.applications
add column if not exists deleted_at timestamptz;

alter table public.blog_posts
add column if not exists deleted_at timestamptz;

create index if not exists profiles_portal_modules_idx
  on public.profiles using gin (portal_modules);

create index if not exists clients_portal_module_idx
  on public.clients (portal_module)
  where deleted_at is null;

create index if not exists applications_portal_module_idx
  on public.applications (portal_module)
  where deleted_at is null;

create index if not exists blog_posts_portal_module_section_idx
  on public.blog_posts (portal_module, content_section, status, published_at desc)
  where deleted_at is null;
