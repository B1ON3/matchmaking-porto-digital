import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services';
import { clearToken, getToken, setToken } from '../services/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (dados: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ao abrir a app tenta recuperar a sessao a partir do token guardado
  useEffect(() => {
    let ativo = true;

    async function recuperarSessao() {
      if (!getToken()) {
        setLoading(false);
        return;
      }

      try {
        const usuario = await authService.me();

        if (ativo) {
          setUser(usuario);
        }
      } catch {
        clearToken();
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    void recuperarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  // o interceptor do axios dispara esse evento quando o token expira
  useEffect(() => {
    function aoExpirar() {
      setUser(null);
    }

    window.addEventListener('matchmaking:unauthorized', aoExpirar);

    return () => window.removeEventListener('matchmaking:unauthorized', aoExpirar);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: usuario } = await authService.login(email, password);
    setToken(token);
    setUser(usuario);
  }, []);

  const register = useCallback(async (dados: Record<string, unknown>) => {
    const { token, user: usuario } = await authService.register(dados);
    setToken(token);
    setUser(usuario);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.role === 'ADMIN',
    }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error('useAuth precisa estar dentro do AuthProvider');
  }

  return contexto;
}