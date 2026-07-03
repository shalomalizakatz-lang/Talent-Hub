import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ children }) {
  const { authenticated } = useAuth();
  const location = useLocation();

  if (authenticated === null) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
