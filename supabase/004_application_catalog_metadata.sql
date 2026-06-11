alter table public.applications
add column if not exists category text not null default 'General';

alter table public.applications
add column if not exists area_tags text[] not null default '{}'::text[];

alter table public.applications
add column if not exists access_tier text not null default 'included';

alter table public.applications
add column if not exists availability_status text not null default 'available';

alter table public.applications
add column if not exists badge_label text;

alter table public.applications
drop constraint if exists applications_access_tier_check;

alter table public.applications
add constraint applications_access_tier_check
check (access_tier in ('included', 'premium', 'featured', 'new'));

alter table public.applications
drop constraint if exists applications_availability_status_check;

alter table public.applications
add constraint applications_availability_status_check
check (availability_status in ('available', 'coming_soon', 'disabled'));
