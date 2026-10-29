export interface CurrentUser {
  idEmpleado: number;
  username: string;
  fullName: string;
  email?: string | null;
  role: 'Supervisor' | 'Responsable' | 'Operador' | string;
  isSupervisor: boolean;
  allowedStations: string[];
}

export interface LoginRequest {
  username: string;
  password?: string;
  isSso?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string | null;
  user?: CurrentUser | null;
  errorMessage?: string | null;
}

export interface AuditLogRequest {
  action: string;
  menuRoute?: string;
  codEstacion?: string;
  durationMs?: number;
  details?: string;
}

