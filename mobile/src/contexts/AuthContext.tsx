import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getItem, setItem, deleteItem } from '../lib/storage';
import api, { TOKEN_KEY } from '../lib/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  // Rehydrate token on mount
  useEffect(() => {
    (async () => {
      const token = await getItem(TOKEN_KEY);
      if (token) {
        try {
          const { data } = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
          setState({ user: data.data.user, token, isLoading: false });
        } catch {
          await deleteItem(TOKEN_KEY);
          setState({ user: null, token: null, isLoading: false });
        }
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const persistToken = async (token: string) => {
    await setItem(TOKEN_KEY, token);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/login', {
      email,
      password,
    });
    await persistToken(data.data.token);
    setState({ user: data.data.user, token: data.data.token, isLoading: false });
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const { data } = await api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/google', {
      idToken,
    });
    await persistToken(data.data.token);
    setState({ user: data.data.user, token: data.data.token, isLoading: false });
  }, []);

  const logout = useCallback(async () => {
    await deleteItem(TOKEN_KEY);
    setState({ user: null, token: null, isLoading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
    setState((s) => ({ ...s, user: data.data.user }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithGoogle, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
