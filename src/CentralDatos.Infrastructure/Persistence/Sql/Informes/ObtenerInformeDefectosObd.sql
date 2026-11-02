-- ==============================================================================
-- Query: ObtenerInformeDefectosObd.sql
-- Dominio: Inspecciones Centralizadas ITV - Defectos de Lectura OBD (Bloque 15)
-- Replicación Oficial: Réplica 1:1 de frmCriterios.vb / Inspecciones_Defectos_OBD
-- Optimización: Conduce desde CENTRALITV.INSPECCION i utilizando el índice de fecha
--               (P17_INSPECCION / P31_INSPECCION) y une mediante Nested Loops a
--               CENTRALITV.INSPECCION_DEFECTOS por clave primaria (CODESTACION, CODINSPECCION).
--               Evita Full Table Scan sobre la tabla de defectos (~50M registros).
-- ==============================================================================
SELECT /*+ LEADING(i dfc e) INDEX(i P17_INSPECCION P31_INSPECCION) USE_NL(dfc) USE_NL(e) */
       i.CODINSPECCION                                               AS CodInspeccion,
       LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')                    AS CodEstacion,
       NVL(e.DesEstacion, 'Estación ' || i.CODESTACION)              AS DesEstacion,
       NVL(e.Cod_Empresa, '01')                                      AS CodEmpresa,
       i.MATRICULA                                                   AS Matricula,
       i.FECHAINSPECCION                                             AS FechaInspeccion,
       NVL(i.MARCA, '-')                                             AS Marca,
       NVL(i.MODELO, '-')                                            AS Modelo,
       NVL(i.TIPOMOTOR, '-')                                         AS TipoMotor,
       NVL(i.TIPOVEHICULO, '-')                                      AS TipoVehiculo,
       i.CHOMOLOGACION                                               AS CHomologacion,
       CONCAT(NVL(i.CODCONSTRUCCION, ''), NVL(i.CODUTILIZACION, '')) AS Clasificacion,
       i.MMA                                                         AS Mma,
       i.KILOMETRAJE                                                 AS Kilometraje,
       NVL(i.CODSEPIVA, '001')                                       AS TipoInspeccion,
       NVL(i.RESULTADO, '3')                                         AS Resultado,
       NVL(i.INDICA12, '1')                                          AS Fase,
       NVL(i.DESNIVEL_EMISIONES, '-')                                AS DesNivelEmisiones,
       dfc.BLOQUE                                                    AS Bloque,
       dfc.DEFECTO                                                   AS Defecto,
       dfc.SUBDEFECTO                                                AS Subdefecto,
       dfc.NUMERO                                                    AS Numero
  FROM CENTRALITV.INSPECCION i
 INNER JOIN CENTRALITV.INSPECCION_DEFECTOS dfc
    ON dfc.CODESTACION   = i.CODESTACION
   AND dfc.CODINSPECCION = i.CODINSPECCION
   AND dfc.BLOQUE        = '15'
   AND dfc.DEFECTO      IN ('02', '03')
   AND dfc.SUBDEFECTO    = '06'
   AND dfc.NUMERO       IN ('02', '03', '04', '05', '31', '51')
  LEFT JOIN CENTRALITV.ESTACIONES e
    ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')
 WHERE i.CODSECCION = 1
   AND i.ANULADA = 0
   AND i.FECHAINSPECCION >= :FechaInicio
   AND i.FECHAINSPECCION <= :FechaFin
 ORDER BY i.FECHAINSPECCION DESC
