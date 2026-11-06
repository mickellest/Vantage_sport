-- =====================================================================
--  Vantage Sport · Datos de ejemplo
-- ---------------------------------------------------------------------
--  Requisito: haber ejecutado schema.sql.
--  Los IDs se escriben explícitamente para que coincidan con los emojis
--  por defecto de app.js (P001–P012). Al final se sincronizan las
--  secuencias para que los próximos IDs automáticos continúen la serie.
-- =====================================================================

BEGIN;

INSERT INTO public.categoria (id_categoria, nombre_categoria) VALUES
    ('CAT01', 'Tecnología'),
    ('CAT02', 'Hogar'),
    ('CAT03', 'Deportes'),
    ('CAT04', 'Libros'),
    ('CAT05', 'Toys');

INSERT INTO public.producto (id_producto, nombre_producto, precio_actual, id_categoria) VALUES
    ('P001', 'Audífonos Inalámbricos',  59.99, 'CAT01'),
    ('P002', 'Teclado Mecánico',        74.50, 'CAT01'),
    ('P003', 'Reloj Inteligente',      129.00, 'CAT01'),
    ('P004', 'Lámpara LED de Escritorio', 24.90, 'CAT02'),
    ('P005', 'Cafetera Express',        89.00, 'CAT02'),
    ('P006', 'Sartén Antiadherente',    32.00, 'CAT02'),
    ('P007', 'Balón de Fútbol Pro',     29.99, 'CAT03'),
    ('P008', 'Mat de Yoga',             19.90, 'CAT03'),
    ('P009', 'Zapatillas Running',      89.90, 'CAT03'),
    ('P010', 'Novela Bestseller',       15.50, 'CAT04'),
    ('P011', 'Manual de Programación',  42.00, 'CAT04'),
    ('P012', 'Globo Terráqueo',         27.00, 'CAT05');

INSERT INTO public.cliente (id_cliente, nom1_cliente, nom2_cliente, ape1_cliente, ape2_cliente) VALUES
    ('C001', 'Juan',  'Carlos', 'Pérez',    'Gómez'),
    ('C002', 'María', NULL,     'González', 'Soto');

INSERT INTO public.cliente_telefono (id_telefono, id_cliente, numero_telefono) VALUES
    ('T001', 'C001', '+56 9 8765 4321'),
    ('T002', 'C001', '+56 2 2345 6789'),
    ('T003', 'C002', '+56 9 1234 5678');

INSERT INTO public.orden (id_orden, id_cliente, fecha_orden) VALUES
    ('O001', 'C001', now() - interval '2 days'),
    ('O002', 'C002', now() - interval '1 day');

-- precio_unitario se omite: el trigger copia el precio actual del producto.
INSERT INTO public.orden_detalle (id_orden, id_producto, cantidad) VALUES
    ('O001', 'P007', 2),
    ('O001', 'P009', 1),
    ('O002', 'P001', 1),
    ('O002', 'P010', 3);

SELECT public.sincronizar_secuencias();

COMMIT;
