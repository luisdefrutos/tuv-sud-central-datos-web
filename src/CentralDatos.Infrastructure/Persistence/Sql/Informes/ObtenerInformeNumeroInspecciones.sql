-- ==============================================================================
-- Query: ObtenerInformeNumeroInspecciones.sql
-- Dominio: Inspecciones Centralizadas ITV - Favorables y Rechazadas por Fase
-- Replicación Oficial: Réplica 1:1 de rptInspFavorablesRechazadas (Crystal Reports)
--                      y desglose Fase 1 (1ª Inspección) / Fase 2 (2ª Inspección).
-- Optimización: Single-pass CTE preagregada con hint de índices P17_INSPECCION y P31_INSPECCION.
-- ==============================================================================
WITH agg AS (
  SELECT /*+ INDEX(i P17_INSPECCION P31_INSPECCION) */
         i.CODESTACION,
         SUM(CASE WHEN i.RESULTADO IN ('1', '2') AND i.INDICA12 = '1' THEN 1 ELSE 0 END) AS Favorables1,
         SUM(CASE WHEN i.RESULTADO IN ('3', '4') AND i.INDICA12 = '1' THEN 1 ELSE 0 END) AS Rechazadas1,
         SUM(CASE WHEN i.RESULTADO IN ('1', '2') AND i.INDICA12 = '2' THEN 1 ELSE 0 END) AS Favorables2,
         SUM(CASE WHEN i.RESULTADO IN ('3', '4') AND i.INDICA12 = '2' THEN 1 ELSE 0 END) AS Rechazadas2,
         COUNT(1) AS TotalInspecciones
    FROM CENTRALITV.INSPECCION i
   WHERE i.FECHAINSPECCION >= :FechaInicio
     AND i.FECHAINSPECCION <= :FechaFin
     AND i.ANULADA = 0
   GROUP BY i.CODESTACION
)
SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CodEstacion,
       e.DesEstacion                               AS DesEstacion,
       e.Cod_Empresa                               AS CodEmpresa,
       NVL(a.Favorables1, 0)                       AS Favorables1,
       NVL(a.Rechazadas1, 0)                       AS Rechazadas1,
       NVL(a.Favorables2, 0)                       AS Favorables2,
       NVL(a.Rechazadas2, 0)                       AS Rechazadas2,
       NVL(a.TotalInspecciones, 0)                 AS TotalInspecciones
  FROM CENTRALITV.ESTACIONES e
  LEFT JOIN agg a
    ON a.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')
 WHERE e.Central_Datos = -1
   AND e.Cod_Empresa IN ('01', '03')
 ORDER BY e.Cod_Empresa, e.DesEstacion

