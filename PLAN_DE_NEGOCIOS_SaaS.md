    # Plan de Negocios: Plataforma SaaS Escolar "Etymon"

    Este documento presenta el plan de negocios integral para la comercialización y escalamiento de **Etymon**, una plataforma SaaS (Software as a Service) multi-tenant diseñada para la gestión académica, administrativa y contable de instituciones educativas.

    ---

    ## 1. Resumen Ejecutivo

    ### 1.1 Introducción
    **Etymon** es una solución tecnológica integral de tipo multi-tenant que unifica en un solo ecosistema web la administración académica, la comunicación escolar con las familias y la gestión de cartera contable de colegios. Desarrollado originalmente por **Fernando Vega**, Etymon está estructurado para escalar de manera masiva, permitiendo aprovisionar de forma autónoma y segura a múltiples colegios en una única base de datos gracias a políticas avanzadas de aislamiento de datos (RLS) en Supabase/Postgres.

    ### 1.2 Misión
    Simplificar la administración escolar y reducir la brecha digital en las instituciones de América Latina, aliviando la carga administrativa de los docentes, facilitando el control financiero a los rectores y aumentando el involucramiento académico de las familias mediante una experiencia de usuario rápida, intuitiva y moderna.

    ### 1.3 Visión
    Convertirse en el sistema operativo escolar de referencia para colegios medianos y pequeños en la región, alcanzando un crecimiento sostenido soportado en un modelo comercial recurrente altamente escalable y con bajos costos operativos de infraestructura.

    ---

    ## 2. Propuesta de Valor y Ajuste al Mercado (Problem-Solution Fit)

    > [!IMPORTANT]
    > Los colegios tradicionales enfrentan tres problemas críticos que Etymon soluciona de forma nativa a través de innovaciones en UX y arquitectura.

    | Problema en los Colegios | Solución Técnica de Etymon | Beneficios Clave |
    | :--- | :--- | :--- |
    | **Carga de notas lenta e interactiva**: Los profesores pierden horas haciendo clics repetitivos para subir calificaciones de 40 alumnos. | **Interfaz "Excel-Like" (Data Grid)**: Reemplaza tablas rígidas por una cuadrícula ágil donde el docente puede copiar/pegar celdas y navegar con teclas direccionales. | Reducción de hasta un 80% en el tiempo administrativo de los profesores. |
    | **Falta de control de cartera y mora**: Los colegios pierden control sobre quién ha pagado la pensión mensual. | **Módulo de Contabilidad Integrado**: Permite registrar cobros, pagos, saldos y generar alertas automáticas a acudientes morosos. | Reducción drástica del índice de cartera vencida a través de la automatización escolar. |
    | **Comunicación desconectada**: Los boletines de notas y horarios se envían de forma manual por PDF en WhatsApp o correo. | **Portal Estudiantil y Alertas Omnicanal**: Un panel dedicado para familias con alertas push, correos e impresión/descarga ágil de boletines escolares en PDF. | Transparencia inmediata y empoderamiento de padres de familia. |

    ---

    ## 3. Arquitectura del Servicio SaaS

    El núcleo del negocio es la **arquitectura Multi-Tenant**. En lugar de desplegar un servidor y una base de datos para cada colegio, todos los clientes residen en la misma infraestructura pero permanecen estrictamente aislados.

    ### 3.1 Diagrama del Ecosistema Multi-Tenant y Control de Módulos

    ```mermaid
    graph TD
        SA[Super Admin - Panel Etymon] -->|Gestiona| INST[Instituciones / Colegios]
        SA -->|Asigna| PLAN[Planes de Suscripción: Esencial / Pro / Integral]
        PLAN -->|Define| MODS[Módulos Habilitados: 6, 12 o 14 activos]
        
        INST -->|Aislado por| RLS[Row-Level Security RLS en Supabase]
        RLS -->|Permite acceso a| DB[(Base de Datos Compartida - Postgres)]
        
        U_REC[Rol: Rector] -->|Control Total del Colegio| INST
        U_PROF[Rol: Profesor] -->|Calificaciones y Horarios| INST
        U_ACUD[Rol: Acudiente / Estudiante] -->|Notas y Horarios| INST
    ```

    ### 3.2 Seguridad por Servidor (Row-Level Security - RLS)
    La plataforma no depende de filtros vulnerables en el navegador de internet. Cada tabla de la base de datos (por ejemplo, `grade_records`, `students`, `schedules`) tiene una columna `institution_id`. Supabase aplica políticas RLS estrictas a nivel del motor PostgreSQL, asegurando que un profesor o rector del *Colegio A* jamás pueda leer ni escribir registros correspondientes al *Colegio B*.

    ---

    ## 4. Los 14 Módulos de la Plataforma

    Etymon cuenta con **14 módulos funcionales** definidos en base de datos (`provider_modules`), los cuales se activan de forma selectiva para cada institución dependiendo de su plan comercial:

    1.  **Dashboard:** Vista principal y panel operativo adaptado al rol del usuario.
    2.  **Estudiantes:** Gestión de bases de datos de alumnos, expedientes, matrículas y datos base.
    3.  **Profesores:** Registro y control del equipo docente, asignaciones de asignaturas y cargas horarias.
    4.  **Grados:** Configuración de la estructura de niveles y grados de la institución.
    5.  **Materias:** Catálogo global de materias de la institución y sus relaciones académicas.
    6.  **Calificaciones:** Registro rápido y consulta de notas periódicas (interfaz tipo Excel para docentes).
    7.  **Asistencias:** Control del pase de lista diario y reportes de inasistencias por materia.
    8.  **Contabilidad:** Facturación recurrente, cobros de pensiones, pagos de cartera, egresos e inventarios.
    9.  **Horarios:** Programación académica por grado/materia y definición de bloques de rutina institucionales.
    10. **Mi Horario:** Vista del horario académico adaptada para padres de familia y acudientes.
    11. **Mis Notas:** Visor histórico de calificaciones en tiempo real para estudiantes y padres.
    12. **Mi Perfil:** Configuración e información personal y de contacto del acudiente.
    13. **Portal Estudiantil:** Módulo administrativo maestro para el control de credenciales, accesos y flujos de acudientes.
    14. **Usuarios:** Control global de cuentas de usuario, asignación de perfiles y permisos a nivel institucional.

    ---

    ## 5. Modelo de Negocio y Estructura de Planes Activos

    El modelo comercial de Etymon se basa en planes fijos recurrentes mensuales en Pesos Colombianos (COP), con la posibilidad de habilitar anulaciones (`overrides`) específicas para módulos especiales de forma individual por colegio.

    ### 5.1 Matriz de Planes y Módulos Activos

    | Plan Comercial | Precio Mensual (COP) | Módulos Activos (Cantidad) | Módulos Habilitados | Módulos Excluidos |
    | :--- | :---: | :---: | :--- | :--- |
    | **Plan Esencial** | **$150,000 COP** | **6 / 14** | Dashboard, Estudiantes, Profesores, Grados, Materias, Calificaciones | Asistencias, Contabilidad, Horarios, Mi Horario, Mis Notas, Mi Perfil, Portal Estudiantil, Usuarios |
    | **Plan Demo.** | **$200,000 COP** | *Configurable* | *Plan de demostración con módulos dinámicos ajustables* | *Ajustable comercialmente* |
    | **Plan Pro** | **$300,000 COP** | **12 / 14** | Dashboard, Estudiantes, Profesores, Grados, Materias, Calificaciones, **Asistencias, Contabilidad, Horarios, Mi Horario, Mis Notas, Mi Perfil** | Portal Estudiantil, Usuarios |
    | **Plan Integral** | **$550,000 COP** | **14 / 14** | **Todos los módulos habilitados** (incluye Portal Estudiantil y Usuarios) | *Ninguno* |

    ---

    ## 6. Estrategia de Onboarding e Implementación (Go-to-Market)

    Para maximizar la retención de clientes y acortar el ciclo de ventas, el proceso de onboarding de nuevos colegios es automatizado:

    1.  **Aprovisionamiento Automatizado:** El Super Admin registra la institución y el correo del rector en el panel maestro de Etymon. Se ejecuta una Edge Function en Supabase que crea las tablas del inquilino de manera instantánea y le envía al rector una contraseña temporal de un solo uso.
    2.  **Carga Masiva de Datos:** En lugar de crear estudiante por estudiante, el sistema provee plantillas de carga masiva en formato CSV/Excel. El rector o su asistente pueden importar la lista completa de docentes, materias y alumnos en pocos minutos.
    3.  **Configuración Académica Express:** El rector realiza las asignaciones iniciales de docentes a materias y grados, lo cual habilita automáticamente a los profesores a iniciar sesión, visualizar a sus alumnos y empezar a calificar desde el primer día.

    ---

    ## 7. Modelos de Negociación y Propiedad Intelectual

    La comercialización y el escalamiento de la plataforma se pueden estructurar a través de tres opciones operativas y financieras propuestas por Fernando Vega (Desarrollador y Propietario de la propiedad intelectual preexistente):

    ```mermaid
    graph LR
        O_A[Opción A: Licenciamiento SaaS] -->|Detalles| OA_D["• Pago inicial: $3,000 USD<br>• Regalías: 20% de MRR (Mínimo $30 USD/colegio)<br>• Fernando como CTO ($3,500 USD/mes)<br>• Creador conserva el 100% de IP"]
        O_B[Opción B: Buyout Completo] -->|Detalles| OB_D["• Pago único de IP: $15,000 USD<br>• Contratación CTO a término indefinido<br>• 8% de Equity (Vesting a 3 años)<br>• Bono del 5% en primeras ventas"]
        O_C[Opción C: Joint Venture] -->|Detalles| OC_D["• Creación de Nueva EdTech SAS<br>• Creador aporta IP (45% acciones)<br>• Empresa aporta Capital (55% acciones)<br>• Fernando ejerce cargo de CTO"]
    ```

    ### 7.1 Análisis Crítico de Viabilidad Financiera (Opción A: El Efecto del Mínimo Garantizado en USD)

    > [!WARNING]
    > Existe una asimetría crítica en la Opción A debido a la cotización de los planes comerciales en COP y las regalías mínimas en USD.

    Asumiendo una tasa de cambio promedio de **$4,000 COP por 1 USD**:
    *   La regalía mínima garantizada para Fernando Vega es de **$30 USD mensuales por colegio activo** ($120,000 COP).
    *   La regalía porcentual estándar es del **20% sobre los ingresos brutos**.

    Veamos cómo afecta esto al margen de la Empresa por cada plan vendido:

    *   **Plan Esencial ($150,000 COP / mes):**
        *   Regalía del 20% nominal: $30,000 COP (~$7.50 USD).
        *   Regalía mínima obligatoria: **$120,000 COP ($30 USD)**.
        *   **Resultado:** La empresa debe pagar el mínimo garantizado de $120,000 COP. **Fernando se queda con el 80% de la facturación** y la Empresa solo retiene **$30,000 COP (20%)**, de los cuales debe cubrir hosting, APIs y costos operativos.
    *   **Plan Pro ($300,000 COP / mes):**
        *   Regalía del 20% nominal: $60,000 COP (~$15.00 USD).
        *   Regalía mínima obligatoria: **$120,000 COP ($30 USD)**.
        *   **Resultado:** Aplica el mínimo garantizado. **Fernando se queda con el 40% de la facturación** y la Empresa retiene **$180,000 COP (60%)**.
    *   **Plan Integral ($550,000 COP / mes):**
        *   Regalía del 20% nominal: $110,000 COP (~$27.50 USD).
        *   Regalía mínima obligatoria: **$120,000 COP ($30 USD)**.
        *   **Resultado:** Aplica el mínimo garantizado (supera por poco el 20% nominal). **Fernando se queda con el 21.8% de la facturación** y la Empresa retiene **$430,000 COP (78.2%)**.

    > [!IMPORTANT]
    > **Conclusión del análisis de viabilidad:** Bajo la Opción A, los planes comerciales por debajo de **$600,000 COP** (cuyo 20% es exactamente $30 USD / $120,000 COP) activan la cláusula del mínimo garantizado. Esto hace que el **Plan Esencial sea financieramente inviable para la Empresa**, obligándola a enfocar su fuerza comercial casi exclusivamente en el **Plan Pro** y **Plan Integral**, o a renegociar el mínimo en USD para el plan básico.

    ---

    ## 8. Proyecciones Financieras Iniciales (Expresadas en COP)

    A continuación, se presenta un escenario proyectado a 12 meses bajo la **Opción A (Licenciamiento)**, asumiendo un mix de ventas realista (10% Esencial, 60% Pro, 30% Integral) para estimar el punto de equilibrio operativo de la empresa.

    ### 8.1 Supuestos Financieros
    *   Tasa de cambio: 1 USD = $4,000 COP.
    *   Precio Promedio Ponderado de Venta (ARPU): **$360,000 COP / mes** por colegio.
    *   Salario CTO (Fernando Vega): $3,500 USD = **$14,000,000 COP / mes**.
    *   Gastos Operativos (Hosting, Supabase Premium, DNS, Resend para emails transaccionales): **$400,000 COP / mes** de base + **$30,000 COP** adicionales por cada colegio.
    *   Costo de Regalía Mensual por Colegio: **$120,000 COP / mes** (Mínimo de $30 USD aplica a todos los colegios ya que el ARPU ponderado de $360,000 COP daría un 20% nominal de $72,000 COP, el cual es menor a los $120,000 COP mínimos obligatorios).

    ### 8.2 Tabla de Crecimiento y Punto de Equilibrio (COP)

    | Mes | Colegios Activos | Ingresos Mensuales (MRR) | Costos de Hosting y APIs | Salario CTO (COP) | Regalía Total (COP) | Margen Neto Mensual (COP) |
    | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
    | **M1** | 2 | $720,000 | $460,000 | $14,000,000 | $240,000 | -$13,980,000 |
    | **M3** | 10 | $3,600,000 | $700,000 | $14,000,000 | $1,200,000 | -$12,300,000 |
    | **M6** | 30 | $10,800,000 | $1,300,000 | $14,000,000 | $3,600,000 | -$8,100,000 |
    | **M9** | 55 | $19,800,000 | $2,050,000 | $14,000,000 | $6,600,000 | -$2,850,000 |
    | **M10** | **66** | **$23,760,000** | **$2,380,000** | **$14,000,000** | **$7,920,000** | **+$540,000** *(Punto de Equilibrio)* |
    | **M12** | 90 | $32,400,000 | $3,100,000 | $14,000,000 | $10,800,000 | +$4,500,000 |

    > [!NOTE]
    > Debido al costo fijo del salario del CTO ($14'000,000 COP / $3,500 USD) y el impacto del mínimo garantizado de regalía, el punto de equilibrio en la Opción A se alcanza al llegar a **66 colegios activos**. A partir de esa cifra, la operación genera flujos de caja netos positivos para la empresa.

    ---

    ## 9. Próximos Pasos Recomendados

    Para consolidar e iniciar operaciones de comercialización masiva:

    1.  **Renegociación o Ajuste de Planes (Recomendado):**
        *   **Alternativa A:** Aumentar el precio del *Plan Esencial* a **$200,000 COP** y el de *Plan Pro* a **$350,000 COP** para absorber el costo de la regalía mínima de $30 USD sin estrangular el margen de la empresa.
        *   **Alternativa B:** Acordar un mínimo garantizado escalonado con Fernando Vega (ej. $10 USD para Plan Esencial, $20 USD para Plan Pro, $30 USD para Plan Integral).
    2.  **Selección del Modelo Contractual:** Evaluar si el Buyout Completo (Opción B) o Joint Venture (Opción C) resultan más atractivos para eliminar el riesgo del costo de regalía mínima recurrente por volumen.
    3.  **Formalización Legal e Inicio de Campaña:** Redacción de contratos comerciales finales e inicio de venta dirigida a colegios privados medianos del territorio nacional.
