import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionModuleAccess, useInstitutionStatus } from "@/hooks/useSchoolData";
import type { SchoolModuleCode } from "@/features/access/modules";
import { LockedModuleView } from "@/components/layout/LockedModuleView";
import { BlockedInstitutionAlert } from "@/components/layout/BlockedInstitutionAlert";

type AllowedRole = "rector" | "profesor" | "contable";
type SupportedAllowedRole = AllowedRole | "parent";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: SupportedAllowedRole[];
  requiredModule?: SchoolModuleCode;
}

export function ProtectedRoute({ children, allowedRoles, requiredModule }: ProtectedRouteProps) {
  const { user, userRole, loading, isProviderOwner } = useAuth();
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

  // Show spinner while auth, modules or institution status resolves
  if (loading || (!isProviderOwner && (instStatusLoading || (requiredModule && moduleAccessLoading)))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fail-Closed: Bloquear si ocurre un error inesperado al validar la licencia
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

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Etymon owner → provider panel
  // IMPORTANT: checked BEFORE userRole since Etymon admins have no institutional role
  if (isProviderOwner) {
    return <Navigate to="/etymon" replace />;
  }

  // Logged in but no role assigned
  if (!userRole) {
    return <Navigate to="/auth" replace />;
  }

  // If institution is blocked (and current user is not provider owner accessing for support)
  if (!isProviderOwner && instStatus?.status === 'blocked') {
    return <BlockedInstitutionAlert institutionName={instStatus?.institution_name ?? null} />;
  }

  // Role not allowed for this route
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  // Module disabled for this institution
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

