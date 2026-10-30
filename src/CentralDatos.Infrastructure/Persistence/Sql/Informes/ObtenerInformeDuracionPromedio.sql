-- ==============================================================================
-- Query: ObtenerInformeDuracionPromedio.sql
-- Dominio: Inspecciones Centralizadas ITV - Duración Promedio Periódicas 001
-- Replicación Oficial: Réplica 1:1 de rptDuracionPromedio (Crystal Reports)
--                      y cálculo de tiempos medios por tipo de vehículo y estación.
-- Optimización: Single-pass CTE preagregada con hint de índices P17_INSPECCION y P31_INSPECCION.
-- ==============================================================================
WITH agg AS (
  SELECT /*+ INDEX(i P17_INSPECCION P31_INSPECCION) */
         i.CODESTACION,
         CENTRALITV.CLASIFICACION_MINER(i.CodConstruccion, i.CodUtilizacion) AS IdConst,
         COUNT(1) AS TotalInspecciones,
         ROUND(AVG((i.HoraFinal - i.HoraCobro) * 24 * 60), 1) AS DuracionPromedioMinutos
    FROM CENTRALITV.INSPECCION i
   WHERE i.FECHAINSPECCION >= :FechaInicio
     AND i.FECHAINSPECCION <= :FechaFin
     AND i.ANULADA = 0
     AND i.CodSepiva IN ('001')
     AND i.HoraFinal IS NOT NULL
     AND i.HoraCobro IS NOT NULL
     AND i.HoraFinal >= i.HoraCobro
   GROUP BY i.CODESTACION, CENTRALITV.CLASIFICACION_MINER(i.CodConstruccion, i.CodUtilizacion)
)
SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CodEstacion,
       e.DesEstacion                               AS DesEstacion,
       e.Cod_Empresa                               AS CodEmpresa,
       NVL(t.DESCRIPCION, 'OTROS')                 AS TipoVehiculo,
       NVL(t.ORDEN, 99)                            AS OrdenTipo,
       NVL(a.TotalInspecciones, 0)                 AS TotalInspecciones,
       NVL(a.DuracionPromedioMinutos, 0)           AS DuracionPromedioMinutos
  FROM CENTRALITV.ESTACIONES e
  JOIN agg a
    ON a.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')
  LEFT JOIN CENTRALITV.TIPOS_CLASIFICACION_MINER t
    ON t.ID_CONST = a.IdConst
 WHERE e.Central_Datos = -1
   AND e.Cod_Empresa IN ('01', '03')
 ORDER BY e.Cod_Empresa, e.DesEstacion, NVL(t.ORDEN, 99)

