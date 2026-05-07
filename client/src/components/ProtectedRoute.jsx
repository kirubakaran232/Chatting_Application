import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600 dark:text-slate-200">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.profileComplete) return <Navigate to="/profile" replace />;
  return children;
}
