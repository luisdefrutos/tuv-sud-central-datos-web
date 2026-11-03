-- =========================================================================================
-- Informe: Inspecciones por Rango Horario (PIVOT por Franja Horaria de 06 a 21 h)
-- Optimización Oracle 19c: PIVOT primero sobre INSPECCION, LEFT JOIN ESTACIONES al final
-- Replicación Oficial: frmCriterios.vb (Cargar_Dataset_Exportacion_InspRangoHorario)
-- =========================================================================================
SELECT p.CodEstacion,
       NVL(e.DesEstacion, 'Estación ' || p.CodEstacion) AS DesEstacion,
       NVL(TRIM(e.Cod_Empresa), '01')                   AS CodEmpresa,
       p.Fecha,
       p.H06, p.H07, p.H08, p.H09, p.H10, p.H11, p.H12, p.H13, p.H14, p.H15, p.H16, p.H17, p.H18, p.H19, p.H20, p.H21
  FROM (
    SELECT i.CODESTACION                                                AS CodEstacion,
           TRUNC(i.FECHAINSPECCION)                                     AS Fecha,
           TO_CHAR(NVL(i.HoraCobro, i.FECHAINSPECCION), 'hh24')         AS Hora,
           i.CODINSPECCION                                              AS CodInspeccion
      FROM CENTRALITV.INSPECCION i
     WHERE i.ANULADA = 0
       AND i.FECHAINSPECCION >= :FechaInicio
       AND i.FECHAINSPECCION <= :FechaFin/*WHERE_EXTRA*/
  )
  PIVOT (
    COUNT(CodInspeccion)
    FOR Hora IN (
      '06' AS H06, '07' AS H07, '08' AS H08, '09' AS H09,
      '10' AS H10, '11' AS H11, '12' AS H12, '13' AS H13,
      '14' AS H14, '15' AS H15, '16' AS H16, '17' AS H17,
      '18' AS H18, '19' AS H19, '20' AS H20, '21' AS H21
    )
  ) p
  LEFT JOIN CENTRALITV.ESTACIONES e
    ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(p.CodEstacion)), 4, '0')
 ORDER BY p.Fecha ASC, p.CodEstacion ASC
