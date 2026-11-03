-- =========================================================================================
-- Catálogo de Bloques de Defectos ITV (Capítulos del Manual de Reformas / Inspección)
-- Replicación Oficial: frmCriterios.vb (mcboBloque)
-- =========================================================================================
SELECT DISTINCT
       TRIM(Bloque) AS Codigo,
       TRIM(Descripcion) AS Descripcion
  FROM CENTRALITV.DEFECTOSBLOQUES
 WHERE CodIdioma = 'ESP'
 ORDER BY Codigo ASC

