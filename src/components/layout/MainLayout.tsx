import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useAcademicPeriods } from "@/hooks/useSchoolData";

interface MainLayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/profesores': 'Profesores',
  '/estudiantes': 'Estudiantes',
  '/horarios': 'Horarios',
  '/grados': 'Grados',
  '/materias': 'Materias',
  '/calificaciones': 'Calificaciones',
};

export function MainLayout({ children }: MainLayoutProps) {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: periods } = useAcademicPeriods();

  const activePeriod = periods?.find(p => p.is_active);
  const pageTitle = pageTitles[location.pathname] ?? 'Instituto ABC';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 sticky top-0 z-10 gap-3">
            <SidebarTrigger className="flex-shrink-0" />
            <div className="h-4 w-px bg-border" />
            <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
            <div className="flex-1" />
            {activePeriod ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
                {activePeriod.name}
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {userRole === "rector" ? "Sin bimestre activo" : "Modo consulta"}
              </span>
            )}
          </header>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
