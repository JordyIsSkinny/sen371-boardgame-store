import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  apiClient,
  setAccessToken,
  setUnauthorizedHandler,
  refreshAccessToken,
} from "../api/client.js";
import { LoadingState } from "../components/LoadingState.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Best-effort: clear local state regardless of whether the server call
      // succeeded, so a network blip never leaves the UI stuck "logged in".
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  // Access tokens are memory-only, so every full page load starts logged
  // out until this succeeds. Runs once on mount.
  useEffect(() => {
    async function silentRefresh() {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          const { data } = await apiClient.get("/users/me");
          setUser(data);
        } catch {
          setAccessToken(null);
        }
      }
      setIsLoading(false);
    }
    silentRefresh();
  }, []);

  async function login(email, password) {
    // Every endpoint responds { data: ... } (team decision, issue #51 —
    // covers auth too, not just resource endpoints).
    const { data } = await apiClient.post("/auth/login", { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function register(firstName, lastName, email, password) {
    const { data } = await apiClient.post("/auth/register", {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  const value = { user, isLoading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState message="Checking your session..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState message="Checking your session..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
