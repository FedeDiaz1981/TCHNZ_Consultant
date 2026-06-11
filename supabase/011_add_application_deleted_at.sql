alter table public.applications
add column if not exists deleted_at timestamptz;
