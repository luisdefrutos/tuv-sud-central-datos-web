import { API_ENDPOINTS } from '../../../constants/api.constants';
import type { AuditLogRequest } from '../types/auth.types';

export interface QueuedAuditEntry extends AuditLogRequest {
  id: string;
  queuedAt: string;
}

const STORAGE_KEY = 'tuv_audit_offline_queue';
const MAX_QUEUE_SIZE = 100;

class AuditQueueService {
  private isFlushing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flush();
      });
    }
  }

  /**
   * Obtiene la cola actual de eventos pendientes desde localStorage
   */
  public getQueue(): QueuedAuditEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Añade una acción a la cola offline local si falla la red
   */
  public enqueue(request: AuditLogRequest): void {
    if (typeof window === 'undefined') return;
    try {
      const current = this.getQueue();
      const entry: QueuedAuditEntry = {
        ...request,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        queuedAt: new Date().toISOString(),
      };

      current.push(entry);

      // Limitar a los últimos MAX_QUEUE_SIZE eventos para no saturar almacenamiento
      const trimmed = current.slice(-MAX_QUEUE_SIZE);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[AuditQueue] No se pudo guardar log offline en localStorage:', e);
    }
  }

  /**
   * Envía en lote todas las acciones acumuladas en segundo plano
   */
  public async flush(token?: string): Promise<boolean> {
    if (typeof window === 'undefined' || this.isFlushing) return false;
    if (navigator && !navigator.onLine) return false;

    const queue = this.getQueue();
    if (queue.length === 0) return true;

    this.isFlushing = true;
    const effectiveToken = token ?? sessionStorage.getItem('tuv_token') ?? '';

    try {
      const payload = queue.map((item) => ({
        action: item.action,
        menuRoute: item.menuRoute,
        codEstacion: item.codEstacion,
        durationMs: item.durationMs,
        details: item.details
          ? `[Offline ${new Date(item.queuedAt).toLocaleTimeString()}]: ${item.details}`
          : `[Offline ${new Date(item.queuedAt).toLocaleTimeString()}]`,
      }));

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (effectiveToken) {
        headers.Authorization = `Bearer ${effectiveToken}`;
      }

      const response = await fetch(API_ENDPOINTS.AUTH.AUDIT_BATCH, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Limpiar solo los enviados
        localStorage.removeItem(STORAGE_KEY);
        this.isFlushing = false;
        return true;
      }
    } catch (err) {
      console.warn('[AuditQueue] Reintento de sincronización offline aplazado por fallo de red:', err);
    } finally {
      this.isFlushing = false;
    }

    return false;
  }

  /**
   * Genera y descarga un archivo .log de diagnóstico técnico con el estado del cliente y logs offline
   */
  public downloadDiagnostics(currentUser?: string | null): void {
    if (typeof window === 'undefined') return;

    const queue = this.getQueue();
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    let content = `================================================================================\n`;
    content += `TÜV SÜD CENTRAL DATOS - INFORME DE DIAGNÓSTICO TÉCNICO OFFLINE\n`;
    content += `================================================================================\n`;
    content += `Fecha/Hora Generación : ${now.toISOString()} (${now.toLocaleString()})\n`;
    content += `Usuario Activo        : ${currentUser ?? 'No autenticado / Desconocido'}\n`;
    content += `Conexión de Red       : ${navigator.onLine ? 'CONECTADO (ONLINE)' : 'SIN CONEXIÓN (OFFLINE)'}\n`;
    content += `URL Actual            : ${window.location.href}\n`;
    content += `Navegador / UserAgent : ${navigator.userAgent}\n`;
    content += `Idioma                : ${navigator.language}\n`;
    content += `Resolución Pantalla   : ${window.screen.width}x${window.screen.height}\n`;
    content += `Logs Offline en Cola  : ${queue.length} registros pendientes\n`;
    content += `--------------------------------------------------------------------------------\n\n`;

    if (queue.length === 0) {
      content += `No existen registros de auditoría pendientes de sincronización.\n`;
    } else {
      content += `REGISTROS DE AUDITORÍA ACUMULADOS EN DISPOSITIVO LOCAL:\n\n`;
      queue.forEach((item, idx) => {
        content += `[${idx + 1}] Timestamp: ${item.queuedAt}\n`;
        content += `    Acción   : ${item.action}\n`;
        content += `    Ruta     : ${item.menuRoute ?? '-'}\n`;
        content += `    Estación : ${item.codEstacion ?? '-'}\n`;
        content += `    Duración : ${item.durationMs != null ? `${item.durationMs}ms` : '-'}\n`;
        content += `    Detalles : ${item.details ?? '-'}\n\n`;
      });
    }

    content += `================================================================================\n`;
    content += `Fin del informe de diagnóstico.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tuv-sud-central-datos-diagnostico-${timestampStr}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const auditQueue = new AuditQueueService();

