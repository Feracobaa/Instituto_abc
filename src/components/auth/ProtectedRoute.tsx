import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInstitutionModuleAccess } from "@/hooks/useSchoolData";
import type { SchoolModuleCode } from "@/features/access/modules";

type AllowedRole = "rector" | "profesor" | "contable";
type SupportedAllowedRole = AllowedRole | "parent";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: SupportedAllowedRole[];
  requiredModule?: SchoolModuleCode;
}

export function ProtectedRoute({ children, allowedRoles, requiredModule }: ProtectedRouteProps) {
  const { user, userRole, loading, isProviderOwner } = useAuth();
  const { data: moduleAccess, isLoading: moduleAccessLoading } = useInstitutionModuleAccess({ enabled: Boolean(user) });
  const location = useLocation();

  if (loading || (requiredModule && moduleAccessLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!userRole) {
    return <Navigate to="/auth" replace />;
  }

  if (isProviderOwner) {
    return children;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  if (requiredModule) {
    const isModuleEnabled = moduleAccess?.[requiredModule];
    if (isModuleEnabled === false) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
