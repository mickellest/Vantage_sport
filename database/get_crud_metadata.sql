-- =====================================================================
--  Función RPC: get_crud_metadata()
-- =====================================================================
--  Uso: Permite al frontend dinámico (Nuevo Front / Java.js) introspeccionar
--  el esquema de la base de datos (columnas, tipos, claves primarias,
--  claves foráneas y valores enum) en una sola llamada RPC.
--
--  Ejecutar en: Supabase > SQL Editor
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_crud_metadata()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH pk_cols AS (
        SELECT 
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
    ),
    fk_cols AS (
        SELECT 
            kcu.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table,
            ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
    ),
    enum_types AS (
        SELECT 
            t.typname,
            jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        GROUP BY t.typname
    ),
    col_meta AS (
        SELECT 
            c.table_name,
            c.column_name AS name,
            c.data_type AS data_type_raw,
            c.udt_name,
            c.is_nullable = 'YES' AS nullable,
            c.column_default AS default_expression,
            c.is_identity = 'YES' AS identity,
            c.is_generated = 'ALWAYS' AS generated,
            EXISTS (
                SELECT 1 FROM pk_cols pk 
                WHERE pk.table_name = c.table_name 
                  AND pk.column_name = c.column_name
            ) AS primary_key,
            (
                SELECT jsonb_build_object(
                    'table', fk.foreign_table,
                    'column', fk.foreign_column
                )
                FROM fk_cols fk
                WHERE fk.table_name = c.table_name 
                  AND fk.column_name = c.column_name
                LIMIT 1
            ) AS foreign_key,
            (
                SELECT et.enum_values 
                FROM enum_types et 
                WHERE et.typname = c.udt_name
            ) AS enum_values,
            c.ordinal_position
        FROM information_schema.columns c
        JOIN information_schema.tables t 
          ON c.table_schema = t.table_schema 
         AND c.table_name = t.table_name
        WHERE c.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
    ),
    processed_cols AS (
        SELECT 
            table_name,
            jsonb_build_object(
                'name', name,
                'dataType', CASE 
                    WHEN enum_values IS NOT NULL THEN 'enum'
                    WHEN udt_name IN ('int2', 'int4') THEN 'integer'
                    WHEN udt_name = 'int8' THEN 'bigint'
                    WHEN udt_name = 'bool' THEN 'boolean'
                    WHEN udt_name = 'numeric' THEN 'numeric'
                    WHEN udt_name IN ('varchar', 'text', 'bpchar') THEN 'text'
                    WHEN udt_name = 'date' THEN 'date'
                    WHEN udt_name = 'timestamptz' THEN 'timestamp with time zone'
                    WHEN udt_name = 'timestamp' THEN 'timestamp without time zone'
                    WHEN udt_name IN ('json', 'jsonb') THEN 'json'
                    ELSE data_type_raw
                END,
                'nullable', nullable,
                'primaryKey', primary_key,
                'identity', identity,
                'generated', generated,
                'defaultExpression', default_expression,
                'foreignKey', foreign_key,
                'enumValues', enum_values
            ) AS col_json,
            ordinal_position
        FROM col_meta
    ),
    table_aggs AS (
        SELECT 
            table_name,
            jsonb_agg(col_json ORDER BY ordinal_position) AS cols
        FROM processed_cols
        GROUP BY table_name
    )
    SELECT COALESCE(jsonb_object_agg(table_name, cols), '{}'::jsonb)
    INTO v_result
    FROM table_aggs;

    RETURN v_result;
END;
$$;

-- Permisos de ejecución para el frontend anónimo y autenticado
GRANT EXECUTE ON FUNCTION public.get_crud_metadata() TO anon, authenticated;
