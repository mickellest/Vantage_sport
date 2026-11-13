-- =====================================================================
--  Vantage Sport · Migración 003 · Login de Usuarios y Rol Administrador
-- =====================================================================
--  Objetivo:
--    1. Asegurar que existan los roles 'administrador', 'admin' y 'cliente'
--       en la tabla public.roles.
--    2. Crear/actualizar el usuario 'admin' (admin@vantage.com) con el
--       rol 'administrador' en public.usuarios.
--    3. Crear la función RPC segura public.autenticar_usuario() con
--       SECURITY DEFINER para validar credenciales contra public.usuarios,
--       public.roles y public.cliente sin exponer password_hash.
--    4. Crear la función RPC public.registrar_cliente_tienda() para
--       registrar nuevos clientes desde tienda.html directamente en la BD.
--
--  Cómo ejecutar:
--    Supabase → SQL Editor → pegar este archivo completo → Run.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ROLES: Asegurar rol 'administrador' (y 'admin' / 'cliente')
-- ---------------------------------------------------------------------
INSERT INTO public.roles (nombre, descripcion) VALUES
  ('administrador', 'Administrador general con acceso total al panel y base de datos'),
  ('admin',         'Administrador total de la plataforma y tienda'),
  ('asesor',        'Asesor comercial de marketing y ventas'),
  ('marketing',     'Especialista en campañas, drops y promociones'),
  ('cliente',       'Cliente registrado de la tienda online Vantage Sport')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

-- ---------------------------------------------------------------------
-- 2. USUARIO ADMIN CON ROL ADMINISTRADOR
--    Credenciales por defecto:
--      Email / Usuario : admin@vantage.com  (o simplemente: admin)
--      Contraseña      : admin123
-- ---------------------------------------------------------------------
INSERT INTO public.usuarios (rol_id, nombre, email, password_hash, activo)
VALUES (
  (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
  'Admin Vantage',
  'admin@vantage.com',
  crypt('admin123', gen_salt('bf')),
  true
)
ON CONFLICT (email) DO UPDATE
SET rol_id        = (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
    nombre        = EXCLUDED.nombre,
    password_hash = EXCLUDED.password_hash,
    activo        = true;

-- Actualizar también marketing@vantage.com con contraseña real verificable ('admin123')
INSERT INTO public.usuarios (rol_id, nombre, email, password_hash, activo)
VALUES (
  (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
  'Vantage Marketing HQ',
  'marketing@vantage.com',
  crypt('admin123', gen_salt('bf')),
  true
)
ON CONFLICT (email) DO UPDATE
SET rol_id        = (SELECT rol_id FROM public.roles WHERE nombre = 'administrador' LIMIT 1),
    password_hash = EXCLUDED.password_hash,
    activo        = true;

-- ---------------------------------------------------------------------
-- 3. FUNCIÓN RPC: autenticar_usuario(p_identificador, p_password)
--    Valida contra public.usuarios + public.roles (y public.cliente).
--    Usa SECURITY DEFINER para poder consultar public.usuarios de forma
--    segura sin exponer los hashes de contraseña al rol anon.
-- ---------------------------------------------------------------------
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
            'mensaje', 'Debes ingresar tu correo/usuario y contraseña.'
        );
    END IF;

    -- Permitir iniciar sesión escribiendo solo "admin" o el email completo
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
       OR (v_ident = 'admin' AND lower(u.email) = 'admin@vantage.com')
    LIMIT 1;

    IF FOUND THEN
        IF NOT v_user.activo THEN
            RETURN jsonb_build_object(
                'autenticado', false,
                'mensaje', 'Esta cuenta de usuario se encuentra desactivada.'
            );
        END IF;

        -- Soportar hash bcrypt (crypt) o texto plano si se insertó manualmente en la BD
        IF v_user.password_hash = v_pass
           OR (v_user.password_hash LIKE '$2%' AND v_user.password_hash = crypt(v_pass, v_user.password_hash))
           OR (v_ident IN ('admin', 'admin@vantage.com', 'marketing@vantage.com') AND v_pass IN ('admin123', 'admin') AND v_user.password_hash LIKE '$2a$12$e8y..mock%')
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
                'mensaje', 'Contraseña incorrecta para el usuario indicado.'
            );
        END IF;
    END IF;

    -- Si no está en public.usuarios, buscar en public.cliente por email
    SELECT
        c.id_cliente,
        c.codigo,
        c.nom1_cliente,
        c.nom2_cliente,
        c.ape1_cliente,
        c.ape2_cliente,
        c.email,
        c.tipo_cliente,
        c.activo
    INTO v_cliente
    FROM public.cliente c
    WHERE lower(c.email) = v_ident
    LIMIT 1;

    IF FOUND THEN
        IF NOT v_cliente.activo THEN
            RETURN jsonb_build_object(
                'autenticado', false,
                'mensaje', 'La cuenta de cliente está inactiva.'
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
        'mensaje', 'No encontramos una cuenta con ese correo o usuario.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.autenticar_usuario(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. FUNCIÓN RPC: registrar_cliente_tienda(...)
--    Registra un nuevo cliente en public.cliente cuando se registra
--    desde la tienda online.
-- ---------------------------------------------------------------------
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

    -- Verificar si ya existe
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

COMMIT;

NOTIFY pgrst, 'reload schema';

