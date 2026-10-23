-- =====================================================================
--  Vantage Sport · Migración 001 · Seguridad a nivel de fila (RLS)
-- ---------------------------------------------------------------------
--  Objetivo:
--    Activar RLS en todas las tablas y crear las políticas que permiten
--    a la aplicación web (rol "anon", clave publishable) leer y escribir.
--
--  Por qué es necesaria:
--    Con RLS activo y SIN políticas, PostgREST responde HTTP 200 con un
--    arreglo vacío ([]). La página se conecta pero no muestra datos.
--
--  Cómo ejecutar:
--    Supabase → SQL Editor → pegar este archivo completo → Run.
--    Es idempotente: puede ejecutarse varias veces sin efectos adversos.
-- =====================================================================

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'categoria', 'producto', 'cliente',
        'cliente_telefono', 'orden', 'orden_detalle'
    ]
    LOOP
        -- 1. Activar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- 2. Privilegios base de la Data API
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);

        -- 3. Eliminar políticas previas con el mismo nombre (idempotencia)
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);

        -- 4. Crear políticas (una por operación)
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

-- Verificación: debe listar 24 políticas (6 tablas × 4 operaciones)
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
