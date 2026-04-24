import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAcademicPeriods, useGuardianAccount } from "@/hooks/useSchoolData";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "react-router-dom";

interface MainLayoutProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/contabilidad": "Contabilidad",
  "/usuarios": "Usuarios",
  "/profesores": "Profesores",
  "/estudiantes": "Estudiantes",
  "/familias": "Portal Estudiantil",
  "/horarios": "Horarios",
  "/grados": "Grados",
  "/materias": "Materias",
  "/calificaciones": "Calificaciones",
  "/mis-notas": "Mis Notas",
  "/mi-horario": "Mi Horario",
  "/mi-perfil": "Mi Perfil",
};

export function MainLayout({ children }: MainLayoutProps) {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: periods } = useAcademicPeriods();
  const guardianAccountQuery = useGuardianAccount(userRole === "parent");

  const activePeriod = periods?.find((period) => period.is_active);
  const pageTitle = pageTitles[location.pathname] ?? "Instituto ABC";
  const needsGuardianOnboarding = Boolean(
    userRole === "parent"
    && guardianAccountQuery.data
    && (
      guardianAccountQuery.data.must_change_password
      || !guardianAccountQuery.data.onboarding_completed_at
    ),
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    if (needsGuardianOnboarding && location.pathname !== "/mi-perfil") {
      navigate("/mi-perfil", { replace: true });
    }
  }, [user, loading, navigate, needsGuardianOnboarding, location.pathname]);

  if (loading || (userRole === "parent" && guardianAccountQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-sm transition-all duration-300">
            <SidebarTrigger className="flex-shrink-0 hover-lift" />
            <div className="h-4 w-px bg-border" />
            
            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Inicio</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {location.pathname !== "/" && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>

            <h2 className="text-sm font-semibold text-foreground sm:hidden">{pageTitle}</h2>

            <div className="flex-1" />
            {needsGuardianOnboarding ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Completa tu perfil inicial
              </span>
            ) : activePeriod ? (
              <span className="hidden items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-success" />
                {activePeriod.name}
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {userRole === "rector" ? "Sin bimestre activo" : "Modo consulta"}
              </span>
            )}
          </header>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
