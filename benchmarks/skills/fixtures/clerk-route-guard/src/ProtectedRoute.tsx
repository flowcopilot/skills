import { useAuth } from "@clerk/react";
import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return <Navigate to="/sign-in" />;
  return <Outlet />;
}
