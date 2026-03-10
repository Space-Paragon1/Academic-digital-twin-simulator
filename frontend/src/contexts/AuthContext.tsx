"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://academic-digital-twin-simulator-production.up.railway.app";
const TOKEN_KEY = "adt_token";
const STUDENT_ID_KEY = "adt_student_id";

interface AuthUser {
  studentId: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  target_gpa?: number;
  weekly_work_hours?: number;
  sleep_target_hours?: number;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, validate any stored token
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    axios
      .get(`${API_BASE}/api/v1/auth/me`, { params: { token: stored } })
      .then(({ data }) => {
        setToken(stored);
        setUser({ studentId: data.student_id, name: data.name, email: data.email });
        localStorage.setItem(STUDENT_ID_KEY, String(data.student_id));
      })
      .catch(() => {
        // Token expired or invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const _applyAuth = (data: { access_token: string; student_id: number; name: string; email: string }) => {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(STUDENT_ID_KEY, String(data.student_id));
    setToken(data.access_token);
    setUser({ studentId: data.student_id, name: data.name, email: data.email });
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await axios.post(`${API_BASE}/api/v1/auth/login`, { email, password });
    _applyAuth(data);
  }, []);

  const register = useCallback(async (payload: RegisterData) => {
    const { data } = await axios.post(`${API_BASE}/api/v1/auth/register`, payload);
    _applyAuth(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STUDENT_ID_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
