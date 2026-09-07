# Reglas de Entrega de Reportes y Análisis

- **Formato de Archivo e Informes:** Cada vez que el usuario solicite un análisis, auditoría o reporte sobre módulos o características de la plataforma, la respuesta debe ser entregada en un documento Markdown estructurado (Artifact `.md`).
- **Gráficos e Diagramas Visuales:** Incluir siempre diagramas conceptuales de flujo mediante sintaxis Mermaid (`mermaid`), tablas comparativas estructuradas y bloques de alerta estilo GitHub (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`).
- **Nivel de Lenguaje:** El contenido debe presentarse de manera detallada, ejecutiva y fácil de entender, evitando tecnicismos innecesarios para facilitar la toma de decisiones administrativas.

# Reglas de Modularidad y Prevención de Monolitos

- **Límite de Tamaño por Archivo:** Ningún componente o archivo de utilidades nuevo debe superar las **300 líneas de código**. Si un componente supera este límite, debe descomponerse en subcomponentes o submódulos especializados dentro de una carpeta dedicada (ej. `src/features/<modulo>/components/` o `src/utils/<modulo>/`).
- **Refactorización con Fachada Retrocompatible (Zero Breaking Changes):** Al modularizar archivos o módulos monolíticos preexistentes, siempre se debe conservar el archivo original como punto de re-exportación (Barrel / Facade) para garantizar que las importaciones existentes no se rompan.
- **Separación de Responsabilidades (SRP):** Mantener separados en archivos independientes:
  1. Tipos e interfaces (`types.ts`)
  2. Funciones de cálculo/formateo puras (`helpers.ts` o `utils.ts`)
  3. Lógica de acceso a datos / mutaciones (`hooks/`)
  4. Vistas y subcomponentes visuales de presentación (`components/`)

# Reglas de Seguridad Informática y Tríada CIA (Inviolable)

- **Cero Credenciales en Frontend:** Jamás exponer claves maestras (`service_role`), secretos de API, credenciales maestras o tokens privilegiados en el cliente web/Vite. Todas las operaciones de creación, actualización o mutación administrativa de usuarios deben ocurrir exclusivamente en Supabase Edge Functions con autenticación serverless y verificación estricta de sesión JWT.
- **Confidencialidad:** 
  - Aislamiento multi-inquilino obligatorio (`institution_id` inmutable extraído del JWT en servidor, nunca de los parámetros del frontend).
  - Manejo seguro de credenciales temporales: contraseñas provisionales autogeneradas, enmascaradas, con opción de copia segura y forzado de cambio de contraseña (`must_change_password`) en el primer inicio de sesión.
- **Integridad:**
  - Control de Acceso Basado en Roles (RBAC): Validación estricta en servidor para impedir escalamiento de privilegios (un rector solo puede gestionar roles de menor rango: `profesor`, `contable`).
  - Idempotencia e Integridad Relacional: Sincronización obligatoria entre `auth.users` y la tabla académica `teachers` para evitar duplicidad de registros o huérfanos relacionales cuando se vincula un usuario a una ficha docente preexistente.
- **Disponibilidad y Resiliencia:**
  - Prevención de ataques por saturación o abuso mediante validaciones de cuota por institución y control de errores resiliente sin exponer trazas internas de la base de datos.
  - Revocación y Desactivación Inmediata: Capacidad de inhabilitar cuentas docentes conservando el histórico académico (notas, asistencias) pero bloqueando de inmediato el inicio de sesión.

