-- Desactiva el catalogo heredado clonado inicialmente en el portal Consultant.

do $$
declare
  target_module text := 'consultant';
  archived_at timestamptz := timezone('utc', now());
begin
  update public.client_application_access
  set is_enabled = false
  where application_id in (
    select id
    from public.applications
    where portal_module = target_module
      and slug in (
        'tiempo-empleado',
        'reconversion-archivo',
        'manual-usuario',
        'novedades',
        'herramientas'
      )
  );

  update public.applications
  set is_active = false,
      availability_status = 'disabled',
      deleted_at = coalesce(deleted_at, archived_at),
      slug = case
        when deleted_at is null then slug || '--archived-' || floor(extract(epoch from clock_timestamp()))::bigint
        else slug
      end
  where portal_module = target_module
    and slug in (
      'tiempo-empleado',
      'reconversion-archivo',
      'manual-usuario',
      'novedades',
      'herramientas'
    )
    and deleted_at is null;
end $$;
