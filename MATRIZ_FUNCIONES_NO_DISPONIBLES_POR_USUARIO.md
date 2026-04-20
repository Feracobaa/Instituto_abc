# Matriz de Funciones No Disponibles Por Usuario

Fecha de corte: 2026-04-16  
Proyecto: Plataforma Instituto Pedagogico ABC

## Alcance y criterio
- Este documento interpreta "usuario" como **rol de usuario** en la plataforma.
- Roles soportados en frontend: `rector`, `profesor`, `contable`, `parent`.
- Se incluyen dos niveles:
  - Restriccion de **interfaz/ruta** (lo que no aparece o no abre en la app).
  - Restriccion de **datos/RLS** (aunque se intente por API, la base de datos lo bloquea).

## Resumen rapido (que NO tiene cada rol)

### 1) Rector
- No tiene acceso al portal de acudiente:
  - `/mis-notas`
  - `/mi-horario`
  - `/mi-perfil`
- En `Contabilidad` entra en **modo lectura**:
  - no puede crear/editar/eliminar pagos de pension
  - no puede crear/editar/eliminar movimientos financieros
  - no puede crear/editar/eliminar inventario
  - no puede asignar pensiones masivas

### 2) Profesor
- No tiene acceso a modulos administrativos:
  - `/contabilidad`
  - `/usuarios`
  - `/profesores`
  - `/estudiantes`
  - `/familias`
  - `/grados`
- En `Horarios` no puede crear/editar bloques (solo rector).
- En `Materias` no puede crear/editar materias (solo rector).
- En `Calificaciones` no puede operar fuera de su alcance:
  - no puede gestionar notas de docentes distintos
  - no puede gestionar grados/materias no asignados
  - no puede editar periodos no activos

### 3) Contable
- No tiene acceso a modulos academicos/gestion escolar:
  - `/usuarios`
  - `/profesores`
  - `/estudiantes`
  - `/familias`
  - `/horarios`
  - `/grados`
  - `/materias`
  - `/calificaciones`
  - `/mis-notas`
  - `/mi-horario`
  - `/mi-perfil`
- No puede administrar docentes, estudiantes, horarios, materias o calificaciones.

### 4) Parent (acudiente/estudiante)
- No tiene acceso a modulos administrativos:
  - `/contabilidad`
  - `/usuarios`
  - `/profesores`
  - `/estudiantes`
  - `/familias`
  - `/horarios`
  - `/grados`
  - `/materias`
  - `/calificaciones`
- No puede crear/editar/eliminar calificaciones ni evaluaciones.
- Solo puede ver informacion de su estudiante vinculado.

### 5) Rol `admin` (existe en enum, pero no operativo en frontend)
- Aunque `admin` aparece en el enum de BD, **no esta soportado por AuthContext**.
- Resultado practico: no se reconoce como rol valido para navegar la app.

## Matriz por modulo (funcion no disponible)

| Modulo / Funcion | Rector | Profesor | Contable | Parent |
| --- | --- | --- | --- | --- |
| Dashboard general `/` | NO | NO | NO | NO |
| Contabilidad `/contabilidad` abrir modulo | NO | SI | NO | SI |
| Contabilidad editar datos (write) | SI | SI | NO | SI |
| Usuarios `/usuarios` | NO | SI | SI | SI |
| Profesores `/profesores` | NO | SI | SI | SI |
| Estudiantes `/estudiantes` | NO | SI | SI | SI |
| Portal estudiantil `/familias` | NO | SI | SI | SI |
| Horarios `/horarios` ver | NO | NO | SI | SI |
| Horarios crear/editar bloques | NO | SI | SI | SI |
| Grados `/grados` | NO | SI | SI | SI |
| Materias `/materias` ver | NO | NO | SI | SI |
| Materias crear/editar | NO | SI | SI | SI |
| Calificaciones `/calificaciones` ver | NO | NO | SI | SI |
| Calificaciones editar fuera de asignacion | NO | SI | SI | SI |
| Mis Notas `/mis-notas` | SI | SI | SI | NO |
| Mi Horario `/mi-horario` | SI | SI | SI | NO |
| Mi Perfil `/mi-perfil` | SI | SI | SI | NO |

Leyenda: `SI` = funcion no disponible para ese rol. `NO` = disponible (al menos a nivel de ruta/UI).

## Restricciones de datos (RLS) relevantes

### Dominio academico
- `students`:
  - rector: select/insert/update/delete
  - profesor: solo select de estudiantes de sus grados asignados
  - parent: solo select de su estudiante vinculado
  - contable: select (sin write)
- `grade_records`:
  - rector: select/insert/update/delete
  - profesor: select/insert/update/delete solo sobre registros propios y asignaciones validas
  - parent: solo select de su estudiante
  - contable: sin acceso funcional
- `preescolar_evaluations`:
  - rector: select/insert/update/delete
  - profesor: select/insert/update/delete solo sobre asignaciones validas
  - parent: solo select de su estudiante
  - contable: sin acceso funcional

### Dominio contable
- `student_tuition_profiles`, `student_tuition_payments`, `financial_transactions`, `inventory_items`:
  - contable: select/insert/update/delete
  - rector: solo select
  - profesor y parent: sin acceso operativo

### Tablas legacy de examenes (hardening 2026-04-16)
- `active_exam_sessions`, `exam_audit_log`, `exam_progress`, `exam_responses`, `exam_settings`, `examenes`, `feedback_analytic`, `preguntas`, `question_statistics`, `resultados`, `simulacro_respuestas`, `simulacro_resultados`, `simulacros`, `usuarios`:
  - authenticated: select
  - rector: all (write)
  - no-rector: sin write

## Fuentes tecnicas usadas
- `src/App.tsx` (rutas por rol)
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/contexts/AuthContext.tsx`
- `src/pages/Contabilidad.tsx`
- `src/pages/Horarios.tsx`
- `src/pages/Materias.tsx`
- `src/pages/Calificaciones.tsx`
- `sql/migrations/20260408_01_harden_school_rls.sql`
- `sql/migrations/20260409_08_parent_portal.sql`
- `sql/migrations/20260411_13_accounting_rls.sql`
- `sql/migrations/20260411_14_accounting_students_access.sql`
- `sql/migrations/20260416_20_supabase_linter_security_remediation.sql`

## Nota final
- Si quieres la misma matriz **por usuario real** (correo/nombre) y no por rol, toca extraer usuarios activos desde BD (`auth.users`, `user_roles`) y cruzar con esta matriz de permisos.
