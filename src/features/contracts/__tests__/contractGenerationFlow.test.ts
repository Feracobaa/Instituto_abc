import { describe, it, expect, vi } from 'vitest';
import { interpolateContractMarkdown } from '../contractInterpolation';
import { generateContractPdf } from '../contractPdfGenerator';
import type { InstitutionContract } from '../types';

// Mock jsPDF y jspdf-autotable para validar generación en entorno headless
const mockSave = vi.fn();
const mockText = vi.fn();
const mockAddPage = vi.fn();
let pageCount = 1;

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      pageCount = 1;
      return {
        internal: {
          pageSize: {
            getWidth: () => 215.9,
            getHeight: () => 279.4,
          },
        },
        splitTextToSize: (text: string) => (text ? [text] : []),
        text: mockText,
        rect: vi.fn(),
        roundedRect: vi.fn(),
        line: vi.fn(),
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setTextColor: vi.fn(),
        setFillColor: vi.fn(),
        setDrawColor: vi.fn(),
        addPage: () => {
          pageCount++;
          mockAddPage();
        },
        getNumberOfPages: () => pageCount,
        setPage: vi.fn(),
        save: mockSave,
      };
    }),
  };
});

vi.mock("jspdf-autotable", () => {
  return {
    default: vi.fn().mockImplementation((doc) => {
      (doc as any).lastAutoTable = { finalY: 85 };
    }),
  };
});

describe('Flujo Completo de Generación de Contratos (Phase 4 Integration)', () => {
  const sampleTemplate = `
# CONTRATO DE PRESTACIÓN DE SERVICIOS SAAS

Entre los suscritos, a saber: por una parte **ETYMON S.A.S.**, y por la otra **{{INSTITUTION_NAME}}**, con NIT {{NIT}}, con domicilio en {{ADDRESS}}, legalmente representada por **{{RECTOR_NAME}}**, acuerdan celebrar el presente contrato bajo las siguientes cláusulas:

### CLÁUSULA PRIMERA - OBJETO Y ALCANCE 📦
El PRESTADOR otorgará a la INSTITUCIÓN acceso a la plataforma según el plan contratado: **{{PLAN_NAME}}**.

### CLÁUSULA SEGUNDA - VALOR Y FORMA DE PAGO 💰
El canon mensual convenido corresponde a **{{PRICE_COP}}**, facturado periódicamente.

### CLÁUSULA TERCERA - OBLIGACIONES “ESPECIALES”
1. La institución mantendrá sus credenciales con estricta confidencialidad.
2. Cumplimiento con la Ley 1581 de 2012 y Ley 527 de 1999.
  `.trim();

  it('interpola correctamente los metadatos institucionales reales sin duplicidades de NIT ni glifos corruptos', () => {
    const variables = {
      contractNumber: 'ETM-2026-COL-889',
      institutionName: 'Colegio Mayor Santa María',
      nit: '900.555.777-1',
      rectorName: 'Dra. Elena Robledo',
      address: 'Carrera 15 # 85-30, Bogotá D.C.',
      planName: 'Plan Campus Integra',
      priceCop: 1800000,
    };

    const interpolated = interpolateContractMarkdown(sampleTemplate, variables);

    // Verificaciones de datos reales interpolados
    expect(interpolated).toContain('Colegio Mayor Santa María');
    expect(interpolated).toContain('con NIT 900.555.777-1');
    expect(interpolated).not.toContain('NIT NIT');
    expect(interpolated).not.toContain('Pendiente de registro');
    expect(interpolated).toContain('Dra. Elena Robledo');
    expect(interpolated).toContain('Carrera 15 # 85-30, Bogotá D.C.');
    expect(interpolated).toContain('Plan Campus Integra');
    expect(interpolated).toContain('1.800.000');

    // Verificaciones de sanitización: Emojis removidos y comillas tipográficas normalizadas
    expect(interpolated).not.toContain('📦');
    expect(interpolated).not.toContain('💰');
    expect(interpolated).toContain('"ESPECIALES"');
  });

  it('soporta sinónimos en español para plantillas redactadas con variables locales', () => {
    const templateSpanish = `
Contrato N° {{NUMERO_CONTRATO}} celebrado con {{INSTITUCION_NOMBRE}} (NIT: {{NIT}}).
Rector: {{REPRESENTANTE_LEGAL}}, Dirección: {{DIRECCION}}.
Plan: {{PLAN_SERVICIO}}, Tarifa: {{CANON_MENSUAL}}.
    `.trim();

    const interpolated = interpolateContractMarkdown(templateSpanish, {
      contractNumber: 'CONV-2026-001',
      institutionName: 'Liceo Pedagógico del Valle',
      nit: '800.999.111-2',
      rectorName: 'Lic. Germán Vargas',
      address: 'Calle 10 # 4-20, Cali',
      planName: 'Plan Escolar Básico',
      priceCop: 950000,
    });

    expect(interpolated).toContain('Liceo Pedagógico del Valle');
    expect(interpolated).toContain('800.999.111-2');
    expect(interpolated).toContain('Lic. Germán Vargas');
    expect(interpolated).toContain('Calle 10 # 4-20, Cali');
    expect(interpolated).toContain('Plan Escolar Básico');
    expect(interpolated).toContain('950.000');
  });

  it('gestiona ordenadamente la ausencia de metadatos mediante fallbacks no redundantes', () => {
    const interpolated = interpolateContractMarkdown(sampleTemplate, {});

    // Fallbacks limpios sin redundancias como "con NIT NIT por registrar"
    expect(interpolated).not.toContain('con NIT NIT');
    expect(interpolated).toContain('con NIT Pendiente de registro');
    expect(interpolated).toContain('Institución Adscrita');
    expect(interpolated).toContain('Rector Titular');
    expect(interpolated).toContain('Sede Principal Institucional');
  });

  it('ejecuta exitosamente el motor de generación PDF con diagramación ejecutiva y bloque bilateral', () => {
    const contract: InstitutionContract = {
      id: 'ct-test-2026',
      contract_number: 'ETM-2026-COL-042',
      institution_id: 'inst-001',
      template_id: 'tmpl-001',
      contract_type: 'saas_service',
      title: 'Contrato de Suscripción Anual SaaS',
      status: 'draft',
      version: '1.2',
      content_markdown: `
### CLÁUSULA PRIMERA - OBJETO
Prestación del servicio integral de software educativo Etymon.

### CLÁUSULA SEGUNDA - VIGENCIA
El presente contrato tendrá una vigencia improrrogable de doce meses.
      `.trim(),
      content_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      institution_legal_name: 'Colegio Colombo Británico',
      institution_nit: '900.111.222-3',
      rector_name: 'Dr. Charles Spencer',
      rector_document_id: '79.123.456',
      rector_email: 'rectoria@colombobritanico.edu.co',
      plan_name: 'Plan Campus Integra',
      plan_price_cop: 2500000,
      billing_cycle: 'monthly',
      valid_from: '2026-03-01',
      valid_until: '2027-02-28',
      created_at: new Date().toISOString(),
      metadata: {},
      created_by: null,
      sent_at: null,
      sent_by: null,
      signed_at: null,
      signed_by_user_id: null,
      signer_name: null,
      signer_document_id: null,
      signer_role: null,
      signature_hash: null,
      signature_metadata: {},
      revoked_at: null,
      revoked_by: null,
      revocation_reason: null,
    };

    expect(() => generateContractPdf(contract)).not.toThrow();
    expect(mockSave).toHaveBeenCalledWith('ETM-2026-COL-042_DRAFT.pdf');
  });
});
