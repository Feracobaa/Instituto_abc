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

export const PREESCOLAR_DEFAULT_FORTALEZAS: Record<string, string> = {
  "Dimensión corporal": "Identifica correctamente las partes de su cuerpo (cabeza, tronco, extremidades).\nMantiene el equilibrio al realizar desplazamientos.\nRealiza con entusiasmo múltiples ejercicios de coordinación y equilibrio que le ayudan a desarrollar su motricidad gruesa.",
  "Dimensión socioafectiva, espiritual y ética": "Le gusta participar, integrarse y cooperar en las actividades cotidianas.\nSe interesa por comprender los pasajes bíblicos orientados por la profesora.\nMuestra sentimientos de gratitud y coopera en las actividades cotidianas.",
  "Dimensión cognitiva": "Comprende y acepta las órdenes que se imparten.\nIdentifica y escribe los números del 1 al 20.\nReconoce y escribe palabras sencillas con las consonantes trabajadas en clase.",
  "Dimensión comunicativa": "Sostiene conversaciones sencillas y coherentes con sus compañeros.\nDisfruta la lectura de cuentos y reconoce sus personajes.\nExplica sus dibujos y las creaciones trabajadas en clase.",
  "Dimensión estética": "Participa con mucha alegría y entusiasmo en las actividades artísticas.\nManipula plastilina y modela otros objetos con habilidad y creatividad.\nDisfruta y se entusiasma con las actividades de dactilopintura.",
  "Informática": "Muestra agrado e interés por las actividades que se realizan en el área de informática.\nIdentifica el monitor en un computador.",
  "Inglés": "Nombra acertadamente cada uno de los colores aprendidos en esta área.\nReproduce en forma oral algunos de los saludos propuestos por el profesor."
};
