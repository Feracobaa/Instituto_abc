import type { InstitutionContract, PlatformLegalTemplate } from "./types";
import { DEFAULT_LEGAL_TEMPLATES } from "./defaultTemplates";

const STORAGE_KEY_TEMPLATES = "etymon_legal_templates_cache";
const STORAGE_KEY_CONTRACTS = "etymon_institution_contracts_cache";

export function getLocalTemplates(): PlatformLegalTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_LEGAL_TEMPLATES;
}

export function saveLocalTemplates(templates: PlatformLegalTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch {}
}

export function getLocalContracts(): InstitutionContract[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTRACTS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalContracts(contracts: InstitutionContract[]) {
  try {
    localStorage.setItem(STORAGE_KEY_CONTRACTS, JSON.stringify(contracts));
  } catch {}
}
