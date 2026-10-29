import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { LoginRequest, LoginResponse, CurrentUser, AuditLogRequest } from '../types/auth.types';

export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    return response.json();
  },

  async logout(accessLogId?: number): Promise<void> {
    try {
      const url = accessLogId ? `${API_ENDPOINTS.AUTH.LOGOUT}?accessLogId=${accessLogId}` : API_ENDPOINTS.AUTH.LOGOUT;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('tuv_token') ?? localStorage.getItem('tuv_token') ?? ''}`,
        },
      });
    } catch {
      // Ignorar fallos de red en logout
    }
  },

  async getCurrentUser(token: string): Promise<CurrentUser | null> {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.ME, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  },

  async logAudit(request: AuditLogRequest, token?: string): Promise<void> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch(API_ENDPOINTS.AUTH.AUDIT, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });
    } catch {
      // No interrumpir la navegación del usuario si falla la auditoría
    }
  },
};

