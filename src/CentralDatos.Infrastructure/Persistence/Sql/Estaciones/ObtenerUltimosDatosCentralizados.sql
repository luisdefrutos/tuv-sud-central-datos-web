-- ==============================================================================
-- Query: ObtenerUltimosDatosCentralizados.sql
-- Dominio: Estaciones ITV Centralizadas
-- Descripción: Consulta la última fecha de inspección sincronizada para cada
--              estación ITV activa de Central Datos (Central_Datos = -1),
--              idéntico al formulario frmUltimaInspeccion de la aplicación de escritorio.
-- ==============================================================================
SELECT LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') AS CodEstacion,
       e.DesEstacion                               AS DesEstacion,
       e.Cod_Empresa                               AS CodEmpresa,
       'ITV'                                       AS TipoEstacion,
       (SELECT MAX(i.FECHAINSPECCION) 
          FROM CENTRALITV.INSPECCION i 
         WHERE i.CODESTACION = LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0')) AS UltimaInspeccion
  FROM CENTRALITV.ESTACIONES e
 WHERE e.Central_Datos = -1
   AND e.Cod_Empresa IN ('01', '03')
 ORDER BY e.Cod_Empresa, e.DesEstacion
