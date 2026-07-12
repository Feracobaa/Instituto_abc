export const SCHOOL_MODULE_CODES = {
  asistencias: "asistencias",
  calificaciones: "calificaciones",
  contabilidad: "contabilidad",
  dashboard: "dashboard",
  estudiantes: "estudiantes",
  familias: "familias",
  grados: "grados",
  horarios: "horarios",
  materias: "materias",
  mi_horario: "mi_horario",
  mi_perfil: "mi_perfil",
  mis_notas: "mis_notas",
  profesores: "profesores",
  usuarios: "usuarios",
} as const;

export type SchoolModuleCode = (typeof SCHOOL_MODULE_CODES)[keyof typeof SCHOOL_MODULE_CODES];
