alter table public.clients
add column if not exists deleted_at timestamptz;
