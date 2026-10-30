import React, { useRef } from 'react';
import { TsButton } from '@tuvsud/design-system/react';
import type { FilaDuracionPromedio, ResumenEstacionDuracion } from '../types/informes.types';

export interface CrystalReportDuracionPromedioModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
  fase: string;
  filas: FilaDuracionPromedio[];
  resumenEstaciones: ResumenEstacionDuracion[];
}

function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

function formatInt(amount: number): string {
  return amount.toLocaleString('es-ES');
}

/**
 * Modal y visor de impresión que replica con fidelidad milimétrica el informe
 * "DURACIÓN PROMEDIO DE INSPECCIONES PERIÓDICAS 001" (rptDuracionPromedio) de Crystal Reports.
 * Configurado para impresión limpia en A4 Apaisado (Landscape), en 1 sola página.
 */
export const CrystalReportDuracionPromedioModal: React.FC<CrystalReportDuracionPromedioModalProps> = ({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
  fase,
  filas,
  resumenEstaciones,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Totales acumulados
  const totalInspeccionesGlobal = resumenEstaciones.reduce((acc, e) => acc + e.totalInspecciones, 0);
  const duracionMediaGlobal = totalInspeccionesGlobal > 0
    ? resumenEstaciones.reduce((acc, e) => acc + e.duracionPromedioMinutos * e.totalInspecciones, 0) / totalInspeccionesGlobal
    : 0;

  // Agrupar filas por Tipo de Vehículo (como en rptDuracionPromedio)
  const gruposPorTipo = filas.reduce((acc, f) => {
    if (!acc[f.tipoVehiculo]) {
      acc[f.tipoVehiculo] = {
        orden: f.ordenTipo,
        items: [],
      };
    }
    acc[f.tipoVehiculo].items.push(f);
    return acc;
  }, {} as Record<string, { orden: number; items: FilaDuracionPromedio[] }>);

  const tiposOrdenados = Object.entries(gruposPorTipo).sort((a, b) => a[1].orden - b[1].orden);

  const handleImprimir = () => {
    if (!printAreaRef.current) return;

    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'fixed';
    printWindow.style.right = '0';
    printWindow.style.bottom = '0';
    printWindow.style.width = '0';
    printWindow.style.height = '0';
    printWindow.style.border = '0';
    document.body.appendChild(printWindow);

    const doc = printWindow.contentWindow?.document;
    if (!doc) return;

    const contenidoHtml = printAreaRef.current.innerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Informe_Duracion_Promedio_${fechaInicio}_${fechaFin}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: "Courier New", Courier, monospace;
              font-size: 8.5pt;
              color: #000;
              margin: 0;
              padding: 0;
              background: #fff;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              padding: 2px 4px;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .border-top { border-top: 1px solid #000; }
            .border-bottom { border-bottom: 1px solid #000; }
            .border-double-bottom { border-bottom: 3px double #000; }
            .font-bold { font-weight: bold; }
            .header-title {
              font-size: 13pt;
              font-weight: bold;
              text-align: center;
              margin-bottom: 2px;
            }
            .header-subtitle {
              font-size: 9pt;
              text-align: center;
              margin-bottom: 6px;
            }
            .box-filtros {
              border: 1px solid #000;
              padding: 4px 8px;
              margin-bottom: 6px;
              font-size: 8.5pt;
            }
            .group-header {
              font-weight: bold;
              background-color: #f1f5f9;
              padding: 4px 6px;
              margin-top: 8px;
              margin-bottom: 4px;
              border-bottom: 1px solid #000;
              font-size: 9pt;
            }
          </style>
        </head>
        <body>
          ${contenidoHtml}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printWindow.contentWindow?.focus();
      printWindow.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printWindow);
      }, 1000);
    }, 400);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 37, 59, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '1180px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Barra superior de herramientas del Visor Crystal Report */}
        <div
          style={{
            padding: '0.65rem 1.25rem',
            backgroundColor: '#0046ad',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #003080',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🖨️</span>
            <span style={{ fontWeight: 700, fontSize: '0.98rem', letterSpacing: '0.3px' }}>
              Vista Clásica Crystal Reports — Duración Promedio Inspecciones (rptDuracionPromedio)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TsButton
              variant="primary"
              size="small"
              onClick={handleImprimir}
              style={{
                backgroundColor: '#ffffff',
                color: '#0046ad',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
              }}
            >
              Imprimir Documento Oficial
            </TsButton>
            <TsButton
              variant="secondary"
              size="small"
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.6)',
                fontSize: '0.82rem',
              }}
            >
              ✕ Cerrar
            </TsButton>
          </div>
        </div>

        {/* Hoja de papel simulada con scroll interno */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            backgroundColor: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            ref={printAreaRef}
            style={{
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: '820px',
              padding: '16mm 14mm',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '8.5pt',
              color: '#000000',
              lineHeight: 1.25,
            }}
          >
            {/* Cabecera oficial TÜV SÜD */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    backgroundColor: '#0046ad',
                    color: '#ffffff',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '11pt',
                    borderRadius: '2px',
                  }}
                >
                  TÜV
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '10pt', color: '#0046ad' }}>TÜV SÜD ATISAE / CAL</div>
                  <div style={{ fontSize: '7pt', color: '#475569' }}>División de Inspección Técnica de Vehículos</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '7.5pt' }}>
                <div><strong>Módulo:</strong> Central Datos</div>
                <div><strong>Informe:</strong> rptDuracionPromedio.rpt</div>
                <div><strong>Fecha Emisión:</strong> {new Date().toLocaleDateString('es-ES')} {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            {/* Título Principal con marco oficial Crystal Report */}
            <div
              style={{
                border: '1px solid #000000',
                padding: '10px 16px',
                textAlign: 'center',
                margin: '10px 0 16px 0',
              }}
            >
              <div style={{ fontSize: '12pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                DURACIÓN PROMEDIO DE INSPECCIONES (EN MINUTOS)
              </div>
              <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '2px' }}>
                INSPECCIONES PERIÓDICAS 001
              </div>
            </div>

            {/* Desglose agrupado por Tipo de Vehículo (Estructura 1:1 Crystal Reports rptDuracionPromedio) */}
            {tiposOrdenados.map(([tipoVehiculo, grupo]) => {
              const totalInspTipo = grupo.items.reduce((acc, f) => acc + f.totalInspecciones, 0);
              const durMediaTipo = totalInspTipo > 0
                ? grupo.items.reduce((acc, f) => acc + f.duracionPromedioMinutos * f.totalInspecciones, 0) / totalInspTipo
                : 0;

              return (
                <div key={tipoVehiculo} style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '9pt',
                      marginBottom: '6px',
                    }}
                  >
                    TIPO DE VEHÍCULO:&nbsp;&nbsp;{tipoVehiculo.toUpperCase()}
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #000000', fontSize: '8.5pt' }}>
                        <th style={{ textAlign: 'left', border: '1px solid #000000', padding: '4px 8px', fontWeight: 'bold' }}>
                          ESTACIÓN ITV
                        </th>
                        <th style={{ textAlign: 'right', width: '180px', border: '1px solid #000000', padding: '4px 8px', fontWeight: 'bold' }}>
                          DURACIÓN (MIN.)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.items.map((fila) => (
                        <tr key={fila.codEstacion}>
                          <td style={{ textAlign: 'left', border: '1px solid #000000', padding: '3px 8px' }}>
                            {fila.codEstacion} - {fila.desEstacion}
                          </td>
                          <td style={{ textAlign: 'right', border: '1px solid #000000', padding: '3px 8px' }}>
                            {Math.round(fila.duracionPromedioMinutos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #000000', backgroundColor: '#fafafa' }}>
                        <td style={{ textAlign: 'right', border: '1px solid #000000', padding: '4px 8px', fontWeight: 'bold' }}>
                          Promedio:
                        </td>
                        <td style={{ textAlign: 'right', border: '1px solid #000000', padding: '4px 8px', fontWeight: 'bold' }}>
                          {Math.round(durMediaTipo)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}

            {/* Cuadro de Filtros Aplicados al Informe (Réplica Página 10 de rptDuracionPromedio) */}
            <div style={{ marginTop: '24px', borderTop: '2px solid #000000', paddingTop: '10px', pageBreakInside: 'avoid' }}>
              <div style={{ fontWeight: 'bold', fontSize: '8.5pt', marginBottom: '4px' }}>
                FILTRO APLICADO AL INFORME
              </div>
              <div style={{ fontSize: '8pt', color: '#111827' }}>
                FECHA INICIAL: {formatDate(fechaInicio)}
              </div>
              <div style={{ fontSize: '8pt', color: '#111827' }}>
                FECHA FINAL: {formatDate(fechaFin)}
              </div>
              {fase !== 'TODAS' && (
                <div style={{ fontSize: '8pt', color: '#111827' }}>
                  FASE: {fase}ª Inspección
                </div>
              )}
              <div style={{ fontSize: '8pt', color: '#111827', marginTop: '2px', lineHeight: 1.4 }}>
                ESTACIONES: {resumenEstaciones.map((e) => e.codEstacion).join(', ')}
              </div>
            </div>

            {/* Pie de página oficial Crystal Report */}
            <div style={{ marginTop: '16px', paddingTop: '6px', borderTop: '1px solid #000000', display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt' }}>
              <span>{new Date().toLocaleDateString('es-ES')}</span>
              <span>Página 1 de 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
