# SQL del proyecto

Esta carpeta concentra los scripts SQL vigentes y el material historico del proyecto.

## Estructura

- `migrations/`
  Scripts actuales, seguros y secuenciales para el estado real de Supabase.

- `manual/`
  Scripts manuales o historicos de apoyo que explican cambios reales del proyecto, pero no forman parte del flujo normal de migracion.

- `legacy/`
  Scripts viejos, incompletos o peligrosos para produccion con datos reales.
  No deben correrse a ciegas.

## Orden correcto hoy

Si se necesita volver a reproducir el endurecimiento reciente de la plataforma, el orden valido es:

1. `migrations/20260408_00_audit_school_integrity.sql`
2. `migrations/20260408_04_backfill_preescolar_teacher_data.sql` solo si la auditoria lo exige
3. `migrations/20260408_05_backfill_grade_record_assignments.sql` solo si la auditoria lo exige
4. `migrations/20260408_06_internal_safety_snapshots.sql`
5. `migrations/20260408_03_subjects_grade_level_default.sql`
6. `migrations/20260408_02_schedule_block_constraint.sql`
7. `migrations/20260408_01_harden_school_rls.sql`

## Regla operativa

- Antes de tocar RLS, correr la auditoria.
- No ejecutar scripts de `legacy/` sobre una base con datos reales.
- No usar `manual/` como si fueran migraciones oficiales.
