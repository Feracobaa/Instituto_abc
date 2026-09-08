begin;

-- ==============================================================================
-- Migración 20260908_52: Ajuste de RLS en user_roles para Suspensión Comercial
-- ==============================================================================
-- Permite que cualquier usuario autenticado consulte siempre su propia asignación
-- de rol (user_id = auth.uid()) incluso cuando la institución se encuentre en mora
-- comercial o inactiva (is_institution_active = false).
-- Esto garantiza que el frontend identifique al usuario y le muestre la pantalla
-- formal de suspensión sin bucles de redirección ni pérdidas de contexto de rol.

drop policy if exists user_roles_tenant_isolation_restrictive on public.user_roles;

create policy user_roles_tenant_isolation_restrictive on public.user_roles
as restrictive for all to authenticated
using (
  -- 1. El usuario siempre puede leer su propia fila de rol
  (user_id = auth.uid())
  -- 2. O si consulta roles de terceros dentro del colegio, el colegio debe pertenecer a su sesión y estar activo comercialmente
  or (
    institution_id = public.current_institution_id()
    and (public.is_provider_owner() or public.is_institution_active(institution_id))
  )
)
with check (
  -- Las mutaciones (INSERT/UPDATE/DELETE) siguen requiriendo que la institución esté activa comercialmente (salvo soporte Etymon)
  institution_id = public.current_institution_id()
  and (public.is_provider_owner() or public.is_institution_active(institution_id))
);

commit;
