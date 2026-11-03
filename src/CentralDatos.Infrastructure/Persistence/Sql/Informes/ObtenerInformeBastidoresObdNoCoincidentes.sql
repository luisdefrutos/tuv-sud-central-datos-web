-- ==============================================================================
-- Query: ObtenerInformeBastidoresObdNoCoincidentes.sql
-- Dominio: Control de Calidad y Antifraude ITV - Bastidores OBD No Coincidentes
-- Replicación Oficial: Réplica 1:1 de frmCriterios.vb / Informe_Bastidores_OBD_No_Coincidentes
-- Optimización: Conduce desde CENTRALITV.INSPECCION i filtrando por rango de fechas
--               y une mediante clave (CODESTACION, CODINSPECCION) a CENTRALITV.INSPECCION_MEDIC_OBD.
--               Filtra ruidos de lectura de bus OBD (longitud != 17, EEPR READ ERR,
--               caracteres inválidos y patrones monótonos repetidos).
-- ==============================================================================
SELECT i.CODINSPECCION                                               AS CodInspeccion,
       LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')                    AS CodEstacion,
       NVL(e.DesEstacion, 'Estación ' || i.CODESTACION)              AS DesEstacion,
       NVL(e.Cod_Empresa, '01')                                      AS CodEmpresa,
       i.FECHAINSPECCION                                             AS FechaInspeccion,
       i.MATRICULA                                                   AS Matricula,
       i.NUMBASTIDOR                                                 AS BastidorInspeccion,
       obd.NUMBASTIDOR_OBD                                           AS BastidorObd,
       NVL(i.CODCATEGORIA, '-')                                      AS Categoria,
       CONCAT(NVL(i.CODCONSTRUCCION, ''), NVL(i.CODUTILIZACION, '')) AS Clasificacion,
       i.NOMBRE                                                      AS Nombre,
       i.APELLIDOS                                                   AS Apellidos,
       i.CIFFACTURA                                                  AS CifFactura,
       i.CODINSPECTOR                                                AS CodInspector,
       i.CODINSPECTOR1                                               AS CodInspector1,
       i.CODINSPECTOR2                                               AS CodInspector2,
       i.CODINSPECTOR3                                               AS CodInspector3,
       i.CODRESPONSABLEVALIDACION                                    AS InspectorResponsableValidacion,
       obd.EQUIPO_OBD                                                AS EquipoObd,
       obd.CODEMPLEADO_BASTIDOR                                      AS CodEmpleadoBastidor
  FROM CENTRALITV.INSPECCION i
 INNER JOIN CENTRALITV.INSPECCION_MEDIC_OBD obd
    ON i.CODINSPECCION = obd.CODINSPECCION
   AND i.CODESTACION   = obd.CODESTACION
  LEFT JOIN CENTRALITV.ESTACIONES e
    ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')
 WHERE i.ANULADA = 0
   AND i.FECHAINSPECCION >= :FechaInicio
   AND i.FECHAINSPECCION <= :FechaFin/*WHERE_EXTRA*/
   -- 1. Bastidor de inspección válido
   AND i.NUMBASTIDOR IS NOT NULL
   AND TRIM(i.NUMBASTIDOR) IS NOT NULL
   -- 2. El bastidor OBD no debe estar en blanco ni ser nulo
   AND obd.NUMBASTIDOR_OBD IS NOT NULL
   AND TRIM(obd.NUMBASTIDOR_OBD) IS NOT NULL
   -- 3. Que sean diferentes
   AND TRIM(UPPER(i.NUMBASTIDOR)) <> TRIM(UPPER(obd.NUMBASTIDOR_OBD))
   -- 4. Filtros de exclusión sobre lectura OBD (descarta datos basura y errores de bus)
   AND LENGTH(TRIM(obd.NUMBASTIDOR_OBD)) = 17
   AND NOT REGEXP_LIKE(obd.NUMBASTIDOR_OBD, '[-¿?\\/<>]')
   AND NOT REGEXP_LIKE(TRIM(obd.NUMBASTIDOR_OBD), '^(.)\1{16}$')
   AND UPPER(obd.NUMBASTIDOR_OBD) NOT LIKE '%EEPR%READ%ERR%'
 ORDER BY i.FECHAINSPECCION DESC
