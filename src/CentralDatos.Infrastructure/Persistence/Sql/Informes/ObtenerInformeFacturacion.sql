-- ==============================================================================
-- Query: ObtenerInformeFacturacion.sql
-- Dominio: Facturación e Inspecciones Centralizadas ITV
-- Replicación Oficial: Réplica 1:1 de rptResumenInspecciones (Crystal Reports)
--                      y liquidación por estación con desglose completo de formas de pago.
-- Optimización: Pre-agregación en un solo paso (Single-pass CTE) con LEFT JOIN a FORMAPAGO
--                para computar simultáneamente totales y formas de pago sin subconsultas repetidas.
-- ==============================================================================
WITH agg AS (
  SELECT /*+ INDEX(i P17_INSPECCION P31_INSPECCION) */
         i.CODESTACION,
         COUNT(CASE WHEN i.INDICA12 = '1' THEN 1 END) AS TotalInspecciones,
         SUM(NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0)) AS TotalIngresos,
         SUM(NVL(i.DESCUENTO, 0)) AS TotalDescuentos,

         -- CONTADOS (CODTIPOFORMAPAGO in 'C', 'X')
         COUNT(CASE WHEN fp.CODTIPOFORMAPAGO IN ('C', 'X') THEN 1 END) AS ContadosNumInspecciones,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('C', 'X') THEN NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) ELSE 0 END) AS ContadosBase,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('C', 'X') THEN NVL(i.IVATARIFA, 0) ELSE 0 END) AS ContadosIVA,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('C', 'X') THEN NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0) ELSE 0 END) AS ContadosTasas,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('C', 'X') THEN NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) + NVL(i.IVATARIFA, 0) + NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0) ELSE 0 END) AS ContadosTotal,

         -- TERCEROS (CODTIPOFORMAPAGO in '3', 'O')
         COUNT(CASE WHEN fp.CODTIPOFORMAPAGO IN ('3', 'O') THEN 1 END) AS TercerosNumInspecciones,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('3', 'O') THEN NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) ELSE 0 END) AS TercerosBase,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('3', 'O') THEN NVL(i.IVATARIFA, 0) ELSE 0 END) AS TercerosIVA,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('3', 'O') THEN NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0) ELSE 0 END) AS TercerosTasas,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO IN ('3', 'O') THEN NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) + NVL(i.IVATARIFA, 0) + NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0) ELSE 0 END) AS TercerosTotal,

         -- TARJETAS (CODTIPOFORMAPAGO = 'T')
         COUNT(CASE WHEN fp.CODTIPOFORMAPAGO = 'T' THEN 1 END) AS TarjetasNumInspecciones,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO = 'T' THEN NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) ELSE 0 END) AS TarjetasBase,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO = 'T' THEN NVL(i.IVATARIFA, 0) ELSE 0 END) AS TarjetasIVA,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO = 'T' THEN NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0) ELSE 0 END) AS TarjetasTasas,
         SUM(CASE WHEN fp.CODTIPOFORMAPAGO = 'T' THEN NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) + NVL(i.IVATARIFA, 0) + NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0) ELSE 0 END) AS TarjetasTotal,

         -- TOTALES OFICIALES CRYSTAL REPORT
         COUNT(1) AS TotalesNumInspecciones,
         SUM(NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0)) AS TotalesBase,
         SUM(NVL(i.IVATARIFA, 0)) AS TotalesIVA,
         SUM(NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0)) AS TotalesTasas,
         SUM(NVL(i.TASATRAFICO, 0)) AS TotalesTasasTrafico,
         SUM(NVL(i.TASAINDUSTRIA, 0)) AS TotalesTasasIndustria,
         SUM(NVL(i.TARIFA, 0) + NVL(i.TARIFADIESEL, 0) + NVL(i.TASAAUX1, 0) - NVL(i.DESCUENTO, 0) + NVL(i.IVATARIFA, 0) + NVL(i.TASATRAFICO, 0) + NVL(i.TASAINDUSTRIA, 0)) AS TotalesTotal,
         COUNT(CASE WHEN SUBSTR(i.CODTARIFA, 4, 1) = '0' THEN 1 END) AS Gratuitas
    FROM CENTRALITV.INSPECCION i
    LEFT JOIN CENTRALITV.FORMAPAGO fp ON fp.CODFORMAPAGO = i.CODFORMAPAGO
   WHERE i.FECHAINSPECCION >= :FechaInicio
     AND i.FECHAINSPECCION <= :FechaFin
     AND i.ANULADA = 0
   GROUP BY i.CODESTACION
)
SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CodEstacion,
       e.DesEstacion                               AS DesEstacion,
       e.Cod_Empresa                               AS CodEmpresa,
       NVL(a.TotalInspecciones, 0)                 AS TotalInspecciones,
       NVL(a.TotalIngresos, 0)                     AS TotalIngresos,

       -- Desglose Crystal Report
       NVL(a.ContadosNumInspecciones, 0)           AS ContadosNumInspecciones,
       NVL(a.ContadosBase, 0)                      AS ContadosBase,
       NVL(a.ContadosIVA, 0)                       AS ContadosIVA,
       NVL(a.ContadosTasas, 0)                     AS ContadosTasas,
       NVL(a.ContadosTotal, 0)                     AS ContadosTotal,

       NVL(a.TercerosNumInspecciones, 0)           AS TercerosNumInspecciones,
       NVL(a.TercerosBase, 0)                      AS TercerosBase,
       NVL(a.TercerosIVA, 0)                       AS TercerosIVA,
       NVL(a.TercerosTasas, 0)                     AS TercerosTasas,
       NVL(a.TercerosTotal, 0)                     AS TercerosTotal,

       NVL(a.TarjetasNumInspecciones, 0)           AS TarjetasNumInspecciones,
       NVL(a.TarjetasBase, 0)                      AS TarjetasBase,
       NVL(a.TarjetasIVA, 0)                       AS TarjetasIVA,
       NVL(a.TarjetasTasas, 0)                     AS TarjetasTasas,
       NVL(a.TarjetasTotal, 0)                     AS TarjetasTotal,

       NVL(a.TotalesNumInspecciones, 0)            AS TotalesNumInspecciones,
       NVL(a.TotalesBase, 0)                       AS TotalesBase,
       NVL(a.TotalesIVA, 0)                        AS TotalesIVA,
       NVL(a.TotalesTasas, 0)                      AS TotalesTasas,
       NVL(a.TotalesTasasTrafico, 0)               AS TotalesTasasTrafico,
       NVL(a.TotalesTasasIndustria, 0)             AS TotalesTasasIndustria,
       NVL(a.TotalesTotal, 0)                      AS TotalesTotal,
       NVL(a.Gratuitas, 0)                         AS Gratuitas
  FROM CENTRALITV.ESTACIONES e
  LEFT JOIN agg a
    ON a.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')
 WHERE e.Central_Datos = -1
   AND e.Cod_Empresa IN ('01', '03')
 ORDER BY e.Cod_Empresa, e.DesEstacion
