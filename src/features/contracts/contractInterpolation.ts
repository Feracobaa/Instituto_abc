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

  const replacements: Record<string, string> = {
    '{{CONTRACT_NUMBER}}': variables.contractNumber || 'ETM-2026-PENDING',
    '{{INSTITUTION_NAME}}': variables.institutionName || 'Institución Educativa',
    '{{NIT}}': variables.nit || 'NIT por registrar',
    '{{RECTOR_NAME}}': variables.rectorName || 'Rector / Representante Legal',
    '{{ADDRESS}}': variables.address || 'Sede Principal Institucional',
    '{{PLAN_NAME}}': variables.planName || 'Plan Institucional Etymon',
    '{{PRICE_COP}}': variables.priceCop !== undefined ? formatCurrencyCop(variables.priceCop) : '$0 COP',
    '{{DATE}}': variables.date || new Date().toLocaleDateString('es-CO'),
  };

  for (const [placeholder, val] of Object.entries(replacements)) {
    result = result.split(placeholder).join(val);
  }

  return result;
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
