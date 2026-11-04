-- =========================================================================================
-- Informe C8: Clientes por Volumen de Inspecciones
-- Optimización Oracle 19c: 100% Relacional, 0 llamadas PL/SQL, Bind Variables
-- Replicación Oficial: frmCriterios.vb (Cargar_Dataset_Exportacion_ClientesVolumen)
-- =========================================================================================
WITH BaseInspecciones AS (
    SELECT /*+ LEADING(i s) INDEX(i P17_INSPECCION P31_INSPECCION) */
           LPAD(TRIM(TO_CHAR(i.CodEstacion)), 4, '0') AS CodEstacion,
           NVL(TRIM(i.Ciffacturat), TRIM(i.Ciffactura)) AS CifFactura,
           TRIM(i.Ciffactura) AS CifTitular,
           TRIM(NVL(i.Nombre, '') || ' ' || NVL(i.Apellidos, '')) AS NombreCliente,
           NVL(i.Domicilio, '') AS Domicilio,
           NVL(i.Dp, '') AS CodigoPostal,
           NVL(i.Poblacion, '') AS Poblacion,
           NVL(i.Provincia, '') AS Provincia,
           NVL(i.Telefono, '') AS Telefono,
           NVL(i.Telefono2, '') AS Telefono2,
           CASE 
               WHEN i.Resultado IN ('1', '2') THEN 'FAV'
               ELSE 'DESFAV'
           END AS Resultado,
           i.CodInspeccion
      FROM CENTRALITV.INSPECCION i
     INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s
        ON s.CodSepiva = i.CodSepiva 
       AND s.CodEstacion = i.CodEstacion 
       AND s.CodServicio = '01'
     WHERE i.Anulada = 0
       AND i.Ciffactura IS NOT NULL
       AND TRIM(i.Ciffactura) IS NOT NULL
       AND i.FechaInspeccion >= :FechaInicio
       AND i.FechaInspeccion <= :FechaFin
       /*FILTROS_BASE*/
),
ResumenDetalle AS (
    SELECT CodEstacion,
           CifFactura,
           CifTitular,
           NombreCliente,
           Domicilio,
           CodigoPostal,
           Poblacion,
           Provincia,
           Telefono,
           Telefono2,
           Resultado,
           COUNT(CodInspeccion) AS Cuenta
      FROM BaseInspecciones
     GROUP BY CodEstacion,
              CifFactura,
              CifTitular,
              NombreCliente,
              Domicilio,
              CodigoPostal,
              Poblacion,
              Provincia,
              Telefono,
              Telefono2,
              Resultado
),
ResumenTotalTitular AS (
    SELECT CodEstacion,
           CifTitular,
           COUNT(CodInspeccion) AS CuentaCif
      FROM BaseInspecciones
     GROUP BY CodEstacion, CifTitular
    HAVING COUNT(CodInspeccion) >= :LimiteCuenta
)
SELECT d.CodEstacion,
       NVL(e.DesEstacion, 'Estación ' || d.CodEstacion) AS DesEstacion,
       NVL(e.Cod_Empresa, '01') AS CodEmpresa,
       d.CifFactura,
       d.CifTitular,
       d.NombreCliente,
       d.Domicilio,
       d.CodigoPostal,
       d.Poblacion,
       d.Provincia,
       d.Telefono,
       d.Telefono2,
       d.Resultado,
       d.Cuenta,
       t.CuentaCif
  FROM ResumenDetalle d
 INNER JOIN ResumenTotalTitular t
    ON d.CodEstacion = t.CodEstacion
   AND d.CifTitular = t.CifTitular
  LEFT JOIN (
      SELECT LPAD(TRIM(TO_CHAR(CodEstacion)), 4, '0') AS CodEstacion,
             MAX(DesEstacion) AS DesEstacion,
             MAX(TRIM(Cod_Empresa)) AS Cod_Empresa
        FROM CENTRALITV.ESTACIONES
       WHERE Central_Datos = -1
         AND Cod_Empresa IN ('01', '03')
       GROUP BY LPAD(TRIM(TO_CHAR(CodEstacion)), 4, '0')
  ) e
    ON e.CodEstacion = d.CodEstacion
 /*FILTROS_EXTRA*/
 ORDER BY d.CodEstacion, t.CuentaCif DESC, d.CifTitular, d.NombreCliente, d.CifFactura, d.Cuenta DESC

