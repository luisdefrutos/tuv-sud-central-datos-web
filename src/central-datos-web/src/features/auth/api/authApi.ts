import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { LoginRequest, LoginResponse, CurrentUser, AuditLogRequest } from '../types/auth.types';
import { auditQueue } from '../services/auditQueue';

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
    // Si el navegador reporta explícitamente estar sin conexión, encolar directamente en cliente
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      auditQueue.enqueue(request);
      return;
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(API_ENDPOINTS.AUTH.AUDIT, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        // Servidor inaccesible o error: encolar en local para reintento
        auditQueue.enqueue(request);
      } else {
        // Petición exitosa: si había eventos pendientes en la cola offline, intentar sincronizarlos en segundo plano
        if (auditQueue.getQueue().length > 0) {
          auditQueue.flush(token);
        }
      }
    } catch {
      // Corte repentino de conexión o timeout: encolar para no perder el evento
      auditQueue.enqueue(request);
    }
  },

  downloadDiagnosticsLog(currentUser?: string | null): void {
    auditQueue.downloadDiagnostics(currentUser);
  },

  flushAuditQueue(token?: string): Promise<boolean> {
    return auditQueue.flush(token);
  },
};

