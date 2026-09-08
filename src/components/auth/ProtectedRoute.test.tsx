import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionModuleAccess, useInstitutionStatus } from "@/hooks/useSchoolData";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useSchoolData", () => ({
  useInstitutionModuleAccess: vi.fn(),
  useInstitutionStatus: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseInstitutionModuleAccess = vi.mocked(useInstitutionModuleAccess);
const mockedUseInstitutionStatus = vi.mocked(useInstitutionStatus);

const defaultAuthState = {
  loading: false,
  session: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  effectiveInstitutionId: "institution-1",
  isProviderOwner: false,
  refreshSupportContext: vi.fn(),
  supportContext: null,
  teacherId: null,
  user: { id: "user-1" },
  userRole: "rector" as const,
};

function renderProtectedRoute(allowedRoles?: Array<"rector" | "profesor" | "parent">) {
  return render(
    <MemoryRouter initialEntries={["/privada"]}>
      <Routes>
        <Route path="/auth" element={<div>Auth</div>} />
        <Route path="/" element={<div>Home</div>} />
        <Route
          path="/privada"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Contenido privado</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue(defaultAuthState as never);
    mockedUseInstitutionModuleAccess.mockReturnValue({
      data: {},
      isLoading: false,
    } as never);
    mockedUseInstitutionStatus.mockReturnValue({
      data: { status: 'active', reason: 'normal', institution_name: 'Test Institution', current_period_end: null, days_remaining: null },
      isLoading: false,
    } as never);
  });

  it("redirige a auth cuando no hay usuario autenticado", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      user: null,
      userRole: null,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Auth")).toBeInTheDocument();
  });

  it("redirige al inicio cuando el rol no esta autorizado", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      userRole: "profesor",
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("renderiza el contenido cuando el rol si esta autorizado", () => {
    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Contenido privado")).toBeInTheDocument();
  });

  it("permite el acceso cuando el rol parent esta autorizado", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      userRole: "parent",
    } as never);

    renderProtectedRoute(["parent"]);

    expect(screen.getByText("Contenido privado")).toBeInTheDocument();
  });

  it("no renderiza nada mientras la sesion carga", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      loading: true,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(document.querySelector(".animate-spin")).toBeTruthy();
  });

  it("muestra pantalla de cuenta no autorizada cuando hay usuario autenticado pero sin rol asignado", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      userRole: null,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Cuenta no autorizada")).toBeInTheDocument();
    expect(screen.getByText("Cerrar Sesión")).toBeInTheDocument();
  });

  it("renderiza BlockedInstitutionAlert cuando la institución está bloqueada con rol rector", () => {
    mockedUseInstitutionStatus.mockReturnValue({
      data: {
        status: 'blocked',
        reason: 'overdue',
        institution_name: 'Colegio Demo',
        current_period_end: '2026-09-01',
        days_remaining: 0,
      },
      isLoading: false,
      isError: false,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Acceso Suspendido")).toBeInTheDocument();
    expect(screen.getByText("Colegio Demo")).toBeInTheDocument();
    expect(screen.getByText("Contactar Soporte")).toBeInTheDocument();
  });

  it("renderiza BlockedInstitutionAlert cuando la institución está bloqueada incluso si userRole es null (evita bucle de parpadeo)", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      userRole: null,
    } as never);

    mockedUseInstitutionStatus.mockReturnValue({
      data: {
        status: 'blocked',
        reason: 'subscription_expired',
        institution_name: 'Instituto ABC',
        current_period_end: '2026-08-30',
        days_remaining: 0,
      },
      isLoading: false,
      isError: false,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Acceso Suspendido")).toBeInTheDocument();
    expect(screen.queryByText("Auth")).not.toBeInTheDocument();
  });

  it("renderiza BlockedInstitutionAlert cuando la institución tiene is_active en false", () => {
    mockedUseInstitutionStatus.mockReturnValue({
      data: {
        is_active: false,
        institution_name: 'Colegio Inactivo',
      },
      isLoading: false,
      isError: false,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Acceso Suspendido")).toBeInTheDocument();
  });
});
