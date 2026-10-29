import React, { useState } from 'react';
import {
  TsAlert,
  TsButton,
  TsCard,
  TsInput,
} from '@tuvsud/design-system/react';
import { TuvSudLogo } from '../../../components/common/TuvSudLogo';
import { useAuth } from '../context/AuthContext';

interface AlertState {
  variant: 'danger' | 'warning' | 'primary';
  heading: string;
  message: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSso, setIsSso] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleUsernameChange = (e: any) => {
    const val = e.target?.value ?? e.detail?.value ?? '';
    setUsername(val);
  };

  const handlePasswordChange = (e: any) => {
    const val = e.target?.value ?? e.detail?.value ?? '';
    setPassword(val);
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }

    if (isLoggingIn) {
      return;
    }

    const userClean = username.trim();
    const passClean = password.trim();

    // 1. Validación de campos obligatorios
    if (!userClean || (!isSso && !passClean)) {
      setAlert({
        variant: 'warning',
        heading: 'Campos requeridos',
        message: 'Debe introducir tanto el usuario como la contraseña para iniciar sesión.',
      });
      return;
    }

    setIsLoggingIn(true);

    // 2. Validación de credenciales en Backend (C# / Oracle / AD)
    try {
      const result = await login({
        username: userClean,
        password: isSso ? undefined : passClean,
        isSso,
      });

      if (!result.success) {
        const isNetworkErr =
          result.errorMessage?.toLowerCase().includes('conexión') ||
          result.errorMessage?.toLowerCase().includes('servidor');

        setAlert({
          variant: 'danger',
          heading: isNetworkErr ? 'Incidencia de comunicación' : 'Acceso no autorizado',
          message: isNetworkErr
            ? 'No ha sido posible verificar las credenciales en este momento. Por favor, inténtelo de nuevo más tarde.'
            : 'Las credenciales introducidas no son válidas o no dispone de autorización para acceder al sistema.',
        });
      }
    } catch {
      setAlert({
        variant: 'danger',
        heading: 'Incidencia de comunicación',
        message: 'No ha sido posible verificar las credenciales en este momento. Por favor, inténtelo de nuevo más tarde.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--ts-semantic-color-background-subtle, #f4f6f9)',
        padding: 'clamp(1rem, 3vw, 2rem)',
        fontFamily: 'var(--ts-semantic-typography-font-family, "TUV SUD Pro", sans-serif)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <TsCard
          style={{
            padding: 'clamp(1.75rem, 5vw, 2.5rem) clamp(1.25rem, 4vw, 2rem)',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0, 43, 91, 0.08)',
            backgroundColor: '#ffffff',
            border: '1px solid var(--ts-semantic-color-border-subtle, #e2e8f0)',
          }}
        >
          {/* Cabecera con Logo Corporativo Oficial */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <TuvSudLogo size={56} />
            </div>
            <h1
              style={{
                fontSize: 'clamp(1.25rem, 4vw, 1.45rem)',
                fontWeight: 700,
                color: 'var(--ts-semantic-color-primary, #002b5b)',
                margin: '0 0 6px 0',
                letterSpacing: '-0.3px',
              }}
            >
              TÜV SÜD Central Datos
            </h1>
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--ts-semantic-color-text-subtle, #64748b)',
                margin: 0,
              }}
            >
              Control de Acceso y Gestión Centralizada de ITV
            </p>
          </div>

          {/* Formulario con Validación Segura */}
          <form
            onSubmit={handleSubmit}
            action="javascript:void(0);"
            noValidate
          >
            {/* Campo Usuario */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--ts-semantic-color-text-default, #1e293b)',
                  marginBottom: '6px',
                }}
              >
                <span>Usuario / Código</span>
                <div style={{ marginTop: '4px' }}>
                  <TsInput
                    type="text"
                    value={username}
                    placeholder="Usuario corporativo, DNI o código (ej. 0001)"
                    onTsInput={handleUsernameChange}
                    disabled={isLoggingIn}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                </div>
              </label>
            </div>

            {/* Campo Contraseña */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--ts-semantic-color-text-default, #1e293b)',
                  marginBottom: '6px',
                }}
              >
                <span>Contraseña</span>
                <div style={{ marginTop: '4px' }}>
                  <TsInput
                    type="password"
                    passwordToggle
                    value={password}
                    placeholder={isSso ? 'Autenticación Windows (SSO activado)' : 'Contraseña corporativa o interna'}
                    onTsInput={handlePasswordChange}
                    disabled={isLoggingIn || isSso}
                    style={{
                      width: '100%',
                      backgroundColor: isSso ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>
              </label>
            </div>

            {/* Checkbox Single Sign-On (SSO) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: alert ? '14px' : '22px',
                padding: '8px 10px',
                backgroundColor: isSso ? '#f0fdf4' : 'transparent',
                borderRadius: '6px',
                transition: 'background-color 0.2s ease',
              }}
            >
              <input
                type="checkbox"
                id="chkSso"
                checked={isSso}
                onChange={(e) => {
                  setIsSso(e.target.checked);
                  if (e.target.checked) {
                    setPassword('');
                    setAlert(null);
                  }
                }}
                disabled={isLoggingIn}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: 'var(--ts-semantic-color-primary, #002b5b)',
                }}
              />
              <label
                htmlFor="chkSso"
                style={{
                  fontSize: '13px',
                  color: isSso ? '#166534' : 'var(--ts-semantic-color-text-default, #334155)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Usar usuario de sesión Windows (SSO Intranet)
              </label>
            </div>

            {/* Alerta de Autenticación / Validación (Visible, Cerrable, Responsiva en Móvil y Pentest-Safe) */}
            {alert && (
              <div
                style={{
                  marginBottom: '18px',
                  maxWidth: '100%',
                  overflowWrap: 'break-word',
                }}
              >
                <TsAlert
                  variant={alert.variant}
                  open
                  closable
                  onTsAfterHide={() => setAlert(null)}
                  style={{
                    wordBreak: 'break-word',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>{alert.heading}</div>
                  <div>{alert.message}</div>
                </TsAlert>
              </div>
            )}

            {/* Botón de envío */}
            <TsButton
              type="submit"
              variant="primary"
              disabled={isLoggingIn}
              loading={isLoggingIn}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {isLoggingIn ? 'Comprobando credenciales...' : 'Iniciar Sesión'}
            </TsButton>
          </form>
        </TsCard>
      </div>
    </div>
  );
};
