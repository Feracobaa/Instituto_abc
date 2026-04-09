# Auditoria estructural del proyecto

Fecha: 2026-04-08

## Alcance

- Se revisaron 119 archivos del repo, excluyendo `node_modules/`, `dist/` y `consultas/`.
- Se tomaron como referencia los documentos guia existentes, el estado actual del frontend, la carpeta `sql/` y la validacion local.
- No se inspecciono el contenido de `.env.local` por contener secretos.

## Estado actual comprobado

- `npm run lint`: OK.
- `npm run build`: OK.
- `npm run test`: OK.
- El frontend esta operativo y la base de datos ya fue estabilizada en Supabase segun los documentos guia y el trabajo previo.

## Lectura ejecutiva

- El proyecto esta en un estado funcionalmente bueno y mucho mas estable que al inicio.
- La zona mas madura hoy es la integracion con Supabase y el flujo academico principal.
- La deuda tecnica ya no esta en seguridad urgente sino en mantenimiento, limpieza de residuos y arquitectura.
- Hay varios archivos guia muy valiosos que hoy sirven como memoria operativa del proyecto.
- Tambien quedan algunos archivos muertos, placeholders o duplicados que seria sano retirar en una siguiente fase.

## Hallazgos principales

1. `CODEX_HANDOFF_2026-04-08.md` y `DIAGNOSTICO_PLATAFORMA_Y_PLAN.md` son documentos vigentes y muy utiles. Deben preservarse.
2. `sql/migrations/` ya es la fuente operativa principal para la parte critica de Supabase.
3. `README.md` sigue siendo casi totalmente generico de Lovable y no describe la plataforma real.
4. `package.json` todavia declara `html2pdf.js`, pero el codigo ya no lo usa. Al mismo tiempo `PreescolarReport.tsx` importa `html2canvas` de forma dinamica sin tenerlo declarado como dependencia directa. Hoy funciona por dependencia transitiva, pero es fragil.
5. `.gitignore` ignora `*.sql`. Eso obliga a forzar cualquier migracion nueva o a depender de que ya este trackeada. Es una regla riesgosa para un proyecto que ahora depende fuertemente de SQL versionado.
6. `index.html` referencia `/favicon.ico`, pero `public/favicon.ico` no existe.
7. `src/App.css` parece residuo de Vite; no esta importado.
8. `src/integrations/client.ts` duplica al cliente real de Supabase en `src/integrations/supabase/client.ts` y no se usa.
9. `src/components/NavLink.tsx` no esta siendo usado.
10. `src/components/reports/PrimaryReport.tsx` y `src/components/reports/ReportSystemContainer.tsx` son placeholders/demo, no parte real del flujo actual.
11. `src/test/example.test.ts` es solo una prueba vacia de humo; el proyecto casi no tiene cobertura real.
12. Siguen quedando `console.log` de depuracion en `src/hooks/useSchoolData.ts` y `src/utils/pdfGenerator.ts`.
13. Hay senales de encoding inconsistente o mojibake en varios textos y documentos.

## Inventario por archivo

## Raiz del proyecto

- `CODEX_HANDOFF_2026-04-08.md`: guia vigente para otro Codex; documenta RLS endurecido, migraciones aplicadas y estado del frontend.
- `DIAGNOSTICO_PLATAFORMA_Y_PLAN.md`: diagnostico amplio del proyecto y del historial de SQL; sigue siendo referencia valida.
- `README.md`: plantilla generica de Lovable; desactualizada respecto al producto real.
- `package.json`: manifiesto principal del frontend; sano en scripts, pero con deuda en dependencias PDF.
- `package-lock.json`: lockfile vigente; refleja el estado real instalado del proyecto.
- `tsconfig.json`: base de TypeScript; permite configuracion relajada y alias `@/*`.
- `tsconfig.app.json`: configuracion del frontend; hoy existe y repara el problema que rompia el proyecto completo en el IDE.
- `tsconfig.node.json`: configuracion de Vite/config TS del entorno Node.
- `vite.config.ts`: Vite + React SWC + alias + `lovable-tagger` en desarrollo.
- `vitest.config.ts`: entorno de pruebas con `jsdom`, alias y setup.
- `eslint.config.js`: configuracion de ESLint actualizada para que `lint` pase.
- `tailwind.config.ts`: configuracion visual madura; define tokens por rol y tema.
- `postcss.config.js`: PostCSS minimo con Tailwind y Autoprefixer.
- `components.json`: configuracion de shadcn/ui; consistente con la estructura `src/components/ui`.
- `index.html`: shell HTML del SPA; funcional, pero referencia un favicon inexistente.
- `vercel.json`: rewrite correcto para SPA.
- `.env.example`: ejemplo correcto para Supabase en frontend.
- `.gitignore`: util, pero la regla global `*.sql` es peligrosa para futuras migraciones.

## Archivos locales no versionados o artefactos

- `.env.local`: archivo local con secretos; no se analizo por seguridad.
- `tsconfig.app.tsbuildinfo`: artefacto local de TypeScript; no debe tratarse como fuente.
- `tsconfig.node.tsbuildinfo`: artefacto local de TypeScript; no debe tratarse como fuente.
- `tmp_bp/`: carpeta temporal local; hoy vacia.
- `tmp_pri/`: carpeta temporal local; hoy vacia.
- `dist/`: build local generado; no forma parte del codigo fuente.
- `node_modules/`: dependencias instaladas.
- `consultas/`: exportes CSV del usuario; insumo de auditoria, no deben ir a git.

## Publicos y assets

- `public/robots.txt`: robots abierto para todos; correcto para un SPA basico.
- `public/logo-iabc.jpg`: logo institucional principal, usado en sidebar, auth y PDFs.
- `public/icons/dim_dimensinsocioafectivaespiritualytica.png`: icono de dimension de preescolar.
- `public/icons/dim_dimensincorporal.png`: icono de dimension corporal.
- `public/icons/dim_dimensincognitiva.png`: icono de dimension cognitiva.
- `public/icons/dim_dimensincomunicativa.png`: icono de dimension comunicativa.
- `public/icons/dim_dimensinesttica.png`: icono de dimension estetica.
- `public/icons/dim_informtica.png`: icono de Informatica.
- `public/icons/dim_ingls.png`: icono de Ingles.

## SQL y documentacion asociada

- `sql/README.md`: guia operativa buena; explica `migrations`, `manual` y `legacy`.

### SQL activos en `sql/migrations`

- `sql/migrations/20260408_00_audit_school_integrity.sql`: auditoria preventiva; archivo vivo y clave.
- `sql/migrations/20260408_01_harden_school_rls.sql`: endurece RLS real y hace backfill defensivo antes de validar; archivo vivo y critico.
- `sql/migrations/20260408_02_schedule_block_constraint.sql`: agrega la constraint formal para bloques de horario; archivo vivo y correcto.
- `sql/migrations/20260408_03_subjects_grade_level_default.sql`: elimina el default engañoso de `subjects.grade_level`; archivo pequeno pero importante.
- `sql/migrations/20260408_04_backfill_preescolar_teacher_data.sql`: backfill seguro para preescolar; historico reciente, todavia util si se repite el escenario.
- `sql/migrations/20260408_05_backfill_grade_record_assignments.sql`: backfill seguro para notas historicas; historico reciente, todavia util si se repite el escenario.
- `sql/migrations/20260408_06_internal_safety_snapshots.sql`: red de seguridad interna en la BD; util como respaldo minimo.
- `sql/migrations/20260408_07_sync_teacher_assignments_from_schedules.sql`: solucion critica del incidente donde profesores dejaron de ver alumnos; archivo vivo y muy importante.

### SQL manuales en `sql/manual`

- `sql/manual/alter_schedules.sql`: refleja la historia real de `schedules`; manual, no flujo principal.
- `sql/manual/fix_teacher_registration.sql`: coherente con el trigger real de Supabase; manual historico valioso.
- `sql/manual/setup_preschool_subjects.sql`: script de carga de submaterias de preescolar; manual util, no migracion principal.
- `sql/manual/sync_existing_users.sql`: backfill historico de usuarios/roles/docentes; util solo en casos puntuales.

### SQL legacy en `sql/legacy`

- `sql/legacy/fix_all_rls.sql`: historico y desalineado con la plataforma actual; mezcla examenes legacy con auth viejo.
- `sql/legacy/fix_grade_records_rls.sql`: historico; resolvia operacion abriendo demasiado RLS.
- `sql/legacy/fix_students_rls.sql`: historico; dependia de frontend para seguridad.
- `sql/legacy/reset_subjects.sql`: peligroso y destructivo; no debe correrse con datos reales.
- `sql/legacy/setup_2026_periods.sql`: de bootstrap/historico; borra periodos antes de insertar.
- `sql/legacy/supabase_fixes.sql`: script de remediacion parcial; no es la fuente actual de verdad.
- `sql/legacy/supa_preescolar_evaluations.sql`: archivo vacio; no aporta nada.

## Frontend raiz en `src/`

- `src/main.tsx`: entrypoint minimo y sano del SPA.
- `src/App.tsx`: orquestador principal; hoy tiene lazy loading por ruta y guardas reales por rol.
- `src/App.css`: residuo de Vite; no se usa.
- `src/index.css`: hoja global importante; define tema, tokens, gradientes, animaciones y look actual.
- `src/vite-env.d.ts`: declaracion minima para Vite; normal.

## Contexto y auth

- `src/contexts/AuthContext.tsx`: contexto central de sesion, rol y `teacherId`; vivo y critico.
- `src/components/auth/ProtectedRoute.tsx`: defensa de rutas por autenticacion y rol; viva y correcta.

## Integraciones

- `src/integrations/types.ts`: contrato de Supabase ya alineado con la base real; archivo muy importante.
- `src/integrations/supabase/client.ts`: cliente real de Supabase usado por la app.
- `src/integrations/client.ts`: duplicado no usado del cliente de Supabase; candidato claro a eliminar.

## Hooks y utilidades base

- `src/hooks/useSchoolData.ts`: capa principal de queries y mutaciones de negocio; viva y central, pero con `console.log` de depuracion.
- `src/hooks/use-toast.ts`: implementacion real del sistema de toast; viva.
- `src/hooks/use-mobile.tsx`: hook utilitario usado por el sidebar; vivo.
- `src/lib/utils.ts`: helper `cn`; infraestructura basica y sana.
- `src/utils/constants.ts`: dimensiones y fortalezas por defecto de preescolar; archivo vivo y de negocio.
- `src/utils/pdfGenerator.ts`: motor grande de PDFs de primaria, horarios, asistencia y plantillas; vivo, util, pero con logs de depuracion y bastante complejidad.

## Paginas en `src/pages`

- `src/pages/Auth.tsx`: pantalla de login/registro; visualmente cuidada y funcional, pero aun mezcla algo de copy con rastros de encoding irregular.
- `src/pages/Index.tsx`: dashboard principal; integra estadisticas por rector/profesor y resume bien la operacion.
- `src/pages/Profesores.tsx`: CRUD visual de docentes; vivo y ya soporta el dialogo con materias y grados.
- `src/pages/Estudiantes.tsx`: CRUD visual de estudiantes; vivo y ya adaptado al schema real.
- `src/pages/Grados.tsx`: vista analitica de grados; viva y visualmente fuerte.
- `src/pages/Materias.tsx`: modulo de materias con resumen, promedios y descargas PDF auxiliares; vivo.
- `src/pages/Horarios.tsx`: modulo de horarios por grado; vivo y ya compatible con bloques de rutina.
- `src/pages/Calificaciones.tsx`: archivo mas complejo del dominio; vivo, muy importante, ya corregido para seleccion explicita de docente y doble flujo primaria/preescolar.
- `src/pages/NotFound.tsx`: 404 funcional, pero generico y menos cuidado que el resto de la UX.

## Componentes custom de layout y navegacion

- `src/components/layout/MainLayout.tsx`: shell autenticado con header, sidebar y periodo activo; vivo.
- `src/components/layout/AppSidebar.tsx`: navegacion lateral por rol, tema y salida de sesion; viva y muy visible.
- `src/components/NavLink.tsx`: compat wrapper no usado; candidato a eliminar.

## Componentes de dashboard

- `src/components/dashboard/QuickActionsBar.tsx`: accesos rapidos por rol; vivo y coherente.
- `src/components/dashboard/StatCard.tsx`: tarjeta estadistica reutilizable; viva y bien resuelta.

## Formularios y dialogos de negocio

- `src/components/teachers/TeacherFormDialog.tsx`: dialogo de profesor; vivo y ahora importante para grados y materias.
- `src/components/students/StudentFormDialog.tsx`: dialogo de estudiante; vivo y sencillo.
- `src/components/subjects/SubjectFormDialog.tsx`: dialogo de materia; vivo y ya captura `parent_id` y `grade_level`.
- `src/components/schedules/ScheduleFormDialog.tsx`: dialogo de horarios; vivo, soporta rutina/clase y repeticion semanal.

## Reportes

- `src/components/reports/PreescolarReport.tsx`: renderer HTML y exportador PDF propio para preescolar; vivo y ya sin `html2pdf`.
- `src/components/reports/PreescolarReport.css`: estilos especializados del boletin de preescolar; vivo.
- `src/components/reports/PrimaryReport.tsx`: placeholder/demo de boletin de primaria; no es parte del flujo real.
- `src/components/reports/ReportSystemContainer.tsx`: contenedor demo para elegir tipo de boletin; parece no usado y contiene mock data.

## Infraestructura UI en `src/components/ui`

- `src/components/ui/accordion.tsx`: wrapper shadcn/Radix de accordion; infraestructura reusable.
- `src/components/ui/alert.tsx`: componente de alertas visuales; infraestructura reusable.
- `src/components/ui/alert-dialog.tsx`: wrapper de dialogos de confirmacion; infraestructura reusable.
- `src/components/ui/aspect-ratio.tsx`: wrapper pequeno de aspect ratio; infraestructura reusable.
- `src/components/ui/avatar.tsx`: avatar basico; infraestructura reusable.
- `src/components/ui/badge.tsx`: badge reutilizable; infraestructura reusable.
- `src/components/ui/breadcrumb.tsx`: breadcrumb reusable; parece disponible pero no central hoy.
- `src/components/ui/button.tsx`: boton base; infraestructura critica.
- `src/components/ui/calendar.tsx`: calendario reusable; infraestructura base.
- `src/components/ui/card.tsx`: card base; infraestructura reusable.
- `src/components/ui/carousel.tsx`: wrapper de carousel; disponible pero no parece clave en el producto actual.
- `src/components/ui/chart.tsx`: helpers para charts; disponible pero hoy poco visible en la app.
- `src/components/ui/checkbox.tsx`: checkbox base; usado en formularios.
- `src/components/ui/collapsible.tsx`: wrapper simple; infraestructura reusable.
- `src/components/ui/command.tsx`: wrapper de command palette; infraestructura reusable.
- `src/components/ui/context-menu.tsx`: wrapper de context menu; infraestructura reusable.
- `src/components/ui/dialog.tsx`: dialog base; infraestructura critica.
- `src/components/ui/drawer.tsx`: drawer reusable; disponible.
- `src/components/ui/dropdown-menu.tsx`: dropdown reusable; usado en materias.
- `src/components/ui/EmptyState.tsx`: empty state custom del producto; vivo y util.
- `src/components/ui/form.tsx`: helpers de form con React Hook Form; infraestructura reusable.
- `src/components/ui/hover-card.tsx`: hover card reusable.
- `src/components/ui/input.tsx`: input base; infraestructura critica.
- `src/components/ui/input-otp.tsx`: input OTP; hoy no parece usarse.
- `src/components/ui/label.tsx`: label base; infraestructura critica.
- `src/components/ui/menubar.tsx`: menubar reusable.
- `src/components/ui/navigation-menu.tsx`: navigation menu reusable.
- `src/components/ui/pagination.tsx`: paginacion reusable; hoy no se nota en la app.
- `src/components/ui/popover.tsx`: popover reusable.
- `src/components/ui/progress.tsx`: progress bar reusable.
- `src/components/ui/radio-group.tsx`: radio group reusable.
- `src/components/ui/resizable.tsx`: resizable panels reusable.
- `src/components/ui/RoleBadge.tsx`: badge custom por rol; vivo.
- `src/components/ui/scroll-area.tsx`: scroll area reusable.
- `src/components/ui/select.tsx`: select base; infraestructura critica.
- `src/components/ui/separator.tsx`: separador reusable.
- `src/components/ui/sheet.tsx`: sheet reusable.
- `src/components/ui/sidebar.tsx`: infraestructura grande y critica del sidebar; una de las piezas UI mas importantes.
- `src/components/ui/skeleton.tsx`: skeleton loading reusable.
- `src/components/ui/slider.tsx`: slider reusable.
- `src/components/ui/sonner.tsx`: puente al sistema Sonner; vivo.
- `src/components/ui/switch.tsx`: switch base; usado en horarios.
- `src/components/ui/table.tsx`: tabla base; usada fuertemente en calificaciones.
- `src/components/ui/tabs.tsx`: tabs base; usada en auth.
- `src/components/ui/textarea.tsx`: textarea base; usada mucho.
- `src/components/ui/time-picker.tsx`: componente custom relevante para horarios; vivo.
- `src/components/ui/toast.tsx`: primitives de toast; vivas.
- `src/components/ui/toaster.tsx`: host visual del toast; vivo.
- `src/components/ui/toggle.tsx`: toggle reusable.
- `src/components/ui/toggle-group.tsx`: grupo de toggles reusable.
- `src/components/ui/tooltip.tsx`: tooltip provider y primitives; vivo.
- `src/components/ui/use-toast.ts`: re-export compat de `useToast`; parece innecesario y no se usa.

## Pruebas

- `src/test/setup.ts`: setup valido de Vitest/JSDOM, especialmente para `matchMedia`.
- `src/test/example.test.ts`: prueba trivial de ejemplo; aporta muy poca cobertura real.

## Observaciones de arquitectura

- La arquitectura real es frontend React + Supabase, sin backend propio.
- `useSchoolData.ts` concentra demasiada logica de acceso a datos; aun funciona, pero es un futuro cuello de mantenimiento.
- `Calificaciones.tsx` sigue siendo el archivo funcional mas sensible por tamano y responsabilidad.
- El sistema PDF esta mejor que antes, pero `pdfGenerator.ts` sigue siendo un modulo de alta complejidad.
- La carpeta `components/ui` esta sana en general, pero mezcla wrappers standard con algunos componentes muy propios (`sidebar`, `time-picker`, `EmptyState`, `RoleBadge`).

## Riesgos y oportunidades inmediatas

1. Corregir dependencias PDF:
   dejar `html2canvas` como dependencia directa y retirar `html2pdf.js` si ya no se usara.
2. Limpiar residuos:
   `src/App.css`, `src/integrations/client.ts`, `src/components/NavLink.tsx`, `src/components/ui/use-toast.ts`, `PrimaryReport.tsx`, `ReportSystemContainer.tsx`.
3. Actualizar documentacion:
   reemplazar `README.md` por uno real del proyecto.
4. Fortalecer pruebas:
   hoy solo existe un test de ejemplo.
5. Limpiar debug:
   eliminar `console.log` de hooks y PDF.
6. Revisar `.gitignore`:
   la regla `*.sql` ya no calza con la realidad del proyecto.
7. Corregir assets pequenos:
   agregar `public/favicon.ico` o quitar la referencia.
8. Revisar encoding:
   homogenizar archivos para evitar textos corruptos.

## Conclusiones

- El proyecto ya no esta en modo rescate; esta en modo estabilizacion y profesionalizacion.
- La parte academica principal esta bien encaminada.
- Los documentos guia existentes son de alto valor y deben mantenerse.
- El siguiente salto de calidad no depende de rehacer la plataforma, sino de limpiar residuos, reducir complejidad y documentar mejor.
