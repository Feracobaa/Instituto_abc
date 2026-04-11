import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

const defaultAuthState = {
  loading: false,
  session: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
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

  it("envia a auth cuando hay usuario pero aun no existe un rol valido", () => {
    mockedUseAuth.mockReturnValue({
      ...defaultAuthState,
      userRole: null,
    } as never);

    renderProtectedRoute(["rector"]);

    expect(screen.getByText("Auth")).toBeInTheDocument();
  });
});
