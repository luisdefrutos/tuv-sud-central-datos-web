import React, { useState } from 'react';
import {
  TsAlert,
  TsButton,
  TsCard,
  TsInput,
} from '@tuvsud/design-system/react';
import { TuvSudLogo } from '../../../components/common/TuvSudLogo';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSso, setIsSso] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const handleUsernameChange = (e: any) => {
    const val = e.target?.value ?? e.detail?.value ?? '';
    setUsername(val);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (e: any) => {
    const val = e.target?.value ?? e.detail?.value ?? '';
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  // Doble Validación: 1) Frontend (inmediata) -> 2) Backend (reglas de negocio)
  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      errors.username = 'Introduzca su usuario corporativo, código de inspector o SUPERVISOR.';
    } else if (username.trim().length < 2) {
      errors.username = 'El identificador de usuario debe contener al menos 2 caracteres.';
    }

    if (!isSso) {
      if (!password.trim()) {
        errors.password = 'Introduzca la contraseña para iniciar sesión.';
      } else if (password.trim().length < 2) {
        errors.password = 'La contraseña debe contener al menos 2 caracteres.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setErrorMessage(null);

    // 1. Validación en Frontend
    if (!validateForm()) {
      return;
    }

    // 2. Validación en Backend (reglas de negocio en C# / Oracle / AD)
    const result = await login({
      username: username.trim(),
      password: isSso ? undefined : password.trim(),
      isSso,
    });

    if (!result.success) {
      // Mensaje seguro sin fuga de información interna (OWASP A04 / A05)
      setErrorMessage(result.errorMessage ?? 'Credenciales no válidas o acceso no autorizado.');
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

          {/* Mensaje de Error del Backend */}
          {errorMessage && (
            <div style={{ marginBottom: '20px' }}>
              <TsAlert
                variant="danger"
                heading="Acceso Denegado"
              >
                {errorMessage}
              </TsAlert>
            </div>
          )}

          {/* Formulario con Doble Validación */}
          <form onSubmit={handleSubmit} noValidate>
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
                    onTsChange={handleUsernameChange}
                    onInput={handleUsernameChange}
                    onChange={handleUsernameChange}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        handleSubmit(e);
                      }
                    }}
                    disabled={isLoading}
                    autoFocus
                    style={{ width: '100%' }}
                  />
                </div>
              </label>
              {fieldErrors.username && (
                <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}>
                  ⚠️ {fieldErrors.username}
                </div>
              )}
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
                    onTsChange={handlePasswordChange}
                    onInput={handlePasswordChange}
                    onChange={handlePasswordChange}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        handleSubmit(e);
                      }
                    }}
                    disabled={isLoading || isSso}
                    style={{
                      width: '100%',
                      backgroundColor: isSso ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>
              </label>
              {!isSso && fieldErrors.password && (
                <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}>
                  ⚠️ {fieldErrors.password}
                </div>
              )}
            </div>

            {/* Checkbox Single Sign-On (SSO) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
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
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                disabled={isLoading}
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

            {/* Botón de envío */}
            <TsButton
              type="button"
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              onClick={handleSubmit}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {isLoading ? 'Comprobando credenciales...' : 'Iniciar Sesión'}
            </TsButton>
            <button type="submit" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
          </form>

          {/* Información de ayuda sobre tipos de acceso */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid var(--ts-semantic-color-border-subtle, #f1f5f9)',
              fontSize: '11px',
              color: 'var(--ts-semantic-color-text-subtle, #94a3b8)',
              lineHeight: '1.5',
            }}
          >
            <div>• <strong>Directorio Activo:</strong> Inicie sesión con su usuario de red corporativo.</div>
            <div style={{ marginTop: '4px' }}>• <strong>Usuario Interno / Planta:</strong> Código numérico (ej. <code>0001</code>) o DNI sin letra.</div>
            <div style={{ marginTop: '4px' }}>• <strong>Soporte del Sistema:</strong> Cuenta técnica <code>SUPERVISOR</code>.</div>
          </div>
        </TsCard>
      </div>
    </div>
  );
};
