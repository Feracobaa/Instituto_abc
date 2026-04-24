# Base de Datos - Estado Actual (22 de Abril de 2026)

**Última actualización:** 22 de abril de 2026  
**Versión del Schema:** Post-migración 20260422_31_user_assignment_resilience.sql

---

## 📊 Resumen de Tablas Críticas

### 1. `grade_records` - Calificaciones Estudiantiles
**Propósito:** Almacenar calificaciones individuales de estudiantes por asignatura y período

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | UUID | NO | Clave primaria |
| `student_id` | UUID | NO | Referencia a `students` |
| `subject_id` | UUID | NO | Referencia a `subjects` |
| `teacher_id` | UUID | **YES** ⚠️ | **PROBLEMA**: Debería ser NOT NULL (RLS crítico) |
| `period_id` | UUID | NO | Referencia a `academic_periods` |
| `grade` | NUMERIC | NO | Calificación numérica |
| `comments` | TEXT | YES | Comentarios del docente |
| `achievements` | TEXT | YES | Logros del estudiante |
| `created_at` | TIMESTAMP | NO | Auditoría |
| `updated_at` | TIMESTAMP | NO | Auditoría |
| `institution_id` | UUID | NO | Referencia a `institutions` |

**Estado:** ⚠️ **NECESITA CORRECCIÓN** - `teacher_id` debe ser NOT NULL
**Plan:** Migración #32 lo arreglará

---

### 2. `teacher_grade_assignments` - Asignación Docentes a Grados
**Propósito:** Vincular docentes con grados para definir qué docentes enseñan en qué grados

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | UUID | NO | Clave primaria |
| `teacher_id` | UUID | NO | Referencia a `teachers` |
| `grade_id` | UUID | NO | Referencia a `grades` |
| `created_at` | TIMESTAMP | YES | Auditoría |
| `is_group_director` | BOOLEAN | NO | ¿Es director de grupo? |
| `institution_id` | UUID | NO | Referencia a `institutions` |

**Estado:** ✅ **CORRECTO** - Estructura apropiada para RLS

---

### 3. `profiles` - Perfiles de Usuarios
**Propósito:** Información general de usuarios autenticados

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | UUID | NO | Clave primaria |
| `user_id` | UUID | NO | Referencia a `auth.users` |
| `full_name` | TEXT | NO | Nombre completo |
| `email` | TEXT | NO | Email único |
| `phone` | TEXT | YES | Teléfono opcional |
| `created_at` | TIMESTAMP | NO | Auditoría |
| `updated_at` | TIMESTAMP | NO | Auditoría |
| `institution_id` | UUID | NO | Institución del usuario |

**Estado:** ✅ **CORRECTO** - Sincronizado con BD

---

### 4. `user_roles` - Roles de Usuarios
**Propósito:** Asignar roles a usuarios dentro de instituciones

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | UUID | NO | Clave primaria |
| `user_id` | UUID | NO | Referencia a `auth.users` |
| `role` | ENUM | NO | Valores: `rector`, `profesor`, `parent`, `admin`, `contable` |
| `institution_id` | UUID | NO | Institución del rol |

**Roles Disponibles:** 
- `rector` - Administrador de institución
- `profesor` - Docente
- `parent` - Apoderado/Guardián
- `admin` - Admin del sistema
- `contable` - Contador/Tesorero

**Estado:** ✅ **CORRECTO** - Enum sincronizado

---

### 5. `teachers` - Información de Docentes
**Propósito:** Detalles específicos de docentes

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | UUID | NO | Clave primaria |
| `user_id` | UUID | YES | ⚠️ Referencia a `auth.users` (nullable es extraño) |
| `full_name` | TEXT | NO | Nombre completo |
| `email` | TEXT | NO | Email institucional |
| `phone` | TEXT | YES | Teléfono |
| `is_active` | BOOLEAN | YES | ¿Activo? |
| `created_at` | TIMESTAMP | NO | Auditoría |
| `updated_at` | TIMESTAMP | NO | Auditoría |
| `institution_id` | UUID | NO | Institución |

**Estado:** ⚠️ **NOTA** - `user_id` nullable es inusual, revisar si es intencional

---

### 6. `students` - Información de Estudiantes
**Propósito:** Datos de estudiantes

| Campo | Tipo | Nullable | Notas |
|-------|------|----------|-------|
| `id` | UUID | NO | Clave primaria |
| `full_name` | TEXT | NO | Nombre completo |
| `grade_id` | UUID | YES | Referencia a `grades` |
| `guardian_name` | TEXT | YES | Nombre del apoderado |
| `guardian_phone` | TEXT | YES | Teléfono del apoderado |
| `is_active` | BOOLEAN | YES | ¿Activo? |
| `created_at` | TIMESTAMP | NO | Auditoría |
| `updated_at` | TIMESTAMP | NO | Auditoría |
| `address` | TEXT | YES | Dirección |
| `birth_date` | DATE | YES | Fecha de nacimiento |
| `institution_id` | UUID | NO | Institución |

**Estado:** ✅ **CORRECTO** - Estructura apropiada

---

## 🔐 Seguridad (RLS - Row Level Security)

### Implementación Actual:
- ✅ Trigger `handle_new_user()` sincroniza auth.users con profiles
- ✅ Función `provider_assign_user_role_by_email()` asigna roles
- ✅ RLS activado en tablas críticas (grade_records, profiles, etc.)

### Puntos Críticos:
1. **`grade_records.teacher_id`** - DEBE ser NOT NULL para que RLS funcione correctamente
   - Los docentes solo deben ver calificaciones donde `teacher_id = auth.uid()`
   - Si es nullable, las políticas RLS fallan

2. **Relaciones de Integridad:**
   - `grade_records.teacher_id` → `teachers.id`
   - `teacher_grade_assignments.teacher_id` → `teachers.id`
   - `teacher_grade_assignments.grade_id` → `grades.id`

---

## 📋 Problemas Identificados

| # | Problema | Severidad | Estado | Solución |
|---|----------|-----------|--------|----------|
| 1 | `grade_records.teacher_id` es NULL | 🔴 CRÍTICA | Abierto | Migración #32 |
| 2 | `teachers.user_id` nullable | 🟡 MEDIA | Abierto | Revisar intención |
| 3 | Tipos TS desfasados | 🟡 MEDIA | Abierto | Sincronizar tipos |
| 4 | 0% Testing de RLS | 🟡 MEDIA | ✅ RESUELTO | Tests RLS en Fase 1 |
| 5 | Índices sin documentar | 🟡 MEDIA | ✅ RESUELTO | Migración #33 |

---

## 🚀 Plan de Correcciones

### Fase 1 (Completada): Testing Defensivo ✅
- Tests RLS establecidos (4/4 pasando)
- Baseline de seguridad validada

### Fase 2 (En Progreso): Sincronización de Tipos
- **Paso 1:** Corregir `grade_records.teacher_id` (Migración #32) 👈 AHORA
- **Paso 2:** Actualizar tipos TypeScript
- **Paso 3:** Remover casting manual (✅ Mitigado doble-cast en Contabilidad)

### Fase 3 (Completada): Índices y Performance ✅
- Migración `20260422_33_performance_indexes.sql` creada para resolver 9 índices críticos faltantes (RLS y filtros frecuentes).

---

## 📝 Notas de Implementación

1. **Datos Existentes:** Si hay `grade_records` con `teacher_id = NULL`, la migración #32 deberá:
   - Identificar el docente responsable
   - Actualizar registros orfandos
   - O, eliminar registros inválidos

2. **RLS Policies:** Revisar que estén actualizadas después de migración

3. **Tests:** Suite RLS debe seguir pasando después de migración

---

**Generado:** 22 de abril de 2026  
**Autor:** Sistema de Auditoría  
**Próxima Revisión:** Después de Migración #32