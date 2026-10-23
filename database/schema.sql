-- =====================================================================
--  Vantage Sport · Esquema completo de la base de datos
-- ---------------------------------------------------------------------
--  Uso: crear la base de datos desde cero en un proyecto Supabase NUEVO.
--  Resultado: equivalente a la base de producción con todas las
--  migraciones de database/migrations/ aplicadas.
--
--  Orden de instalación:
--    1. schema.sql   (este archivo)
--    2. seed.sql     (opcional, datos de ejemplo)
--
--  ⚠ No ejecutar sobre una base que ya tiene las tablas: usar las
--    migraciones en su lugar.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Secuencias y generador de identificadores
-- ---------------------------------------------------------------------
CREATE SEQUENCE public.seq_categoria;
CREATE SEQUENCE public.seq_producto;
CREATE SEQUENCE public.seq_cliente;
CREATE SEQUENCE public.seq_cliente_telefono;
CREATE SEQUENCE public.seq_orden;

CREATE FUNCTION public.generar_id(p_prefijo text, p_secuencia regclass, p_digitos int)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
    n bigint := nextval(p_secuencia);
BEGIN
    RETURN p_prefijo || lpad(n::text, greatest(p_digitos, length(n::text)), '0');
END;
$$;

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------
CREATE TABLE public.categoria (
    id_categoria     TEXT PRIMARY KEY DEFAULT public.generar_id('CAT', 'public.seq_categoria'::regclass, 2),
    nombre_categoria TEXT NOT NULL
);

CREATE TABLE public.producto (
    id_producto     TEXT    PRIMARY KEY DEFAULT public.generar_id('P', 'public.seq_producto'::regclass, 3),
    nombre_producto TEXT    NOT NULL,
    precio_actual   NUMERIC NOT NULL CHECK (precio_actual >= 0),
    id_categoria    TEXT    NOT NULL REFERENCES public.categoria (id_categoria)
                            ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE public.cliente (
    id_cliente   TEXT PRIMARY KEY DEFAULT public.generar_id('C', 'public.seq_cliente'::regclass, 3),
    nom1_cliente TEXT NOT NULL,
    nom2_cliente TEXT,
    ape1_cliente TEXT NOT NULL,
    ape2_cliente TEXT
);

CREATE TABLE public.cliente_telefono (
    id_telefono     TEXT PRIMARY KEY DEFAULT public.generar_id('T', 'public.seq_cliente_telefono'::regclass, 3),
    id_cliente      TEXT NOT NULL REFERENCES public.cliente (id_cliente)
                         ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_telefono TEXT NOT NULL
);

CREATE TABLE public.orden (
    id_orden    TEXT        PRIMARY KEY DEFAULT public.generar_id('O', 'public.seq_orden'::regclass, 3),
    id_cliente  TEXT        NOT NULL REFERENCES public.cliente (id_cliente)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
    fecha_orden TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orden_detalle (
    id_orden        TEXT    NOT NULL REFERENCES public.orden (id_orden)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
    id_producto     TEXT    NOT NULL REFERENCES public.producto (id_producto)
                            ON UPDATE CASCADE ON DELETE RESTRICT,
    cantidad        INT4    NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC NOT NULL,
    CONSTRAINT chk_precio_unitario_no_negativo CHECK (precio_unitario >= 0),
    PRIMARY KEY (id_orden, id_producto)
);

-- ---------------------------------------------------------------------
-- 3. Índices sobre claves foráneas y columnas de filtrado
-- ---------------------------------------------------------------------
CREATE INDEX idx_producto_categoria ON public.producto (id_categoria);
CREATE INDEX idx_telefono_cliente   ON public.cliente_telefono (id_cliente);
CREATE INDEX idx_orden_cliente      ON public.orden (id_cliente);
CREATE INDEX idx_orden_fecha        ON public.orden (fecha_orden DESC);
CREATE INDEX idx_detalle_producto   ON public.orden_detalle (id_producto);

-- ---------------------------------------------------------------------
-- 4. Trigger: precio unitario por defecto
-- ---------------------------------------------------------------------
CREATE FUNCTION public.fn_asignar_precio_unitario()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.precio_unitario IS NULL THEN
        SELECT precio_actual INTO NEW.precio_unitario
        FROM   public.producto
        WHERE  id_producto = NEW.id_producto;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_asignar_precio_unitario
    BEFORE INSERT ON public.orden_detalle
    FOR EACH ROW EXECUTE FUNCTION public.fn_asignar_precio_unitario();

-- ---------------------------------------------------------------------
-- 5. Funciones de negocio
-- ---------------------------------------------------------------------
CREATE FUNCTION public.sincronizar_secuencias()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    r     record;
    v_max bigint;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('categoria',        'id_categoria', 'public.seq_categoria'),
            ('producto',         'id_producto',  'public.seq_producto'),
            ('cliente',          'id_cliente',   'public.seq_cliente'),
            ('cliente_telefono', 'id_telefono',  'public.seq_cliente_telefono'),
            ('orden',            'id_orden',     'public.seq_orden')
        ) AS t(tabla, columna, secuencia)
    LOOP
        EXECUTE format(
            $q$SELECT COALESCE(MAX(NULLIF(regexp_replace(%I, '\D', '', 'g'), '')::bigint), 0) FROM public.%I$q$,
            r.columna, r.tabla
        ) INTO v_max;
        PERFORM setval(r.secuencia::regclass, v_max + 1, false);
    END LOOP;
END;
$$;

CREATE FUNCTION public.crear_orden(
    p_items      jsonb,
    p_id_cliente text  DEFAULT NULL,
    p_cliente    jsonb DEFAULT NULL
)
RETURNS public.orden
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id_cliente text := NULLIF(trim(p_id_cliente), '');
    v_orden      public.orden;
    v_items      int;
    v_insertados int;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La orden debe contener al menos un producto' USING ERRCODE = '22023';
    END IF;
    v_items := jsonb_array_length(p_items);

    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS i(id_producto text, cantidad int)
        WHERE i.cantidad IS NULL OR i.cantidad <= 0
    ) THEN
        RAISE EXCEPTION 'Todas las cantidades deben ser mayores que cero' USING ERRCODE = '22023';
    END IF;

    IF v_id_cliente IS NULL THEN
        IF p_cliente IS NULL
           OR COALESCE(trim(p_cliente->>'nom1_cliente'), '') = ''
           OR COALESCE(trim(p_cliente->>'ape1_cliente'), '') = '' THEN
            RAISE EXCEPTION 'Faltan datos obligatorios del cliente (primer nombre y primer apellido)'
                USING ERRCODE = '22023';
        END IF;

        INSERT INTO cliente (nom1_cliente, nom2_cliente, ape1_cliente, ape2_cliente)
        VALUES (
            trim(p_cliente->>'nom1_cliente'),
            NULLIF(trim(p_cliente->>'nom2_cliente'), ''),
            trim(p_cliente->>'ape1_cliente'),
            NULLIF(trim(p_cliente->>'ape2_cliente'), '')
        )
        RETURNING id_cliente INTO v_id_cliente;

        IF COALESCE(trim(p_cliente->>'numero_telefono'), '') <> '' THEN
            INSERT INTO cliente_telefono (id_cliente, numero_telefono)
            VALUES (v_id_cliente, trim(p_cliente->>'numero_telefono'));
        END IF;
    END IF;

    INSERT INTO orden (id_cliente)
    VALUES (v_id_cliente)
    RETURNING * INTO v_orden;

    INSERT INTO orden_detalle (id_orden, id_producto, cantidad, precio_unitario)
    SELECT v_orden.id_orden, i.id_producto, i.cantidad, p.precio_actual
    FROM   jsonb_to_recordset(p_items) AS i(id_producto text, cantidad int)
    JOIN   producto p ON p.id_producto = i.id_producto;

    GET DIAGNOSTICS v_insertados = ROW_COUNT;
    IF v_insertados <> v_items THEN
        RAISE EXCEPTION 'Uno o más productos de la orden no existen' USING ERRCODE = '23503';
    END IF;

    RETURN v_orden;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. Permisos
-- ---------------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generar_id(text, regclass, int)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crear_orden(jsonb, text, jsonb)     TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sincronizar_secuencias() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Seguridad a nivel de fila (RLS)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'categoria', 'producto', 'cliente',
        'cliente_telefono', 'orden', 'orden_detalle'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
                       t || '_select', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)',
                       t || '_insert', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)',
                       t || '_update', t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (true)',
                       t || '_delete', t);
    END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
