import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { login as apiLogin, logout as apiLogout, getMe } from "../services/api";

// Mirrors api/models.py -> Role(models.TextChoices)
export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  RECEPTIONIST: "RECEPTIONIST",
  CASHIER: "CASHIER",
  NURSE: "NURSE",
  DOCTOR: "DOCTOR",
  LAB_TECHNOLOGIST: "LAB_TECHNOLOGIST",
  RADIOLOGIST: "RADIOLOGIST",
  PHARMACIST: "PHARMACIST",
  ACCOUNTANT: "ACCOUNTANT",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const navigate = useNavigate();

  // On first load, if a token already exists (page refresh / new tab),
  // hydrate the session by asking the API who we are.
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    getMe()
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await apiLogout(refresh);
    } catch {
      // Best-effort: still clear the local session even if the API call fails
      // (e.g. token already expired, network is down).
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  // Re-fetch the current user, e.g. after a profile edit or role change.
  const refreshUser = useCallback(async () => {
    const data = await getMe();
    setUser(data);
    return data;
  }, []);

  // Update the cached user in place without a round-trip (optimistic UI).
  const patchUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false;
      if (user.role === ROLES.SUPER_ADMIN) return true; // Super Admin always has full access
      return roles.includes(user.role);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isBootstrapping,
      isSuperAdmin: user?.role === ROLES.SUPER_ADMIN,
      login,
      logout,
      refreshUser,
      patchUser,
      hasRole,
    }),
    [user, isBootstrapping, login, logout, refreshUser, patchUser, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}