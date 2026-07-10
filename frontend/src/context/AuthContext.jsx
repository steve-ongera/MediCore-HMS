// src/context/AuthContext.jsx
import { createContext, useCallback, useEffect, useState } from "react";
import * as api from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await api.logout(refresh);
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.clear();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await api.getMe();
    setUser(me);
    return me;
  }, []);

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}