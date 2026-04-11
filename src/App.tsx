import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profesores = lazy(() => import("./pages/Profesores"));
const Estudiantes = lazy(() => import("./pages/Estudiantes"));
const Familias = lazy(() => import("./pages/Familias"));
const Horarios = lazy(() => import("./pages/Horarios"));
const Grados = lazy(() => import("./pages/Grados"));
const Materias = lazy(() => import("./pages/Materias"));
const Calificaciones = lazy(() => import("./pages/Calificaciones"));
const MisNotas = lazy(() => import("./pages/MisNotas"));
const MiHorario = lazy(() => import("./pages/MiHorario"));
const MiPerfil = lazy(() => import("./pages/MiPerfil"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 60 * 1000,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
      // The platform already invalidates queries after mutations, so a longer
      // freshness window keeps idle sessions from re-fetching the whole dashboard.
      staleTime: 15 * 60 * 1000,
    },
  },
});

const AppFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="text-sm font-medium text-muted-foreground">Cargando...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Analytics />
        <SpeedInsights />
        <AuthProvider>
          <Suspense fallback={<AppFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor", "parent"]}>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profesores"
                element={
                  <ProtectedRoute allowedRoles={["rector"]}>
                    <Profesores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiantes"
                element={
                  <ProtectedRoute allowedRoles={["rector"]}>
                    <Estudiantes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/familias"
                element={
                  <ProtectedRoute allowedRoles={["rector"]}>
                    <Familias />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/horarios"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]}>
                    <Horarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grados"
                element={
                  <ProtectedRoute allowedRoles={["rector"]}>
                    <Grados />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/materias"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]}>
                    <Materias />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calificaciones"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]}>
                    <Calificaciones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mis-notas"
                element={
                  <ProtectedRoute allowedRoles={["parent"]}>
                    <MisNotas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mi-horario"
                element={
                  <ProtectedRoute allowedRoles={["parent"]}>
                    <MiHorario />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mi-perfil"
                element={
                  <ProtectedRoute allowedRoles={["parent"]}>
                    <MiPerfil />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
