import React, { useRef } from 'react';
import { TsButton } from '@tuvsud/design-system/react';
import type { FilaFacturacion } from '../types/informes.types';

export interface CrystalReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechaInicio: string;
  fechaFin: string;
  filas: FilaFacturacion[];
}

function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatInt(amount: number): string {
  return amount.toLocaleString('es-ES');
}

/**
 * Modal y visor de impresión que replica con fidelidad milimétrica el informe
 * "RESUMEN DE FACTURACIÓN DE INSPECCIONES" (rptResumenInspecciones) de Crystal Reports.
 * Configurado específicamente para impresión limpia en A4 Apaisado (Landscape),
 * sin cabeceras de navegador, sin botones de pantalla y en 1 sola página.
 */
export const CrystalReportPreviewModal: React.FC<CrystalReportPreviewModalProps> = ({
  isOpen,
  onClose,
  fechaInicio,
  fechaFin,
  filas,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Cálculo de totales acumulados reales de cada forma de pago
  const sumContadosNumInspecciones = filas.reduce((acc, f) => acc + (f.contadosNumInspecciones ?? 0), 0);
  const sumContadosBase = filas.reduce((acc, f) => acc + (f.contadosBase ?? 0), 0);
  const sumContadosIva = filas.reduce((acc, f) => acc + (f.contadosIva ?? 0), 0);
  const sumContadosTasas = filas.reduce((acc, f) => acc + (f.contadosTasas ?? 0), 0);
  const sumContadosTotal = filas.reduce((acc, f) => acc + (f.contadosTotal ?? 0), 0);

  const sumTercerosNumInspecciones = filas.reduce((acc, f) => acc + (f.tercerosNumInspecciones ?? 0), 0);
  const sumTercerosBase = filas.reduce((acc, f) => acc + (f.tercerosBase ?? 0), 0);
  const sumTercerosIva = filas.reduce((acc, f) => acc + (f.tercerosIva ?? 0), 0);
  const sumTercerosTasas = filas.reduce((acc, f) => acc + (f.tercerosTasas ?? 0), 0);
  const sumTercerosTotal = filas.reduce((acc, f) => acc + (f.tercerosTotal ?? 0), 0);

  const sumTarjetasNumInspecciones = filas.reduce((acc, f) => acc + (f.tarjetasNumInspecciones ?? 0), 0);
  const sumTarjetasBase = filas.reduce((acc, f) => acc + (f.tarjetasBase ?? 0), 0);
  const sumTarjetasIva = filas.reduce((acc, f) => acc + (f.tarjetasIva ?? 0), 0);
  const sumTarjetasTasas = filas.reduce((acc, f) => acc + (f.tarjetasTasas ?? 0), 0);
  const sumTarjetasTotal = filas.reduce((acc, f) => acc + (f.tarjetasTotal ?? 0), 0);

  const sumTotalesNumInspecciones = filas.reduce((acc, f) => acc + (f.totalesNumInspecciones ?? f.totalInspecciones), 0);
  const sumTotalesBase = filas.reduce((acc, f) => acc + (f.totalesBase ?? 0), 0);
  const sumTotalesIva = filas.reduce((acc, f) => acc + (f.totalesIva ?? 0), 0);
  const sumTotalesTasas = filas.reduce((acc, f) => acc + (f.totalesTasas ?? 0), 0);
  const sumTotalesTasasTrafico = filas.reduce((acc, f) => acc + (f.totalesTasasTrafico ?? 0), 0);
  const sumTotalesTasasIndustria = filas.reduce((acc, f) => acc + (f.totalesTasasIndustria ?? 0), 0);
  const sumTotalesTotal = filas.reduce((acc, f) => acc + (f.totalesTotal ?? f.totalIngresos), 0);

  const codigosEstaciones = filas.map((f) => f.codEstacion).join(', ');
  const fechaHoyStr = formatDate(new Date().toISOString().split('T')[0]);

  /**
   * Imprime utilizando un iframe aislado para garantizar:
   * 1. 0% de elementos UI en la impresión (ni botones, ni modal, ni barras grises).
   * 2. Orientación horizontal forzada (A4 Landscape).
   * 3. Ajuste milimétrico de todas las 23 columnas en una sola hoja apaisada.
   */
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
          <title>Resumen de Facturación de Inspecciones</title>
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
              padding: 1px 1.5px;
              text-align: right;
              font-size: 7.2px;
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
      {/* Estilos para impresión nativa (Ctrl+P) como respaldo */}
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
                SAP CRYSTAL REPORTS® - Resumen de facturación de inspecciones (A4 Apaisado)
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

          {/* Hoja de papel del informe (Fiel réplica a rptResumenInspecciones) */}
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
              {/* Título enmarcado como en Crystal Report oficial */}
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
                RESUMEN DE FACTURACIÓN DE INSPECCIONES
              </div>

              {/* Cabecera de filtros y criterios oficiales enmarcada */}
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
                <div><strong>IVA SUMADO</strong></div>
                <div><strong>FECHA INICIAL:</strong> {formatDate(fechaInicio)}</div>
                <div><strong>FECHA FINAL:</strong> {formatDate(fechaFin)}</div>
                <div style={{ wordBreak: 'break-word' }}>
                  <strong>ESTACIONES:</strong> {codigosEstaciones || 'Todas las estaciones'}
                </div>
              </div>

              {/* Tabla oficial Crystal Reports con todas las 23 columnas */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    tableLayout: 'fixed',
                    fontSize: '7.2px',
                    textAlign: 'right',
                  }}
                >
                  <thead>
                    {/* Fila 1 de cabeceras de grupos */}
                    <tr style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', backgroundColor: '#f3f4f6' }}>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '3.2%' }} rowSpan={2}>
                        ITV
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '21.4%' }} colSpan={5}>
                        Contados
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '20.0%' }} colSpan={5}>
                        Terceros
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '21.4%' }} colSpan={5}>
                        Tarjetas
                      </th>
                      <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '34.0%' }} colSpan={7}>
                        Total
                      </th>
                    </tr>
                    {/* Fila 2 de subcolumnas */}
                    <tr style={{ borderBottom: '2px solid #000', backgroundColor: '#f3f4f6', fontSize: '6.8px' }}>
                      {/* Contados */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '3.8%' }}>NºIns</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.8%' }}>Base</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.0%' }}>IVA</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.0%' }}>Tasas</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.8%' }}>Total</th>
                      {/* Terceros */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '3.4%' }}>NºIns</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.5%' }}>Base</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '3.8%' }}>IVA</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '3.8%' }}>Tasas</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.5%' }}>Total</th>
                      {/* Tarjetas */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '3.8%' }}>NºIns</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.8%' }}>Base</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.0%' }}>IVA</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.0%' }}>Tasas</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.8%' }}>Total</th>
                      {/* Total */}
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.0%' }}>NºIns</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '5.4%' }}>Base</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.6%' }}>IVA</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.6%' }}>Tasas</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.6%' }}>Trafico</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '4.2%' }}>Industria</th>
                      <th style={{ border: '1px solid #000', padding: '1px', width: '6.6%' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => {
                      return (
                        <tr key={fila.codEstacion} style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px', textAlign: 'center', fontWeight: 'bold' }}>
                            {fila.codEstacion}
                          </td>
                          {/* Contados reales */}
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>
                            {formatInt(fila.contadosNumInspecciones ?? 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.contadosBase ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.contadosIva ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.contadosTasas ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.contadosTotal ?? 0)}</td>

                          {/* Terceros reales */}
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>
                            {formatInt(fila.tercerosNumInspecciones ?? 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tercerosBase ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tercerosIva ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tercerosTasas ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tercerosTotal ?? 0)}</td>

                          {/* Tarjetas reales */}
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>
                            {formatInt(fila.tarjetasNumInspecciones ?? 0)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tarjetasBase ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tarjetasIva ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tarjetasTasas ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.tarjetasTotal ?? 0)}</td>

                          {/* Totales reales de la estación */}
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px', fontWeight: 'bold' }}>
                            {formatInt(fila.totalesNumInspecciones ?? fila.totalInspecciones)}
                          </td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.totalesBase ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.totalesIva ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.totalesTasas ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.totalesTasasTrafico ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px' }}>{formatMoney(fila.totalesTasasIndustria ?? 0)}</td>
                          <td style={{ border: '1px solid #000', padding: '1px 1.5px', fontWeight: 'bold' }}>
                            {formatMoney(fila.totalesTotal ?? fila.totalIngresos)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px', textAlign: 'center' }}>TOTAL</td>
                      {/* Contados Totales */}
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatInt(sumContadosNumInspecciones)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumContadosBase)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumContadosIva)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumContadosTasas)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumContadosTotal)}</td>

                      {/* Terceros Totales */}
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatInt(sumTercerosNumInspecciones)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTercerosBase)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTercerosIva)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTercerosTasas)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTercerosTotal)}</td>

                      {/* Tarjetas Totales */}
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatInt(sumTarjetasNumInspecciones)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTarjetasBase)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTarjetasIva)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTarjetasTasas)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTarjetasTotal)}</td>

                      {/* Totales Generales */}
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatInt(sumTotalesNumInspecciones)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTotalesBase)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTotalesIva)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTotalesTasas)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTotalesTasasTrafico)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTotalesTasasIndustria)}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 1.5px' }}>{formatMoney(sumTotalesTotal)}</td>
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
