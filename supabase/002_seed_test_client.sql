-- Seed inicial para probar el portal de consultores sin aplicaciones precargadas.
-- Antes de correrlo:
-- 1. Crear un usuario en Supabase Auth.
-- 2. Reemplazar el email de abajo por el del usuario de prueba.

do $$
declare
  target_email text := 'consultor.demo@technized.com';
  target_user_id uuid;
  test_client_id uuid;
begin
  select id
  into target_user_id
  from public.profiles
  where email = target_email
  limit 1;

  if target_user_id is null then
    raise exception 'No existe un profile para el email % . Primero crea el usuario en Supabase Auth.', target_email;
  end if;

  insert into public.clients (name, slug, logo_url, is_active)
  values (
    'Consultor Demo Technized',
    'consultor-demo-technized',
    '/assets/brand/logo-technized-tr.png',
    true
  )
  on conflict (slug) do update
  set name = excluded.name,
      logo_url = excluded.logo_url,
      is_active = excluded.is_active
  returning id into test_client_id;

  if test_client_id is null then
    select id
    into test_client_id
    from public.clients
    where slug = 'consultor-demo-technized'
    limit 1;
  end if;

  insert into public.client_memberships (client_id, user_id, role, is_active)
  values (test_client_id, target_user_id, 'owner', true)
  on conflict (client_id, user_id) do update
  set role = excluded.role,
      is_active = excluded.is_active;
end $$;

select
  c.name as client_name,
  c.logo_url,
  p.email as user_email,
  count(caa.id) filter (where caa.is_enabled = true) as enabled_applications
from public.clients c
join public.client_memberships cm on cm.client_id = c.id and cm.is_active = true
join public.profiles p on p.id = cm.user_id
left join public.client_application_access caa on caa.client_id = c.id
where c.slug = 'consultor-demo-technized'
group by c.name, c.logo_url, p.email;
