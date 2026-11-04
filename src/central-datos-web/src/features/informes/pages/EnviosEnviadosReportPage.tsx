import React from 'react';
import {
  TsButton,
  TsCard,
  TsBadge,
  TsSpinner,
  TsIcon,
} from '@tuvsud/design-system/react';
import { ReportPageHeader } from '../components/ReportPageHeader';
import { ReportDateRangeAlert } from '../components/ReportDateRangeAlert';
import { ReportFiltersBar } from '../components/ReportFiltersBar';
import { BlockingLoadingModal } from '../../../components/common/BlockingLoadingModal';
import { AppTooltip } from '../../../components/common/AppTooltip';
import { useEnviosRecordatoriosReport } from '../hooks/useEnviosRecordatoriosReport';
import type { FilaDetalleEnviosRecordatorios } from '../types/enviosRecordatorios.types';

interface EnviosEnviadosReportPageProps {
  onNavigateHome?: () => void;
  onNavigateToInformes?: () => void;
}

/**
 * Pantalla 2: 'SMSs/EMAILs enviados'
 * Equivalente exacto a: frmSMSEnviado.vb (la pantalla de la captura del usuario)
 * Muestra exclusivamente la consulta y auditoría operativa registro a registro:
 * - Filtros rápidos granulares en cabecera: Cod. Insp, Teléfono, Matrícula (*), Fecha Vto, Cliente, Fecha Envío
 * - Tabla granular con: Cod. Insp, Teléfono/Email, Matrícula, Vencimiento, Cliente, Fecha Envío, Plantilla, Estado
 * - Modal con la ficha técnica individual de la inspección
 * - NO incluye KPIs agregados ni gráficos que pertenecen al informe de totales.
 */
export const EnviosEnviadosReportPage: React.FC<EnviosEnviadosReportPageProps> = ({
  onNavigateHome,
  onNavigateToInformes,
}) => {
  const {
    filters,
    canal,
    setCanal,
    idPlantilla,
    setIdPlantilla,
    busqueda,
    setBusqueda,
    filtroCodInspeccion,
    setFiltroCodInspeccion,
    filtroTelefono,
    setFiltroTelefono,
    filtroMatricula,
    setFiltroMatricula,
    filtroFechaCaducidad,
    setFiltroFechaCaducidad,
    filtroCliente,
    setFiltroCliente,
    filtroFechaEnvio,
    setFiltroFechaEnvio,
    limpiarFiltrosGranulares,
    plantillas,
    data,
    isLoading,
    error,
    isExporting,
    exportError,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalFilas,
    sortField,
    sortAsc,
    handleSort,
    filasPaginadas,
    selectedDetalle,
    setSelectedDetalle,
    handleConsultar,
    handleExportarExcel,
  } = useEnviosRecordatoriosReport('detalle');

  const hayDatosParaExportar = (data?.filasDetalle && data.filasDetalle.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. Cabecera Corporativa del Informe */}
      <ReportPageHeader
        title="SMSs/EMAILs Enviados"
        subtitle="Consulta operativa y auditoría de recordatorios emitidos por estación a destinatarios individuales (frmSMSEnviado)."
        breadcrumbItemText="SMSs/EMAILs Enviados"
        icon="sms"
        onNavigateHome={onNavigateHome}
        onNavigateToInformes={onNavigateToInformes}
      >
        <AppTooltip
          content={
            hayDatosParaExportar
              ? 'Descargar listado de destinatarios en formato Excel (.xlsx)'
              : 'Consulte primero para habilitar la exportación'
          }
          position="bottom"
        >
          <span>
            <TsButton
              variant="primary"
              onClick={handleExportarExcel}
              disabled={!hayDatosParaExportar || isExporting}
            >
              <TsIcon slot="prefix" name={isExporting ? 'hourglass_empty' : 'download'} />
              {isExporting ? 'Generando Excel...' : 'Exportar a Excel'}
            </TsButton>
          </span>
        </AppTooltip>
      </ReportPageHeader>

      {/* 2. Alertas de validación de fechas o errores */}
      <ReportDateRangeAlert
        mensaje={filters.alertaRangoFechas}
        onAjustarAUnAno={filters.ajustarAUnAno}
      />

      {error && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <TsIcon name="warning" size={18} style={{ color: '#b91c1c' }} />
          <span>{error}</span>
        </div>
      )}

      {exportError && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.88rem',
          }}
        >
          {exportError}
        </div>
      )}

      {/* 3. Barra de Filtros Primaria (Estaciones y Fechas) */}
      <ReportFiltersBar
        fechaInicio={filters.fechaInicio}
        fechaFin={filters.fechaFin}
        sociedad={filters.sociedad}
        estacionesSeleccionadas={filters.estacionesSeleccionadas}
        estacionesPermitidas={filters.estacionesPermitidas}
        onFechaInicioChange={filters.handleFechaInicioChange}
        onFechaFinChange={filters.handleFechaFinChange}
        onSociedadChange={filters.setSociedad}
        onEstacionesChange={filters.setEstacionesSeleccionadas}
        onConsultar={handleConsultar}
        loading={isLoading}
      />

      {/* 4. Panel de Selección de Canal y Plantilla (Como en el cboTipoEnvioSMS de frmSMSEnviado) */}
      <TsCard style={{ padding: '14px 20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Selector de Canal: TODOS, SMS, EMAIL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Canal de Envío:</span>
            <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setCanal('TODOS')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: canal === 'TODOS' ? '#0046ad' : '#ffffff',
                  color: canal === 'TODOS' ? '#ffffff' : '#334155',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCanal('SMS')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: canal === 'SMS' ? '#0046ad' : '#ffffff',
                  color: canal === 'SMS' ? '#ffffff' : '#334155',
                  transition: 'background-color 0.15s ease',
                }}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => setCanal('EMAIL')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: canal === 'EMAIL' ? '#0046ad' : '#ffffff',
                  color: canal === 'EMAIL' ? '#ffffff' : '#334155',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Email
              </button>
            </div>
          </div>

          {/* Selector de Plantilla de Recordatorio */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Tipo de Envío / Plantilla:</span>
            <select
              value={idPlantilla ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null;
                setIdPlantilla(val);
              }}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '0.84rem',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                minWidth: '260px',
              }}
            >
              <option value="">-- Todos los tipos de envío --</option>
              {plantillas
                .filter((p) => canal === 'TODOS' || p.canal.toUpperCase() === canal)
                .map((p) => (
                  <option key={`${p.canal}-${p.idTipo}`} value={p.idTipo}>
                    [{p.canal}] #{p.idTipo} — {p.descripcion}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </TsCard>

      {/* 5. Tabla de Destinatarios con la Banda Superior de frmSMSEnviado */}
      <TsCard style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
        {/* Banda Marrón/Gris de Filtros Rápidos Granulares (Fiel a la captura de frmSMSEnviado) */}
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0046ad', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TsIcon name="tune" size={16} />
              Criterios de Búsqueda
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
              Recuerde que puede utilizar caracteres comodín (*) para la búsqueda por matrícula, teléfono o cliente
            </span>
          </div>

          {/* Fila de Inputs de Filtro Granular (Responsive) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                CANAL
              </label>
              <select
                value={canal}
                onChange={(e) => {
                  setCanal(e.target.value as 'TODOS' | 'SMS' | 'EMAIL');
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#0046ad',
                }}
              >
                <option value="TODOS">Todos los canales</option>
                <option value="SMS">Solo SMS</option>
                <option value="EMAIL">Solo Email</option>
              </select>
            </div>

            <div style={{ flex: '1 1 110px', minWidth: '95px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                Nº INSP.
              </label>
              <input
                type="text"
                value={filtroCodInspeccion}
                onChange={(e) => {
                  setFiltroCodInspeccion(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    handleConsultar();
                  }
                }}
                placeholder="Ej: 123456"
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                }}
              />
            </div>

            <div style={{ flex: '1.2 1 140px', minWidth: '130px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                TELÉFONO / EMAIL
              </label>
              <input
                type="text"
                value={filtroTelefono}
                onChange={(e) => {
                  setFiltroTelefono(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    handleConsultar();
                  }
                }}
                placeholder="Ej: 600* o *gmail*"
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                }}
              />
            </div>

            <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                MATRÍCULA (*)
              </label>
              <input
                type="text"
                value={filtroMatricula}
                onChange={(e) => {
                  setFiltroMatricula(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    handleConsultar();
                  }
                }}
                placeholder="Ej: *1234* o 5678*"
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#0046ad',
                }}
              />
            </div>

            <div style={{ flex: '1 1 110px', minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                FECHA VTO.
              </label>
              <input
                type="text"
                value={filtroFechaCaducidad}
                onChange={(e) => {
                  setFiltroFechaCaducidad(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    handleConsultar();
                  }
                }}
                placeholder="dd/mm/aaaa"
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                }}
              />
            </div>

            <div style={{ flex: '1.2 1 130px', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                CLIENTE
              </label>
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => {
                  setFiltroCliente(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    handleConsultar();
                  }
                }}
                placeholder="Ej: Perez*"
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                }}
              />
            </div>

            <div style={{ flex: '1 1 110px', minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                FECHA ENVÍO
              </label>
              <input
                type="text"
                value={filtroFechaEnvio}
                onChange={(e) => {
                  setFiltroFechaEnvio(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    handleConsultar();
                  }
                }}
                placeholder="dd/mm/aaaa"
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.82rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                }}
              />
            </div>

            {/* Botonera de Filtrar / Limpiar */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto', paddingTop: '4px' }}>
              <TsButton
                variant="primary"
                size="small"
                onClick={() => {
                  setPage(1);
                  handleConsultar();
                }}
                style={{ height: '32px' }}
              >
                <TsIcon slot="prefix" name="search" />
                Filtrar
              </TsButton>
              <TsButton
                variant="secondary"
                size="small"
                onClick={limpiarFiltrosGranulares}
                style={{ height: '32px' }}
              >
                <TsIcon slot="prefix" name="close" />
                Limpiar
              </TsButton>
            </div>
          </div>
        </div>

        {/* Buscador General Adicional y Selector de Tamaño de Página */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 300px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                width: '100%',
                maxWidth: '420px',
              }}
            >
              <TsIcon name="search" size={18} style={{ color: '#64748b' }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPage(1);
                }}
                placeholder="Búsqueda rápida en destinatarios..."
                className="cd-report-search-input"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  backgroundColor: 'transparent',
                }}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                  }}
                >
                  <TsIcon name="close" size={16} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                Mostrando {totalFilas.toLocaleString('es-ES')} registro{totalFilas !== 1 ? 's' : ''}
              </span>
              <AppTooltip
                content="Límite de seguridad en pantalla: Se cargan hasta 2.000 registros iniciales (y hasta 5.000 al aplicar filtros) para asegurar una navegación rápida en el navegador. Para extraer el histórico íntegro sin límite de corte, utilice el botón 'Exportar a Excel'."
                position="top"
              >
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#0046ad',
                    padding: '2px',
                  }}
                  aria-label="Información sobre límite de registros en pantalla"
                >
                  <TsIcon name="info" size={16} />
                </button>
              </AppTooltip>
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <option value="15">15 por pág.</option>
              <option value="25">25 por pág.</option>
              <option value="50">50 por pág.</option>
              <option value="100">100 por pág.</option>
            </select>
          </div>
        </div>

        {/* Grid de Registros Individuales */}
        {isLoading ? (
          <div
            style={{
              padding: '3rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              color: '#64748b',
            }}
          >
            <TsSpinner size="large" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Consultando listado de destinatarios...</span>
          </div>
        ) : totalFilas === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
            }}
          >
            <TsIcon name="sms" size={40} style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#334155', fontWeight: 600 }}>No se encontraron destinatarios</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Intente ajustar los filtros de matrícula, teléfono o el rango de fechas.
            </p>
          </div>
        ) : (
          <div className="cd-touch-scroll" style={{ overflowX: 'auto' }}>
            <table className="cd-data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th className="cd-table-th" onClick={() => handleSort('canal')} style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, width: '85px' }}>
                    Canal {sortField === 'canal' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('nombreEstacion')} style={{ padding: '10px 12px', textAlign: 'left', color: '#ffffff', fontWeight: 700, minWidth: '150px' }}>
                    Estación {sortField === 'nombreEstacion' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('numeroInspeccion')} style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, width: '100px' }}>
                    Nº Insp. {sortField === 'numeroInspeccion' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('fechaEnvio')} style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, width: '145px' }}>
                    Fecha Envío {sortField === 'fechaEnvio' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('matricula')} style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, width: '110px' }}>
                    Matrícula {sortField === 'matricula' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('destinatario')} style={{ padding: '10px 12px', textAlign: 'left', color: '#ffffff', fontWeight: 700, minWidth: '180px' }}>
                    Destinatario {sortField === 'destinatario' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('nombre')} style={{ padding: '10px 12px', textAlign: 'left', color: '#ffffff', fontWeight: 700, minWidth: '180px' }}>
                    Titular {sortField === 'nombre' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('descripcionPlantilla')} style={{ padding: '10px 12px', textAlign: 'left', color: '#ffffff', fontWeight: 700, minWidth: '220px' }}>
                    Plantilla {sortField === 'descripcionPlantilla' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th className="cd-table-th" onClick={() => handleSort('estadoEnvio')} style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, width: '105px' }}>
                    Estado {sortField === 'estadoEnvio' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', color: '#ffffff', fontWeight: 700, backgroundColor: '#0046ad', width: '70px' }}>
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {(filasPaginadas as FilaDetalleEnviosRecordatorios[]).map((row, idx) => (
                  <tr
                    key={`${row.codigoEstacion}-${row.numeroInspeccion}-${idx}`}
                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer' }}
                    onClick={() => setSelectedDetalle(row)}
                  >
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <TsBadge variant={row.canal === 'SMS' ? 'primary' : 'neutral'}>
                        {row.canal}
                      </TsBadge>
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0b253b' }}>
                      {row.nombreEstacion}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#475569', fontFamily: 'monospace' }}>
                      {row.numeroInspeccion > 0 ? (
                        <span style={{ backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#0046ad' }}>
                          {row.numeroInspeccion}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#475569', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const d = new Date(row.fechaEnvio);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        const hours = String(d.getHours()).padStart(2, '0');
                        const minutes = String(d.getMinutes()).padStart(2, '0');
                        return `${day}/${month}/${year} ${hours}:${minutes}`;
                      })()}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#0046ad',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {row.matricula}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#1e293b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {row.destinatario}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#1e293b', fontWeight: 500 }}>
                      {(() => {
                        const raw = `${row.nombre} ${row.apellidos}`.trim();
                        // Limpiar guion o barras iniciales de clientes importados
                        return raw.replace(/^[-–—/\s]+/, '') || '—';
                      })()}
                    </td>
                    <td style={{ padding: '9px 12px', color: '#475569', fontSize: '0.82rem', lineHeight: '1.3' }}>
                      {row.descripcionPlantilla}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                        }}
                      >
                        <TsIcon name="check" size={13} />
                        {row.estadoEnvio}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetalle(row);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0046ad',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <TsIcon name="visibility" size={15} />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación Fiel al Estilo Anteriores / Siguientes de frmSMSEnviado */}
        {totalFilas > pageSize && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '1.25rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Página {page} de {totalPages} ({totalFilas.toLocaleString('es-ES')} destinatarios encontrados)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: page === 1 ? '#f1f5f9' : '#ffffff',
                  color: page === 1 ? '#94a3b8' : '#334155',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ◀ Anteriores
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: page === totalPages ? '#f1f5f9' : '#ffffff',
                  color: page === totalPages ? '#94a3b8' : '#334155',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Siguientes ▶
              </button>
            </div>
          </div>
        )}
      </TsCard>

      {/* Modal Ficha Individual de Envío */}
      {selectedDetalle && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(11, 37, 59, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedDetalle(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TsIcon name={selectedDetalle.canal === 'SMS' ? 'sms' : 'mail'} size={22} style={{ color: '#0046ad' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0b253b', fontWeight: 700 }}>
                  Ficha de Envío {selectedDetalle.canal}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetalle(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px',
                }}
              >
                <TsIcon name="close" size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.88rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ESTACIÓN ITV</span>
                <span style={{ fontWeight: 600, color: '#0b253b' }}>
                  {selectedDetalle.nombreEstacion} ({selectedDetalle.codigoEstacion})
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>FECHA Y HORA ENVÍO</span>
                <span style={{ fontWeight: 600, color: '#0b253b', fontFamily: 'monospace' }}>
                  {(() => {
                    const d = new Date(selectedDetalle.fechaEnvio);
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    const hours = String(d.getHours()).padStart(2, '0');
                    const minutes = String(d.getMinutes()).padStart(2, '0');
                    return `${day}/${month}/${year} ${hours}:${minutes}`;
                  })()}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>MATRÍCULA</span>
                <span style={{ fontWeight: 700, color: '#0046ad', fontFamily: 'monospace', fontSize: '1rem' }}>
                  {selectedDetalle.matricula}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>CADUCIDAD ITV</span>
                <span style={{ color: '#1e293b', fontWeight: 500, fontFamily: 'monospace' }}>
                  {selectedDetalle.fechaCaducidad
                    ? (() => {
                        const d = new Date(selectedDetalle.fechaCaducidad);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()
                    : '—'}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>DESTINATARIO</span>
                <span style={{ fontWeight: 600, color: '#0b253b', fontFamily: 'monospace' }}>
                  {selectedDetalle.destinatario}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>TITULAR / CLIENTE</span>
                <span style={{ color: '#1e293b', fontWeight: 500 }}>
                  {(() => {
                    const raw = `${selectedDetalle.nombre} ${selectedDetalle.apellidos}`.trim();
                    return raw.replace(/^[-–—/\s]+/, '') || '—';
                  })()}
                </span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>PLANTILLA RECORDATORIO</span>
                <span style={{ color: '#1e293b' }}>
                  #{selectedDetalle.idPlantilla} — {selectedDetalle.descripcionPlantilla}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>ESTADO COMUNICACIÓN</span>
                <span style={{ fontWeight: 600, color: '#059669' }}>
                  {selectedDetalle.estadoEnvio}
                </span>
              </div>
              {selectedDetalle.numeroInspeccion > 0 && (
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Nº INSPECCIÓN ORIGEN</span>
                  <span style={{ fontFamily: 'monospace', color: '#1e293b' }}>
                    {selectedDetalle.numeroInspeccion}
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <TsButton variant="secondary" onClick={() => setSelectedDetalle(null)}>
                Cerrar Ficha
              </TsButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloqueante Durante Carga */}
      <BlockingLoadingModal
        isOpen={isLoading}
        title="Consultando Datos de Producción Oracle"
        message="Buscando destinatarios y detalles de envíos de recordatorios..."
      />
    </div>
  );
};
