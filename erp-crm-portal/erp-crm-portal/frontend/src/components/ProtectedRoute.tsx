import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, Role } from "../context/AuthContext";

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="page">
        <h2>Access denied</h2>
        <p>Your role ({user.role}) does not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
