-- =====================================================================
--  VANTAGE SPORT · CREAR USUARIO ADMIN Y CONFIGURAR LOGIN
-- =====================================================================
--  Instrucciones:
--  1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
--  2. Abre el "SQL Editor"
--  3. Pega este script completo y haz clic en "RUN"
--
--  Credenciales creadas:
--    Usuario / Email : admin
--    Contraseña      : admin
--    Rol             : administrador
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Asegurar existencia de los roles
INSERT INTO public.roles (nombre, descripcion) VALUES
  ('administrador', 'Administrador general con acceso total a la plataforma y base de datos'),
  ('admin',         'Administrador total de la plataforma y tienda'),
  ('asesor',        'Asesor comercial de marketing y ventas'),
  ('cliente',       'Cliente de la tienda deportiva Vantage')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Asegurar que las políticas RLS permitan autenticar y consultar roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.roles TO anon, authenticated;
DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT TO anon, authenticated USING (true);

-- 3. Crear / actualizar usuario con:
--    usuario/email = admin
--    contraseña = admin
--    rol = administrador
INSERT INTO public.usuarios (rol_id, nombre, email, password_hash, activo)
VALUES (
  (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
  'Administrador Vantage',
  'admin',
  crypt('admin', gen_salt('bf')),
  true
)
ON CONFLICT (email) DO UPDATE
SET rol_id        = (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
    nombre        = 'Administrador Vantage',
    password_hash = crypt('admin', gen_salt('bf')),
    activo        = true;

-- Asegurar también con email completo admin@vantage.com
INSERT INTO public.usuarios (rol_id, nombre, email, password_hash, activo)
VALUES (
  (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
  'Administrador Vantage',
  'admin@vantage.com',
  crypt('admin', gen_salt('bf')),
  true
)
ON CONFLICT (email) DO UPDATE
SET rol_id        = (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
    nombre        = 'Administrador Vantage',
    password_hash = crypt('admin', gen_salt('bf')),
    activo        = true;

-- 4. Función de autenticación segura RPC (permite login con 'admin' y clave 'admin')
CREATE OR REPLACE FUNCTION public.autenticar_usuario(
    p_identificador text,
    p_password      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_ident   text := lower(trim(COALESCE(p_identificador, '')));
    v_pass    text := trim(COALESCE(p_password, ''));
    v_user    record;
    v_cliente record;
BEGIN
    IF v_ident = '' OR v_pass = '' THEN
        RETURN jsonb_build_object(
            'autenticado', false,
            'mensaje', 'Por favor ingresa usuario y contraseña.'
        );
    END IF;

    -- Buscar en la tabla usuarios (donde están administradores y asesores)
    SELECT
        u.usuario_id,
        u.nombre,
        u.email,
        u.password_hash,
        u.activo,
        r.rol_id,
        r.nombre AS rol_nombre
    INTO v_user
    FROM public.usuarios u
    JOIN public.roles r ON r.rol_id = u.rol_id
    WHERE lower(u.email) = v_ident
       OR lower(u.nombre) = v_ident
       OR (v_ident = 'admin' AND lower(u.email) IN ('admin', 'admin@vantage.com'))
    LIMIT 1;

    IF FOUND THEN
        IF NOT v_user.activo THEN
            RETURN jsonb_build_object(
                'autenticado', false,
                'mensaje', 'El usuario se encuentra inactivo.'
            );
        END IF;

        -- Validar contraseña con bcrypt, texto plano directo o bypass admin
        IF v_user.password_hash = crypt(v_pass, v_user.password_hash)
           OR v_user.password_hash = v_pass
           OR (v_ident = 'admin' AND v_pass = 'admin')
        THEN
            RETURN jsonb_build_object(
                'autenticado', true,
                'origen',      'usuarios',
                'usuario_id',  v_user.usuario_id,
                'nombre',      v_user.nombre,
                'email',       v_user.email,
                'rol_id',      v_user.rol_id,
                'rol',         v_user.rol_nombre,
                'es_admin',    lower(v_user.rol_nombre) IN ('administrador', 'admin', 'marketing', 'asesor')
            );
        ELSE
            RETURN jsonb_build_object(
                'autenticado', false,
                'mensaje', 'Contraseña incorrecta.'
            );
        END IF;
    END IF;

    -- Si no está en usuarios, buscar en clientes
    SELECT
        c.id_cliente,
        c.codigo,
        c.nom1_cliente,
        c.ape1_cliente,
        c.email,
        c.activo
    INTO v_cliente
    FROM public.cliente c
    WHERE lower(c.email) = v_ident
    LIMIT 1;

    IF FOUND THEN
        IF NOT v_cliente.activo THEN
            RETURN jsonb_build_object(
                'autenticado', false,
                'mensaje', 'Tu cuenta de cliente está inactiva.'
            );
        END IF;

        RETURN jsonb_build_object(
            'autenticado', true,
            'origen',      'cliente',
            'id_cliente',  v_cliente.id_cliente,
            'codigo',      v_cliente.codigo,
            'nombre',      trim(v_cliente.nom1_cliente || ' ' || v_cliente.ape1_cliente),
            'email',       v_cliente.email,
            'rol',         'cliente',
            'es_admin',    false
        );
    END IF;

    RETURN jsonb_build_object(
        'autenticado', false,
        'no_encontrado', true,
        'mensaje', 'Usuario no encontrado.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.autenticar_usuario(text, text) TO anon, authenticated;

-- 5. Función RPC para registrar cliente desde la tienda
CREATE OR REPLACE FUNCTION public.registrar_cliente_tienda(
    p_nombre   text,
    p_apellido text,
    p_email    text,
    p_telefono text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email      text := lower(trim(COALESCE(p_email, '')));
    v_nom1       text := COALESCE(NULLIF(trim(p_nombre), ''), 'Cliente');
    v_ape1       text := COALESCE(NULLIF(trim(p_apellido), ''), 'Vantage');
    v_id_cliente int4;
    v_codigo     text;
BEGIN
    IF v_email = '' THEN
        RAISE EXCEPTION 'El correo electrónico es obligatorio' USING ERRCODE = '22023';
    END IF;

    SELECT id_cliente, codigo, nom1_cliente, ape1_cliente
    INTO v_id_cliente, v_codigo, v_nom1, v_ape1
    FROM public.cliente
    WHERE lower(email) = v_email
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.cliente (nom1_cliente, ape1_cliente, email, tipo_cliente, activo)
        VALUES (v_nom1, v_ape1, v_email, 'minorista', true)
        RETURNING id_cliente INTO v_id_cliente;

        v_codigo := 'C' || lpad(v_id_cliente::text, 3, '0');
        UPDATE public.cliente SET codigo = v_codigo WHERE id_cliente = v_id_cliente AND codigo IS NULL;

        IF COALESCE(trim(p_telefono), '') <> '' THEN
            INSERT INTO public.cliente_telefono (id_cliente, numero_telefono)
            VALUES (v_id_cliente, trim(p_telefono));
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'autenticado', true,
        'origen',      'cliente',
        'id_cliente',  v_id_cliente,
        'codigo',      v_codigo,
        'nombre',      trim(v_nom1 || ' ' || v_ape1),
        'email',       v_email,
        'rol',         'cliente',
        'es_admin',    false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_cliente_tienda(text, text, text, text) TO anon, authenticated;

-- 6. Función RPC Transaccional Completa del Proceso de Negocio (BPMN Checkout):
--    Cliente -> Teléfono -> Dirección -> Promoción -> Orden -> Orden Detalle -> Stock -> Pago -> Envío
CREATE OR REPLACE FUNCTION public.procesar_checkout_completo(
    p_email            text,
    p_nombre           text,
    p_apellido         text,
    p_cedula_rif       text,
    p_telefono         text,
    p_estado           text,
    p_ciudad           text,
    p_direccion        text,
    p_referencia       text,
    p_codigo_promocion text,
    p_metodo_pago      text,
    p_referencia_pago  text,
    p_empresa_envio    text,
    p_items            jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email         text := lower(trim(COALESCE(p_email, '')));
    v_nom1          text := COALESCE(NULLIF(trim(p_nombre), ''), 'Cliente');
    v_ape1          text := COALESCE(NULLIF(trim(p_apellido), ''), 'Vantage');
    v_id_cliente    int4;
    v_id_direccion  int4;
    v_id_promocion  int4 := NULL;
    v_promo         record;
    v_subtotal      numeric(12,2) := 0;
    v_descuento     numeric(12,2) := 0;
    v_total         numeric(12,2) := 0;
    v_id_orden      int4;
    v_codigo_orden  text;
    v_item          jsonb;
    v_id_producto   int4;
    v_variante_id   int4;
    v_cant          int4;
    v_precio        numeric(12,2);
    v_metodo_enum   metodo_pago_enum;
    v_ref_pago      text;
    v_guia_envio    text;
    v_id_cat_def    int4;
BEGIN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito no puede estar vacío' USING ERRCODE = '22023';
    END IF;

    -- 6.1 Buscar o crear Cliente
    IF v_email <> '' THEN
        SELECT id_cliente INTO v_id_cliente
        FROM public.cliente
        WHERE lower(email) = v_email
        LIMIT 1;
    END IF;

    IF v_id_cliente IS NULL THEN
        INSERT INTO public.cliente (nom1_cliente, ape1_cliente, cedula_rif, email, tipo_cliente, activo)
        VALUES (
            v_nom1,
            v_ape1,
            NULLIF(trim(COALESCE(p_cedula_rif, '')), ''),
            NULLIF(v_email, ''),
            'minorista',
            true
        )
        RETURNING id_cliente INTO v_id_cliente;

        UPDATE public.cliente
        SET codigo = 'C' || lpad(v_id_cliente::text, 3, '0')
        WHERE id_cliente = v_id_cliente AND codigo IS NULL;
    END IF;

    -- 6.2 Registrar teléfono si se proporcionó
    IF COALESCE(trim(p_telefono), '') <> '' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.cliente_telefono
            WHERE id_cliente = v_id_cliente AND numero_telefono = trim(p_telefono)
        ) THEN
            INSERT INTO public.cliente_telefono (id_cliente, numero_telefono)
            VALUES (v_id_cliente, trim(p_telefono));
        END IF;
    END IF;

    -- 6.3 Registrar dirección de envío del cliente
    INSERT INTO public.direcciones_cliente (id_cliente, estado, ciudad, direccion, referencia, principal)
    VALUES (
        v_id_cliente,
        COALESCE(NULLIF(trim(p_estado), ''), 'Región Metropolitana'),
        COALESCE(NULLIF(trim(p_ciudad), ''), 'Santiago'),
        COALESCE(NULLIF(trim(p_direccion), ''), 'Despacho Estándar'),
        NULLIF(trim(COALESCE(p_referencia, '')), ''),
        true
    )
    RETURNING direccion_id INTO v_id_direccion;

    -- 6.4 Calcular subtotal y validar promoción si existe
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_cant   := GREATEST(1, COALESCE((v_item->>'cantidad')::int4, 1));
        v_precio := GREATEST(0, COALESCE((v_item->>'precio_unitario')::numeric, 0));
        v_subtotal := v_subtotal + (v_cant * v_precio);
    END LOOP;

    IF COALESCE(trim(p_codigo_promocion), '') <> '' THEN
        SELECT promocion_id, tipo, valor
        INTO v_promo
        FROM public.promociones
        WHERE upper(codigo) = upper(trim(p_codigo_promocion))
          AND current_date BETWEEN fecha_inicio AND fecha_fin
        LIMIT 1;

        IF FOUND THEN
            v_id_promocion := v_promo.promocion_id;
            IF v_promo.tipo = 'porcentaje' THEN
                v_descuento := round((v_subtotal * v_promo.valor) / 100.0, 2);
            ELSE
                v_descuento := LEAST(v_subtotal, v_promo.valor);
            END IF;
        END IF;
    END IF;

    v_total := GREATEST(0, v_subtotal - v_descuento);

    -- 6.5 Crear cabecera en public.orden
    INSERT INTO public.orden (id_cliente, id_direccion, id_promocion, fecha_orden, estado, subtotal, descuento, total)
    VALUES (v_id_cliente, v_id_direccion, v_id_promocion, now(), 'pagado', v_subtotal, v_descuento, v_total)
    RETURNING id_orden INTO v_id_orden;

    v_codigo_orden := 'ORD-2026-' || lpad(v_id_orden::text, 3, '0');
    UPDATE public.orden SET codigo = v_codigo_orden WHERE id_orden = v_id_orden;

    -- 6.6 Insertar líneas en public.orden_detalle y descontar stock en variantes_producto
    SELECT id_categoria INTO v_id_cat_def FROM public.categoria ORDER BY id_categoria LIMIT 1;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_id_producto := NULL;
        v_variante_id := NULL;
        v_cant        := GREATEST(1, COALESCE((v_item->>'cantidad')::int4, 1));
        v_precio      := GREATEST(0, COALESCE((v_item->>'precio_unitario')::numeric, 0));

        -- Intentar resolver id_producto por ID numérico, código o nombre
        IF (v_item->>'id_producto') ~ '^\d+$' THEN
            SELECT id_producto INTO v_id_producto
            FROM public.producto
            WHERE id_producto = (v_item->>'id_producto')::int4;
        END IF;

        IF v_id_producto IS NULL AND COALESCE(v_item->>'codigo', '') <> '' THEN
            SELECT id_producto INTO v_id_producto
            FROM public.producto
            WHERE upper(codigo) = upper(v_item->>'codigo')
            LIMIT 1;
        END IF;

        IF v_id_producto IS NULL AND COALESCE(v_item->>'nombre_producto', '') <> '' THEN
            SELECT id_producto INTO v_id_producto
            FROM public.producto
            WHERE lower(nombre_producto) = lower(v_item->>'nombre_producto')
            LIMIT 1;
        END IF;

        -- Si era un producto de plantilla que aún no estaba en BD, sincronizarlo
        IF v_id_producto IS NULL THEN
            INSERT INTO public.producto (codigo, nombre_producto, precio_actual, activo, id_categoria)
            VALUES (
                COALESCE(NULLIF(v_item->>'codigo', ''), 'VAN-' || floor(random()*9000 + 1000)::text),
                COALESCE(NULLIF(v_item->>'nombre_producto', ''), 'Prenda Deportiva Vantage'),
                v_precio,
                true,
                v_id_cat_def
            )
            ON CONFLICT (codigo) DO UPDATE SET precio_actual = EXCLUDED.precio_actual
            RETURNING id_producto INTO v_id_producto;
        END IF;

        -- Buscar variante y actualizar stock_actual
        IF COALESCE(v_item->>'talla', '') <> '' THEN
            SELECT variante_id INTO v_variante_id
            FROM public.variantes_producto
            WHERE id_producto = v_id_producto
              AND upper(COALESCE(talla, '')) = upper(v_item->>'talla')
            LIMIT 1;
        END IF;

        IF v_variante_id IS NULL THEN
            SELECT variante_id INTO v_variante_id
            FROM public.variantes_producto
            WHERE id_producto = v_id_producto
            LIMIT 1;
        END IF;

        IF v_variante_id IS NOT NULL THEN
            UPDATE public.variantes_producto
            SET stock_actual = GREATEST(0, stock_actual - v_cant)
            WHERE variante_id = v_variante_id;
        END IF;

        INSERT INTO public.orden_detalle (id_orden, id_producto, variante_id, cantidad, precio_unitario)
        VALUES (v_id_orden, v_id_producto, v_variante_id, v_cant, v_precio);
    END LOOP;

    -- 6.7 Registrar Pago en public.pagos
    BEGIN
        v_metodo_enum := lower(trim(COALESCE(p_metodo_pago, 'tarjeta')))::metodo_pago_enum;
    EXCEPTION WHEN OTHERS THEN
        v_metodo_enum := 'tarjeta'::metodo_pago_enum;
    END;

    v_ref_pago := COALESCE(NULLIF(trim(p_referencia_pago), ''), 'PAY-VAN-' || v_id_orden || '-' || floor(random()*8999 + 1000)::int::text);

    INSERT INTO public.pagos (id_orden, metodo_pago, referencia_pasarela, monto, estado, fecha_pago)
    VALUES (v_id_orden, v_metodo_enum, v_ref_pago, v_total, 'confirmado', now());

    -- 6.8 Registrar Envío en public.envios
    v_guia_envio := 'VAN-GUIA-' || v_id_orden || '-' || floor(random()*89999 + 10000)::int::text;

    INSERT INTO public.envios (id_orden, empresa_envio, numero_guia, estado, fecha_despacho)
    VALUES (
        v_id_orden,
        COALESCE(NULLIF(trim(p_empresa_envio), ''), 'Vantage Logistics Pro'),
        v_guia_envio,
        'preparando',
        now()
    );

    RETURN jsonb_build_object(
        'exito',           true,
        'id_orden',        v_id_orden,
        'codigo_orden',    v_codigo_orden,
        'id_cliente',      v_id_cliente,
        'subtotal',        v_subtotal,
        'descuento',       v_descuento,
        'total',           v_total,
        'metodo_pago',     v_metodo_enum,
        'referencia_pago', v_ref_pago,
        'empresa_envio',   COALESCE(NULLIF(trim(p_empresa_envio), ''), 'Vantage Logistics Pro'),
        'numero_guia',     v_guia_envio,
        'estado_orden',    'pagado',
        'estado_envio',    'preparando'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.procesar_checkout_completo(
    text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb
) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

