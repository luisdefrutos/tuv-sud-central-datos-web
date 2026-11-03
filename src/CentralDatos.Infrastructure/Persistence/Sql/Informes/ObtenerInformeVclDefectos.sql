-- =========================================================================================
-- Informe C7: Volumen de Defectos Detectados por Grupo de Vehículo y Gravedad
-- Optimización Oracle 19c: 100% Relacional, 0 llamadas PL/SQL, Bind Variables
-- Replicación Oficial: frmCriterios.vb (Cargar_Dataset_Exportacion_VolumenDefectos)
-- =========================================================================================
SELECT LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0') AS CodEstacion,
       NVL(MAX(e.DesEstacion), 'Estación ' || LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')) AS DesEstacion,
       NVL(MAX(TRIM(e.Cod_Empresa)), '01') AS CodEmpresa,
       CASE 
         WHEN i.Codcategoria IN ('M1','M1G') THEN 'Grupo_M1'
         WHEN i.Codcategoria IN ('M2','M2G','M3','M3G') THEN 'Grupo_M2_M3'
         WHEN i.Codcategoria IN ('N1','N1G') THEN 'Grupo_N1'
         WHEN i.Codcategoria IN ('N2','N2G','N3','N3G') THEN 'Grupo_N2_N3'
         WHEN i.Codcategoria IN ('O3','O3.1','O4','O4.1') THEN 'Grupo_O3_O4'
         WHEN i.Codcategoria IN ('L1','L1e') THEN 'Grupo_L1_L1e'
         WHEN i.Codcategoria IN ('L3','L3e','L3e-A1','L3e-A2','L3e-A3') THEN 'Grupo_L3_L3e'
         ELSE 'Otros'
       END AS GrupoCategoria,
       d.Bloque,
       d.Defecto,
       d.Subdefecto,
       CASE 
         WHEN d.Muygrave = -1 THEN 'MG'
         WHEN d.Grave = -1    THEN 'G'
         ELSE 'L'
       END AS Gravedad,
       NVL(MAX(sub.Descripcion), 'Defecto ' || d.Bloque || '.' || d.Defecto || '.' || d.Subdefecto) AS Descripcion,
       COUNT(d.Bloque) AS NumDefectos
  FROM CENTRALITV.INSPECCION i
 INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s
    ON s.CodSepiva = i.CodSepiva 
   AND s.CodEstacion = i.CodEstacion 
   AND s.CodServicio = '01'
 INNER JOIN CENTRALITV.INSPECCION_DEFECTOS d
    ON d.CodEstacion = i.CodEstacion 
   AND d.CodInspeccion = i.CodInspeccion
  LEFT JOIN CENTRALITV.DEFECTOSSUB_SECCION sub
    ON sub.Bloque = d.Bloque
   AND sub.Defecto = d.Defecto
   AND sub.Subdefecto = d.Subdefecto
   AND sub.Numero = d.Numero
   AND sub.Leve = d.Leve
   AND sub.Grave = d.Grave
   AND sub.Muygrave = d.Muygrave
   AND sub.CodIdioma = 'ESP'
  LEFT JOIN CENTRALITV.ESTACIONES e
    ON LPAD(TRIM(TO_CHAR(e.CodEstacion)), 4, '0') = LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0')
 WHERE i.Anulada = 0
   AND i.Indica12 = '1'
   AND i.FechaInspeccion >= :FechaInicio
   AND i.FechaInspeccion <= :FechaFin
   AND (
     i.Codcategoria IN ('M1','M1G') OR
     i.Codcategoria IN ('M2','M2G','M3','M3G') OR
     i.Codcategoria IN ('N1','N1G') OR
     i.Codcategoria IN ('N2','N2G','N3','N3G') OR
     i.Codcategoria IN ('O3','O3.1','O4','O4.1') OR
     i.Codcategoria IN ('L1','L1e') OR
     i.Codcategoria IN ('L3','L3e','L3e-A1','L3e-A2','L3e-A3')
   )/*WHERE_EXTRA*/
 GROUP BY LPAD(TRIM(TO_CHAR(i.CODESTACION)), 4, '0'),
          CASE 
            WHEN i.Codcategoria IN ('M1','M1G') THEN 'Grupo_M1'
            WHEN i.Codcategoria IN ('M2','M2G','M3','M3G') THEN 'Grupo_M2_M3'
            WHEN i.Codcategoria IN ('N1','N1G') THEN 'Grupo_N1'
            WHEN i.Codcategoria IN ('N2','N2G','N3','N3G') THEN 'Grupo_N2_N3'
            WHEN i.Codcategoria IN ('O3','O3.1','O4','O4.1') THEN 'Grupo_O3_O4'
            WHEN i.Codcategoria IN ('L1','L1e') THEN 'Grupo_L1_L1e'
            WHEN i.Codcategoria IN ('L3','L3e','L3e-A1','L3e-A2','L3e-A3') THEN 'Grupo_L3_L3e'
            ELSE 'Otros'
          END,
          d.Bloque,
          d.Defecto,
          d.Subdefecto,
          CASE 
            WHEN d.Muygrave = -1 THEN 'MG'
            WHEN d.Grave = -1    THEN 'G'
            ELSE 'L'
          END
 ORDER BY NumDefectos DESC, GrupoCategoria ASC, d.Bloque ASC, d.Defecto ASC

