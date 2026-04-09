# Plan maestro de desarrollo y profesionalizacion

Fecha: 2026-04-08

## 1. Objetivo de este documento

Este documento define como vamos a llevar la plataforma a un estado mas profesional sin perder el contexto real del producto ni repetir errores de la fase de estabilizacion.

No es un roadmap generico. Esta escrito para esta plataforma, su base real en Supabase y su flujo academico actual.

## 2. Contexto canonico del proyecto

### 2.1 Producto actual

La plataforma es un sistema academico para el Instituto ABC con estos modulos vivos:

- autenticacion
- dashboard por rol
- profesores
- estudiantes
- grados
- materias
- horarios
- calificaciones
- evaluaciones de preescolar
- generacion de PDFs

### 2.2 Stack actual

- frontend: React + Vite + TypeScript
- UI: Tailwind + shadcn/ui + Radix
- data/auth: Supabase
- estado remoto: TanStack Query
- tests: Vitest

### 2.3 Reglas de negocio ya confirmadas

Estas reglas ya no se deben rediscutir salvo decision explicita del usuario:

- `subjects` oficialmente tiene `parent_id` y `grade_level`.
- `schedules` puede tener bloques de rutina con `title` y con `subject_id` / `teacher_id` nulos.
- el rector puede registrar notas, pero debe seleccionar explicitamente al docente responsable.
- el docente responsable debe corresponder al grado y a la materia de la nota.
- la seguridad real debe estar en servidor por RLS, no solo en filtros del frontend.
- las tablas legacy de examenes, simulacros y similares no hacen parte del producto vigente.

### 2.4 Modelo de seguridad que ya quedo adoptado

La plataforma ya se estabilizo alrededor de estas piezas:

- `teacher_subjects`
- `teacher_grade_assignments`
- `grade_records.teacher_id`
- `preescolar_evaluations.teacher_id`
- sincronizacion defensiva desde `schedules`

Eso significa:

- un profesor solo debe ver estudiantes de sus grados asignados
- un profesor solo debe ver y tocar notas donde realmente es el docente responsable
- el rector puede operar globalmente, pero dentro de reglas validas de asignacion

### 2.5 Estado tecnico comprobado hoy

- `npm run lint`: OK
- `npm run build`: OK
- `npm run test`: OK

Ademas:

- RLS ya fue endurecido
- la auditoria de integridad ya quedo limpia
- el incidente de profesores sin alumnos ya fue corregido con sincronizacion desde `schedules`

## 3. Fuentes de verdad que otro Codex debe leer primero

Antes de tocar codigo o SQL, cualquier agente debe leer estos archivos:

1. `CODEX_HANDOFF_2026-04-08.md`
2. `DIAGNOSTICO_PLATAFORMA_Y_PLAN.md`
3. `AUDITORIA_ESTRUCTURAL_PROYECTO_2026-04-08.md`
4. este archivo: `PLAN_MAESTRO_DESARROLLO_2026-04-08.md`

Y para cambios de base de datos:

5. `sql/README.md`
6. `sql/migrations/20260408_00_audit_school_integrity.sql`
7. `sql/migrations/20260408_01_harden_school_rls.sql`
8. `sql/migrations/20260408_07_sync_teacher_assignments_from_schedules.sql`

## 4. Meta objetivo

La meta no es solo "que funcione". La meta es que el proyecto quede con estas propiedades:

- seguridad real por servidor
- cambios de base auditables y repetibles
- frontend mantenible por modulos
- deuda tecnica bajo control
- documentacion minima pero real
- pruebas en los flujos criticos
- procesos claros para agregar nuevas funciones sin romper lo existente

## 5. Principios de trabajo

### 5.1 Reglas duras

- no correr scripts destructivos sobre produccion con datos
- no volver a abrir RLS por comodidad de frontend
- no agregar SQL nuevo en la raiz del repo
- no meter logica nueva grande dentro de archivos gigantes sin modularizar
- no introducir placeholders o demos en rutas reales de produccion
- no asumir que el frontend reemplaza validaciones de base

### 5.2 Reglas operativas

- todo cambio de schema o seguridad va por `sql/migrations`
- antes de tocar RLS o relaciones de docentes, correr auditoria
- todo cambio funcional debe venir con criterio de aceptacion
- todo refactor debe cerrar con `lint`, `build` y `test`
- cada nueva funcion debe decidir explicitamente si vive en frontend, en query, en helper o en SQL

## 6. Diagnostico de madurez actual

### 6.1 Lo que ya esta bien

- Supabase ya refleja el modelo real del negocio principal
- el tipado local ya fue alineado con la base real
- el flujo de rector al registrar notas ya fue corregido
- horarios ya soportan rutina vs clase
- build, lint y test pasan
- el bundle ya esta mejor repartido por lazy loading

### 6.2 Lo que todavia no es profesional del todo

- `README.md` sigue generico
- hay archivos muertos o residuales
- `useSchoolData.ts` concentra demasiada responsabilidad
- `Calificaciones.tsx` es demasiado grande
- casi no hay pruebas reales
- hay `console.log` de depuracion en archivos productivos
- hay detalles de encoding/mojibake
- la politica de git para `*.sql` no acompana el uso actual del repo
- el flujo de PDF sigue siendo potente pero complejo

## 7. Roadmap por fases

## Fase 1. Orden y base profesional del repo

### Objetivo

Dejar el proyecto ordenado para que crecer no vuelva a generar caos.

### Entregables

- reemplazar `README.md` por documentacion real del proyecto
- documentar instalacion local, variables de entorno y flujo de despliegue
- corregir `.gitignore` para que la estrategia de SQL versionado sea coherente
- agregar dependencia directa de `html2canvas`
- retirar `html2pdf.js` si ya no se usa
- limpiar archivos residuales o no usados:
  - `src/App.css`
  - `src/integrations/client.ts`
  - `src/components/NavLink.tsx`
  - `src/components/ui/use-toast.ts`
  - `src/components/reports/PrimaryReport.tsx`
  - `src/components/reports/ReportSystemContainer.tsx`
- resolver el favicon faltante
- eliminar `console.log` de depuracion en codigo productivo
- homogenizar encoding en textos visibles

### Definicion de terminado

- repo mas limpio
- documentacion real en raiz
- dependencias PDF consistentes
- ningun archivo placeholder confundiendo el producto real

## Fase 2. Modularizacion del dominio academico

### Objetivo

Sacar al proyecto de la dependencia en archivos gigantes y volver mas claro donde vive cada responsabilidad.

### Entregables

- dividir `src/hooks/useSchoolData.ts` por dominios:
  - `academicPeriods`
  - `teachers`
  - `students`
  - `subjects`
  - `schedules`
  - `gradeRecords`
  - `preescolar`
- centralizar `queryKeys`
- crear helpers de dominio compartidos
- reducir el tamano de `src/pages/Calificaciones.tsx`
- mover logica de dialogs y tablas de calificaciones a componentes dedicados
- revisar si `Materias.tsx` y `Horarios.tsx` necesitan extraccion parcial de logica

### Definicion de terminado

- los modulos grandes dejan de ser cuellos de botella
- agregar funciones nuevas no exige tocar un solo archivo monstruo

## Fase 3. Calidad funcional y pruebas reales

### Objetivo

Pasar de "compila" a "tenemos confianza para cambiar".

### Entregables

- reemplazar la prueba de ejemplo por pruebas utiles
- agregar pruebas unitarias para:
  - helpers de calificaciones
  - deteccion de preescolar
  - reglas de filtros por rol
  - generacion de payloads para horarios y notas
- agregar pruebas de componentes para:
  - `ProtectedRoute`
  - `TeacherFormDialog`
  - `SubjectFormDialog`
  - partes criticas de `Calificaciones`
- evaluar incorporar pruebas E2E con Playwright para:
  - login rector
  - login profesor
  - registrar nota como rector
  - profesor viendo solo sus datos

### Definicion de terminado

- existe una base de tests que cubre los flujos que mas nos pueden romper el negocio

## Fase 4. Hardening funcional del producto

### Objetivo

Volver mas profesional la experiencia operativa y reducir errores humanos del rector y del profesor.

### Entregables

- mejorar validaciones de formularios con esquemas claros
- normalizar estados de loading, error y vacio
- crear mensajes de error mas precisos para fallos de Supabase/RLS
- agregar confirmaciones consistentes para acciones destructivas
- revisar accesibilidad basica de formularios y tablas
- definir criterios de bloqueo por periodo academico activo/inactivo
- definir si ciertas ediciones deben quedar cerradas al cerrar un periodo

### Definicion de terminado

- menos ambiguedad en la operacion
- menos errores de uso
- mejor trazabilidad funcional

## Fase 5. Gobierno de datos y operaciones

### Objetivo

Que la plataforma se pueda operar con disciplina y no solo con intuicion.

### Entregables

- dejar un checklist de migraciones productivas
- dejar un checklist de respaldo antes de cambios sensibles
- definir procedimiento para auditar asignaciones desde `schedules`
- definir protocolo para alta de usuarios y asignacion inicial de roles/docentes
- documentar que tablas son canonicas y cuales son legacy
- definir que hacer si reaparecen inconsistencias en notas, preescolar o horarios

### Definicion de terminado

- cualquier otro desarrollador o Codex puede tocar Supabase sin improvisar

## Fase 6. Desarrollo funcional nuevo

### Objetivo

Agregar funciones nuevas sobre una base ya profesionalizada, sin volver a desordenar el proyecto.

### Backlog de producto recomendado

#### Prioridad alta

- modulo real de asistencia
  - hoy solo existen PDFs de plantilla, no un registro estructurado de asistencia
- cierre de periodos
  - bloquear edicion cuando el periodo este cerrado
  - dejar historial claro por periodo
- historial de cambios de notas
  - quien creo, quien edito y cuando
- mejora del modulo de horarios
  - detectar cruces de docente
  - detectar cruces por grado

#### Prioridad media

- ficha academica mas rica del estudiante
- filtros y exportaciones mas potentes en calificaciones
- analitica basica por materia, grado y docente
- asignacion mas guiada de docentes a materias y grados

#### Prioridad baja o diferida

- portal para padres
- soporte real para rol `admin`
- reactivar cualquier modulo de examenes legacy
- multi-institucion

## 8. Plan de ejecucion recomendado

## Sprint 1

- Fase 1 completa
- dejar el repo limpio y coherente
- cerrar residuos y documentacion minima

## Sprint 2

- comenzar Fase 2
- partir `useSchoolData.ts`
- partir `Calificaciones.tsx`

## Sprint 3

- Fase 3
- pruebas reales sobre rutas, dialogs y flujo de notas

## Sprint 4

- Fase 4
- validaciones funcionales y manejo de errores mas profesional

## Sprint 5 en adelante

- Fase 5 + primeras funciones nuevas de Fase 6

## 9. Reglas para agregar funciones nuevas sin romper el proyecto

Cada nueva funcionalidad debe responder estas preguntas antes de implementarse:

1. Que tablas toca o crea
2. Que reglas RLS necesita
3. Que rol puede verla
4. Que flujo rector/profesor cambia
5. Que pruebas minimas necesita
6. Si requiere migracion o solo cambio de frontend
7. Que documento del repo debe actualizarse despues

Si una funcion no responde esas preguntas, no esta lista para implementarse.

## 10. Cosas que no debemos hacer otra vez

- agregar scripts SQL sueltos en la raiz
- arreglar acceso de profesores abriendo politicas con `true`
- dejar relaciones criticas solo implcitas en el frontend
- depender de placeholders o componentes demo para funciones reales
- meter toda la logica academica en una sola pagina o hook

## 11. Recomendacion inmediata

El siguiente paso correcto no es inventar una funcion nueva todavia.

El siguiente paso correcto es ejecutar la Fase 1 completa para que el proyecto quede limpio y preparado para crecer.

Eso significa que, si seguimos trabajando ya, el orden ideal es:

1. limpiar dependencias y residuos
2. actualizar README y reglas del repo
3. ordenar SQL y gitignore
4. luego partir `useSchoolData.ts`
5. luego partir `Calificaciones.tsx`

## 12. Resultado esperado si seguimos este plan

Si seguimos este plan, la plataforma deberia quedar asi:

- segura por servidor
- clara para cualquier desarrollador nuevo
- con deuda tecnica controlada
- lista para agregar asistencia, cierres de periodo y analitica sin improvisar
- con menos riesgo de romper notas, horarios o visibilidad por rol
