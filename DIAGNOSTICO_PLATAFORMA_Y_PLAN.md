# Diagnostico de la plataforma y plan de correccion

Fecha: 2026-04-08

## 1. Objetivo de este documento

Este documento resume como se encontro la plataforma, que cosas ya estan bien encaminadas, que cosas estan mal o incompletas, y cual debe ser el orden de trabajo para corregirlas sin perder la informacion existente en Supabase.

La regla principal a partir de este punto es esta:

- No se deben perder notas, evaluaciones, estudiantes, docentes ni asignaciones ya registradas.
- No se deben volver a correr scripts destructivos sobre produccion.
- Las correcciones deben hacerse con migraciones seguras y auditables.

## 2. Fuentes revisadas

Se cruzo informacion de tres lugares:

1. Codigo del frontend y la integracion con Supabase.
2. Archivos `.sql` que estan en la raiz del proyecto.
3. Resultados reales de consultas hechas contra Supabase.

Archivos y evidencias usados:

- `src/integrations/types.ts`
- `src/contexts/AuthContext.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/pages/Calificaciones.tsx`
- `alter_schedules.sql`
- `setup_preschool_subjects.sql`
- `fix_grade_records_rls.sql`
- `fix_students_rls.sql`
- `fix_teacher_registration.sql`
- `sync_existing_users.sql`
- `fix_all_rls.sql`
- `reset_subjects.sql`
- `setup_2026_periods.sql`
- `supabase_fixes.sql`
- CSV de inspeccion de columnas, politicas RLS, funciones, trigger, enum y `teacher_grade_assignments`

## 3. Resumen ejecutivo

La plataforma no esta rota en su base principal, pero si esta desalineada.

En palabras simples:

- La base real de Supabase ya evoluciono mas que el tipado local del frontend.
- La seguridad RLS actual mezcla politicas finas buenas con politicas abiertas que las debilitan.
- El flujo de calificaciones todavia tiene un error funcional importante cuando un rector registra notas.
- Hay `.sql` de la raiz que si reflejan el estado actual de la base, pero otros ya son historicos, estan desactualizados o son peligrosos para una base con datos reales.
- El proyecto necesita una fase de estabilizacion antes de seguir agregando funciones.

La buena noticia es esta:

- No hace falta destruir la base ni reiniciar datos.
- La mayor parte del trabajo correcto se puede hacer con migraciones seguras.
- Ya existe una base util para implementar seguridad real por docente usando `teacher_subjects` y `teacher_grade_assignments`.

## 4. Como se encontro la plataforma

### 4.1 Frontend

El frontend esta montado sobre React + Vite + TypeScript y tiene una estructura funcional para:

- autenticacion
- gestion de docentes
- gestion de estudiantes
- materias
- grados
- horarios
- calificaciones
- evaluaciones de preescolar
- generacion de boletines PDF

La aplicacion si construye y las pruebas existentes pasan, pero la base de calidad todavia esta floja:

- `npm run build` pasa
- `npm run test` pasa
- `npm run lint` falla con varios errores de calidad y tipado

Eso significa que la plataforma es operable, pero no esta limpia ni endurecida.

### 4.2 Estado real de la base en Supabase

Con las consultas reales se confirmo lo siguiente:

- `subjects` oficialmente si tiene `parent_id` y `grade_level`
- `schedules` oficialmente si tiene `title`, `start_date`, `end_date`
- `schedules.subject_id` y `schedules.teacher_id` hoy permiten `NULL`
- existe `teacher_grade_assignments`
- existen las funciones `is_user_rector()` e `is_user_profesor()`
- el enum real es `user_role_enum` y hoy incluye `rector`, `profesor`, `parent` y `admin`
- el trigger `on_auth_user_created` existe y usa `handle_new_user()`

Tambien se confirmo que hoy la base tiene soporte para seguridad por docente y por grado, pero esa seguridad esta parcialmente debilitada por politicas abiertas heredadas.

### 4.3 Estado de los `.sql` de la raiz

La conclusion mas honesta es esta:

- Si, todos o la mayoria fueron ejecutados total o parcialmente en algun momento.
- No, no todos siguen siendo la fuente oficial de verdad.
- Algunos explican el estado real actual.
- Otros son historicos.
- Otros no se deben volver a correr porque borran o abren demasiado.

## 5. Hallazgos confirmados

### 5.1 Desfase entre la base real y `src/integrations/types.ts`

Este es uno de los hallazgos mas claros.

La base real usa:

- `user_role_enum`
- `is_user_rector`
- `is_user_profesor`
- `subjects.parent_id`
- `subjects.grade_level`
- `schedules.title`
- `schedules.start_date`
- `schedules.end_date`
- `teacher_grade_assignments`

Pero el archivo local `src/integrations/types.ts` sigue modelando una base mas vieja:

- usa `app_role`
- usa `has_role`
- usa `get_teacher_id_for_user`
- no incluye `teacher_grade_assignments`
- no incluye los campos nuevos confirmados en `subjects` y `schedules`
- solo contempla `rector` y `profesor`, mientras el enum real ya contempla mas roles

Conclusion:

- El frontend esta trabajando con tipos desactualizados frente a la base real.
- Eso aumenta el riesgo de errores silenciosos, casts manuales y permisos mal asumidos.

### 5.2 La seguridad RLS no esta cerrada profesionalmente todavia

Este es el problema mas importante.

La base ya tiene politicas finas correctas en varias partes, por ejemplo:

- `grade_records_insert_professor_own`
- `grade_records_select_professor_own`
- `grade_records_update_professor_own`
- `grade_records_insert_rector`
- `students_select_professor_grades`
- politicas para `teacher_grade_assignments`

Pero al mismo tiempo existen politicas abiertas como estas:

- lectura de estudiantes para autenticados con `USING (true)`
- lectura de calificaciones para autenticados con `USING (true)`
- insercion y actualizacion abiertas en `grade_records`
- varias politicas abiertas en `preescolar_evaluations`

Como las politicas son `PERMISSIVE`, las abiertas le ganan en la practica a la intencion fina.

Conclusion:

- Hoy un profesor puede terminar viendo o tocando mas informacion de la debida.
- La plataforma depende demasiado de filtros del frontend.
- Eso no cumple la meta de seguridad real por servidor.

### 5.3 El flujo de calificaciones del rector esta mal resuelto

El usuario ya definio la regla correcta de negocio:

- un rector si puede registrar una nota
- pero debe seleccionar explicitamente al profesor responsable
- y ese profesor debe corresponder al area y al grado de esa nota

Hoy el problema es que en `src/pages/Calificaciones.tsx` el rector no selecciona de verdad al docente responsable.

En la practica el codigo toma el primer docente disponible:

- para `grade_records`
- para `preescolar_evaluations`

Eso es incorrecto funcionalmente y peligroso para la trazabilidad.

Impacto:

- notas atribuidas al docente equivocado
- dificultad para aplicar RLS de forma coherente
- reportes y auditoria inconsistentes

### 5.4 `teacher_grade_assignments` si es parte del modelo vigente

Esto quedo confirmado con consulta real.

La tabla existe con:

- `id`
- `teacher_id`
- `grade_id`
- `created_at`

Y tiene politicas coherentes:

- rector puede insertar, actualizar y borrar
- profesor solo puede leer sus propias asignaciones

Conclusion:

- esta tabla no es historica
- es una pieza clave del modelo vigente
- el endurecimiento RLS debe construirse alrededor de ella junto con `teacher_subjects`

### 5.5 El trigger de alta de usuarios si esta vigente

La definicion real de `handle_new_user()` y el trigger `on_auth_user_created` coincide con la idea del script `fix_teacher_registration.sql`.

Eso significa que este flujo si parece haber sido aplicado:

- crear `profiles`
- crear `user_roles`
- crear `teachers` cuando el rol es `profesor`

Conclusion:

- el alta automatica de usuarios no es teorica, si hace parte del estado real

### 5.6 `subjects` y `schedules` ya no deben modelarse como antes

El usuario confirmo estas decisiones:

- `subjects` oficialmente debe tener `parent_id` y `grade_level`
- `schedules` debe soportar bloques de rutina si eso es lo mejor para la plataforma

Mi recomendacion tecnica sigue siendo esta:

- mantener `title`
- permitir `subject_id` y `teacher_id` nulos para bloques como descanso, devocional o ludica
- agregar una restriccion de base que evite registros ambiguos

Regla sugerida:

- o el bloque es una rutina con `title`
- o el bloque es una clase con `subject_id` y `teacher_id`
- no debe quedar un bloque vacio o incoherente

### 5.7 Hay scripts destructivos o peligrosos para una base con datos reales

Esto es critico porque ya hay informacion cargada en la base.

Hay scripts en la raiz que no deben ejecutarse nuevamente en produccion sin revision exhaustiva.

Los casos mas delicados:

- `reset_subjects.sql`
  - borra `schedules`
  - borra `grade_records`
  - borra `teacher_subjects`
  - borra `teacher_grade_assignments`
  - luego borra `subjects`

- `setup_2026_periods.sql`
  - borra todos los periodos academicos antes de insertar otros
  - si ya hay notas ligadas a periodos, esto puede romper consistencia o bloquearse por FK

Conclusion:

- estos scripts no deben volver a correrse a ciegas
- deben quedar marcados como historicos, de bootstrap o de uso manual controlado

### 5.8 Los scripts de RLS antiguos si dejaron huella, pero no son el estado ideal final

Hay evidencia fuerte de que `fix_grade_records_rls.sql` y `fix_students_rls.sql` si fueron aplicados o inspiraron politicas reales, porque sus politicas abiertas aparecen reflejadas en la base.

Problema:

- fueron utiles para desbloquear operacion
- pero dejaron la plataforma sobreexpuesta

Conclusion:

- fueron una solucion de continuidad, no una solucion final

### 5.9 `fix_all_rls.sql` hoy es historico y no debe tratarse como fuente oficial

Este script mezcla cosas de dos mundos:

- tablas legacy de examenes: `usuarios`, `examenes`, `simulacros`, etc.
- helpers viejos de auth: `app_role`, `has_role`, `get_teacher_id_for_user`

Eso ya no coincide con la base real que hoy usa:

- `user_role_enum`
- `is_user_rector`
- `is_user_profesor`

Conclusion:

- `fix_all_rls.sql` es historico o de una etapa anterior
- no debe seguir guiando las decisiones del sistema actual

### 5.10 Las tablas legacy de examenes son basura historica

Esto ya quedo definido por negocio.

No hacen parte de la plataforma vigente.

Por tanto:

- no deben influir en el diseno actual
- no deben mezclarse con el RLS del sistema academico principal
- los scripts que las mencionan deben archivarse como legacy

### 5.11 La app depende demasiado del frontend para ocultar acceso

En `MainLayout` se protege autenticacion, pero no se hace una defensa fuerte por rol a nivel de rutas.

Ademas, varias vistas y menus se comportan segun el rol desde el frontend.

Eso no es un problema grave si el RLS esta perfecto, pero hoy el RLS no esta perfecto.

Conclusion:

- hay que tener seguridad real en la base
- y ademas defensa en profundidad en frontend y UX

### 5.12 Hay deuda tecnica adicional

Tambien aparecieron problemas secundarios:

- `npm run lint` falla
- hay tipado flojo y varios `any`
- hay texto con problemas de encoding en algunos archivos
- el proyecto tiene un documento README muy generico

Nada de esto es lo primero que se debe arreglar, pero si hace mas dificil mantener el sistema.

## 6. Clasificacion de los `.sql` de la raiz

### 6.1 Scripts que si reflejan el estado real o parte de el

- `alter_schedules.sql`
  - reflejado en la base real por `title` y por los `NULL` permitidos en `subject_id` y `teacher_id`

- `fix_teacher_registration.sql`
  - reflejado en la base real por la funcion `handle_new_user()` y el trigger `on_auth_user_created`

- `fix_grade_records_rls.sql`
  - dejo huella clara en la base real por sus politicas abiertas

- `fix_students_rls.sql`
  - dejo huella clara en la base real por su politica abierta de lectura de estudiantes

- `setup_preschool_subjects.sql`
  - es consistente con la existencia de `parent_id` y con el modelo jerarquico de materias

- `sync_existing_users.sql`
  - es compatible con el modelo real actual y tiene sentido como backfill historico

### 6.2 Scripts que parecen de una etapa anterior o ya superada

- `fix_all_rls.sql`
  - mezcla seguridad del sistema academico con tablas legacy de examenes
  - usa helpers y enums viejos que ya no son la verdad actual

- `supabase_fixes.sql`
  - puede tener partes utiles, pero no alcanza para tratarlo como fuente principal del estado actual

- `supa_preescolar_evaluations.sql`
  - el archivo esta vacio y no debe asumirse como migracion valida

### 6.3 Scripts que no deben correrse de nuevo con la base actual

- `reset_subjects.sql`
- `setup_2026_periods.sql`

Ambos deben tratarse como scripts de bootstrap o uso excepcional, nunca como migraciones normales de produccion.

## 7. Decisiones de negocio ya confirmadas

Estas decisiones ya quedaron resueltas y deben respetarse en las proximas migraciones:

- `subjects` oficialmente debe tener `parent_id` y `grade_level`
- el rector debe seleccionar explicitamente el profesor responsable cuando registre notas
- ese profesor debe estar asignado al area y al grado correspondiente
- se quiere seguridad real por servidor con RLS
- las tablas de examenes y simulacros son legacy y no forman parte de la plataforma
- no se deben perder las notas ya cargadas ni la informacion existente

## 8. Que esta mal y se tiene que corregir

Ordenado por prioridad real.

### Prioridad alta

1. RLS demasiado abierto en `students`, `grade_records` y `preescolar_evaluations`.
2. Tipos locales desactualizados frente a la base real.
3. Rector registrando notas sin seleccionar correctamente al docente responsable.
4. Riesgo de volver a correr scripts destructivos sobre una base con datos.

### Prioridad media

1. Falta de restriccion formal en `schedules` para diferenciar clase vs rutina.
2. Falta de limpieza y archivo de SQL legacy.
3. Defensa de rol insuficiente en el frontend.
4. Posibles registros viejos con `teacher_id` nulo en notas o preescolar.

### Prioridad baja pero importante

1. Lint roto y deuda tecnica.
2. README generico y sin documentacion real de arquitectura.
3. Problemas de encoding en algunos textos.

## 9. Plan recomendado de correccion sin perder datos

### Fase 0. Congelacion y respaldo

Antes de tocar schema o RLS:

- exportar backup de la base
- exportar al menos `grade_records`, `preescolar_evaluations`, `students`, `teachers`, `teacher_subjects`, `teacher_grade_assignments`, `subjects`, `academic_periods`
- revisar cuantos registros tienen `teacher_id` nulo en notas o preescolar
- revisar si hay asignaciones incompletas entre docentes, grados y materias

Objetivo:

- tener retorno seguro antes de cualquier endurecimiento

### Fase 1. Alinear el contrato real de Supabase

Crear migraciones no destructivas para:

- regenerar `src/integrations/types.ts` contra la base real
- incorporar `teacher_grade_assignments`
- reflejar `subjects.parent_id`
- reflejar `subjects.grade_level`
- reflejar `schedules.title`
- reflejar `schedules.start_date`
- reflejar `schedules.end_date`
- cambiar enums y funciones locales viejas por las reales

Objetivo:

- que el frontend deje de trabajar contra un schema imaginario

### Fase 2. Endurecer RLS de verdad

Corregir politicas de:

- `students`
- `grade_records`
- `preescolar_evaluations`

Regla objetivo:

- rector puede ver y gestionar todo
- profesor solo puede ver estudiantes de sus grados asignados
- profesor solo puede ver e insertar notas de materias que le pertenecen
- profesor solo puede tocar notas donde el `teacher_id` realmente corresponde a el
- rector puede registrar, pero solo seleccionando un docente valido para ese grado y esa materia

Importante:

- primero se auditan datos
- despues se eliminan politicas abiertas
- luego se dejan solo politicas finas

### Fase 3. Corregir el flujo funcional de calificaciones

Cambios esperados:

- cuando el rector cree una nota, debe elegir el profesor responsable
- ese selector debe filtrar por materia y grado compatibles
- el insert no debe tomar nunca `teachers?.[0]?.id`
- si hay registros viejos con `teacher_id` nulo, se deben completar antes de endurecer restricciones

Idealmente:

- `grade_records.teacher_id` debe terminar siendo obligatorio despues del backfill
- `preescolar_evaluations.teacher_id` debe evaluarse igual

### Fase 4. Formalizar horarios de rutina

Mantener la flexibilidad de `schedules`, pero con control de integridad.

Se recomienda agregar un `CHECK` equivalente a esta logica:

- clase academica: `subject_id` y `teacher_id` presentes
- bloque de rutina: `title` presente

Y ademas:

- no permitir registros vacios
- no permitir combinaciones ambiguas que luego compliquen reportes

### Fase 5. Limpiar y reorganizar SQL raiz

Recomendacion:

- mover scripts historicos a una carpeta `sql/legacy/`
- mover scripts de solo bootstrap a `sql/manual/`
- dejar solo migraciones vigentes y seguras como referencia operativa
- documentar expresamente cuales scripts estan prohibidos en produccion con datos

### Fase 6. Endurecimiento de aplicacion

Despues de estabilizar base y RLS:

- mejorar guardas por rol en frontend
- corregir `lint`
- eliminar `any` criticos
- arreglar encoding
- documentar arquitectura y flujo de roles

## 10. Orden concreto sugerido para ejecutar el trabajo

Este seria el orden correcto para no romper nada:

1. Backup y auditoria de datos reales.
2. Regenerar tipos de Supabase y alinear frontend.
3. Corregir flujo de seleccion de docente en calificaciones.
4. Auditar y completar `teacher_id` faltantes.
5. Endurecer RLS quitando politicas abiertas.
6. Agregar restriccion formal en `schedules`.
7. Archivar SQL legacy y destructivo.
8. Limpiar deuda tecnica del frontend.

## 11. Estado final esperado

Cuando esto quede bien, la plataforma debe cumplir estas reglas:

- el profesor solo ve sus grados, sus materias y sus notas por RLS real
- el rector puede operar todo, pero seleccionando explicitamente al docente responsable cuando corresponda
- las notas ya registradas permanecen intactas
- el frontend y Supabase comparten el mismo contrato real
- los scripts de la raiz dejan de ser una mezcla confusa y pasan a estar ordenados
- lo legacy de examenes deja de contaminar el sistema academico activo

## 12. Conclusiones finales

La plataforma ya tiene una base util y no esta para rehacer desde cero.

Lo que necesita no es una reconstruccion total, sino una estabilizacion seria en cuatro frentes:

- contrato real de datos
- seguridad RLS
- flujo correcto de calificaciones
- limpieza de legado

La conclusion mas importante es esta:

- si, la mayoria de los `.sql` de la raiz dejaron huella en Supabase
- pero varios ya no deben tratarse como verdad vigente
- y algunos son peligrosos si se corren hoy con datos reales

El siguiente paso correcto es convertir este diagnostico en una secuencia de migraciones seguras y cambios de frontend, siempre preservando los datos ya cargados.
