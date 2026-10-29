-- =============================================================================
-- SCRIPT IDEMPOTENTE: TABLA DE AUDITORÍA Y TRAZABILIDAD WEB CENTRAL DATOS
-- Esquema: CENTRALITV
-- Compatibilidad: Oracle 11g / 12c / 19c / 21c / 23c
-- Característica: 100% IDEMPOTENTE (Se puede ejecutar N veces sin producir errores)
-- Fecha: 29/10/2026
-- =============================================================================

SET SERVEROUTPUT ON SIZE UNLIMITED;

PROMPT ============================================================================
PROMPT >> Iniciando despliegue idempotente de Auditoría Web en CENTRALITV...
PROMPT ============================================================================

-- -----------------------------------------------------------------------------
-- 1. SECUENCIA: CENTRALITV.SEQ_LOG_AUDITORIA_WEB
-- -----------------------------------------------------------------------------
DECLARE
    v_seq_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_seq_count
    FROM all_sequences
    WHERE sequence_owner = 'CENTRALITV' AND sequence_name = 'SEQ_LOG_AUDITORIA_WEB';

    IF v_seq_count = 0 THEN
        EXECUTE IMMEDIATE 'CREATE SEQUENCE CENTRALITV.SEQ_LOG_AUDITORIA_WEB START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE';
        DBMS_OUTPUT.PUT_LINE('[+] Secuencia CENTRALITV.SEQ_LOG_AUDITORIA_WEB creada exitosamente.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('[-] Secuencia CENTRALITV.SEQ_LOG_AUDITORIA_WEB ya existe. No se modifica.');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('[-] Secuencia CENTRALITV.SEQ_LOG_AUDITORIA_WEB ya existe (ORA-00955).');
        ELSE
            RAISE;
        END IF;
END;
/

-- -----------------------------------------------------------------------------
-- 2. TABLA: CENTRALITV.LOG_AUDITORIA_WEB
-- -----------------------------------------------------------------------------
DECLARE
    v_tab_count NUMBER;
BEGIN
    SELECT COUNT(*) INTO v_tab_count
    FROM all_tables
    WHERE owner = 'CENTRALITV' AND table_name = 'LOG_AUDITORIA_WEB';

    IF v_tab_count = 0 THEN
        EXECUTE IMMEDIATE '
            CREATE TABLE CENTRALITV.LOG_AUDITORIA_WEB (
                ID_LOG              NUMBER              NOT NULL,
                FECHA_HORA          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP NOT NULL,
                ID_EMPLEADO         NUMBER,
                COD_USUARIO         VARCHAR2(50)        NOT NULL,
                ROL                 VARCHAR2(30)        NOT NULL,
                ACCION              VARCHAR2(50)        NOT NULL,
                RUTA_MENU           VARCHAR2(150),
                CODESTACION         VARCHAR2(10),
                IP_ORIGEN           VARCHAR2(45),
                USER_AGENT          VARCHAR2(250),
                DURACION_MS         NUMBER,
                DETALLES            VARCHAR2(500),
                CONSTRAINT PK_LOG_AUDITORIA_WEB PRIMARY KEY (ID_LOG)
            )';
        DBMS_OUTPUT.PUT_LINE('[+] Tabla CENTRALITV.LOG_AUDITORIA_WEB creada exitosamente.');
    ELSE
        DBMS_OUTPUT.PUT_LINE('[-] Tabla CENTRALITV.LOG_AUDITORIA_WEB ya existe. No se modifica.');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('[-] Tabla CENTRALITV.LOG_AUDITORIA_WEB ya existe (ORA-00955).');
        ELSE
            RAISE;
        END IF;
END;
/

-- -----------------------------------------------------------------------------
-- 3. TRIGGER AUTOINCREMENTAL: CENTRALITV.TRG_LOG_AUDITORIA_WEB
-- (CREATE OR REPLACE es nativamente idempotente)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER CENTRALITV.TRG_LOG_AUDITORIA_WEB
BEFORE INSERT ON CENTRALITV.LOG_AUDITORIA_WEB
FOR EACH ROW
BEGIN
    IF :NEW.ID_LOG IS NULL THEN
        SELECT CENTRALITV.SEQ_LOG_AUDITORIA_WEB.NEXTVAL INTO :NEW.ID_LOG FROM DUAL;
    END IF;
END;
/

-- -----------------------------------------------------------------------------
-- 4. ÍNDICES DE RENDIMIENTO (Creación segura e idempotente)
-- -----------------------------------------------------------------------------
DECLARE
    PROCEDURE crear_indice_seguro(p_sql IN VARCHAR2, p_idx_name IN VARCHAR2) IS
        v_idx_count NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_idx_count
        FROM all_indexes
        WHERE owner = 'CENTRALITV' AND index_name = p_idx_name;

        IF v_idx_count = 0 THEN
            EXECUTE IMMEDIATE p_sql;
            DBMS_OUTPUT.PUT_LINE('[+] Índice ' || p_idx_name || ' creado exitosamente.');
        ELSE
            DBMS_OUTPUT.PUT_LINE('[-] Índice ' || p_idx_name || ' ya existe. Omitido.');
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- -955: nombre en uso; -1408: columna(s) ya indexada(s)
            IF SQLCODE IN (-955, -1408) THEN
                DBMS_OUTPUT.PUT_LINE('[-] Índice ' || p_idx_name || ' ya existente o equivalente (ORA' || SQLCODE || '). Omitido.');
            ELSE
                RAISE;
            END IF;
    END;
BEGIN
    crear_indice_seguro(
        'CREATE INDEX CENTRALITV.IX_LOG_AUDIT_FECHA ON CENTRALITV.LOG_AUDITORIA_WEB(FECHA_HORA)',
        'IX_LOG_AUDIT_FECHA'
    );
    crear_indice_seguro(
        'CREATE INDEX CENTRALITV.IX_LOG_AUDIT_USUARIO ON CENTRALITV.LOG_AUDITORIA_WEB(COD_USUARIO)',
        'IX_LOG_AUDIT_USUARIO'
    );
    crear_indice_seguro(
        'CREATE INDEX CENTRALITV.IX_LOG_AUDIT_ACCION ON CENTRALITV.LOG_AUDITORIA_WEB(ACCION)',
        'IX_LOG_AUDIT_ACCION'
    );
    crear_indice_seguro(
        'CREATE INDEX CENTRALITV.IX_LOG_AUDIT_ESTACION ON CENTRALITV.LOG_AUDITORIA_WEB(CODESTACION)',
        'IX_LOG_AUDIT_ESTACION'
    );
END;
/

-- -----------------------------------------------------------------------------
-- 5. COMENTARIOS DE DICCIONARIO DE DATOS (Nativamente idempotentes)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE CENTRALITV.LOG_AUDITORIA_WEB IS 'Registro de trazabilidad y auditoría de navegación de Central Datos Web (TÜV SÜD)';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.ID_LOG IS 'Identificador secuencial único del evento de auditoría';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.FECHA_HORA IS 'Fecha y hora exacta del evento (SYSTIMESTAMP)';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.COD_USUARIO IS 'Identificador de usuario (AD, DNI o código propio)';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.ROL IS 'Rol con el que ejecutó la acción (Supervisor, Responsable, Operador)';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.ACCION IS 'Tipo de acción: LOGIN, LOGOUT, NAVEGACION, EXPORT_EXCEL, etc.';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.RUTA_MENU IS 'Ruta o módulo del frontend accedido';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.CODESTACION IS 'Estación ITV filtrada o afectada';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.IP_ORIGEN IS 'Dirección IP del cliente';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.USER_AGENT IS 'Navegador o dispositivo utilizado';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.DURACION_MS IS 'Tiempo de permanencia en pantalla o duración de la petición en milisegundos';
COMMENT ON COLUMN CENTRALITV.LOG_AUDITORIA_WEB.DETALLES IS 'Información adicional contextual del evento';

PROMPT ============================================================================
PROMPT >> Despliegue idempotente finalizado con éxito (0 errores).
PROMPT ============================================================================

-- -----------------------------------------------------------------------------
-- 6. CONSULTAS DE VALIDACIÓN POST-EJECUCIÓN
-- -----------------------------------------------------------------------------
-- SELECT table_name, num_rows, status FROM all_tables WHERE owner = 'CENTRALITV' AND table_name = 'LOG_AUDITORIA_WEB';
-- SELECT index_name, status FROM all_indexes WHERE owner = 'CENTRALITV' AND table_name = 'LOG_AUDITORIA_WEB';
