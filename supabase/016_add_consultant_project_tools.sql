insert into public.applications (
  name,
  slug,
  url,
  description,
  icon,
  category,
  area_tags,
  access_tier,
  availability_status,
  badge_label,
  sort_order,
  is_active,
  portal_module,
  deleted_at
)
values
  (
    'Asana XML Importer',
    'asana-xml-importer',
    '/clientes/aplicaciones/asana-xml-importer',
    'Importa XML de Microsoft Project hacia Asana con mapeo de campos, validacion y modo simulacion.',
    'bolt',
    'Gestion de proyectos',
    array['proyectos', 'asana', 'ms project', 'consultoria']::text[],
    'featured',
    'available',
    'Nueva',
    30,
    true,
    'consultant',
    null
  ),
  (
    'Dashboard MS Project',
    'dashboard-ms-project',
    '/clientes/aplicaciones/dashboard-ms-project',
    'Analiza XML de Microsoft Project con KPIs, Gantt, comparativas, reportes y panel ejecutivo.',
    'chart',
    'Gestion de proyectos',
    array['proyectos', 'dashboard', 'ms project', 'consultoria']::text[],
    'featured',
    'available',
    'Nueva',
    31,
    true,
    'consultant',
    null
  )
on conflict (slug) do update
set
  name = excluded.name,
  url = excluded.url,
  description = excluded.description,
  icon = excluded.icon,
  category = excluded.category,
  area_tags = excluded.area_tags,
  access_tier = excluded.access_tier,
  availability_status = excluded.availability_status,
  badge_label = excluded.badge_label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  portal_module = excluded.portal_module,
  deleted_at = excluded.deleted_at;
