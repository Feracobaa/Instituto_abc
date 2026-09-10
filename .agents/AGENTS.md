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

# Reglas de Habeas Data y Tratamiento de Datos Sensibles de Menores (Inviolable)

- **Clasificación Previa de Fundamento Legal y Consentimiento Granular:**
  - Todo tratamiento de datos de menores de edad debe clasificar obligatoriamente la categoría del dato, la finalidad específica y su base legal (`legal_basis`: cumplimiento de obligación legal/ministerial, ejecución de contrato educativo, interés vital/superior o consentimiento del representante legal).
  - Cuando el tratamiento exija autorización del titular o de su representante legal (especialmente para datos sensibles como biometría o salud no amparada por urgencia), este consentimiento debe registrarse de manera previa, expresa e informada en `student_consents`.
  - Jamás modelar el consentimiento como una simple bandera booleana (`true/false`). Cada registro debe contener obligatoriamente: `purpose` (catálogo estructurado), `status` (`GRANTED`, `REVOKED`, `EXPIRED`, `REQUIRES_RECONFIRMATION`, `SUPERSEDED`), `legal_basis`, `policy_version`, `terms_version`, `consent_text_hash` (SHA-256 del texto exacto presentado), `accepted_at`, `revoked_at`, `ip_address`, `user_agent` y `source`.

- **Reconfirmación Selectiva ante Cambios de Política (Cero Rupturas Innecesarias):**
  - Ante modificaciones de la Política de Privacidad o términos institucionales, el sistema NO debe invalidar masivamente todos los consentimientos.
  - La institución debe determinar las finalidades materialmente afectadas; únicamente los consentimientos vinculados a dichas finalidades pasarán a estado `REQUIRES_RECONFIRMATION` para solicitar su ratificación al acudiente, manteniendo vigentes los tratamientos no alterados y el histórico probatorio.

- **Cadena de Verificación Zero-Trust previa a Emisión de Documentos:**
  - Una Signed URL con tiempo de caducidad es una política de expiración, no una garantía de seguridad en sí misma.
  - Antes de emitir cualquier enlace de acceso a un documento sensible de un estudiante, el sistema debe validar estrictamente la cadena de 7 compuertas:
    1. JWT válido y activo en servidor.
    2. Usuario activo en la plataforma.
    3. Pertenencia verificada a la institución (`institution_id` inmutable extraído del token).
    4. Rol RBAC autorizado para la categoría documental específica.
    5. Vínculo formal verificado con el estudiante (acudiente registrado o funcionario asignado).
    6. Fundamento legal y/o consentimiento activo y vigente (`GRANTED`) para la finalidad del documento en `student_consents`.
    7. Emisión de Signed URL con TTL mínimo (máximo 5 a 10 minutos) y registro inmediato en auditoría.

- **Registro de Auditoría Protegido contra Modificación por Usuarios Operativos:**
  - Todo intento de acceso, visualización, descarga, generación de enlace o modificación de documentos sensibles debe registrarse en `sensitive_access_logs`, documentando tanto eventos exitosos (`success = true`) como intentos denegados (`success = false`, `denied_reason`).
  - La tabla de auditoría debe estar protegida físicamente: prohibir sentencias `UPDATE`, `DELETE` y `TRUNCATE` para roles de aplicación (`authenticated`, `anon`, `public`). La inserción debe realizarse exclusivamente a través de funciones controladas con `SECURITY DEFINER` o triggers de sistema.

- **Desacoplamiento Estricto: RLS en PostgreSQL vs. Storage Policies:**
  - La capa relacional de metadatos (`student_documents`) y la capa de almacenamiento de objetos (Supabase Storage) son independientes y deben protegerse por separado.
  - Los documentos sensibles deben residir en buckets estrictamente privados (`public = false`). Queda terminantemente prohibido utilizar `getPublicUrl()` para identidades, datos médicos o soportes de pago de menores.

- **Gobernanza y Retención Configurable por Institución (No Hardcoded):**
  - La retención y supresión documental no debe codificarse como reglas estáticas universales en el software.
  - El sistema debe soportar una matriz de retención configurable por tipo documental (`document_types`), parametrizando la base legal, el plazo y el disparador de vencimiento (ej. cierre de ciclo, egreso o mandato legal aplicable), permitiendo que cada institución aplique su propia política archivística y regulatoria.
  - Toda anomalía o filtración potencial debe gestionarse mediante la entidad `data_breach_incidents` siguiendo el protocolo formal de respuesta ante incidentes (SIRT).

# Metodología de Implementación Fásica y Monitorización Modular

- **Desarrollo por Fases Atómicas y Verificables:** Ningún módulo sensible debe implementarse de forma masiva o monolítica. Se debe dividir obligatoriamente en fases secuenciales:
  - **Fase 1: Infraestructura de Cumplimiento y Seguridad (Base de Datos, RLS, Storage Privado y Políticas).**
  - **Fase 2: Servicios de Backend y Lógica de Consentimiento / Auditoría.**
  - **Fase 3: Componentes Visuales Modulares (< 300 líneas) y Experiencia de Usuario.**
- **Monitorización de Componentes:** Cada nuevo subcomponente o función debe validarse individualmente con pruebas de tipado (`tsc`), verificación de límites de líneas y verificación de aislamiento multi-inquilino antes de proceder a la siguiente fase.
