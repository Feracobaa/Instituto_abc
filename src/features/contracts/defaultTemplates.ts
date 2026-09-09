import type { PlatformLegalTemplate } from "./types";

export const DEFAULT_LEGAL_TEMPLATES: PlatformLegalTemplate[] = [
  {
    id: "tpl-saas-001",
    code: "SAAS_SERVICE_AGREEMENT",
    name: "Contrato Marco de Licenciamiento SaaS",
    version: "1.0",
    category: "legal_master",
    description: "Contrato principal de prestación de servicios de software en la nube, módulos habilitados, SLA de servicio y soporte.",
    is_mandatory: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_markdown: `# CONTRATO DE PRESTACIÓN DE SERVICIOS DE SOFTWARE COMO SERVICIO (SaaS)

**CONTRATO NÚMERO:** {{CONTRACT_NUMBER}}  
**FECHA DE EMISIÓN:** {{DATE}}  

Entre los suscritos:
1. **EL PROVEEDOR:** **ETYMON**, plataforma de gestión y gobernanza educativa integral en la nube.
2. **EL CLIENTE:** La institución educativa **{{INSTITUTION_NAME}}**, con NIT **{{NIT}}**, domiciliada en **{{ADDRESS}}**, legalmente representada por **{{RECTOR_NAME}}** en su calidad de Rector(a) y Representante Legal.

Las partes acuerdan celebrar el presente Contrato de Licenciamiento SaaS bajo las siguientes cláusulas:

---

### CLÁUSULA PRIMERA: OBJETO
El Proveedor concede al Cliente una licencia de uso no exclusiva, intransferible y en la modalidad SaaS de la plataforma Etymon, que incluye los módulos de gestión académica, portal de calificaciones, asistencias, horarios y administración escolar bajo el plan contratado: **{{PLAN_NAME}}**.

### CLÁUSULA SEGUNDA: CANON DEL SERVICIO Y FORMA DE PAGO
El valor de licenciamiento pactado corresponde a **{{PRICE_COP}}**, el cual será liquidado y facturado periódicamente conforme al plan comercial acordado.

### CLÁUSULA TERCERA: DISPONIBILIDAD Y SOPORTE (SLA)
El Proveedor se compromete a mantener un nivel de disponibilidad mensual del servicio de al menos **99.5%**, excluyendo ventanas de mantenimiento programadas informadas con no menos de 24 horas de antelación.

### CLÁUSULA CUARTA: PROPIEDAD INTELECTUAL Y CUSTODIA
El software, su código fuente, arquitectura, diseño y marcas son propiedad exclusiva de Etymon. Los datos académicos, expedientes de estudiantes y registros de la institución son y permanecerán bajo exclusiva titularidad y dominio del Cliente.

### CLÁUSULA QUINTA: VALIDEZ DE FIRMA ELECTRÓNICA
Las partes reconocen plena validez, eficacia probatoria y obligatoriedad legal a la firma electrónica y aceptación digital del presente instrumento, conforme a lo establecido en la **Ley 527 de 1999** de la República de Colombia.
`,
  },
  {
    id: "tpl-dpa-002",
    code: "DATA_PROCESSING_AGREEMENT",
    name: "Acuerdo de Transmisión de Datos Personales (DPA / Habeas Data Menores)",
    version: "1.0",
    category: "legal_master",
    description: "Acuerdo vinculante conforme a la Ley 1581 de 2012 y Decreto 1377 de 2013 para la custodia y tratamiento seguro de datos de niños, niñas y adolescentes.",
    is_mandatory: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_markdown: `# ACUERDO DE TRANSMISIÓN DE DATOS PERSONALES (DPA) Y HABEAS DATA
### CUSTODIA Y PROTECCIÓN DE DATOS SENSIBLES DE MENORES DE EDAD

**VINCULADO AL CONTRATO:** {{CONTRACT_NUMBER}}  
**RESPONSABLE DEL TRATAMIENTO:** {{INSTITUTION_NAME}} (NIT: {{NIT}})  
**ENCARGADO DEL TRATAMIENTO:** ETYMON (Plataforma Tecnológica)  

En cumplimiento de la **Ley Estatutaria 1581 de 2012**, el **Decreto Reglamentario 1377 de 2013** y la jurisprudencia constitucional sobre el interés superior de los niños, niñas y adolescentes:

---

### CLÁUSULA PRIMERA: CALIDAD DE LAS PARTES
La Institución Educativa actúa en calidad de **Responsable del Tratamiento**, garantizando contar con las autorizaciones y fundamentos legales aplicables. Etymon actúa en calidad de **Encargado del Tratamiento**, procesando la información exclusivamente bajo las directrices del Responsable.

### CLÁUSULA SEGUNDA: FINALIDADES AUTORIZADAS
El tratamiento de datos personales de estudiantes, padres y acudientes se limitará a:
1. Gestión y emisión de boletines, registros de notas y certificados académicos.
2. Control de asistencia presencial y biométrica consentida.
3. Notificaciones escolares, circulares y cobranza de pensiones.

### CLÁUSULA TERCERA: MEDIDAS DE SEGURIDAD Y CONFIDENCIALIDAD
Etymon implementa aislamiento lógico multi-inquilino (RLS), cifrado de datos en reposo y tránsito (TLS 1.3), y pistas de auditoría inmutables para el acceso a documentos confidenciales.

### CLÁUSULA CUARTA: NOTIFICACIÓN DE INCIDENTES
En caso de detectar cualquier brecha de seguridad que comprometa la confidencialidad de datos personales, Etymon notificará a la Institución dentro de las 72 horas siguientes para coordinar el reporte ante la Superintendencia de Industria y Comercio (SIC).
`,
  },
  {
    id: "tpl-terms-003",
    code: "TERMS_AND_CONDITIONS",
    name: "Términos y Condiciones Generales de Uso",
    version: "1.0",
    category: "legal_master",
    description: "Políticas de uso aceptable, deberes de los usuarios y validez de actos electrónicos en la plataforma.",
    is_mandatory: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_markdown: `# TÉRMINOS Y CONDICIONES GENERALES DE USO DE LA PLATAFORMA ETYMON

**APLICABLE A:** {{INSTITUTION_NAME}}  
**VINCULADO A:** {{CONTRACT_NUMBER}}  

1. **Uso Aceptable:** Los accesos asignados a directivos, profesores y familias son personales e intransferibles. Queda estrictamente prohibido compartir credenciales maestras o vulnerar controles de acceso.
2. **Custodia de Información:** La institución es responsable de la exactitud y veracidad de las calificaciones y datos ingresados en el sistema escolar.
3. **No Repudio:** Todo acto realizado bajo una sesión autenticada con roles directivos se entenderá ejecutado legítimamente por el titular de la cuenta bajo la Ley 527 de 1999.
`,
  },
  {
    id: "tpl-sla-004",
    code: "SLA_SECURITY_POLICY",
    name: "Política de Niveles de Servicio y Seguridad (SLA)",
    version: "1.0",
    category: "legal_master",
    description: "Definición de RPO, RTO, soporte prioritario, copias de seguridad continuas y ventanas de mantenimiento.",
    is_mandatory: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_markdown: `# POLÍTICA DE NIVELES DE SERVICIO (SLA) Y CONTINUIDAD OPERATIVA

**INSTITUCIÓN:** {{INSTITUTION_NAME}}  
**NIVEL DE SERVICIO GARANTIZADO:** 99.5% ANUAL  

- **Disponibilidad comprometida:** 99.5% de tiempo de actividad en la plataforma en la nube.
- **RPO (Pérdida máxima de datos admisible):** Menor a 1 hora mediante réplicas y copias de seguridad continuas.
- **RTO (Tiempo de recuperación ante desastres):** Menor a 4 horas.
- **Soporte prioritario:** Atención especializada a rectoría y secretaría en días hábiles de 7:00 a 17:00 horas (COT).
`,
  },
  {
    id: "tpl-pack-005",
    code: "MASTER_COMPLIANCE_PACK",
    name: "Paquete Integral de Legitimidad y Cumplimiento Educativo",
    version: "1.0",
    category: "legal_master",
    description: "Convenio unificado que agrupa el Contrato SaaS, el Acuerdo de Tratamiento de Datos (DPA) y los Términos de Servicio en un solo instrumento vinculante.",
    is_mandatory: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_markdown: `# CONVENIO INTEGRAL DE SERVICIOS Y CUMPLIMIENTO REGULATORIO EDUCATIVO

**CONVENIO NÚMERO:** {{CONTRACT_NUMBER}}  
**INSTITUCIÓN:** {{INSTITUTION_NAME}} (NIT: {{NIT}})  
**REPRESENTANTE LEGAL:** {{RECTOR_NAME}}  
**VALOR MENSUAL:** {{PRICE_COP}}  

El presente instrumento unifica de manera integral:
1. El **Contrato Marco de Licenciamiento SaaS de Etymon**.
2. El **Acuerdo de Transmisión de Datos Personales de Menores (DPA Ley 1581/2012)**.
3. La **Política de Seguridad, Copias de Respaldo y Niveles de Servicio (SLA)**.

Al suscribir este convenio, las partes ratifican su compromiso con la excelencia educativa, la protección integral de la niñez y la legitimidad jurídica de todas las operaciones tecnológicas del colegio.
`,
  },
];
