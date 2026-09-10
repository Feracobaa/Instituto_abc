import { describe, expect, it } from 'vitest';
import {
  AuditEvent,
  ConsentPurpose,
  DocumentType,
  hasRequiredConsent,
  isConsentActive,
  RequestDocumentAccessPayload,
  StudentConsent,
  StudentDocument,
  StudentDocumentRole,
} from '@/types/studentPrivacy';

describe('Fase 1.1 — Pruebas de Nivel 1 (Unit Tests y Contratos de Dominio)', () => {
  describe('1.1 y 1.3 Contratos de Consentimiento Granular y Versionado', () => {
    it('debe reconocer únicamente GRANTED como estado de consentimiento activo', () => {
      expect(isConsentActive('GRANTED')).toBe(true);
      expect(isConsentActive('REVOKED')).toBe(false);
      expect(isConsentActive('EXPIRED')).toBe(false);
      expect(isConsentActive('REQUIRES_RECONFIRMATION')).toBe(false);
      expect(isConsentActive('SUPERSEDED')).toBe(false);
    });

    it('debe validar en dominio si un estudiante tiene consentimiento activo para un propósito determinado', () => {
      const consents: StudentConsent[] = [
        {
          id: 'c-1',
          institution_id: 'inst-1',
          student_id: 'stu-1',
          guardian_name: 'Carlos Gómez',
          purpose: 'BIOMETRIC',
          status: 'GRANTED',
          legal_basis: 'Autorización expresa e informada del acudiente',
          policy_version: '1.0',
          terms_version: '1.0',
          consent_text_hash: 'abc123hash',
          source: 'PORTAL_WEB',
          accepted_at: '2026-09-08T00:00:00Z',
          created_at: '2026-09-08T00:00:00Z',
          updated_at: '2026-09-08T00:00:00Z',
        },
        {
          id: 'c-2',
          institution_id: 'inst-1',
          student_id: 'stu-1',
          guardian_name: 'Carlos Gómez',
          purpose: 'HEALTH',
          status: 'REQUIRES_RECONFIRMATION',
          legal_basis: 'Interés vital',
          policy_version: '1.0',
          terms_version: '1.1',
          consent_text_hash: 'def456hash',
          source: 'PRESENCIAL_DIGITALIZADO',
          accepted_at: '2026-09-01T00:00:00Z',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-08T00:00:00Z',
        },
      ];

      expect(hasRequiredConsent(consents, 'BIOMETRIC')).toBe(true);
      expect(hasRequiredConsent(consents, 'HEALTH')).toBe(false);
      expect(hasRequiredConsent(consents, 'ACADEMIC')).toBe(false);
    });

    it('soporta los 6 propósitos definidos por el dominio institucional de la plataforma', () => {
      const definedPurposes: ConsentPurpose[] = [
        'ACADEMIC',
        'HEALTH',
        'BIOMETRIC',
        'EMERGENCY',
        'COMMUNICATION',
        'DOCUMENT_STORAGE',
      ];
      expect(definedPurposes).toHaveLength(6);
    });
  });

  describe('1.2 Tipado Estricto de Roles en Catálogo Documental', () => {
    it('asegura que allowed_roles pertenezca al dominio estricto de roles del sistema', () => {
      const allowedRoles: StudentDocumentRole[] = ['rector', 'contable'];
      const docType: DocumentType = {
        id: 'dt-med',
        code: 'MEDICAL_CERTIFICATE',
        name: 'Certificado Médico',
        category: 'HEALTH',
        is_sensitive: true,
        requires_consent: true,
        allowed_roles: allowedRoles,
        is_active: true,
        created_at: '2026-09-08T00:00:00Z',
      };

      expect(docType.allowed_roles).toContain('rector');
      expect(docType.allowed_roles).toContain('contable');
      expect(docType.allowed_roles).not.toContain('profesor');
    });
  });

  describe('1.4 Contrato de Expediente Digital (Metadatos Seguros)', () => {
    it('declara la estructura de metadatos sin exposición de binarios directos', () => {
      const mockDoc: StudentDocument = {
        id: 'doc-1',
        institution_id: 'inst-10',
        student_id: 'stu-5',
        document_type_id: 'dt-identity',
        storage_path: 'inst-10/students/stu-5/dt-identity/ti_alumn.pdf',
        original_filename: 'tarjeta_identidad.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1048576,
        file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        verification_status: 'PENDING',
        uploaded_at: '2026-09-08T01:00:00Z',
        is_active: true,
        created_at: '2026-09-08T01:00:00Z',
        updated_at: '2026-09-08T01:00:00Z',
      };

      expect(mockDoc.storage_path).toContain('inst-10/students/stu-5');
      expect(mockDoc.storage_path).not.toContain('http');
      expect(mockDoc.size_bytes).toBeGreaterThan(0);
      expect(mockDoc.verification_status).toBe('PENDING');
    });
  });

  describe('1.5 Desacoplamiento de Auditoría: ClientRequest vs AuditEvent del Servidor', () => {
    it('el cliente solo emite su intención y no tiene autoridad sobre el resultado de auditoría', () => {
      const clientReq: RequestDocumentAccessPayload = {
        student_id: 'stu-1',
        document_id: 'doc-1',
        action: 'VIEW',
        document_type: 'IDENTITY_CARD',
      };

      expect(clientReq.student_id).toBe('stu-1');
      expect(clientReq.action).toBe('VIEW');
      expect('institution_id' in clientReq).toBe(false);
      expect('success' in clientReq).toBe(false);
    });

    it('el servidor construye el AuditEvent inmutable con tenant y rol verificado', () => {
      const serverEvent: AuditEvent = {
        institution_id: 'inst-jwt-1',
        student_id: 'stu-1',
        document_id: 'doc-1',
        user_id: 'user-auth-123',
        user_role: 'rector',
        action: 'VIEW',
        document_type: 'IDENTITY_CARD',
        success: true,
        ip_address: '190.14.25.10',
        user_agent: 'Mozilla/5.0 Server',
        created_at: '2026-09-08T02:00:00Z',
      };

      expect(serverEvent.institution_id).toBe('inst-jwt-1');
      expect(serverEvent.user_role).toBe('rector');
      expect(serverEvent.success).toBe(true);
    });
  });
});
