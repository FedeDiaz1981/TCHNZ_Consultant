-- Limpia todas las aplicaciones del modulo Consultant.
-- Alcance:
-- - Deshabilita accesos relacionados al modulo.
-- - Archiva todas las aplicaciones del modulo consultant.
-- - No toca usuarios, clientes ni auth.users.
--
-- Idempotente: puede correrse mas de una vez sin romper el esquema.

do $$
declare
  target_module text := 'consultant';
  archived_at timestamptz := timezone('utc', now());
  archive_suffix text := '--archived-' || floor(extract(epoch from clock_timestamp()))::bigint;
begin
  update public.client_application_access as caa
  set is_enabled = false
  where exists (
    select 1
    from public.applications a
    where a.id = caa.application_id
      and a.portal_module = target_module
  )
  or exists (
    select 1
    from public.clients c
    where c.id = caa.client_id
      and c.portal_module = target_module
  );

  update public.applications
  set is_active = false,
      availability_status = 'disabled',
      deleted_at = coalesce(deleted_at, archived_at),
      slug = case
        when deleted_at is null then slug || archive_suffix || '-' || left(id::text, 8)
        else slug
      end
  where portal_module = target_module
    and deleted_at is null;
end $$;

select
  'applications_active' as metric,
  count(*)::bigint as total
from public.applications
where portal_module = 'consultant'
  and is_active = true
  and deleted_at is null

union all

select
  'applications_visible' as metric,
  count(*)::bigint as total
from public.applications
where portal_module = 'consultant'
  and deleted_at is null

union all

select
  'enabled_accesses' as metric,
  count(*)::bigint as total
from public.client_application_access caa
where caa.is_enabled = true
  and (
    exists (
      select 1
      from public.clients c
      where c.id = caa.client_id
        and c.portal_module = 'consultant'
    )
    or exists (
      select 1
      from public.applications a
      where a.id = caa.application_id
        and a.portal_module = 'consultant'
    )
  );
