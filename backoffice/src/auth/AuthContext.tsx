import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, apiRequest, type RequestOptions } from '../api/client';
import { clearToken, isExpired, readToken, tokenExpiry, writeToken } from './token';

export type EndReason = 'expired' | 'logged_out';

interface AuthValue {
  token: string | null;
  // Why the last session ended, shown once on the login page.
  endReason: EndReason | null;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  // Calls the API with the token. A 401 ends the session and goes to the login page.
  request<T>(path: string, opts?: Omit<RequestOptions, 'token'>): Promise<T>;
}

const AuthContext = createContext<AuthValue | null>(null);

// setTimeout fires at once for delays above this.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

function initialToken(): string | null {
  const token = readToken();
  if (token && !isExpired(token)) return token;
  clearToken();
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(initialToken);
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const navigate = useNavigate();

  const endSession = useCallback(
    (reason: EndReason) => {
      clearToken();
      setToken(null);
      setEndReason(reason);
      navigate('/login', { replace: true });
    },
    [navigate],
  );

  // Log out on our own when the token expires.
  useEffect(() => {
    if (!token) return;
    const exp = tokenExpiry(token);
    if (exp === null) return;
    const id = setTimeout(() => endSession('expired'), Math.min(Math.max(exp - Date.now(), 0), MAX_TIMEOUT_MS));
    return () => clearTimeout(id);
  }, [token, endSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<{ accessToken: string }>('/api/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    writeToken(res.accessToken);
    setEndReason(null);
    setToken(res.accessToken);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      // The session ends here even if the server cannot be reached.
      await apiRequest('/api/auth/logout', { method: 'POST', token }).catch(() => undefined);
    }
    endSession('logged_out');
  }, [token, endSession]);

  const request = useCallback(
    async <T,>(path: string, opts: Omit<RequestOptions, 'token'> = {}) => {
      try {
        return await apiRequest<T>(path, { ...opts, token });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) endSession('expired');
        throw e;
      }
    },
    [token, endSession],
  );

  const value = useMemo(
    () => ({ token, endReason, login, logout, request }),
    [token, endReason, login, logout, request],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
