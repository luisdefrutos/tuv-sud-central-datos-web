import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { LoginRequest, LoginResponse, CurrentUser, AuditLogRequest } from '../types/auth.types';
import { auditQueue } from '../services/auditQueue';

export const authApi = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    // Si el usuario marca "Usar usuario de sesión Windows", llamamos al endpoint /sso-login con credentials: 'include'
    // para que IIS negocie Kerberos/NTLM únicamente en ese momento y verifique la sesión Windows del equipo.
    const endpoint = request.isSso ? API_ENDPOINTS.AUTH.SSO_LOGIN : API_ENDPOINTS.AUTH.LOGIN;

    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: request.isSso ? 'include' : 'same-origin',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (response.status === 401) {
      return {
        success: false,
        token: null,
        user: null,
        errorMessage: 'No se ha podido autenticar su sesión de Windows en este equipo. Desmarque la casilla SSO e introduzca su contraseña.',
      };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Respuesta no válida del servidor (HTTP ${response.status})`);
    }

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
