#!/usr/bin/env node
/**
 * TÜV SÜD Central Datos — Read-Only Database MCP Server
 *
 * Dual-transport architecture tailored to the GESITV / Central Datos network topology:
 *  1. DB_MODE=soap   -> Queries Oracle safely through CentralITV_Svc (centralitv.asmx -> GetDatos_Paginados_3)
 *                       over HTTPS 443 using the legacy MD5 signature protocol. Zero Oracle client or VPN :1521 needed.
 *  2. DB_MODE=oracle -> Connects directly to Oracle (:1521) via node-oracledb v6+ pure-JS Thin Mode
 *                       (or optional Thick Mode if ORACLE_CLIENT_LIB_DIR is defined) with SET TRANSACTION READ ONLY.
 *
 * SECURITY: Strictly read-only. Only single SELECT / WITH statements are permitted; DML, DDL, PL/SQL blocks,
 *           FOR UPDATE locks, and dangerous packages (DBMS_*, UTL_*) are rejected before network transmission.
 */

import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';

const SERVER_NAME = 'central-datos-db';
const SERVER_VERSION = '1.0.0';
const MAX_ROWS_HARD_LIMIT = 200;
const DEFAULT_MAX_ROWS = 50;

const DB_MODE = (process.env.DB_MODE || 'soap').trim().toLowerCase();
const CENTRALITV_WS_URL = (
  process.env.CENTRALITV_WS_URL ||
  'https://gestion-desa.atisae.com/centralitvwebservice/centralitv.asmx'
).trim();
const CENTRALITV_WS_SECRET = process.env.CENTRALITV_WS_SECRET || 'HELKFN23AJURJSK2D';
const REQUEST_TIMEOUT_MS = Number(process.env.CENTRALITV_WS_TIMEOUT_MS || 30000);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  parseTagValue: false, // Preserve leading zeros in ITV codes (e.g. COD_ESTACION "0502")
  trimValues: true,
});

// ---------------------------------------------------------------------------
// 1. Read-Only SQL Guardrails
// ---------------------------------------------------------------------------

const FORBIDDEN_SQL_REGEX =
  /\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|BEGIN|DECLARE|COMMIT|ROLLBACK|SAVEPOINT|LOCK|PURGE|FLASHBACK|RENAME|COMMENT|AUDIT|NOAUDIT)\b|\b(DBMS_[A-Z0-9_$#]*|UTL_[A-Z0-9_$#]*)\b|\bFOR\s+UPDATE\b/i;

function sanitizeAndValidateReadOnlySql(rawSql) {
  if (typeof rawSql !== 'string' || !rawSql.trim()) {
    throw new Error('La consulta SQL no puede estar vacía.');
  }

  // Strip trailing whitespace and at most one trailing semicolon
  const cleaned = rawSql.trim().replace(/;\s*$/, '').trim();

  // Neutralize comments and single-quoted string literals exclusively for token analysis
  const strippedForInspection = cleaned
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/'([^']|'')*'/g, "''")
    .trim();

  if (!strippedForInspection) {
    throw new Error('La consulta SQL no contiene ninguna sentencia ejecutable.');
  }

  if (strippedForInspection.includes(';')) {
    throw new Error('Seguridad MCP: No se permiten múltiples sentencias SQL separadas por punto y coma (;).');
  }

  if (!/^(SELECT|WITH)\b/i.test(strippedForInspection)) {
    throw new Error('Seguridad MCP (Solo Lectura): Únicamente se permiten consultas que comiencen por SELECT o WITH.');
  }

  const forbiddenMatch = strippedForInspection.match(FORBIDDEN_SQL_REGEX);
  if (forbiddenMatch) {
    throw new Error(
      `Seguridad MCP (Solo Lectura): Palabra clave u objeto bloqueado detectado ("${forbiddenMatch[0]}").`
    );
  }

  return cleaned;
}

function assertSafeIdentifier(value, fieldName) {
  const clean = (value || '').trim().toUpperCase();
  if (!/^[A-Z0-9_$#%]+$/.test(clean)) {
    throw new Error(`Identificador inválido en ${fieldName}: "${value}". Use solo [A-Z0-9_$#%].`);
  }
  return clean;
}

function clampMaxRows(maxRows) {
  const n = Number(maxRows ?? DEFAULT_MAX_ROWS);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MAX_ROWS;
  return Math.min(Math.trunc(n), MAX_ROWS_HARD_LIMIT);
}

// ---------------------------------------------------------------------------
// 2. Transport A: SOAP (CentralITV_Svc / centralitv.asmx)
// ---------------------------------------------------------------------------

/**
 * Reproduces `clsCur.SQL_Limpia` + `modGeneral.Encripta` byte-for-byte:
 * - Strips non-ASCII-alphanumeric chars: `[A-Za-z0-9]`
 * - Computes 32-char lowercase MD5 hex of `sqlLimpia` -> `Clave`
 * - Computes 32-char lowercase MD5 hex of `Clave + CENTRALITV_WS_SECRET` -> `Passport`
 */
function computeCentralItvSignature(sql) {
  const sqlLimpia = sql.replace(/[^A-Za-z0-9]/g, '');
  const clave = crypto.createHash('md5').update(sqlLimpia, 'latin1').digest('hex');
  const passport = crypto
    .createHash('md5')
    .update(clave + CENTRALITV_WS_SECRET, 'latin1')
    .digest('hex');
  return { clave, passport };
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function callSoapEnvelope(soapAction, bodyInnerXml) {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${bodyInnerXml}
  </soap:Body>
</soap:Envelope>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  let responseText;
  try {
    response = await fetch(CENTRALITV_WS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"http://tempuri.org/${soapAction}"`,
      },
      body: envelope,
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (err) {
    throw new Error(
      `No se pudo conectar con CentralITV_Svc (${CENTRALITV_WS_URL}): ${err.message}. ` +
        `Verifique VPN/red corporativa o certificados TLS (NODE_EXTRA_CA_CERTS).`
    );
  } finally {
    clearTimeout(timer);
  }

  const parsed = xmlParser.parse(responseText);
  const fault = parsed?.Envelope?.Body?.Fault;
  if (fault) {
    const faultMsg = fault.faultstring || JSON.stringify(fault);
    throw new Error(`SOAP Fault desde CentralITV_Svc: ${faultMsg}`);
  }

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} (${response.statusText}) desde CentralITV_Svc: ${responseText.slice(0, 400)}`
    );
  }

  return parsed?.Envelope?.Body;
}

function extractDiffgramRows(resultNode) {
  const diffgram = resultNode?.diffgram;
  if (!diffgram || typeof diffgram !== 'object') {
    return [];
  }

  // Locate the DataSet container inside diffgram (e.g. NewDataSet / DocumentElement)
  const datasetKeys = Object.keys(diffgram).filter((k) => !k.startsWith('@_') && k !== 'errors');
  if (datasetKeys.length === 0) {
    return [];
  }

  const datasetNode = diffgram[datasetKeys[0]];
  if (!datasetNode || typeof datasetNode !== 'object') {
    return [];
  }

  const tableKeys = Object.keys(datasetNode).filter((k) => !k.startsWith('@_'));
  if (tableKeys.length === 0) {
    return [];
  }

  const rawRows = datasetNode[tableKeys[0]];
  const rowArray = Array.isArray(rawRows) ? rawRows : [rawRows];

  return rowArray.map((row) => {
    const cleanRow = {};
    for (const [col, val] of Object.entries(row || {})) {
      if (col.startsWith('@_')) continue;
      if (val && typeof val === 'object') {
        cleanRow[col] = val['@_nil'] === 'true' ? null : (val['#text'] ?? null);
      } else {
        cleanRow[col] = val ?? null;
      }
    }
    return cleanRow;
  });
}

async function executeSoapQuery(validSql, maxRows) {
  const { clave, passport } = computeCentralItvSignature(validSql);
  const bodyXml = `<GetDatos_Paginados_3 xmlns="http://tempuri.org/">
      <strSQL>${escapeXml(validSql)}</strSQL>
      <intLimite_Inferior>1</intLimite_Inferior>
      <intLimite_Superior>${maxRows}</intLimite_Superior>
      <Clave>${clave}</Clave>
      <Passport>${passport}</Passport>
    </GetDatos_Paginados_3>`;

  const startMs = performance.now();
  const body = await callSoapEnvelope('GetDatos_Paginados_3', bodyXml);
  const elapsedMs = Math.round(performance.now() - startMs);

  const resultNode = body?.GetDatos_Paginados_3Response?.GetDatos_Paginados_3Result;
  const rows = extractDiffgramRows(resultNode);
  return { rows, elapsedMs };
}

async function getSoapServiceVersion() {
  const body = await callSoapEnvelope('Version', '<Version xmlns="http://tempuri.org/" />');
  return body?.VersionResponse?.VersionResult ?? 'desconocida';
}

// ---------------------------------------------------------------------------
// 3. Transport B: Direct Oracle (node-oracledb v6+ Thin / optional Thick)
// ---------------------------------------------------------------------------

let oracleModulePromise = null;
let oracleThickInitialized = false;

async function getOracleDriver() {
  if (!oracleModulePromise) {
    oracleModulePromise = import('oracledb').then((m) => m.default || m);
  }
  const oracledb = await oracleModulePromise;
  const libDir = (process.env.ORACLE_CLIENT_LIB_DIR || '').trim();
  if (libDir && !oracleThickInitialized) {
    oracledb.initOracleClient({ libDir });
    oracleThickInitialized = true;
  }
  return oracledb;
}

async function executeOracleDirectQuery(validSql, maxRows) {
  const connectString = (process.env.ORACLE_CONNECT_STRING || '').trim();
  const user = (process.env.ORACLE_USER || '').trim();
  const password = process.env.ORACLE_PASSWORD || '';

  if (!connectString || !user || !password) {
    throw new Error(
      'DB_MODE=oracle requiere definir ORACLE_CONNECT_STRING (ej. host:1521/SERVICIO), ORACLE_USER y ORACLE_PASSWORD en mcp_config.json.'
    );
  }

  const oracledb = await getOracleDriver();
  const startMs = performance.now();
  let connection;

  try {
    connection = await oracledb.getConnection({ user, password, connectString });
    await connection.execute('SET TRANSACTION READ ONLY');

    const result = await connection.execute(validSql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      maxRows,
      fetchArraySize: Math.min(maxRows, 100),
      fetchTypeHandler: (metaData) => {
        if (
          metaData.dbType === oracledb.DB_TYPE_CLOB ||
          metaData.dbType === oracledb.DB_TYPE_NCLOB
        ) {
          return { type: oracledb.STRING };
        }
        return undefined;
      },
    });

    const elapsedMs = Math.round(performance.now() - startMs);
    return { rows: result.rows || [], elapsedMs };
  } finally {
    if (connection) {
      await connection.close().catch(() => {});
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Unified Query Dispatcher & Formatter
// ---------------------------------------------------------------------------

async function runReadOnlyQuery(rawSql, maxRows = DEFAULT_MAX_ROWS) {
  const validSql = sanitizeAndValidateReadOnlySql(rawSql);
  const limit = clampMaxRows(maxRows);

  if (DB_MODE === 'oracle') {
    return executeOracleDirectQuery(validSql, limit);
  }
  if (DB_MODE === 'soap') {
    return executeSoapQuery(validSql, limit);
  }
  throw new Error(`DB_MODE inválido ("${DB_MODE}"). Valores soportados: "soap" | "oracle".`);
}

function formatSuccess(payload) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function formatError(err) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            error: err instanceof Error ? err.message : String(err),
            mode: DB_MODE,
            endpoint: DB_MODE === 'soap' ? CENTRALITV_WS_URL : process.env.ORACLE_CONNECT_STRING || '(no definido)',
          },
          null,
          2
        ),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 5. MCP Server & Tools Registration
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

server.tool(
  'db_ping',
  'Verifica conectividad con la base de datos Oracle de Central Datos (vía SOAP CentralITV_Svc o conexión directa Oracle Thin) y devuelve metadatos básicos de la instancia.',
  {},
  async () => {
    try {
      let wsVersion = null;
      if (DB_MODE === 'soap') {
        wsVersion = await getSoapServiceVersion();
      }
      const { rows, elapsedMs } = await runReadOnlyQuery(
        "SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS SERVER_TIME, USER AS DB_USER, SYS_CONTEXT('USERENV', 'DB_NAME') AS DB_NAME, SYS_CONTEXT('USERENV', 'SERVER_HOST') AS SERVER_HOST FROM DUAL",
        1
      );
      return formatSuccess({
        status: 'OK',
        transportMode: DB_MODE,
        endpoint: DB_MODE === 'soap' ? CENTRALITV_WS_URL : process.env.ORACLE_CONNECT_STRING,
        webServiceVersion: wsVersion,
        elapsedMs,
        instance: rows[0] || null,
      });
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  'list_tables',
  'Lista tablas y vistas de un esquema Oracle (por defecto CENTRALITV) con estimación de filas (NUM_ROWS) y fecha de análisis.',
  {
    owner: z.string().default('CENTRALITV').describe('Esquema propietario en Oracle (ej. CENTRALITV)'),
    namePattern: z
      .string()
      .default('%')
      .describe('Filtro LIKE en mayúsculas sobre el nombre de tabla/vista (ej. %INSPEC% o EXPEDIENTES%)'),
    maxRows: z.number().int().min(1).max(MAX_ROWS_HARD_LIMIT).default(100),
  },
  async ({ owner, namePattern, maxRows }) => {
    try {
      const safeOwner = assertSafeIdentifier(owner, 'owner');
      const safePattern = assertSafeIdentifier(namePattern, 'namePattern');
      const sql = `
        SELECT OWNER, 'TABLE' AS OBJECT_TYPE, TABLE_NAME AS OBJECT_NAME, NUM_ROWS, TO_CHAR(LAST_ANALYZED, 'YYYY-MM-DD') AS LAST_ANALYZED
          FROM ALL_TABLES
         WHERE OWNER = '${safeOwner}' AND TABLE_NAME LIKE '${safePattern}'
        UNION ALL
        SELECT OWNER, 'VIEW' AS OBJECT_TYPE, VIEW_NAME AS OBJECT_NAME, NULL AS NUM_ROWS, NULL AS LAST_ANALYZED
          FROM ALL_VIEWS
         WHERE OWNER = '${safeOwner}' AND VIEW_NAME LIKE '${safePattern}'
         ORDER BY OBJECT_TYPE, OBJECT_NAME`;
      const { rows, elapsedMs } = await runReadOnlyQuery(sql, maxRows);
      return formatSuccess({ owner: safeOwner, pattern: safePattern, count: rows.length, elapsedMs, objects: rows });
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  'describe_table',
  'Obtiene la estructura de columnas, tipos de datos, nulabilidad y comentarios de una tabla o vista de Central Datos.',
  {
    owner: z.string().default('CENTRALITV').describe('Esquema propietario en Oracle (ej. CENTRALITV)'),
    tableName: z.string().describe('Nombre exacto de la tabla o vista (ej. INSPECCIONES)'),
  },
  async ({ owner, tableName }) => {
    try {
      const safeOwner = assertSafeIdentifier(owner, 'owner');
      const safeTable = assertSafeIdentifier(tableName, 'tableName');
      const sql = `
        SELECT c.COLUMN_ID,
               c.COLUMN_NAME,
               c.DATA_TYPE,
               c.DATA_LENGTH,
               c.DATA_PRECISION,
               c.DATA_SCALE,
               c.NULLABLE,
               cm.COMMENTS
          FROM ALL_TAB_COLUMNS c
          LEFT JOIN ALL_COL_COMMENTS cm
            ON cm.OWNER = c.OWNER
           AND cm.TABLE_NAME = c.TABLE_NAME
           AND cm.COLUMN_NAME = c.COLUMN_NAME
         WHERE c.OWNER = '${safeOwner}'
           AND c.TABLE_NAME = '${safeTable}'
         ORDER BY c.COLUMN_ID`;
      const { rows, elapsedMs } = await runReadOnlyQuery(sql, MAX_ROWS_HARD_LIMIT);
      return formatSuccess({ owner: safeOwner, tableName: safeTable, columnCount: rows.length, elapsedMs, columns: rows });
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  'list_indexes',
  'Lista todos los índices (incluidos índices basados en funciones) y sus columnas para una tabla Oracle de Central Datos. Clave para auditar rendimiento SQL.',
  {
    owner: z.string().default('CENTRALITV').describe('Esquema propietario en Oracle (ej. CENTRALITV)'),
    tableName: z.string().describe('Nombre exacto de la tabla (ej. INSPECCIONES)'),
  },
  async ({ owner, tableName }) => {
    try {
      const safeOwner = assertSafeIdentifier(owner, 'owner');
      const safeTable = assertSafeIdentifier(tableName, 'tableName');
      const sql = `
        SELECT i.INDEX_NAME,
               i.INDEX_TYPE,
               i.UNIQUENESS,
               i.STATUS,
               ic.COLUMN_POSITION,
               ic.COLUMN_NAME,
               ic.DESCEND
          FROM ALL_INDEXES i
          JOIN ALL_IND_COLUMNS ic
            ON ic.INDEX_OWNER = i.OWNER
           AND ic.INDEX_NAME = i.INDEX_NAME
         WHERE i.TABLE_OWNER = '${safeOwner}'
           AND i.TABLE_NAME = '${safeTable}'
         ORDER BY i.INDEX_NAME, ic.COLUMN_POSITION`;
      const { rows, elapsedMs } = await runReadOnlyQuery(sql, MAX_ROWS_HARD_LIMIT);
      return formatSuccess({ owner: safeOwner, tableName: safeTable, count: rows.length, elapsedMs, indexColumns: rows });
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  'get_plsql_source',
  'Obtiene líneas de código fuente PL/SQL (PACKAGE, PACKAGE BODY, PROCEDURE, FUNCTION, TRIGGER) desde ALL_SOURCE en modo solo lectura.',
  {
    owner: z.string().default('CENTRALITV').describe('Esquema propietario en Oracle'),
    objectName: z.string().describe('Nombre del paquete, procedimiento, función o trigger'),
    startLine: z.number().int().min(1).default(1).describe('Línea inicial (inclusive)'),
    endLine: z.number().int().min(1).default(150).describe('Línea final (inclusive, máx 200 líneas por lectura)'),
  },
  async ({ owner, objectName, startLine, endLine }) => {
    try {
      const safeOwner = assertSafeIdentifier(owner, 'owner');
      const safeObj = assertSafeIdentifier(objectName, 'objectName');
      const cappedEnd = Math.min(endLine, startLine + MAX_ROWS_HARD_LIMIT - 1);
      const sql = `
        SELECT TYPE, LINE, TEXT
          FROM ALL_SOURCE
         WHERE OWNER = '${safeOwner}'
           AND NAME = '${safeObj}'
           AND LINE BETWEEN ${Math.trunc(startLine)} AND ${Math.trunc(cappedEnd)}
         ORDER BY TYPE, LINE`;
      const { rows, elapsedMs } = await runReadOnlyQuery(sql, MAX_ROWS_HARD_LIMIT);
      return formatSuccess({
        owner: safeOwner,
        objectName: safeObj,
        range: [startLine, cappedEnd],
        lineCount: rows.length,
        elapsedMs,
        lines: rows,
      });
    } catch (err) {
      return formatError(err);
    }
  }
);

server.tool(
  'query_readonly',
  'Ejecuta una consulta SQL estrictamente de SOLO LECTURA (SELECT o WITH) sobre Oracle Central Datos con límite máximo de 200 filas.',
  {
    sql: z.string().describe('Sentencia SELECT o WITH sin punto y coma final'),
    maxRows: z
      .number()
      .int()
      .min(1)
      .max(MAX_ROWS_HARD_LIMIT)
      .default(DEFAULT_MAX_ROWS)
      .describe('Número máximo de filas a devolver (1..200, por defecto 50)'),
  },
  async ({ sql, maxRows }) => {
    try {
      const limit = clampMaxRows(maxRows);
      const { rows, elapsedMs } = await runReadOnlyQuery(sql, limit);
      return formatSuccess({
        transportMode: DB_MODE,
        rowCount: rows.length,
        maxRowsApplied: limit,
        truncated: rows.length >= limit,
        elapsedMs,
        rows,
      });
    } catch (err) {
      return formatError(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

