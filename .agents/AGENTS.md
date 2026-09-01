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
