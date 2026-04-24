import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProviderRouteProps {
  children: React.ReactElement;
}

export function ProviderRoute({ children }: ProviderRouteProps) {
  const { isProviderOwner, loading, user, userRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  if (!isProviderOwner) {
    return <Navigate to={userRole ? '/' : '/auth'} replace />;
  }

  return children;
}
