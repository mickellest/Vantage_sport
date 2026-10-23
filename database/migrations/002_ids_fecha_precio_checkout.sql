-- =====================================================================
--  Vantage Sport · Migración 002 · IDs, fecha, precio histórico y checkout
-- ---------------------------------------------------------------------
--  Cambios:
--    a) Los IDs (P001, C001, O001…) los genera la base de datos mediante
--       secuencias, evitando duplicados con usuarios concurrentes.
--    b) orden.fecha_orden          → fecha y hora de creación de la orden.
--    c) orden_detalle.precio_unitario → precio congelado al momento de la
--       compra (los cambios de precio no alteran órdenes antiguas).
--    d) Función crear_orden()      → registra cliente, teléfono, orden y
--       detalle en UNA sola transacción (todo o nada).
--
--  Requisitos: haber ejecutado 001_politicas_rls.sql.
--  Cómo ejecutar: Supabase → SQL Editor → pegar el archivo → Run.
--  Es idempotente y se ejecuta dentro de una transacción.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- a) Generación de identificadores
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.seq_categoria;
CREATE SEQUENCE IF NOT EXISTS public.seq_producto;
CREATE SEQUENCE IF NOT EXISTS public.seq_cliente;
CREATE SEQUENCE IF NOT EXISTS public.seq_cliente_telefono;
CREATE SEQUENCE IF NOT EXISTS public.seq_orden;

-- Devuelve prefijo + número con relleno de ceros: ('P', seq, 3) → 'P013'.
-- Si el número supera el relleno no se trunca: 1000 → 'P1000'.
CREATE OR REPLACE FUNCTION public.generar_id(p_prefijo text, p_secuencia regclass, p_digitos int)
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

-- Ajusta cada secuencia al número más alto existente en su tabla.
-- Ejecutar después de cargar datos con IDs escritos a mano.
CREATE OR REPLACE FUNCTION public.sincronizar_secuencias()
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

REVOKE EXECUTE ON FUNCTION public.sincronizar_secuencias() FROM PUBLIC, anon, authenticated;

SELECT public.sincronizar_secuencias();

ALTER TABLE public.categoria        ALTER COLUMN id_categoria SET DEFAULT public.generar_id('CAT', 'public.seq_categoria'::regclass, 2);
ALTER TABLE public.producto         ALTER COLUMN id_producto  SET DEFAULT public.generar_id('P',   'public.seq_producto'::regclass, 3);
ALTER TABLE public.cliente          ALTER COLUMN id_cliente   SET DEFAULT public.generar_id('C',   'public.seq_cliente'::regclass, 3);
ALTER TABLE public.cliente_telefono ALTER COLUMN id_telefono  SET DEFAULT public.generar_id('T',   'public.seq_cliente_telefono'::regclass, 3);
ALTER TABLE public.orden            ALTER COLUMN id_orden     SET DEFAULT public.generar_id('O',   'public.seq_orden'::regclass, 3);

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generar_id(text, regclass, int) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- b) Fecha de la orden
-- ---------------------------------------------------------------------
-- Las órdenes existentes reciben la fecha/hora en que se ejecuta esta migración.
ALTER TABLE public.orden
    ADD COLUMN IF NOT EXISTS fecha_orden TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orden_fecha ON public.orden (fecha_orden DESC);

-- ---------------------------------------------------------------------
-- c) Precio unitario histórico
-- ---------------------------------------------------------------------
ALTER TABLE public.orden_detalle
    ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC;

-- Las líneas existentes toman el precio actual del producto.
UPDATE public.orden_detalle d
SET    precio_unitario = p.precio_actual
FROM   public.producto p
WHERE  p.id_producto = d.id_producto
  AND  d.precio_unitario IS NULL;

ALTER TABLE public.orden_detalle ALTER COLUMN precio_unitario SET NOT NULL;
ALTER TABLE public.orden_detalle DROP CONSTRAINT IF EXISTS chk_precio_unitario_no_negativo;
ALTER TABLE public.orden_detalle ADD  CONSTRAINT chk_precio_unitario_no_negativo CHECK (precio_unitario >= 0);

-- Si una línea se inserta sin precio, se copia el precio actual del producto.
CREATE OR REPLACE FUNCTION public.fn_asignar_precio_unitario()
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

DROP TRIGGER IF EXISTS trg_asignar_precio_unitario ON public.orden_detalle;
CREATE TRIGGER trg_asignar_precio_unitario
    BEFORE INSERT ON public.orden_detalle
    FOR EACH ROW EXECUTE FUNCTION public.fn_asignar_precio_unitario();

-- ---------------------------------------------------------------------
-- d) Checkout transaccional
-- ---------------------------------------------------------------------
-- Parámetros:
--   p_items      [{"id_producto":"P001","cantidad":2}, ...]   (obligatorio)
--   p_id_cliente 'C001'  → cliente existente
--   p_cliente    {"nom1_cliente":"", "nom2_cliente":"", "ape1_cliente":"",
--                 "ape2_cliente":"", "numero_telefono":""} → cliente nuevo
-- Devuelve la fila creada en public.orden.
CREATE OR REPLACE FUNCTION public.crear_orden(
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
    -- Validar productos
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

    -- Cliente nuevo (+ teléfono)
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

    -- Cabecera
    INSERT INTO orden (id_cliente)
    VALUES (v_id_cliente)
    RETURNING * INTO v_orden;

    -- Detalle con precio congelado
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

GRANT EXECUTE ON FUNCTION public.crear_orden(jsonb, text, jsonb) TO anon, authenticated;

COMMIT;

-- Pide a PostgREST recargar el esquema para exponer la nueva función.
NOTIFY pgrst, 'reload schema';
