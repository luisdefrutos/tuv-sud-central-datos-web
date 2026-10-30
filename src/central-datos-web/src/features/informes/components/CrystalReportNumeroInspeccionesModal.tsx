import React, { useRef } from 'react';
import { TsButton } from '@tuvsud/design-system/react';
import type { FilaNumeroInspecciones } from '../types/informes.types';

export interface CrystalReportNumeroInspeccionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
  filas: FilaNumeroInspecciones[];
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

function formatPercent(pct: number): string {
  return `${pct.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

/**
 * Modal y visor de impresión que replica con fidelidad milimétrica el informe
 * "INSPECCIONES FAVORABLES Y RECHAZADAS" (rptInspFavorablesRechazadas) de Crystal Reports.
 * Configurado para impresión limpia en A4 Apaisado (Landscape), en 1 sola página.
 */
export const CrystalReportNumeroInspeccionesModal: React.FC<CrystalReportNumeroInspeccionesModalProps> = ({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
  filas,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Totales acumulados
  const sumFav1 = filas.reduce((acc, f) => acc + f.favorables1, 0);
  const sumRech1 = filas.reduce((acc, f) => acc + f.rechazadas1, 0);
  const sumTotal1 = filas.reduce((acc, f) => acc + f.totalFase1, 0);
  const sumPct1 = sumTotal1 > 0 ? (sumRech1 / sumTotal1) * 100 : 0;

  const sumFav2 = filas.reduce((acc, f) => acc + f.favorables2, 0);
  const sumRech2 = filas.reduce((acc, f) => acc + f.rechazadas2, 0);
  const sumTotal2 = filas.reduce((acc, f) => acc + f.totalFase2, 0);
  const sumPct2 = sumTotal2 > 0 ? (sumRech2 / sumTotal2) * 100 : 0;

  const sumFavTot = filas.reduce((acc, f) => acc + f.totalFavorables, 0);
  const sumRechTot = filas.reduce((acc, f) => acc + f.totalRechazadas, 0);
  const sumTotalInsp = filas.reduce((acc, f) => acc + f.totalInspecciones, 0);
  const sumPctGlobal = sumTotalInsp > 0 ? (sumRechTot / sumTotalInsp) * 100 : 0;

  const codigosEstaciones = filas.map((f) => f.codEstacion).join(', ');
  const fechaHoyStr = formatDate(new Date().toISOString().split('T')[0]);

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Inspecciones Favorables y Rechazadas</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 5mm 6mm 5mm 6mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-title-box {
              border: 1.5px solid #000000;
              padding: 3px;
              text-align: center;
              font-weight: bold;
              font-size: 13px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .criteria-box {
              border: 1px solid #000000;
              padding: 3px 5px;
              font-size: 7.5px;
              line-height: 1.35;
              margin-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #000000;
              padding: 1.5px 3px;
              text-align: right;
              font-size: 7.5px;
              line-height: 1.15;
              overflow: hidden;
              white-space: nowrap;
            }
            th {
              font-weight: bold;
              text-align: center;
              background-color: #f3f4f6;
            }
            tfoot tr td {
              font-weight: bold;
              background-color: #f3f4f6;
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              margin-top: 4px;
              padding: 0 2px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm 6mm;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .crystal-report-sheet,
          .crystal-report-sheet * {
            visibility: visible !important;
          }
          .crystal-report-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .crystal-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="crystal-modal-overlay crystal-no-print"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto',
        }}
        onClick={onClose}
      >
        <div
          className="crystal-modal-card"
          style={{
            backgroundColor: '#525659',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '1280px',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Barra superior estilo SAP Crystal Reports Viewer */}
          <div
            className="crystal-viewer-toolbar crystal-no-print"
            style={{
              backgroundColor: '#323639',
              padding: '8px 16px',
              color: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #444',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>📄</span>
              <span style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.5px' }}>
                SAP CRYSTAL REPORTS® - Inspecciones Favorables y Rechazadas (A4 Apaisado)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TsButton variant="primary" size="small" onClick={handlePrint}>
                🖨️ Imprimir / Guardar PDF (1 Hoja)
              </TsButton>
              <TsButton variant="secondary" size="small" onClick={onClose}>
                ✕ Cerrar
              </TsButton>
            </div>
          </div>

          {/* Hoja de papel del informe (Fiel réplica a rptInspFavorablesRechazadas) */}
          <div
            style={{
              overflowY: 'auto',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'center',
              backgroundColor: '#525659',
            }}
          >
            <div
              ref={printAreaRef}
              className="crystal-report-sheet"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                padding: '12px 16px',
                width: '100%',
                maxWidth: '1220px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                fontSize: '8px',
              }}
            >
              {/* Título enmarcado */}
              <div
                className="header-title-box"
                style={{
                  border: '1.5px solid #000000',
                  padding: '3px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  letterSpacing: '0.5px',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                }}
              >
                INSPECCIONES FAVORABLES Y RECHAZADAS
              </div>

              {/* Cabecera de filtros enmarcada */}
              <div
                className="criteria-box"
                style={{
                  border: '1px solid #000000',
                  padding: '3px 6px',
                  fontSize: '7.5px',
                  lineHeight: 1.35,
                  marginBottom: '5px',
                }}
              >
                <div><strong>FECHA INICIAL:</strong> {formatDate(fechaInicio)}</div>
                <div><strong>FECHA FINAL:</strong> {formatDate(fechaFin)}</div>
                <div style={{ wordBreak: 'break-word' }}>
                  <strong>ESTACIONES:</strong> {codigosEstaciones || 'Todas las estaciones'}
                </div>
              </div>

              {/* Tabla con estructura oficial Crystal Reports */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    fontSize: '7.5px',
                    textAlign: 'right',
                  }}
                >
                  <thead>
                    <tr style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', backgroundColor: '#f3f4f6' }}>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '6%' }} rowSpan={2}>
                        ITV
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '31%' }} colSpan={4}>
                        Fase 1 (1ª Inspección)
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '31%' }} colSpan={4}>
                        Fase 2 (2ª Inspección)
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '32%' }} colSpan={4}>
                        Total Inspecciones
                      </th>
                    </tr>
                    <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f3f4f6', fontSize: '7.2px' }}>
                      {/* Fase 1 */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '7.5%' }}>Favorables</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '7.5%' }}>Rechazadas</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>Total F1</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>% Rechazo</th>
                      {/* Fase 2 */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '7.5%' }}>Favorables</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '7.5%' }}>Rechazadas</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>Total F2</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>% Rechazo</th>
                      {/* Total */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>Total Fav.</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>Total Rech.</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>Total Red</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '8%' }}>% Rechazo Global</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => {
                      return (
                        <tr key={fila.codEstacion} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px', textAlign: 'center', fontWeight: 'bold' }}>
                            {fila.codEstacion}
                          </td>
                          {/* Fase 1 */}
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatInt(fila.favorables1)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatInt(fila.rechazadas1)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px', fontWeight: 'bold' }}>{formatInt(fila.totalFase1)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatPercent(fila.porcentajeRechazoFase1)}</td>

                          {/* Fase 2 */}
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatInt(fila.favorables2)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatInt(fila.rechazadas2)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px', fontWeight: 'bold' }}>{formatInt(fila.totalFase2)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatPercent(fila.porcentajeRechazoFase2)}</td>

                          {/* Totales */}
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatInt(fila.totalFavorables)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px' }}>{formatInt(fila.totalRechazadas)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px', fontWeight: 'bold' }}>{formatInt(fila.totalInspecciones)}</td>
                          <td style={{ border: '1px solid #000', padding: '1.5px 3px', fontWeight: 'bold' }}>
                            {formatPercent(fila.porcentajeRechazoGlobal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'center' }}>TOTAL</td>
                      {/* Fase 1 */}
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumFav1)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumRech1)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumTotal1)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatPercent(sumPct1)}</td>

                      {/* Fase 2 */}
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumFav2)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumRech2)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumTotal2)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatPercent(sumPct2)}</td>

                      {/* Totales */}
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumFavTot)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px' }}>{formatInt(sumRechTot)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', color: '#0046ad' }}>{formatInt(sumTotalInsp)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', color: '#0046ad' }}>{formatPercent(sumPctGlobal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pie de página oficial Crystal Reports */}
              <div
                className="footer-info"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '8px',
                  marginTop: '5px',
                  padding: '0 2px',
                }}
              >
                <span>{fechaHoyStr}</span>
                <span>Página 1 de 1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

