'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null
  });
  const router = useRouter();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });

      if (response.ok) {
        const userData = await response.json();
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          user: userData
        });
        return true;
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null
        });
        return false;
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null
      });
      return false;
    }
  };

  const redirectToLogin = () => {
    router.push('/');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error durante logout:', error);
    } finally {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null
      });
      redirectToLogin();
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    ...authState,
    checkAuth,
    redirectToLogin,
    logout
  };
}

// Hook para hacer peticiones autenticadas con manejo automático de errores 401
export function useAuthenticatedFetch() {
  const { redirectToLogin } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include'
    });

    if (response.status === 401) {
      console.log('🔒 Token expirado o inválido, redirigiendo al login...');
      redirectToLogin();
      throw new Error('No autorizado');
    }

    return response;
  };

  return { authenticatedFetch };
}