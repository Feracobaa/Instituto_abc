import { Navigate, useLocation } from "react-router-dom";
import { Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionModuleAccess, useInstitutionStatus } from "@/hooks/useSchoolData";
import type { SchoolModuleCode } from "@/features/access/modules";
import { LockedModuleView } from "@/components/layout/LockedModuleView";
import { BlockedInstitutionAlert } from "@/components/layout/BlockedInstitutionAlert";
import { Button } from "@/components/ui/button";

type AllowedRole = "rector" | "profesor" | "contable";
type SupportedAllowedRole = AllowedRole | "parent";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: SupportedAllowedRole[];
  requiredModule?: SchoolModuleCode;
}

export function ProtectedRoute({ children, allowedRoles, requiredModule }: ProtectedRouteProps) {
  const { user, userRole, loading, isProviderOwner, signOut } = useAuth();
  const { data: moduleAccess, isLoading: moduleAccessLoading } = useInstitutionModuleAccess({
    enabled: Boolean(user) && !isProviderOwner,
  });
  const { 
    data: instStatus, 
    isLoading: instStatusLoading,
    isError: instStatusError 
  } = useInstitutionStatus({
    enabled: Boolean(user) && !isProviderOwner,
  });
  const location = useLocation();

  // 1. Mostrar spinner mientras carga la sesión base o el estado de la institución
  if (loading || (!isProviderOwner && instStatusLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Fail-Closed: Bloquear si ocurre un error inesperado al validar la licencia
  if (!isProviderOwner && instStatusError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h2 className="text-lg font-bold text-destructive">Error de verificación</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          No logramos validar el estado de la licencia de la institución debido a un error de conexión. Por favor, reintente más tarde.
        </p>
      </div>
    );
  }

  // 3. No autenticado en el sistema
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // 4. Etymon owner → panel de proveedor
  // IMPORTANTE: evaluado antes de roles institucionales
  if (isProviderOwner) {
    return <Navigate to="/etymon" replace />;
  }

  // 5. Institución suspendida/bloqueada (COMPUERTA PRIORITARIA)
  // Debe ejecutarse ANTES de verificar el rol o módulos para erradicar el bucle de parpadeo
  const isInstitutionBlocked = 
    instStatus?.status === 'blocked' || 
    (instStatus && 'is_active' in instStatus && (instStatus as unknown as { is_active: boolean }).is_active === false);

  if (!isProviderOwner && isInstitutionBlocked) {
    return <BlockedInstitutionAlert institutionName={instStatus?.institution_name ?? null} />;
  }

  // 6. Esperar módulos si la ruta lo exige (solo si la institución no está bloqueada)
  if (!isProviderOwner && requiredModule && moduleAccessLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 7. Usuario autenticado pero sin rol asignado (Evita el bucle cíclico con /auth)
  if (!userRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
          <h2 className="text-lg font-bold text-foreground">Cuenta no autorizada</h2>
          <p className="text-sm text-muted-foreground">
            Tu cuenta no tiene un rol activo asignado en la institución. Por favor, comunícate con la rectoría o secretaría para habilitar tu acceso.
          </p>
          <Button 
            variant="outline" 
            onClick={() => signOut()}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    );
  }

  // 8. Rol no autorizado para esta ruta específica
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  // 9. Módulo deshabilitado institucionalmente
  if (requiredModule) {
    const isModuleEnabled = moduleAccess?.[requiredModule]?.is_enabled;
    if (isModuleEnabled === false) {
      return (
        <div className="flex-1 overflow-auto bg-background/95">
          <LockedModuleView moduleName={requiredModule} />
        </div>
      );
    }
  }

  return children;
}

