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
import { ProviderRoute } from "@/components/auth/ProviderRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Contabilidad = lazy(() => import("./pages/Contabilidad"));
const Pensiones = lazy(() => import("./pages/Pensiones"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Profesores = lazy(() => import("./pages/Profesores"));
const Estudiantes = lazy(() => import("./pages/Estudiantes"));
const Familias = lazy(() => import("./pages/Familias"));
const Horarios = lazy(() => import("./pages/Horarios"));
const Grados = lazy(() => import("./pages/Grados"));
const Materias = lazy(() => import("./pages/Materias"));
const Calificaciones = lazy(() => import("./pages/Calificaciones"));
const Asistencias = lazy(() => import("./pages/Asistencias"));
const MisNotas = lazy(() => import("./pages/MisNotas"));
const MiHorario = lazy(() => import("./pages/MiHorario"));
const MiPerfil = lazy(() => import("./pages/MiPerfil"));
const PortalEstudiantil = lazy(() => import("./pages/PortalEstudiantil"));
const EtymonDashboard = lazy(() => import("./pages/etymon/EtymonDashboard"));
const EtymonInstituciones = lazy(() => import("./pages/etymon/EtymonInstituciones"));
const EtymonSuscripciones = lazy(() => import("./pages/etymon/EtymonSuscripciones"));
const EtymonSoporte = lazy(() => import("./pages/etymon/EtymonSoporte"));
const EtymonAuditoria = lazy(() => import("./pages/etymon/EtymonAuditoria"));
const EtymonUsuarios = lazy(() => import("./pages/etymon/EtymonUsuarios"));
const EtymonPlanes = lazy(() => import("./pages/etymon/EtymonPlanes"));
const EtymonPermisos = lazy(() => import("./pages/etymon/EtymonPermisos"));
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
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Analytics />
        <SpeedInsights />
        <AuthProvider>
          <Suspense fallback={<AppFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/login/:slug" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor", "parent", "contable"]} requiredModule="dashboard">
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contabilidad"
                element={
                  <ProtectedRoute allowedRoles={["rector", "contable"]} requiredModule="contabilidad">
                    <Contabilidad />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pensiones"
                element={
                  <ProtectedRoute allowedRoles={["rector", "contable"]} requiredModule="contabilidad">
                    <Pensiones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute allowedRoles={["rector"]} requiredModule="usuarios">
                    <Usuarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profesores"
                element={
                  <ProtectedRoute allowedRoles={["rector"]} requiredModule="profesores">
                    <Profesores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiantes"
                element={
                  <ProtectedRoute allowedRoles={["rector"]} requiredModule="estudiantes">
                    <Estudiantes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/familias"
                element={
                  <ProtectedRoute allowedRoles={["rector"]} requiredModule="familias">
                    <Familias />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/horarios"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]} requiredModule="horarios">
                    <Horarios />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grados"
                element={
                  <ProtectedRoute allowedRoles={["rector"]} requiredModule="grados">
                    <Grados />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/materias"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]} requiredModule="materias">
                    <Materias />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calificaciones"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]} requiredModule="calificaciones">
                    <Calificaciones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/asistencias"
                element={
                  <ProtectedRoute allowedRoles={["rector", "profesor"]} requiredModule="asistencias">
                    <Asistencias />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal"
                element={
                  <ProtectedRoute allowedRoles={["parent"]} requiredModule="mis_notas">
                    <PortalEstudiantil />
                  </ProtectedRoute>
                }
              />
              {/* Legacy redirects - keep for bookmarks */}
              <Route path="/mis-notas" element={<ProtectedRoute allowedRoles={["parent"]}><MisNotas /></ProtectedRoute>} />
              <Route path="/mi-horario" element={<ProtectedRoute allowedRoles={["parent"]}><MiHorario /></ProtectedRoute>} />
              <Route path="/mi-perfil" element={<ProtectedRoute allowedRoles={["parent"]}><MiPerfil /></ProtectedRoute>} />
              <Route
                path="/etymon"
                element={
                  <ProviderRoute>
                    <EtymonDashboard />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/instituciones"
                element={
                  <ProviderRoute>
                    <EtymonInstituciones />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/suscripciones"
                element={
                  <ProviderRoute>
                    <EtymonSuscripciones />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/planes"
                element={
                  <ProviderRoute>
                    <EtymonPlanes />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/soporte"
                element={
                  <ProviderRoute>
                    <EtymonSoporte />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/auditoria"
                element={
                  <ProviderRoute>
                    <EtymonAuditoria />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/usuarios"
                element={
                  <ProviderRoute>
                    <EtymonUsuarios />
                  </ProviderRoute>
                }
              />
              <Route
                path="/etymon/permisos"
                element={
                  <ProviderRoute>
                    <EtymonPermisos />
                  </ProviderRoute>
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
