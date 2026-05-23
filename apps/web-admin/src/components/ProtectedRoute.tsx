import { Navigate, useLocation } from 'react-router-dom';
import { getSession } from '../lib/auth';
import type { UserRole } from '../types/db.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const role = session.user.role;

  if (allowedRoles && !allowedRoles.includes(role)) {
    const fallback = role === 'CUSTOMER' ? '/app' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
