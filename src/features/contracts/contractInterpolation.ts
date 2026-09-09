import { sanitizeTextForPdf } from "./contractSanitizer";

export interface InterpolationVariables {
  contractNumber?: string;
  institutionName?: string;
  nit?: string;
  rectorName?: string;
  address?: string;
  planName?: string;
  priceCop?: number;
  date?: string;
}

export function formatCurrencyCop(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function interpolateContractMarkdown(
  templateMarkdown: string,
  variables: InterpolationVariables
): string {
  let result = templateMarkdown;

  const institution = variables.institutionName ? sanitizeTextForPdf(variables.institutionName) : 'Institución Adscrita';
  const nit = variables.nit ? sanitizeTextForPdf(variables.nit) : 'Pendiente de registro';
  const rector = variables.rectorName ? sanitizeTextForPdf(variables.rectorName) : 'Rector Titular';
  const address = variables.address ? sanitizeTextForPdf(variables.address) : 'Sede Principal Institucional';
  const plan = sanitizeTextForPdf(variables.planName || 'Plan Institucional Etymon');
  const price = variables.priceCop !== undefined ? formatCurrencyCop(variables.priceCop) : '$0 COP';
  const date = variables.date || new Date().toLocaleDateString('es-CO');
  const contractNumber = sanitizeTextForPdf(variables.contractNumber || 'ETM-2026-PENDING');

  const replacements: Record<string, string> = {
    '{{CONTRACT_NUMBER}}': contractNumber,
    '{{NUMERO_CONTRATO}}': contractNumber,
    '{{INSTITUTION_NAME}}': institution,
    '{{INSTITUCION_NOMBRE}}': institution,
    '{{NIT}}': nit,
    '{{RECTOR_NAME}}': rector,
    '{{REPRESENTANTE_LEGAL}}': rector,
    '{{ADDRESS}}': address,
    '{{DIRECCION}}': address,
    '{{PLAN_NAME}}': plan,
    '{{PLAN_SERVICIO}}': plan,
    '{{PRICE_COP}}': price,
    '{{CANON_MENSUAL}}': price,
    '{{VALOR_MENSUAL}}': price,
    '{{DATE}}': date,
    '{{FECHA}}': date,
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    result = result.split(placeholder).join(val);
  }

  return sanitizeTextForPdf(result);
}

export async function computeSha256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple determinista para entornos sin subtle crypto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}
