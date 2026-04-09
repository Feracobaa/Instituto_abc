import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AcademicPeriodsManager } from "@/components/dashboard/AcademicPeriodsManager";

vi.mock("@/hooks/useSchoolData", () => ({
  useSetAcademicPeriodState: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

describe("AcademicPeriodsManager", () => {
  it("muestra el estado activo e inactivo de los bimestres", () => {
    render(
      <AcademicPeriodsManager
        periods={[
          {
            id: "period-1",
            name: "Primer Bimestre",
            start_date: "2026-01-15",
            end_date: "2026-03-15",
            is_active: true,
            created_at: "2026-01-01",
          },
          {
            id: "period-2",
            name: "Segundo Bimestre",
            start_date: "2026-03-16",
            end_date: "2026-05-15",
            is_active: false,
            created_at: "2026-01-01",
          },
        ]}
      />,
    );

    expect(screen.getByText("Control de Bimestres")).toBeInTheDocument();
    expect(screen.getByText("Primer Bimestre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activar/ })).toBeInTheDocument();
  });

  it("advierte cuando no existe ningun bimestre activo", () => {
    render(
      <AcademicPeriodsManager
        periods={[
          {
            id: "period-1",
            name: "Primer Bimestre",
            start_date: "2026-01-15",
            end_date: "2026-03-15",
            is_active: false,
            created_at: "2026-01-01",
          },
        ]}
      />,
    );

    expect(screen.getByText(/No hay ningun bimestre activo/)).toBeInTheDocument();
  });
});
