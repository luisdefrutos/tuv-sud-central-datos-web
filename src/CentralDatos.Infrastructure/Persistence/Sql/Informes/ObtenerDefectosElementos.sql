-- =========================================================================================
-- Catálogo de Elementos / Defectos ITV por Bloque
-- Replicación Oficial: frmCriterios.vb (mcboElemento)
-- =========================================================================================
SELECT DISTINCT
       TRIM(Defecto) AS Codigo,
       TRIM(Descripcion) AS Descripcion
  FROM CENTRALITV.DEFECTOS
 WHERE Bloque = :Bloque
   AND CodIdioma = 'ESP'
 ORDER BY Codigo ASC

