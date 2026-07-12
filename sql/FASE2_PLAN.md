# FASE 2 - PASO 2: Tipos Teacher & Student Completos
**Fecha:** 22 de abril de 2026  
**Objetivo:** Sincronizar tipos con BD y remover casting manual

---

## 📋 ANÁLISIS DE CASTING MANUAL ACTUAL

### Castings encontrados (13 total):
```
src/hooks/school/useGradeRecords.ts:32         as GradeRecord[]
src/hooks/school/useGradeRecordPartials.ts:121 as GradeRecordPartial[]
src/hooks/school/useGradeRecordPartials.ts:226 as GradeRecord
src/hooks/school/useStudents.ts:27             as Student[]
src/hooks/school/useTeachers.ts:42             as Teacher[]
src/hooks/school/useAttendance.ts:92           as StudentAttendance[]
src/hooks/school/useAttendance.ts:117          as Student[]
src/features/horarios/conflicts.test.ts:11    as Teacher[]
src/features/asistencias/helpers.test.ts:84   as unknown as Student[]
src/features/asistencias/helpers.test.ts:88   as unknown as StudentAttendance[]
src/features/calificaciones/helpers.test.ts:28  as Teacher
src/features/calificaciones/helpers.test.ts:34  as Teacher
src/features/calificaciones/helpers.test.ts:80  as GradeRecord[]
```

**Patrón:** Casi todos están en `hooks/school/` - es el lugar donde Supabase devuelve datos sin tipos correctos

---

## 🔧 PLAN DE TRABAJO

### PASO 2.1: Crear Tipos Completos (30 min)
**Archivo:** `src/hooks/school/types.ts`

Agregar interfaces completas basadas en BD:
- [ ] `TeacherBase` (sin relaciones)
- [ ] `Teacher` (con relaciones completas)
- [ ] `StudentBase` (sin relaciones)
- [ ] `Student` (con relaciones completas)

### PASO 2.2: Crear Helpers de Tipo-Seguridad (45 min)
**Archivo:** `src/hooks/school/typeGuards.ts` (nuevo)

Funciones para validar tipos en tiempo de ejecución:
- [ ] `isTeacher(value: unknown): value is Teacher`
- [ ] `isStudent(value: unknown): value is Student`
- [ ] `asTeacher(value: any): Teacher` - con validación
- [ ] `asStudent(value: any): Student` - con validación

### PASO 2.3: Refactorizar Hooks (2 horas)
Actualizar cada hook para usar tipos correctos:

**useTeachers.ts**
- [ ] Remover `as Teacher[]`
- [ ] Tipado correcto desde Supabase

**useStudents.ts**
- [ ] Remover `as Student[]`
- [ ] Validación de campos opcionales

**useGradeRecords.ts**
- [ ] Remover `as GradeRecord[]`
- [ ] Mejor manejo de datos relacionados

**useGradeRecordPartials.ts**
- [ ] Remover `as GradeRecordPartial[]`
- [ ] Validación de estructura parcial

**useAttendance.ts**
- [ ] Remover `as StudentAttendance[]`
- [ ] Remover `as Student[]`

### PASO 2.4: Actualizar Tests (45 min)
- [ ] Tests de horarios
- [ ] Tests de asistencias
- [ ] Tests de calificaciones
- [ ] Remover castings en tests

### PASO 2.5: Validación Final (30 min)
- [ ] 35/35 tests pasando ✓
- [ ] TypeScript strict sin `as` innecesarios
- [ ] Compilación limpia

---

## ✅ ESTRATEGIA DE RIESGO MÍNIMO

### Cambios Secuenciales (no todo de una vez):
1. **Paso 1:** Crear tipos - SIN cambiar código existente
2. **Paso 2:** Crear type guards - SIN cambiar lógica
3. **Paso 3:** Actualizar 1 hook a la vez (useTeachers first)
4. **Paso 4:** Tests después de cada cambio
5. **Paso 5:** Validar regresión total

### Si algo falla:
- Rollback es sencillo (solo cambios TypeScript)
- Tests alertan inmediatamente
- BD no cambia

### Orden de Prioridad:
1. **useTeachers.ts** - Más simple, menos dependencias
2. **useStudents.ts** - Estructura similar
3. **useGradeRecords.ts** - Crítico para RLS
4. **useAttendance.ts** - Complejo, hacer último

---

## 📊 MÉTRICAS DE ÉXITO

| Métrica | Actual | Meta | 
|---------|--------|------|
| Castings manuales | 13 | 0 |
| Tests pasando | 35/35 | 35/35 ✓ |
| TypeScript errors | 0 | 0 ✓ |
| Tipos sincronizados con BD | Parcial | 100% ✓ |
| Cobertura de tipos | ~60% | 95%+ |

---

## 🚀 COMENCEMOS

**Siguiente:** Crear tipos completos en `src/hooks/school/types.ts`