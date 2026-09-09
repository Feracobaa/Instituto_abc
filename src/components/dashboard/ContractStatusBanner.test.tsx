import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ContractStatusBanner } from "@/components/dashboard/ContractStatusBanner";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ContractStatusBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renderiza el aviso institucional formal y la fecha formateada en español", () => {
    render(
      <ContractStatusBanner
        daysRemaining={1}
        periodEnd="2026-09-10"
      />
    );

    expect(screen.getByText("Aviso Importante: Licencia del Servicio")).toBeInTheDocument();
    expect(screen.getByText("Vencimiento Inminente")).toBeInTheDocument();
    expect(screen.getByText(/10 de septiembre de 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText(/quedan 1 día/i).length).toBeGreaterThan(0);
  });

  it("muestra el badge de atención requerida cuando quedan entre 4 y 10 días", () => {
    render(
      <ContractStatusBanner
        daysRemaining={7}
        periodEnd="2026-09-16"
      />
    );

    expect(screen.getByText("Atención Requerida")).toBeInTheDocument();
    expect(screen.getAllByText(/quedan 7 días/i).length).toBeGreaterThan(0);
  });

  it("muestra el aviso preventivo cuando quedan más de 10 días", () => {
    render(
      <ContractStatusBanner
        daysRemaining={25}
        periodEnd="2026-10-04"
      />
    );

    expect(screen.getByText("Aviso Preventivo")).toBeInTheDocument();
    expect(screen.getAllByText(/quedan 25 días/i).length).toBeGreaterThan(0);
  });

  it("permite copiar el aviso al portapapeles mediante el botón interactivo", async () => {
    render(
      <ContractStatusBanner
        daysRemaining={1}
        periodEnd="2026-09-10"
      />
    );

    const copyButton = screen.getByRole("button", { name: /copiar aviso/i });
    expect(copyButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("10 de septiembre de 2026")
    );
  });
});
