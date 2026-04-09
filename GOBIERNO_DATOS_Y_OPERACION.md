# Gobierno De Datos Y Operacion

## Objetivo

Dejar una guia operativa concreta para tocar Supabase, migraciones y datos academicos sin improvisar.

## 1. Checklist Antes De Cambios Sensibles

Ejecutar siempre antes de tocar RLS, relaciones docentes, horarios o calificaciones:

1. Confirmar en que rama y commit se esta trabajando.
2. Revisar [CODEX_HANDOFF_2026-04-08.md](/e:/iabc/CODEX_HANDOFF_2026-04-08.md) y [PLAN_MAESTRO_DESARROLLO_2026-04-08.md](/e:/iabc/PLAN_MAESTRO_DESARROLLO_2026-04-08.md).
3. Verificar que `npm run lint`, `npm run test` y `npm run build` pasan localmente.
4. Revisar si hay datos productivos nuevos que puedan verse afectados.
5. Ejecutar la auditoria [20260408_00_audit_school_integrity.sql](/e:/iabc/sql/migrations/20260408_00_audit_school_integrity.sql).
6. Si la auditoria devuelve filas, no endurecer ni migrar nada hasta corregirlas.

## 2. Checklist De Migraciones Productivas

Orden recomendado para cualquier cambio de base:

1. Escribir migracion nueva en [sql/migrations](/e:/iabc/sql/migrations).
2. Nombrarla con fecha y secuencia.
3. Evitar SQL suelto en la raiz.
4. Revisar si el cambio:
   afecta RLS
   cambia contratos del frontend
   necesita backfill
   necesita auditoria previa o posterior
5. Ejecutar primero en entorno de prueba o contra datos controlados.
6. Ejecutar la auditoria despues de aplicar el cambio si toca notas, horarios o asignaciones.
7. Documentar el cambio en el handoff si modifica reglas de negocio.

## 3. Respaldo Minimo Antes De Cambios Sensibles

Si no hay backup externo listo, hacer al menos una de estas dos:

1. Confirmar que existe backup automatico reciente en Supabase.
2. Ejecutar [20260408_06_internal_safety_snapshots.sql](/e:/iabc/sql/migrations/20260408_06_internal_safety_snapshots.sql) para snapshots internos antes de cambios delicados.

Nota:
- Los snapshots internos no reemplazan un backup completo.
- Sirven como red de seguridad operativa rapida cuando se necesita intervenir produccion con urgencia.

## 4. Procedimiento Para Auditar Asignaciones Desde Horarios

Usar cuando profesores dejan de ver estudiantes o notas que deberian ver:

1. Ejecutar [20260408_00_audit_school_integrity.sql](/e:/iabc/sql/migrations/20260408_00_audit_school_integrity.sql).
2. Revisar especialmente:
   `schedules_teacher_without_grade_assignment`
   `schedules_teacher_without_subject_assignment`
3. Si alguno da mas de `0`, ejecutar [20260408_07_sync_teacher_assignments_from_schedules.sql](/e:/iabc/sql/migrations/20260408_07_sync_teacher_assignments_from_schedules.sql).
4. Repetir la auditoria.
5. Confirmar que los profesores afectados recargaron sesion.

## 5. Protocolo De Alta De Usuarios Y Asignacion Inicial

### Rector

1. Crear usuario en Auth.
2. Confirmar que el trigger `handle_new_user` creo `profiles` y `user_roles`.
3. Verificar que el rol quedo como `rector`.

### Profesor

1. Crear usuario en Auth.
2. Confirmar que el trigger `handle_new_user` creo `profiles`, `user_roles` y `teachers`.
3. Entrar a la plataforma como rector.
4. Abrir `Profesores`.
5. Asignar materias y grados al docente.
6. Si el docente va a aparecer en horarios, crear o revisar sus bloques en `Horarios`.

Sin esas asignaciones, el docente puede autenticarse, pero no necesariamente vera estudiantes, materias o notas de forma correcta.

## 6. Tablas Canonicas Del Producto

Estas son las tablas vivas del producto escolar:

- `academic_periods`
- `grade_records`
- `grades`
- `preescolar_evaluations`
- `profiles`
- `schedules`
- `students`
- `subjects`
- `teacher_grade_assignments`
- `teacher_subjects`
- `teachers`
- `user_roles`

## 7. Tablas Legacy O Fuera De Alcance

Se consideran historicas o fuera de la plataforma activa:

- tablas de examenes
- simulacros
- usuarios legacy no ligados al flujo actual

Regla:
- no reutilizarlas para nuevas funciones
- no integrarlas al frontend actual
- si vuelven a aparecer en SQL viejos, tratarlas como legacy hasta demostrar lo contrario

## 8. Que Hacer Si Reaparecen Inconsistencias

### Notas

1. Ejecutar auditoria.
2. Revisar `grade_records_without_teacher`.
3. Revisar `grade_records_teacher_without_grade_assignment`.
4. Revisar `grade_records_teacher_without_subject_assignment`.
5. Si aplica, ejecutar [20260408_05_backfill_grade_record_assignments.sql](/e:/iabc/sql/migrations/20260408_05_backfill_grade_record_assignments.sql).

### Preescolar

1. Ejecutar auditoria.
2. Revisar `preescolar_without_teacher`.
3. Revisar `preescolar_teacher_without_grade_assignment`.
4. Si aplica, ejecutar [20260408_04_backfill_preescolar_teacher_data.sql](/e:/iabc/sql/migrations/20260408_04_backfill_preescolar_teacher_data.sql).

### Horarios

1. Ejecutar auditoria.
2. Revisar `schedules_ambiguous_blocks`.
3. Revisar las validaciones de cruces en frontend.
4. Revisar si hubo inserciones manuales que saltaron la UI.

## 9. Reglas Operativas Actuales

1. `subjects` mantiene `parent_id` y `grade_level`.
2. `schedules` permite bloques de rutina con `title` y `subject_id` / `teacher_id` nulos.
3. El rector debe elegir explicitamente el docente responsable al registrar notas.
4. Los profesores ven informacion real por RLS, no por filtros solo del frontend.
5. El periodo activo es el unico periodo editable en el frontend para calificaciones.
6. Los periodos no activos quedan en modo consulta y descarga.

## 10. Fuentes De Verdad Del Proyecto

Leer primero:

1. [README.md](/e:/iabc/README.md)
2. [DIAGNOSTICO_PLATAFORMA_Y_PLAN.md](/e:/iabc/DIAGNOSTICO_PLATAFORMA_Y_PLAN.md)
3. [CODEX_HANDOFF_2026-04-08.md](/e:/iabc/CODEX_HANDOFF_2026-04-08.md)
4. [AUDITORIA_ESTRUCTURAL_PROYECTO_2026-04-08.md](/e:/iabc/AUDITORIA_ESTRUCTURAL_PROYECTO_2026-04-08.md)
5. [PLAN_MAESTRO_DESARROLLO_2026-04-08.md](/e:/iabc/PLAN_MAESTRO_DESARROLLO_2026-04-08.md)

## 11. Resultado Esperado

Si este runbook se sigue, cualquier cambio futuro sobre docentes, horarios, notas o RLS deberia poder hacerse:

- sin perder datos
- sin abrir permisos por accidente
- sin depender de memoria personal
- y con criterio claro para auditar antes y despues
