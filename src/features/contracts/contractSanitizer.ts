/**
 * Utilidad de sanitización tipográfica y normalización Unicode para jsPDF.
 * 
 * Previene la corrupción de caracteres (e.g. 'Ø=Üž') causada por fuentes de 8 bits
 * (WinAnsi / Latin-1) en jsPDF cuando se procesan emojis o pares subrogados UTF-16.
 */

// Expresión regular para detectar pares subrogados UTF-16 (emojis y caracteres extendidos)
const SURROGATE_PAIR_REGEX = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

// Bloques comunes de emojis y símbolos Unicode suplementarios
const EXTENDED_PICTOGRAPHIC_REGEX = /\p{Extended_Pictographic}/gu;

// Caracteres tipográficos comunes que necesitan normalización a ASCII / Latin-1
const TYPOGRAPHIC_REPLACEMENTS: [RegExp, string][] = [
  // Comillas tipográficas curvas
  [/[\u201C\u201D\u00AB\u00BB]/g, '"'],
  [/[\u2018\u2019\u201A\u201B]/g, "'"],
  // Guiones largos y medios
  [/[\u2014\u2013\u2015]/g, "-"],
  // Puntos de viñeta
  [/[\u2022\u2023\u25E6\u2043\u2219]/g, "-"],
  // Espacios duros o especiales
  [/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " "],
  // Puntos suspensivos
  [/\u2026/g, "..."],
  // Símbolos comerciales comunes
  [/\u2122/g, "(TM)"],
  [/\u00A9/g, "(C)"],
  [/\u00AE/g, "(R)"],
];

/**
 * Sanitiza una cadena de texto para renderizado seguro en documentos PDF de jsPDF.
 * 
 * - Elimina emojis y símbolos de 4 bytes que producen glifos corruptos como 'Ø=Üž'.
 * - Normaliza caracteres tipográficos especiales a sus equivalentes seguros en Latin-1.
 * - Preserva acentos, eñes y signos propios del idioma español (á, é, í, ó, ú, ñ, ¿, ¡, etc.).
 * - Limpia dobles espacios accidentales.
 */
export function sanitizeTextForPdf(input: string | null | undefined): string {
  if (!input) return "";

  let cleaned = input;

  // 1. Reemplazar caracteres tipográficos problemáticos
  for (const [pattern, replacement] of TYPOGRAPHIC_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // 2. Eliminar emojis y caracteres con pares subrogados (causantes directos de Ø=Üž)
  try {
    cleaned = cleaned.replace(EXTENDED_PICTOGRAPHIC_REGEX, "");
  } catch {
    // Fallback si la versión de regex no soporta \p
  }
  cleaned = cleaned.replace(SURROGATE_PAIR_REGEX, "");

  // 3. Filtrar cualquier carácter restante no compatible con el rango WinAnsi / Latin-1 imprimible
  // Rango seguro: ASCII básico (32-126) + Latin-1 extendido español (160-255) + saltos de línea (\n, \r, \t)
  cleaned = cleaned.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, "");

  // 4. Limpiar espacios múltiples redundantes pero preservar saltos de línea
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

  return cleaned.trim();
}
