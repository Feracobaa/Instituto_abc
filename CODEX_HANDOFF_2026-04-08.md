# Codex Handoff 2026-04-08

## Estado general

La plataforma ya quedó estabilizada en dos frentes:

1. Seguridad y consistencia de Supabase.
2. Limpieza técnica del frontend para que `lint` no falle con errores.

No se perdieron notas ni datos. El usuario confirmó que la app quedó funcionando bien después de las migraciones y también confirmó que el incidente posterior de profesores sin alumnos ya quedó corregido.

## Contexto de base de datos ya resuelto

Se confirmó contra Supabase real que:

- `subjects` sí tiene `parent_id` y `grade_level`.
- `schedules` sí tiene `title`, y permite `subject_id` / `teacher_id` nulos para bloques de rutina.
- El rector debe elegir explícitamente al docente responsable al registrar notas.
- La seguridad debía quedar de verdad en servidor vía RLS.
- Las tablas legacy de exámenes son históricas y no forman parte de la plataforma actual.

### Migraciones principales ya aplicadas en Supabase

- `sql/migrations/20260408_03_subjects_grade_level_default.sql`
- `sql/migrations/20260408_02_schedule_block_constraint.sql`
- `sql/migrations/20260408_01_harden_school_rls.sql`
- `sql/migrations/20260408_04_backfill_preescolar_teacher_data.sql`
- `sql/migrations/20260408_05_backfill_grade_record_assignments.sql`
- `sql/migrations/20260408_06_internal_safety_snapshots.sql`
- `sql/migrations/20260408_07_sync_teacher_assignments_from_schedules.sql`

### Auditoría final confirmada por el usuario

El usuario volvió a correr `sql/migrations/20260408_00_audit_school_integrity.sql` y confirmó todo en `0`:

- `grade_records_without_teacher`
- `grade_records_teacher_without_grade_assignment`
- `grade_records_teacher_without_subject_assignment`
- `preescolar_without_teacher`
- `preescolar_teacher_without_grade_assignment`
- `schedules_ambiguous_blocks`
- `schedules_teacher_without_grade_assignment`
- `schedules_teacher_without_subject_assignment`

## Incidente importante que ya ocurrió y quedó corregido

### Síntoma

Después del endurecimiento de RLS, algunos profesores dejaron de ver alumnos en ciertos salones, aunque sí tenían materias/horarios allí.

### Causa real

El RLS de `students` depende de `teacher_grade_assignments`, pero algunas relaciones profesor -> grado solo existían en `schedules`.

Entonces:

- el profesor sí tenía horario/materia,
- pero el servidor no lo reconocía como asignado oficialmente al grado,
- y RLS le ocultaba estudiantes.

### Corrección aplicada

Se creó `sql/migrations/20260408_07_sync_teacher_assignments_from_schedules.sql`, que:

- backfillea `teacher_grade_assignments` desde `schedules`
- backfillea `teacher_subjects` desde `schedules`
- crea trigger `schedules_sync_teacher_assignments`
- crea función `public.sync_teacher_assignments_from_schedule()`

También se reforzaron:

- `sql/migrations/20260408_00_audit_school_integrity.sql`
- `sql/migrations/20260408_01_harden_school_rls.sql`

para que en el futuro este caso se detecte y se autocorrija.

El usuario ejecutó el `07`, obtuvo ambos checks en `0`, y confirmó que el problema quedó resuelto en la app.

## Cambios importantes de frontend/código ya hechos

### Seguridad y flujo

- Rutas protegidas con `ProtectedRoute`.
- Restricción real de pantallas para rector/profesor en `src/App.tsx`.
- `AuthContext` alineado con roles reales de Supabase (`user_role_enum`).
- En `Calificaciones`, el rector ahora debe seleccionar docente responsable.
- En `TeacherFormDialog`, se asignan grados al profesor.
- En `SubjectFormDialog`, se captura `grade_level`.

### Tipado / contrato Supabase

Se alineó `src/integrations/types.ts` con la base real:

- `teacher_grade_assignments`
- `user_role_enum`
- `subjects.parent_id`
- `subjects.grade_level`
- `schedules.title`
- `schedules.start_date`
- `schedules.end_date`
- `schedules.subject_id` nullable
- `schedules.teacher_id` nullable

### Limpieza técnica reciente

Se limpió `lint` hasta dejarlo sin errores:

- tipado reutilizable en `src/hooks/useSchoolData.ts`
- eliminación de `any` en pantallas clave
- reemplazo de `@ts-ignore`
- tipado de `html2pdf.js`
- ajuste de `tailwind.config.ts` para evitar `require()`

Archivo nuevo importante:

- `src/types/html2pdf-js.d.ts`

## Estado actual de validación

Última verificación local antes del handoff:

- `npm run lint` -> sin errores, solo warnings de `react-refresh/only-export-components`
- `npm run build` -> OK

Warnings restantes:

- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/form.tsx`
- `src/components/ui/navigation-menu.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/ui/toggle.tsx`
- `src/contexts/AuthContext.tsx`

No bloquean ni build ni funcionamiento.

## Organización SQL actual

- `sql/migrations`: scripts vigentes y seguros
- `sql/manual`: scripts manuales aún útiles
- `sql/legacy`: scripts históricos / peligrosos / viejos

## Archivos de diagnóstico/documentación

- `DIAGNOSTICO_PLATAFORMA_Y_PLAN.md`
- `sql/README.md`
- este archivo: `CODEX_HANDOFF_2026-04-08.md`

## Qué NO hacer

- No revertir RLS endurecido.
- No borrar ni rehacer asignaciones históricas sin nueva auditoría.
- No tocar `consultas/`; son archivos locales del usuario y no deben ir al commit.
- No confiar solo en filtros de frontend para seguridad.

## Próximos pasos recomendados

1. Hacer commit de los cambios actuales.
2. Si el usuario quiere más pulido, resolver los 8 warnings de `react-refresh`.
3. Mantener la auditoría como verificación obligatoria antes de futuros cambios grandes de RLS o horarios.
