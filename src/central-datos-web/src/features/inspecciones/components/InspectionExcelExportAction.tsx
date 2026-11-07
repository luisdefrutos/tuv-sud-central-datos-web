import React from 'react';
import { TsButton, TsDialog, TsIcon } from '@tuvsud/design-system/react';
import { AppTooltip } from '../../../components/common/AppTooltip';

interface InspectionExcelExportActionProps {
  fileTitle: string;
  totalRecords: number;
  confirmationThreshold: number;
  maxExportRows: number;
  hasData: boolean;
  isLoading: boolean;
  isExporting: boolean;
  confirmationRequired: boolean;
  onExport: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
}

export const InspectionExcelExportAction: React.FC<InspectionExcelExportActionProps> = ({
  fileTitle,
  totalRecords,
  confirmationThreshold,
  maxExportRows,
  hasData,
  isLoading,
  isExporting,
  confirmationRequired,
  onExport,
  onConfirmExport,
  onCancelExport,
}) => {
  const exportDisabled = !hasData || isLoading || isExporting || totalRecords > maxExportRows;
  const formattedTotal = totalRecords.toLocaleString('es-ES');
  const formattedThreshold = confirmationThreshold.toLocaleString('es-ES');
  const formattedMaximum = maxExportRows.toLocaleString('es-ES');

  const tooltipContent = !hasData
    ? 'Realice una consulta válida con resultados para habilitar la exportación.'
    : totalRecords > maxExportRows
      ? `Hay ${formattedTotal} resultados y el máximo para Excel es ${formattedMaximum}. Ajuste los filtros y vuelva a consultar.`
      : totalRecords > confirmationThreshold
        ? `Excel incluye todos los resultados (${formattedTotal}). Al superar ${formattedThreshold}, se solicitará confirmación. Máximo: ${formattedMaximum}.`
        : `Excel incluye todos los resultados (${formattedTotal}). Máximo: ${formattedMaximum}.`;

  return (
    <>
      <AppTooltip
        title={fileTitle}
        subtitle="Exportación completa según los criterios aplicados"
        content={tooltipContent}
        position="bottom"
      >
        <span>
          <TsButton
            type="button"
            variant="primary"
            size="medium"
            onClick={onExport}
            disabled={exportDisabled}
          >
            <TsIcon slot="prefix" name={isExporting ? 'hourglass_empty' : 'download'} />
            {isExporting ? 'Exportando...' : 'Exportar a Excel'}
          </TsButton>
        </span>
      </AppTooltip>

      {totalRecords > maxExportRows && (
        <AppTooltip
          title="Exportación no disponible"
          content={`La consulta devuelve ${formattedTotal} registros y el máximo permitido es ${formattedMaximum}. Ajuste los filtros y vuelva a consultar.`}
          position="bottom"
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--ts-semantic-color-icon-neutral-default)',
              cursor: 'help',
            }}
          >
            <TsIcon name="info" aria-label="Información sobre el límite de exportación" />
          </span>
        </AppTooltip>
      )}

      <TsDialog
        open={confirmationRequired}
        label="Confirmar exportación a Excel"
        closable
        closeTitle="Cancelar exportación"
        width="min(32rem, calc(100vw - 2rem))"
        onTsRequestClose={onCancelExport}
      >
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Se van a exportar <strong>{formattedTotal} registros</strong>. La generación del archivo puede tardar.
        </p>
        <div
          slot="footer"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--ts-semantic-size-space-300, 0.5rem)',
            flexWrap: 'wrap',
          }}
        >
          <TsButton type="button" variant="secondary" onClick={onCancelExport}>
            Cancelar
          </TsButton>
          <TsButton type="button" variant="primary" onClick={onConfirmExport}>
            Continuar exportación
          </TsButton>
        </div>
      </TsDialog>
    </>
  );
};
