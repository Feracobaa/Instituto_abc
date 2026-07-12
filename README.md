# Plataforma Instituto ABC

Aplicacion academica para la gestion diaria del Instituto Pedagogico ABC.

## Modulos vivos

- autenticacion por rol
- dashboard para rector y profesor
- profesores
- estudiantes
- grados
- materias
- horarios
- calificaciones
- evaluaciones de preescolar
- generacion de PDF

## Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix
- TanStack Query
- Supabase
- Vitest

## Documentos clave del proyecto

Lee estos archivos antes de tocar codigo o base de datos:

- `CODEX_HANDOFF_2026-04-08.md`
- `DIAGNOSTICO_PLATAFORMA_Y_PLAN.md`
- `AUDITORIA_ESTRUCTURAL_PROYECTO_2026-04-08.md`
- `PLAN_MAESTRO_DESARROLLO_2026-04-08.md`
- `sql/README.md`

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalacion local

```bash
npm install
```

Crea un archivo `.env.local` con estas variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key
VITE_SUPABASE_PROJECT_ID=tu_project_id
```

Tambien puedes partir de `.env.example`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run preview
```

## Estructura importante

- `src/pages/`: modulos principales de la plataforma
- `src/hooks/`: acceso a datos y hooks compartidos
- `src/contexts/`: auth y estado global de sesion
- `src/components/`: componentes de negocio, layout y UI
- `src/utils/pdfGenerator.ts`: generacion de PDFs de primaria, horarios y plantillas
- `sql/migrations/`: migraciones activas y seguras
- `sql/manual/`: scripts manuales o historicos utiles
- `sql/legacy/`: scripts viejos o peligrosos para produccion

## Regla de trabajo para SQL

- No crear scripts SQL en la raiz del repo.
- Todo cambio nuevo de schema, RLS o integridad debe ir en `sql/migrations/`.
- Antes de tocar seguridad o asignaciones de docentes, correr la auditoria:

```text
sql/migrations/20260408_00_audit_school_integrity.sql
```

## Estado actual

Estado validado localmente:

- `npm run lint`: OK
- `npm run build`: OK
- `npm run test`: OK

Estado funcional ya estabilizado:

- RLS endurecido en Supabase
- asignaciones de docentes sincronizadas con horarios
- flujo de notas del rector corregido
- soporte real para bloques de rutina en horarios

## Despliegue

El proyecto esta preparado como SPA y usa `vercel.json` para redirigir todas las rutas a `index.html`.

Flujo recomendado:

1. validar `lint`, `build` y `test`
2. revisar cambios de `sql/migrations` si aplica
3. desplegar frontend
4. ejecutar migraciones manualmente en Supabase cuando el cambio lo requiera

## Notas operativas

- `consultas/` es carpeta local del usuario y no debe ir a git
- no reabrir politicas RLS con reglas permisivas por comodidad
- no correr scripts de `sql/legacy/` sobre una base con datos reales
