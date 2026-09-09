import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateContractPdf } from "../contractPdfGenerator";
import type { InstitutionContract } from "../types";

// Mock jsPDF y jspdf-autotable
const mockText = vi.fn();
const mockSave = vi.fn();
const mockAddPage = vi.fn();
const mockSetFont = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockRect = vi.fn();
const mockRoundedRect = vi.fn();
const mockLine = vi.fn();
const mockSetPage = vi.fn();
let mockPageCount = 1;

vi.mock("jspdf", () => {
  return {
    default: vi.fn().mockImplementation(() => {
      mockPageCount = 1;
      return {
        internal: {
          pageSize: {
            getWidth: () => 215.9,
            getHeight: () => 279.4,
          },
        },
        splitTextToSize: (text: string) => (text ? [text] : []),
        text: mockText,
        rect: mockRect,
        roundedRect: mockRoundedRect,
        line: mockLine,
        setFont: mockSetFont,
        setFontSize: mockSetFontSize,
        setTextColor: mockSetTextColor,
        setFillColor: mockSetFillColor,
        setDrawColor: mockSetDrawColor,
        addPage: () => {
          mockPageCount++;
          mockAddPage();
        },
        getNumberOfPages: () => mockPageCount,
        setPage: mockSetPage,
        save: mockSave,
      };
    }),
  };
});

vi.mock("jspdf-autotable", () => {
  return {
    default: vi.fn().mockImplementation((doc) => {
      (doc as any).lastAutoTable = { finalY: 90 };
    }),
  };
});

describe("contractPdfGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleContract: InstitutionContract = {
    id: "ct-123",
    contract_number: "ETM-2026-COL-921",
    institution_id: "inst-1",
    template_id: "tpl-1",
    contract_type: "SAAS_SERVICE_AGREEMENT",
    title: "Contrato Marco de Licenciamiento SaaS",
    status: "sent",
    version: "1.0",
    content_markdown: `
### CLÁUSULA PRIMERA: OBJETO
El Proveedor concede al Cliente una licencia de uso bajo el plan 📦 Plan Integral (Anual) 🚀.

### CLÁUSULA SEGUNDA: CANON DEL SERVICIO
El valor de licenciamiento corresponde a $ 300.000 COP.

### CLÁUSULA CUARTA: PROPIEDAD INTELECTUAL
Los datos académicos son y permanecerán bajo exclusiva titularidad y dominio del Cliente.
    `,
    content_hash: "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
    institution_legal_name: "Colegio Mayor Campestre",
    institution_nit: "900.123.456-7",
    rector_name: "Dr. Juan Manuel Santos",
    rector_document_id: "19.876.543",
    rector_email: "rector@colegio.edu.co",
    plan_name: "📦 Plan Integral (Anual) 🚀",
    plan_price_cop: 300000,
    billing_cycle: "annual",
    valid_from: "2026-09-09",
    valid_until: "2027-09-09",
    metadata: {},
    created_by: "user-1",
    sent_at: "2026-09-09T10:00:00Z",
    sent_by: "user-1",
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
    created_at: "2026-09-09T10:00:00Z",
    updated_at: "2026-09-09T10:00:00Z",
  };

  it("genera el PDF legal guardándolo con el nombre oficial del contrato", () => {
    generateContractPdf(sampleContract);
    expect(mockSave).toHaveBeenCalledWith("ETM-2026-COL-921_SENT.pdf");
  });

  it("sanitiza el nombre del plan en las llamadas de texto para evitar glifos corruptos", () => {
    generateContractPdf(sampleContract);
    
    // Verificar que ninguna llamada a doc.text incluya los emojis originales ni los caracteres corruptos
    const textCalls = mockText.mock.calls.map((c) => String(c[0]));
    const hasCorruptGliphs = textCalls.some((t) => t.includes("Ø") || t.includes("Ü") || t.includes("ž"));
    expect(hasCorruptGliphs).toBe(false);

    // Verificar que el plan sanitizado esté presente
    const hasSanitizedPlan = textCalls.some((t) => t.includes("Plan Integral (Anual)"));
    expect(hasSanitizedPlan).toBe(true);
  });

  it("renderiza el bloque de firmas bilaterales para ambas partes", () => {
    generateContractPdf(sampleContract);

    const textCalls = mockText.mock.calls.map((c) => String(c[0]));
    expect(textCalls.some((t) => t.includes("POR EL PROVEEDOR (LICENCIANTE)"))).toBe(true);
    expect(textCalls.some((t) => t.includes("POR EL CLIENTE (INSTITUCIÓN EDUCATIVA)"))).toBe(true);
    expect(textCalls.some((t) => t.includes("LEY 527 DE 1999"))).toBe(true);
  });
});
