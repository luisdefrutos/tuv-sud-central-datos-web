import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { TsButton, TsCard, TsAlert, TsIcon } from '@tuvsud/design-system/react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Error inesperado de ejecución.';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <TsCard
            style={{
              padding: '2rem',
              backgroundColor: '#ffffff',
              borderTop: '4px solid #dc2626',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <TsIcon name="warning" style={{ fontSize: '2.5rem', color: '#dc2626' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0b253b', fontWeight: 700 }}>
                  {this.props.fallbackTitle || 'Incidencia en la Carga del Módulo'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                  Se ha producido una excepción al renderizar la vista. Puede intentar recargar el módulo o volver al inicio.
                </p>
              </div>
            </div>

            <TsAlert variant="danger" open heading="Detalle de la Incidencia">
              <div style={{ fontSize: '0.85rem', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {errorMessage}
              </div>
            </TsAlert>

            {componentStack && (
              <details style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#64748b' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Ver traza de componentes</summary>
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <TsButton variant="primary" size="medium" onClick={this.handleReset}>
                <TsIcon slot="prefix" name="refresh" />
                Reintentar Carga
              </TsButton>
              <TsButton variant="secondary" size="medium" onClick={this.handleReload}>
                <TsIcon slot="prefix" name="refresh" />
                Recargar Aplicación
              </TsButton>
              <TsButton
                variant="secondary"
                size="medium"
                onClick={() => {
                  window.location.hash = '';
                  window.location.reload();
                }}
              >
                <TsIcon slot="prefix" name="home" />
                Ir al Inicio
              </TsButton>
            </div>
          </TsCard>
        </div>
      );
    }

    return this.props.children;
  }
}

