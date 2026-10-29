-- ==============================================================================
-- Query: ObtenerUltimosDatosCentralizados.sql
-- Dominio: Estaciones ITV Centralizadas
-- Descripción: Consulta la última fecha de inspección sincronizada para cada
--              estación ITV activa de TÜV SÜD (26 TSA + 3 CAL = 29 estaciones).
--              Excluye Maqueda (4510), Villasante (0905) y Tarancón Ext. (18).
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
   AND LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') NOT IN ('4510', '0905')
 ORDER BY e.DesEstacion
