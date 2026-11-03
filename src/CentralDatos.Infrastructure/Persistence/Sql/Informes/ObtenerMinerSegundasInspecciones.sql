-- Informe C4: Estadística MINER - Segundas Inspecciones (Fase 2) (Optimizado 100% Relacional)
WITH BaseFase2 AS (
    SELECT 
        CASE i.resultado WHEN '1' THEN 'FAV' WHEN '2' THEN 'FAV' ELSE 'DESFAV' END AS ResultadoTipo,
        COALESCE(t1.ID_CONST, t2.ID_CONST, 'OT') AS MinerCat
    FROM CENTRALITV.inspeccion i
    INNER JOIN CENTRALITV.SERVICIOSPORTIPOINSPECCION s
        ON s.CodSepiva = i.CodSepiva AND s.CodEstacion = i.CodEstacion AND s.CodServicio = '01'
    LEFT JOIN CENTRALITV.tipovehiculo_ident t1
        ON t1.CodConstruccion = i.CodConstruccion AND t1.CodUtilizacion = i.CodUtilizacion
    LEFT JOIN CENTRALITV.tipovehiculo_ident t2
        ON t2.CodConstruccion = i.CodConstruccion AND t2.CodUtilizacion = '*'
    WHERE i.indica12 = '2' 
      AND i.resultado <> 0 
      AND i.anulada = 0 
      AND i.fechainspeccion >= :FechaInicio AND i.fechainspeccion <= :FechaFin
      /*FILTRO_ESTACIONES*/
)
SELECT 
    ResultadoTipo AS Result,
    NVL(SUM(decode(MinerCat, 'MO', 1, 0)), 0) AS Grupo01Mo,
    NVL(SUM(decode(MinerCat, 'TP', 1, 0)), 0) AS Grupo02Tp,
    NVL(SUM(decode(MinerCat, 'TR', 1, 0)), 0) AS Grupo03Tr,
    NVL(SUM(decode(MinerCat, 'MP', 1, 0)), 0) AS Grupo04Mp,
    NVL(SUM(decode(MinerCat, 'MG', 1, 0)), 0) AS Grupo05Mg,
    NVL(SUM(decode(MinerCat, 'AU', 1, 0)), 0) AS Grupo06Au,
    NVL(SUM(decode(MinerCat, 'RS', 1, 0)), 0) AS Grupo07Rs,
    NVL(SUM(decode(MinerCat, 'AG', 1, 0)), 0) AS Grupo08Ag,
    NVL(SUM(decode(MinerCat, 'OT', 1, 0)), 0) AS Grupo09Ot
FROM BaseFase2
GROUP BY ResultadoTipo
ORDER BY ResultadoTipo DESC
