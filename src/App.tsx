import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
            <Route path="/" element={<Index />} />
            <Route path="/profesores" element={<Profesores />} />
            <Route path="/estudiantes" element={<Estudiantes />} />
            <Route path="/horarios" element={<Horarios />} />
            <Route path="/grados" element={<Grados />} />
            <Route path="/materias" element={<Materias />} />
            <Route path="/calificaciones" element={<Calificaciones />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
