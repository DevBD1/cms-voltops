import { Navigate, useLocation } from 'react-router-dom';
import { getSession, isAuthenticated } from '../lib/auth';
import type { UserRole } from '../types/db.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const session = getSession();

  if (!isAuthenticated() || !session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    const fallback = session.role === 'CUSTOMER' ? '/app' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
