/**
 * Tipos de Dominio y Contratos de Seguridad: Habeas Data y Privacidad Estudiantil
 * Fase 1.1 — Hardening de Integridad Multi-Tenant y Auditoría No Falsificable
 * Cumple con los estatutos de AGENTS.md (Modularidad < 300 líneas, Tipado Estricto).
 */

export type StudentDocumentRole =
  | 'rector'
  | 'contable'
  | 'profesor'
  | 'admin'
  | 'parent';

export type ConsentPurpose =
  | 'ACADEMIC'
  | 'HEALTH'
  | 'BIOMETRIC'
  | 'EMERGENCY'
  | 'COMMUNICATION'
  | 'DOCUMENT_STORAGE';

export type ConsentStatus =
  | 'GRANTED'
  | 'REVOKED'
  | 'EXPIRED'
  | 'REQUIRES_RECONFIRMATION'
  | 'SUPERSEDED';

export type ConsentSource =
  | 'PORTAL_WEB'
  | 'PRESENCIAL_DIGITALIZADO'
  | 'APP_MOVIL'
  | 'SECRETARIA_VENTANILLA';

export type SensitiveAction =
  | 'VIEW'
  | 'DOWNLOAD'
  | 'GENERATE_URL'
  | 'DELETE'
  | 'UPLOAD'
  | 'UPDATE'
  | 'SHARE'
  | 'PRINT';

export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type DocumentCategory =
  | 'IDENTIFICATION'
  | 'HEALTH'
  | 'ACADEMIC'
  | 'FINANCIAL'
  | 'CONTRACT';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentResolutionStatus =
  | 'DETECTED'
  | 'CONTAINING'
  | 'INVESTIGATING'
  | 'NOTIFIED'
  | 'RESOLVED'
  | 'CLOSED';

export interface DocumentType {
  id: string;
  institution_id?: string | null;
  code: string;
  name: string;
  category: DocumentCategory;
  is_sensitive: boolean;
  requires_consent: boolean;
  allowed_roles: StudentDocumentRole[];
  validity_months?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface StudentConsent {
  id: string;
  institution_id: string;
  student_id: string;
  guardian_id?: string | null;
  guardian_name: string;
  guardian_document_id?: string | null;
  purpose: ConsentPurpose;
  status: ConsentStatus;
  legal_basis: string;
  policy_version: string;
  terms_version: string;
  consent_text_hash: string;
  accepted_at: string;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  source: ConsentSource;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StudentDocument {
  id: string;
  institution_id: string;
  student_id: string;
  document_type_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  file_hash?: string | null;
  verification_status: DocumentVerificationStatus;
  verified_at?: string | null;
  verified_by?: string | null;
  rejection_reason?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
  expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  document_type?: DocumentType;
}

export interface SensitiveAccessLog {
  id: string;
  institution_id: string;
  student_id: string;
  document_id?: string | null;
  user_id?: string | null;
  user_role: StudentDocumentRole;
  action: SensitiveAction;
  document_type: string;
  success: boolean;
  denied_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface DataBreachIncident {
  incident_id: string;
  institution_id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  detected_at: string;
  reported_at?: string | null;
  affected_students: number;
  affected_documents?: Array<{ document_id: string; document_type: string }>;
  containment_action?: string | null;
  notification_status: string;
  resolution_status: IncidentResolutionStatus;
  root_cause?: string | null;
  remediation_action?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
}

/**
 * Payload de creación emitido por frontend (sin autoridad de tenant)
 * El servidor/Edge Function inyecta inmutablemente institution_id desde el JWT.
 */
export interface CreateConsentPayload {
  student_id: string;
  guardian_name: string;
  guardian_document_id?: string;
  guardian_id?: string;
  purpose: ConsentPurpose;
  legal_basis?: string;
  policy_version?: string;
  terms_version?: string;
  consent_text_hash: string;
  source?: ConsentSource;
  metadata?: Record<string, unknown>;
}

/**
 * Petición de acceso del cliente: solo declara su intención de operación.
 */
export interface RequestDocumentAccessPayload {
  student_id: string;
  document_id?: string;
  action: SensitiveAction;
  document_type?: string;
}

/**
 * Evento de auditoría validado e insertado por el servidor/RPC
 */
export interface AuditEvent {
  institution_id: string;
  student_id: string;
  document_id?: string | null;
  user_id: string;
  user_role: StudentDocumentRole;
  action: SensitiveAction;
  document_type: string;
  success: boolean;
  denied_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

/**
 * Helper de dominio para consultar vigencia de un consentimiento
 */
export function isConsentActive(status: ConsentStatus): boolean {
  return status === 'GRANTED';
}

/**
 * Helper de dominio para UI.
 * IMPORTANTE: No sustituye la compuerta de autorización serverless Zero-Trust.
 */
export function hasRequiredConsent(
  consents: StudentConsent[],
  purpose: ConsentPurpose
): boolean {
  return consents.some(
    (consent) => consent.purpose === purpose && isConsentActive(consent.status)
  );
}
