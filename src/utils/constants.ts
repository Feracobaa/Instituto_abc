export const PREESCOLAR_DIMENSIONS = [
  "Dimensión corporal",
  "Dimensión socioafectiva, espiritual y ética",
  "Dimensión cognitiva",
  "Dimensión comunicativa",
  "Dimensión estética",
  "Informática",
  "Inglés"
] as const;

export type PreescolarDimension = typeof PREESCOLAR_DIMENSIONS[number];
