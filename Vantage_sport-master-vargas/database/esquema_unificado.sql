-- =====================================================================
--  ESQUEMA UNIFICADO - ERP + Ventas/CRM + Pagos/Envíos + Usuarios
--                      + Suministros (proveedores e inventario)
-- =====================================================================
--  Ejecutar en: Supabase > SQL Editor
--
--  ⚠️  ATENCIÓN: este script BORRA todas las tablas actuales del ERP
--      (orden_detalle, orden, cliente_telefono, cliente, producto,
--      categoria) y sus datos, y las crea de nuevo.
--
--  Decisiones de diseño:
--   * IDs enteros autoincrementales (int4) en todas las tablas.
--   * Nombres del ERP para las tablas que se repetían entre módulos.
--   * Las columnas "codigo" conservan los códigos antiguos del ERP
--     (P001, C001, O001...) para trazabilidad.
--
--  Tablas que se UNIFICARON (una sola tabla para varios módulos):
--   cliente          <- cliente (ERP)       + clientes
--   cliente_telefono <- cliente_telefono    + clientes.telefono
--   producto         <- producto (ERP)      + productos (CRM) + productos (Suministros)
--   categoria        <- categoria (ERP)     + categorias (Suministros)
--   variantes_producto <- variantes_producto (CRM) + variantes_producto (Suministros)
--   orden            <- orden (ERP)         + pedidos
--   orden_detalle    <- orden_detalle (ERP) + detalle_pedido
--
--  Tablas nuevas del módulo de Suministros (IDs uuid -> int4):
--   proveedores, ordenes_suministro, detalles_orden_suministro,
--   historial_inventario
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. LIMPIEZA (tablas actuales + tablas de otros módulos si existieran)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS historial_inventario         CASCADE;
DROP TABLE IF EXISTS detalles_orden_suministro    CASCADE;
DROP TABLE IF EXISTS ordenes_suministro           CASCADE;
DROP TABLE IF EXISTS proveedores                  CASCADE;
DROP TABLE IF EXISTS orden_detalle        CASCADE;
DROP TABLE IF EXISTS pagos                CASCADE;
DROP TABLE IF EXISTS envios               CASCADE;
DROP TABLE IF EXISTS orden                CASCADE;
DROP TABLE IF EXISTS campana              CASCADE;
DROP TABLE IF EXISTS "Campaña"            CASCADE;
DROP TABLE IF EXISTS etapas_venta         CASCADE;
DROP TABLE IF EXISTS promociones          CASCADE;
DROP TABLE IF EXISTS direcciones_cliente  CASCADE;
DROP TABLE IF EXISTS cliente_telefono     CASCADE;
DROP TABLE IF EXISTS cliente              CASCADE;
DROP TABLE IF EXISTS variantes_producto   CASCADE;
DROP TABLE IF EXISTS producto             CASCADE;
DROP TABLE IF EXISTS categoria            CASCADE;
DROP TABLE IF EXISTS usuarios             CASCADE;
DROP TABLE IF EXISTS roles                CASCADE;

-- Tablas de otros módulos con nombres distintos (por si se importaron)
DROP TABLE IF EXISTS detalle_pedido CASCADE;
DROP TABLE IF EXISTS pedidos        CASCADE;
DROP TABLE IF EXISTS productos      CASCADE;
DROP TABLE IF EXISTS clientes       CASCADE;
DROP TABLE IF EXISTS categorias     CASCADE;

-- Funciones y secuencias del esquema anterior del ERP (database/schema.sql)
DROP FUNCTION IF EXISTS public.crear_orden(jsonb, text, jsonb)          CASCADE;
DROP FUNCTION IF EXISTS public.crear_orden(jsonb, int4, jsonb)          CASCADE;
DROP FUNCTION IF EXISTS public.fn_asignar_precio_unitario()             CASCADE;
DROP FUNCTION IF EXISTS public.sincronizar_secuencias()                 CASCADE;
DROP FUNCTION IF EXISTS public.generar_id(text, regclass, int)          CASCADE;
DROP SEQUENCE IF EXISTS public.seq_categoria;
DROP SEQUENCE IF EXISTS public.seq_producto;
DROP SEQUENCE IF EXISTS public.seq_cliente;
DROP SEQUENCE IF EXISTS public.seq_cliente_telefono;
DROP SEQUENCE IF EXISTS public.seq_orden;

DROP TYPE IF EXISTS estado_orden_enum   CASCADE;
DROP TYPE IF EXISTS metodo_pago_enum    CASCADE;
DROP TYPE IF EXISTS estado_pago_enum    CASCADE;
DROP TYPE IF EXISTS estado_envio_enum   CASCADE;
DROP TYPE IF EXISTS tipo_promocion_enum CASCADE;
DROP TYPE IF EXISTS tipo_cliente_enum   CASCADE;
DROP TYPE IF EXISTS origen_lead_enum    CASCADE;
DROP TYPE IF EXISTS estado_pedido_enum  CASCADE;

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUM
--    ⚠️ Los valores son una propuesta: ajústalos a los que usan los
--    otros módulos (o añade más con ALTER TYPE ... ADD VALUE).
-- ---------------------------------------------------------------------
CREATE TYPE estado_orden_enum   AS ENUM ('pendiente','pagado','enviado','entregado','cancelado');
CREATE TYPE metodo_pago_enum    AS ENUM ('efectivo','transferencia','pago_movil','tarjeta','zelle','paypal');
CREATE TYPE estado_pago_enum    AS ENUM ('pendiente','confirmado','rechazado','reembolsado');
CREATE TYPE estado_envio_enum   AS ENUM ('preparando','despachado','en_transito','entregado','devuelto');
CREATE TYPE tipo_promocion_enum AS ENUM ('porcentaje','monto_fijo');
CREATE TYPE tipo_cliente_enum   AS ENUM ('minorista','mayorista');
CREATE TYPE origen_lead_enum    AS ENUM ('web','redes_sociales','referido','tienda_fisica','otro');

-- ---------------------------------------------------------------------
-- 2. SEGURIDAD / USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    rol_id       int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       varchar NOT NULL UNIQUE,
    descripcion  varchar
);

CREATE TABLE usuarios (
    usuario_id      int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rol_id          int4 NOT NULL REFERENCES roles(rol_id),
    nombre          varchar NOT NULL,
    email           varchar NOT NULL UNIQUE,
    password_hash   varchar NOT NULL,
    activo          bool NOT NULL DEFAULT true,
    fecha_registro  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. CATÁLOGO (categoria, producto, variantes_producto)
--    Unifica ERP + CRM + Suministros
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    id_categoria      int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo            text UNIQUE,                 -- antes: 'CAT01'
    nombre_categoria  text NOT NULL UNIQUE,
    descripcion       text                         -- viene de Suministros
);

CREATE TABLE producto (
    id_producto      int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo           text UNIQUE,                  -- antes: 'P001'
    nombre_producto  text NOT NULL,
    descripcion      text,                         -- viene de Suministros
    precio_compra    numeric(12,2) CHECK (precio_compra >= 0),  -- Suministros
    -- precio_actual = precio de venta (ERP) = precio_venta (Suministros)
    precio_actual    numeric(12,2) NOT NULL CHECK (precio_actual >= 0),
    activo           bool NOT NULL DEFAULT true,   -- viene de Suministros
    id_categoria     int4 REFERENCES categoria(id_categoria)
                          ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE variantes_producto (
    variante_id   int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_producto   int4 NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    sku           varchar NOT NULL UNIQUE,
    talla         varchar,
    color         varchar,
    stock_actual  int4 NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo  int4 NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)  -- Suministros
);

-- ---------------------------------------------------------------------
-- 4. CLIENTES (cliente + clientes, cliente_telefono, direcciones)
-- ---------------------------------------------------------------------
CREATE TABLE cliente (
    id_cliente      int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo          text UNIQUE,                   -- antes: 'C001'
    nom1_cliente    text NOT NULL,
    nom2_cliente    text,
    ape1_cliente    text NOT NULL,
    ape2_cliente    text,
    cedula_rif      varchar UNIQUE,                -- opcional: el ERP no lo pedía
    email           varchar UNIQUE,                -- opcional: el ERP no lo pedía
    tipo_cliente    tipo_cliente_enum NOT NULL DEFAULT 'minorista',
    fecha_registro  timestamptz NOT NULL DEFAULT now(),
    activo          bool NOT NULL DEFAULT true
);

CREATE TABLE cliente_telefono (
    id_telefono      int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo           text UNIQUE,                  -- antes: 'T001'
    id_cliente       int4 NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    numero_telefono  text NOT NULL
);

CREATE TABLE direcciones_cliente (
    direccion_id  int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente    int4 NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    estado        varchar NOT NULL,
    ciudad        varchar NOT NULL,
    direccion     varchar NOT NULL,
    referencia    varchar,
    principal     bool NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------
-- 5. VENTAS / CRM (promociones, etapas_venta, campana)
-- ---------------------------------------------------------------------
CREATE TABLE promociones (
    promocion_id  int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo        varchar NOT NULL UNIQUE,
    nombre        varchar NOT NULL,
    tipo          tipo_promocion_enum NOT NULL,
    valor         numeric(12,2) NOT NULL CHECK (valor >= 0),
    fecha_inicio  date NOT NULL,
    fecha_fin     date NOT NULL,
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE etapas_venta (
    etapa_id     int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre       varchar NOT NULL UNIQUE,
    orden        int2 NOT NULL,
    probabilidad numeric(5,2) NOT NULL CHECK (probabilidad BETWEEN 0 AND 100)
);

-- Antes "Campaña" (con ñ y mayúscula, obliga a usar comillas siempre).
-- Se renombra a "campana" para evitar problemas en consultas y API.
CREATE TABLE campana (
    campana_id        int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente        int4 NOT NULL REFERENCES cliente(id_cliente),
    asesor_id         int4 NOT NULL REFERENCES usuarios(usuario_id),
    etapa_id          int4 NOT NULL REFERENCES etapas_venta(etapa_id),
    titulo            varchar,
    monto_estimado    numeric(12,2),
    origen_lead       origen_lead_enum,
    fecha_cierre_est  date,
    fecha_creacion    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 6. ÓRDENES (orden + pedidos, orden_detalle + detalle_pedido)
-- ---------------------------------------------------------------------
CREATE TABLE orden (
    id_orden       int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo         text UNIQUE,                    -- antes: 'O001'
    id_cliente     int4 NOT NULL REFERENCES cliente(id_cliente),
    id_direccion   int4 REFERENCES direcciones_cliente(direccion_id) ON DELETE SET NULL,
    id_promocion   int4 REFERENCES promociones(promocion_id)         ON DELETE SET NULL,
    id_campana     int4 REFERENCES campana(campana_id)               ON DELETE SET NULL,
    fecha_orden    timestamptz NOT NULL DEFAULT now(),
    estado         estado_orden_enum NOT NULL DEFAULT 'pendiente',
    subtotal       numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    descuento      numeric(12,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    total          numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0)
);

CREATE TABLE orden_detalle (
    detalle_id       int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_orden         int4 NOT NULL REFERENCES orden(id_orden) ON DELETE CASCADE,
    id_producto      int4 NOT NULL REFERENCES producto(id_producto),
    variante_id      int4 REFERENCES variantes_producto(variante_id),
    cantidad         int4 NOT NULL CHECK (cantidad > 0),
    precio_unitario  numeric(12,2) NOT NULL CHECK (precio_unitario >= 0)
);

-- ---------------------------------------------------------------------
-- 7. PAGOS Y ENVÍOS (se enlazan a orden)
-- ---------------------------------------------------------------------
CREATE TABLE pagos (
    pago_id              int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_orden             int4 NOT NULL REFERENCES orden(id_orden) ON DELETE CASCADE,
    metodo_pago          metodo_pago_enum NOT NULL,
    referencia_pasarela  varchar UNIQUE,
    monto                numeric(12,2) NOT NULL CHECK (monto >= 0),
    estado               estado_pago_enum NOT NULL DEFAULT 'pendiente',
    fecha_pago           timestamptz
);

CREATE TABLE envios (
    envio_id         int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_orden         int4 NOT NULL REFERENCES orden(id_orden) ON DELETE CASCADE,
    empresa_envio    varchar NOT NULL,
    numero_guia      varchar UNIQUE,
    estado           estado_envio_enum NOT NULL DEFAULT 'preparando',
    fecha_despacho   timestamptz,
    fecha_entrega    timestamptz
);

-- ---------------------------------------------------------------------
-- 8. SUMINISTROS (proveedores, compras a proveedores, inventario)
-- ---------------------------------------------------------------------
CREATE TABLE proveedores (
    proveedor_id     int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_empresa   text NOT NULL,
    contacto_nombre  text,
    telefono         text,
    email            text,
    direccion        text,
    fecha_registro   timestamptz NOT NULL DEFAULT now(),
    activo           bool NOT NULL DEFAULT true
);

-- Compras a proveedores (distinto de "orden", que son ventas a clientes)
-- "estado" se deja como text igual que en el módulo original.
CREATE TABLE ordenes_suministro (
    orden_id               int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proveedor_id           int4 REFERENCES proveedores(proveedor_id),
    fecha_pedido           timestamptz NOT NULL DEFAULT now(),
    fecha_entrega_estimada timestamptz,
    fecha_entrega_real     timestamptz,
    estado                 text NOT NULL DEFAULT 'pendiente',
    total_pedido           numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_pedido >= 0)
);

CREATE TABLE detalles_orden_suministro (
    detalle_id             int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id               int4 NOT NULL REFERENCES ordenes_suministro(orden_id) ON DELETE CASCADE,
    variante_id            int4 NOT NULL REFERENCES variantes_producto(variante_id),
    cantidad_solicitada    int4 NOT NULL CHECK (cantidad_solicitada > 0),
    cantidad_recibida      int4 NOT NULL DEFAULT 0 CHECK (cantidad_recibida >= 0),
    precio_unitario_compra numeric(12,2) CHECK (precio_unitario_compra >= 0)
);

-- usuario_responsable era texto libre; ahora enlaza a usuarios.
CREATE TABLE historial_inventario (
    historial_id        int4 GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    variante_id         int4 NOT NULL REFERENCES variantes_producto(variante_id),
    detalle_id          int4 REFERENCES detalles_orden_suministro(detalle_id) ON DELETE SET NULL,
    tipo_movimiento     text NOT NULL,
    cantidad            int4 NOT NULL,
    fecha_movimiento    timestamptz NOT NULL DEFAULT now(),
    usuario_responsable int4 REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    notas               text
);

-- ---------------------------------------------------------------------
-- 9. ÍNDICES sobre claves foráneas
-- ---------------------------------------------------------------------
CREATE INDEX idx_ordenes_sum_proveedor   ON ordenes_suministro(proveedor_id);
CREATE INDEX idx_det_sum_orden           ON detalles_orden_suministro(orden_id);
CREATE INDEX idx_det_sum_variante        ON detalles_orden_suministro(variante_id);
CREATE INDEX idx_hist_inv_variante       ON historial_inventario(variante_id);
CREATE INDEX idx_hist_inv_detalle        ON historial_inventario(detalle_id);
CREATE INDEX idx_hist_inv_fecha          ON historial_inventario(fecha_movimiento);
CREATE INDEX idx_producto_categoria      ON producto(id_categoria);
CREATE INDEX idx_variantes_producto      ON variantes_producto(id_producto);
CREATE INDEX idx_telefono_cliente        ON cliente_telefono(id_cliente);
CREATE INDEX idx_direccion_cliente       ON direcciones_cliente(id_cliente);
CREATE INDEX idx_campana_cliente         ON campana(id_cliente);
CREATE INDEX idx_campana_asesor          ON campana(asesor_id);
CREATE INDEX idx_campana_etapa           ON campana(etapa_id);
CREATE INDEX idx_orden_cliente           ON orden(id_cliente);
CREATE INDEX idx_orden_fecha             ON orden(fecha_orden);
CREATE INDEX idx_detalle_orden           ON orden_detalle(id_orden);
CREATE INDEX idx_detalle_producto        ON orden_detalle(id_producto);
CREATE INDEX idx_pagos_orden             ON pagos(id_orden);
CREATE INDEX idx_envios_orden            ON envios(id_orden);
CREATE INDEX idx_usuarios_rol            ON usuarios(rol_id);

-- ---------------------------------------------------------------------
-- 10. FUNCIONES DE NEGOCIO (portadas del ERP, adaptadas a IDs int4)
-- ---------------------------------------------------------------------

-- Si una línea de detalle no trae precio_unitario, usa el precio actual
-- del producto.
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

-- Crea una orden completa en una sola transacción (cliente nuevo opcional,
-- cabecera, líneas de detalle y totales).
--   p_items   : [{"id_producto": 1, "cantidad": 2, "variante_id": null}, ...]
--   p_cliente : {"nom1_cliente":"..","nom2_cliente":"..",
--                "ape1_cliente":"..","ape2_cliente":"..","numero_telefono":".."}
--               (solo si no se indica p_id_cliente)
CREATE FUNCTION public.crear_orden(
    p_items      jsonb,
    p_id_cliente int4  DEFAULT NULL,
    p_cliente    jsonb DEFAULT NULL
)
RETURNS public.orden
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_id_cliente int4 := p_id_cliente;
    v_orden      public.orden;
    v_items      int;
    v_insertados int;
    v_subtotal   numeric(12,2);
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La orden debe contener al menos un producto' USING ERRCODE = '22023';
    END IF;
    v_items := jsonb_array_length(p_items);

    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_items) AS i(id_producto int, cantidad int)
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

    INSERT INTO orden_detalle (id_orden, id_producto, variante_id, cantidad, precio_unitario)
    SELECT v_orden.id_orden, i.id_producto, i.variante_id, i.cantidad, p.precio_actual
    FROM   jsonb_to_recordset(p_items) AS i(id_producto int, variante_id int, cantidad int)
    JOIN   producto p ON p.id_producto = i.id_producto;

    GET DIAGNOSTICS v_insertados = ROW_COUNT;
    IF v_insertados <> v_items THEN
        RAISE EXCEPTION 'Uno o más productos de la orden no existen' USING ERRCODE = '23503';
    END IF;

    SELECT COALESCE(SUM(cantidad * precio_unitario), 0) INTO v_subtotal
    FROM   orden_detalle WHERE id_orden = v_orden.id_orden;

    UPDATE orden
    SET    subtotal = v_subtotal, total = v_subtotal - descuento
    WHERE  id_orden = v_orden.id_orden
    RETURNING * INTO v_orden;

    RETURN v_orden;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_orden(jsonb, int4, jsonb) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 11. SEGURIDAD A NIVEL DE FILA (RLS)
--     Mismo criterio que el ERP en producción: RLS activa y políticas
--     abiertas (USING true) para anon/authenticated, de modo que el front
--     público pueda leer y escribir. Restringir más adelante por rol.
--     EXCEPCIÓN: "usuarios" guarda password_hash -> RLS activa SIN
--     políticas y sin permisos para anon/authenticated (solo service_role).
-- ---------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles', 'categoria', 'producto', 'variantes_producto',
        'cliente', 'cliente_telefono', 'direcciones_cliente',
        'promociones', 'etapas_venta', 'campana',
        'orden', 'orden_detalle', 'pagos', 'envios',
        'proveedores', 'ordenes_suministro',
        'detalles_orden_suministro', 'historial_inventario'
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

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usuarios FROM anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
