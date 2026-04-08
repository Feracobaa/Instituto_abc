import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profesores from "./pages/Profesores";
import Estudiantes from "./pages/Estudiantes";
import Horarios from "./pages/Horarios";
import Grados from "./pages/Grados";
import Materias from "./pages/Materias";
import Calificaciones from "./pages/Calificaciones";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={["rector", "profesor"]}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
