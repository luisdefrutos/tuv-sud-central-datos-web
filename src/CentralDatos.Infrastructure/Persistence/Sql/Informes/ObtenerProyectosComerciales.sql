-- =========================================================================================
-- Catálogo de Proyectos Comerciales Activos
-- Replicación Oficial: frmCriterios.vb (mcboProyectosComerciales)
-- =========================================================================================
SELECT ID_PROYECTO AS IdProyecto,
       DESPROYECTO AS DesProyecto
  FROM CENTRALITV.PROYECTOS_COMERCIALES
 WHERE ACTIVO = -1
 ORDER BY DESPROYECTO

