-- Informe C4: Estadística MINER - Defectos por Bloque y Gravedad (Optimizado 100% Relacional)
WITH BaseDefectos AS (
    SELECT /*+ LEADING(i s d) INDEX(i P17_INSPECCION P31_INSPECCION) USE_NL(d) INDEX(d IX1_INSPECCION_DEFECTOS) */
        d.bloque,
        decode(d.leve, -1, 'L', decode(d.grave, -1, 'G', 'G')) AS GravedadTipo,
        COALESCE(t1.ID_CONST, t2.ID_CONST, 'OT') AS MinerCat
    FROM CENTRALITV.inspeccion i
    INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s
        ON s.CodSepiva = i.CodSepiva AND s.CodEstacion = i.CodEstacion AND s.CodServicio = '01'
    INNER JOIN CENTRALITV.inspeccion_defectos d
        ON i.codinspeccion = d.codinspeccion 
       AND i.codestacion = d.codestacion
    LEFT JOIN CENTRALITV.tipovehiculo_ident t1
        ON t1.CodConstruccion = i.CodConstruccion AND t1.CodUtilizacion = i.CodUtilizacion
    LEFT JOIN CENTRALITV.tipovehiculo_ident t2
        ON t2.CodConstruccion = i.CodConstruccion AND t2.CodUtilizacion = '*'
    WHERE i.resultado <> 0 
      AND i.anulada = 0 
      AND i.fechainspeccion >= :FechaInicio AND i.fechainspeccion <= :FechaFin
      AND d.bloque < '21'
      /*FILTRO_ESTACIONES*/
)
SELECT 
    bloque || GravedadTipo AS Gravedad,
    NVL(SUM(decode(MinerCat, 'MO', 1, 0)), 0) AS Grupo01Mo,
    NVL(SUM(decode(MinerCat, 'TP', 1, 0)), 0) AS Grupo02Tp,
    NVL(SUM(decode(MinerCat, 'TR', 1, 0)), 0) AS Grupo03Tr,
    NVL(SUM(decode(MinerCat, 'MP', 1, 0)), 0) AS Grupo04Mp,
    NVL(SUM(decode(MinerCat, 'MG', 1, 0)), 0) AS Grupo05Mg,
    NVL(SUM(decode(MinerCat, 'AU', 1, 0)), 0) AS Grupo06Au,
    NVL(SUM(decode(MinerCat, 'RS', 1, 0)), 0) AS Grupo07Rs,
    NVL(SUM(decode(MinerCat, 'AG', 1, 0)), 0) AS Grupo08Ag,
    NVL(SUM(decode(MinerCat, 'OT', 1, 0)), 0) AS Grupo09Ot
FROM BaseDefectos
GROUP BY bloque, GravedadTipo
ORDER BY bloque, GravedadTipo DESC
