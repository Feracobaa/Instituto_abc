# Plan Maestro de Etymon (Arquitectura SaaS Escolar)

Este documento establece la ruta técnica y funcional definitiva para consolidar **Etymon** como un producto SaaS de nivel empresarial. Las decisiones aquí tomadas se rigen por el principio de "Criterio de Producto Final": si una característica no escala o afecta la experiencia, se descarta o se rediseña.

---

## 1. El Eje Central: Arquitectura Multi-Tenant y el "Panel Etymon"

Para que Etymon tenga control total sobre cada plataforma (colegio) que se implemente, la arquitectura debe consolidarse como un sistema **Multi-Tenant (Multiusuario Institucional)**. 

### Panel de Control "Super Admin" (Perfil Etymon)
El perfil raíz de Etymon no pertenecerá a ningún colegio, sino que será el **proveedor del servicio**.
*   **Gestor de Instituciones:** Crear, pausar o suspender colegios enteros.
*   **Gestor de Usuarios Global:** Creación manual de usuarios (Rectores, Administradores de colegio) asignándoles una **contraseña temporal**. El sistema exigirá obligatoriamente el cambio de contraseña en el primer inicio de sesión.
*   **Control de Módulos:** Activar o desactivar módulos (Ej. "Este colegio no pagó el módulo de contabilidad, apagarlo").
*   **Auditoría Global:** Registro de acceso (quién entra, qué falla a nivel técnico).

---

## 2. Soluciones UX para la Operación Diaria (Colegios)

### Problema A: La Carga Masiva de Notas es Tediosa
**Solución: Interfaz "Excel-Like" (Data Grid)**
No podemos obligar a un profesor a hacer 3 clics por cada nota de 40 alumnos. 
*   **Implementación:** Reemplazaremos las tablas de calificación tradicionales por un **Data Grid** (similar a Excel usando librerías como `react-data-grid`).
*   **Funcionalidad:** El profesor podrá moverse con las flechas del teclado, escribir una nota, presionar `Enter` para bajar al siguiente alumno, e incluso **Copiar y Pegar** una columna entera directamente desde su Excel de escritorio hacia la web. El guardado será automático y silencioso.

### Problema B: Falta de Notificaciones y Alertas
**Solución: Sistema de Alertas Omnicanal**
*   **In-App (Centro de Notificaciones):** Una "campanita" en el menú superior impulsada por *Supabase Realtime*. Mostrará un punto rojo cuando haya novedades (Ej. "Tu pensión está por vencer", "El profesor X subió una nueva nota").
*   **Notificaciones Push (Web/Móvil):** A través de Service Workers, permitiendo que el estudiante reciba la alerta en su celular aunque no tenga la app abierta.
*   **Alertas por Email Críticas:** Integración con un servicio transaccional (ej. Resend) exclusivo para alertas rojas (Ej. Cobros de pensión vencidos, reportes disciplinarios graves).

---

## 3. Rendimiento Crítico: Paginación de Servidor y Virtualización

Al crecer, las tablas no pueden descargar toda la base de datos de golpe. 

*   **Paginación desde el Servidor (Server-Side Pagination):** 
    En la contabilidad y el inventario, en lugar de descargar 5,000 registros, la tabla le dirá a Supabase: *"Dame solo de la fila 1 a la 20"*. Al hacer clic en "Siguiente", pedirá de la 21 a la 40. Esto mantiene el consumo de datos casi en cero y la velocidad instantánea.
*   **Virtualización de Tablas (UI Virtualization):**
    Para listas donde forzosamente necesitamos ver todos los datos (Ej. El "Excel" de notas de un salón de 50 alumnos), usaremos **Virtualización**. Aunque haya 50 alumnos, el navegador de internet solo "dibujará" en pantalla los 10 que los ojos del profesor están viendo. Al hacer *scroll*, se dibujan y borran dinámicamente. Esto evita que los computadores antiguos de los colegios se queden pegados.

---

## 4. Expansión del Portal Estudiantil (Valor Agregado)

Para que el estudiante perciba valor en Etymon, la plataforma debe ser más que un "visor de notas". Propongo las siguientes funcionalidades (a implementar por fases):

1.  **Dashboard de Progreso Histórico:** Gráficos de barras y líneas que comparen su rendimiento actual con periodos anteriores. "Tendencia académica".
2.  **Calendario Interactivo Escolar:** Una vista mensual sincronizada donde vean fechas de exámenes, entregas de trabajos y eventos del colegio.
3.  **Buzón de Tareas (Assignments):** Un módulo donde los profesores publiquen tareas con fecha límite, y el estudiante pueda subir su archivo o enlace (PDF/Word). El estado cambia a "Entregado" automáticamente.
4.  **Gamificación (Insignias/Logros):** Premiar el rendimiento y la asistencia perfecta con medallas digitales ("Mejor promedio", "100% Asistencia"). Esto incrementa drásticamente el uso de la plataforma por parte de los alumnos.

---

## Fases de Implementación Propuestas

*   **Fase 1: Etymon Rebranding & Super Admin Panel.** Limpiar el nombre antiguo, crear el rol `etymon_admin` y construir el panel de control de instituciones y creación de usuarios con contraseña temporal.
*   **Fase 2: Arquitectura de Rendimiento.** Migrar las tablas pesadas (Contabilidad, Estudiantes) a *Server-Side Pagination* y preparar la virtualización para notas.
*   **Fase 3: UX del Profesor.** Implementar el *Data Grid* (estilo Excel) para la carga masiva y rápida de notas.
*   **Fase 4: Sistema de Notificaciones.** Desplegar el motor de notificaciones In-App (Campanita).
*   **Fase 5: Expansión Estudiantil.** Desplegar las nuevas funcionalidades del portal de alumnos (Gráficos, Calendario).
