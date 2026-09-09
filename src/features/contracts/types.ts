export type PlatformContractType =
  | 'SAAS_SERVICE_AGREEMENT'
  | 'DATA_PROCESSING_AGREEMENT'
  | 'TERMS_AND_CONDITIONS'
  | 'SLA_SECURITY_POLICY'
  | 'MASTER_COMPLIANCE_PACK';

export type PlatformContractStatus =
  | 'draft'
  | 'sent'
  | 'signed'
  | 'active'
  | 'expired'
  | 'revoked';

export type PlatformContractAuditAction =
  | 'GENERATE'
  | 'SEND'
  | 'VIEW'
  | 'SIGN'
  | 'DOWNLOAD'
  | 'REVOKE'
  | 'UPDATE';

export interface PlatformLegalTemplate {
  id: string;
  code: PlatformContractType;
  name: string;
  version: string;
  category: string;
  description: string;
  content_markdown: string;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstitutionContract {
  id: string;
  contract_number: string;
  institution_id: string;
  template_id: string | null;
  contract_type: PlatformContractType;
  title: string;
  status: PlatformContractStatus;
  version: string;
  content_markdown: string;
  content_hash: string;
  institution_legal_name: string | null;
  institution_nit: string | null;
  rector_name: string | null;
  rector_document_id: string | null;
  rector_email: string | null;
  plan_name: string | null;
  plan_price_cop: number;
  billing_cycle: string;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  sent_at: string | null;
  sent_by: string | null;
  signed_at: string | null;
  signed_by_user_id: string | null;
  signer_name: string | null;
  signer_document_id: string | null;
  signer_role: string | null;
  signature_hash: string | null;
  signature_metadata: {
    ip_address?: string;
    user_agent?: string;
    legal_framework?: string;
    timestamp?: string;
  };
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformContractAuditLog {
  id: string;
  contract_id: string | null;
  institution_id: string | null;
  actor_user_id: string | null;
  actor_role: string;
  action: PlatformContractAuditAction;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface GenerateContractPayload {
  institutionId: string;
  templateCode: PlatformContractType;
  customTitle?: string;
  planName?: string;
  planPriceCop?: number;
  billingCycle?: string;
  validUntil?: string;
  contentOverride?: string;
  institutionName?: string;
  institutionNit?: string;
  rectorName?: string;
  rectorDocumentId?: string;
  rectorEmail?: string;
  address?: string;
}

export interface SignContractPayload {
  contractId: string;
  signerDocumentId: string;
  signerName: string;
}

export interface ContractFilters {
  institutionId?: string;
  status?: PlatformContractStatus | 'all';
  search?: string;
}
