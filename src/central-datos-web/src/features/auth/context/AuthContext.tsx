import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CurrentUser, LoginRequest } from '../types/auth.types';
import { authApi } from '../api/authApi';
import { API_ENDPOINTS } from '../../../constants/api.constants';

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<{ success: boolean; errorMessage?: string }>;
  logout: () => Promise<void>;
  logNavigation: (route: string, details?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'tuv_token';
const USER_KEY = 'tuv_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Limpieza defensiva de persistencia antigua en localStorage
  if (typeof window !== 'undefined' && localStorage.getItem(TOKEN_KEY)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Usar sessionStorage para que al cerrar la pestaña o reiniciar el entorno se deba iniciar sesión siempre
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const cached = sessionStorage.getItem(USER_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validar el token guardado en la sesión activa al arrancar
  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      const storedToken = sessionStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        const validatedUser = await authApi.getCurrentUser(storedToken);
        if (isMounted) {
          if (validatedUser) {
            setUser(validatedUser);
            sessionStorage.setItem(USER_KEY, JSON.stringify(validatedUser));
          } else {
            // Token expirado o inválido
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    }

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Notificar al backend el cierre de sesión si se cierra la ventana o pestaña accidentalmente
  useEffect(() => {
    const handleWindowClose = () => {
      const currentToken = sessionStorage.getItem(TOKEN_KEY);
      if (currentToken) {
        try {
          fetch(API_ENDPOINTS.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${currentToken}`,
            },
            keepalive: true,
          });
        } catch {
          // Ignorar excepciones al descargar la ventana
        }
      }
    };

    window.addEventListener('pagehide', handleWindowClose);
    return () => {
      window.removeEventListener('pagehide', handleWindowClose);
    };
  }, []);

  const login = useCallback(async (request: LoginRequest) => {
    try {
      const result = await authApi.login(request);
      if (result.success && result.token && result.user) {
        sessionStorage.setItem(TOKEN_KEY, result.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setToken(result.token);
        setUser(result.user);
        return { success: true };
      }

      return { success: false, errorMessage: result.errorMessage ?? 'Error al iniciar sesión' };
    } catch {
      return { success: false, errorMessage: 'Error de conexión con el servidor de autenticación' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[Auth] Error de red al notificar logout al backend:', err);
    } finally {
      // Garantizar reseteo total de credenciales y retorno inmediato a pantalla de Login
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  const logNavigation = useCallback(async (route: string, details?: string) => {
    if (token) {
      await authApi.logAudit(
        {
          action: 'NAVEGACION',
          menuRoute: route,
          details: details ?? `Navegación a ${route}`,
        },
        token
      );
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        logNavigation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return context;
};

