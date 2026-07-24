import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * allowedRoles is optional. Every existing usage of <ProtectedRoute>
 * without it behaves exactly as before — authentication check only.
 * Pass allowedRoles={['police']} (etc.) to additionally restrict a
 * route to specific roles, e.g. for /police/dashboard.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Signed in, but the wrong role for this route — send them back to
    // the dashboard gate rather than the login page, since they don't
    // need to sign in again, just somewhere they're actually allowed.
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}