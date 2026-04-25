import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionModuleAccess } from "@/hooks/useSchoolData";
import type { SchoolModuleCode } from "@/features/access/modules";
import { LockedModuleView } from "@/components/layout/LockedModuleView";

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
  const location = useLocation();

  // Show spinner while auth or module access is resolving
  if (loading || (!isProviderOwner && requiredModule && moduleAccessLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  // Role not allowed for this route
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  // Module disabled for this institution
  if (requiredModule) {
    const isModuleEnabled = moduleAccess?.[requiredModule];
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
