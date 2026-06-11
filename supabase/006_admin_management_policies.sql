-- Politicas adicionales para habilitar gestion desde el modulo admin del portal.
-- Ejecutar despues de 001_clients_portal_schema.sql

drop policy if exists "clients_insert_admin_only" on public.clients;
create policy "clients_insert_admin_only"
on public.clients
for insert
with check (public.is_admin());

drop policy if exists "clients_update_admin_only" on public.clients;
create policy "clients_update_admin_only"
on public.clients
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "applications_insert_admin_only" on public.applications;
create policy "applications_insert_admin_only"
on public.applications
for insert
with check (public.is_admin());

drop policy if exists "applications_update_admin_only" on public.applications;
create policy "applications_update_admin_only"
on public.applications
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "memberships_insert_admin_only" on public.client_memberships;
create policy "memberships_insert_admin_only"
on public.client_memberships
for insert
with check (public.is_admin());

drop policy if exists "memberships_update_admin_only" on public.client_memberships;
create policy "memberships_update_admin_only"
on public.client_memberships
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "access_insert_admin_only" on public.client_application_access;
create policy "access_insert_admin_only"
on public.client_application_access
for insert
with check (public.is_admin());

drop policy if exists "access_update_admin_only" on public.client_application_access;
create policy "access_update_admin_only"
on public.client_application_access
for update
using (public.is_admin())
with check (public.is_admin());
