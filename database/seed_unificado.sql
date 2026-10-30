-- =====================================================================
--  VANTAGE SPORT · DATOS DE PRUEBA COMPLETOS (ESQUEMA UNIFICADO)
-- =====================================================================
--  Instrucciones:
--  1. Entra a tu proyecto en Supabase (https://supabase.com/dashboard)
--  2. Ve al menú lateral "SQL Editor"
--  3. Pega este archivo completo y presiona "RUN"
--  4. ¡Listo! Recarga tu panel de marketing (index.html) y la tienda (tienda.html)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. ROLES Y USUARIOS (ADMINISTRADORES Y ASESORES)
-- ---------------------------------------------------------------------
INSERT INTO public.roles (nombre, descripcion) VALUES
  ('admin', 'Administrador total de la plataforma y tienda'),
  ('asesor', 'Asesor comercial de marketing y ventas'),
  ('marketing', 'Especialista en campañas, drops y promociones')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO public.usuarios (rol_id, nombre, email, password_hash, activo) VALUES
  ((SELECT rol_id FROM public.roles WHERE nombre = 'admin' LIMIT 1), 'Vantage Marketing HQ', 'marketing@vantage.com', '$2a$12$e8y..mockAdminHashForSecurity', true),
  ((SELECT rol_id FROM public.roles WHERE nombre = 'asesor' LIMIT 1), 'Carlos Mendoza (Asesor Senior)', 'carlos.mendoza@vantage.com', '$2a$12$e8y..mockAdvisorHash1', true),
  ((SELECT rol_id FROM public.roles WHERE nombre = 'asesor' LIMIT 1), 'Sofía Valenzuela (Asesora Ventas)', 'sofia.valenzuela@vantage.com', '$2a$12$e8y..mockAdvisorHash2', true)
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. CATEGORÍAS DEPORTIVAS
-- ---------------------------------------------------------------------
INSERT INTO public.categoria (codigo, nombre_categoria, descripcion) VALUES
  ('CAT01', 'Fútbol', 'Equipaciones oficiales matchday, camisetas retro, shorts y balones'),
  ('CAT02', 'Running', 'Prendas técnicas ultraligeras, cortavientos aero y calzado nitro speed'),
  ('CAT03', 'Training & Gym', 'Prendas de compresión pro combat, tops deportivos de alta sujeción y licras'),
  ('CAT04', 'Abrigo & Streetwear', 'Hoodies térmicos fleece, pantalones jogger técnicos y chaquetas de salida'),
  ('CAT05', 'Accesorios', 'Balones oficiales FIFA Quality, mochilas técnicas 35L y gorras airflow')
ON CONFLICT (nombre_categoria) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. PRODUCTOS DEPORTIVOS VANTAGE
-- ---------------------------------------------------------------------
INSERT INTO public.producto (codigo, nombre_producto, descripcion, precio_compra, precio_actual, activo, id_categoria) VALUES
  ('P001', 'Camiseta Técnica Vantage Pro Matchday Dri-FIT', 'Camiseta oficial con microfibras ventiladas AeroWeave que expulsan el sudor.', 22.00, 49.99, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT01' LIMIT 1)),
  ('P002', 'Jersey Oficial Vantage Retro 90s Street Edition', 'Homenaje a las camisetas de fútbol de los 90 con gráficos geométricos sublimados.', 25.00, 54.00, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT01' LIMIT 1)),
  ('P003', 'Balón Oficial de Fútbol Vantage Match Ball FIFA Pro', 'Balón termosellado sin costuras, absorción nula de agua y vuelo aerodinámico.', 18.00, 39.99, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT01' LIMIT 1)),
  ('P004', 'Zapatillas de Running Vantage Nitro Speed Max Pro', 'Suela de espuma nitrogenada ultra ligera con placa propulsora de carbono.', 58.00, 119.90, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT02' LIMIT 1)),
  ('P005', 'Chaqueta Cortavientos Ultralight Vantage Aero Shield', 'Protección ripstop 20D repelente al agua. Pesa menos de 140g y se autoempaca.', 34.00, 74.99, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT02' LIMIT 1)),
  ('P006', 'Gorra Técnica de Competición Vantage Laser AirFlow', 'Microperforaciones láser laterales con visera oscura antideslumbrante UPF 50+.', 9.50, 22.00, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT02' LIMIT 1)),
  ('P007', 'Shorts de Compresión Vantage Pro Combat con Bolsillo', 'Soporte muscular graduado 4-Way stretch con bolsillo interior para smartphone.', 14.50, 32.00, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT03' LIMIT 1)),
  ('P008', 'Leggings de Alto Rendimiento Vantage High-Waist Seamless', 'Cintura alta reforzada anti-deslizante y tejido 100% squat-proof no transparente.', 20.00, 44.90, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT03' LIMIT 1)),
  ('P009', 'Top Deportivo Sujeción Máxima Vantage Core Impact', 'Doble densidad para running y HIIT de alto impacto con almohadillas transpirables.', 12.00, 29.50, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT03' LIMIT 1)),
  ('P010', 'Hoodie Térmico Vantage Performance Fleece con Capucha Tech', 'Polerón térmico con bolsillo canguro termosellado y cordones reflectantes.', 32.00, 68.50, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT04' LIMIT 1)),
  ('P011', 'Pantalón Jogger Técnico Vantage Street Athlete Pro', 'Corte cónico moderno con cremalleras invisibles en los tobillos.', 24.00, 52.50, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT04' LIMIT 1)),
  ('P012', 'Mochila Técnica Deportiva Vantage Gym & Match 35L', 'Compartimento inferior ventilado para zapatillas y bolsillo estanco para ropa húmeda.', 22.50, 49.00, true, (SELECT id_categoria FROM public.categoria WHERE codigo = 'CAT05' LIMIT 1))
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. VARIANTES DE PRODUCTO (TALLAS, COLORES Y STOCK)
-- ---------------------------------------------------------------------
INSERT INTO public.variantes_producto (id_producto, sku, talla, color, stock_actual, stock_minimo) VALUES
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), 'VAN-P001-S-BLK', 'S', 'Negro', 18, 5),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), 'VAN-P001-M-BLK', 'M', 'Negro', 35, 5),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), 'VAN-P001-L-BLK', 'L', 'Negro', 28, 5),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), 'VAN-P001-XL-BLK', 'XL', 'Negro', 14, 3),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P003' LIMIT 1), 'VAN-P003-T5-WHT', 'Talla 5', 'Blanco/Lima', 42, 10),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P004' LIMIT 1), 'VAN-P004-41-ORG', '41', 'Naranja/Negro', 12, 3),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P004' LIMIT 1), 'VAN-P004-42-ORG', '42', 'Naranja/Negro', 19, 4),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P004' LIMIT 1), 'VAN-P004-43-ORG', '43', 'Naranja/Negro', 8, 3),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P007' LIMIT 1), 'VAN-P007-M-BLK', 'M', 'Negro', 24, 6),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P007' LIMIT 1), 'VAN-P007-L-BLK', 'L', 'Negro', 30, 6),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P010' LIMIT 1), 'VAN-P010-M-GRN', 'M', 'Verde Bosque', 15, 4),
  ((SELECT id_producto FROM public.producto WHERE codigo = 'P010' LIMIT 1), 'VAN-P010-L-GRN', 'L', 'Verde Bosque', 20, 4)
ON CONFLICT (sku) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5. CLIENTES Y COMUNIDAD DEPORTIVA
-- ---------------------------------------------------------------------
INSERT INTO public.cliente (codigo, nom1_cliente, nom2_cliente, ape1_cliente, ape2_cliente, cedula_rif, email, tipo_cliente, activo) VALUES
  ('C001', 'Ignacio', 'Andrés', 'Silva', 'Rojas', '19.456.123-K', 'ignacio.silva.runner@gmail.com', 'minorista', true),
  ('C002', 'Camila', 'Fernanda', 'Morales', 'Pérez', '18.892.450-4', 'camila.morales.fitness@outlook.com', 'minorista', true),
  ('C003', 'Matías', 'Alejandro', 'Castro', 'Fuentes', '16.782.901-2', 'matias.castro@clubandes.cl', 'mayorista', true),
  ('C004', 'Valentina', 'Paz', 'Gutiérrez', 'Torres', '20.123.678-9', 'vale.guti.triatlon@gmail.com', 'minorista', true),
  ('C005', 'Felipe', 'Eduardo', 'Navarro', 'Soto', '17.345.987-1', 'felipe.navarro@crossfitbox.cl', 'mayorista', true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cliente_telefono (codigo, id_cliente, numero_telefono) VALUES
  ('T001', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C001' LIMIT 1), '+56 9 8456 1234'),
  ('T002', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C002' LIMIT 1), '+56 9 7123 9876'),
  ('T003', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C003' LIMIT 1), '+56 2 2345 6789'),
  ('T004', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C004' LIMIT 1), '+56 9 9876 5432'),
  ('T005', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C005' LIMIT 1), '+56 9 6543 2109')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.direcciones_cliente (id_cliente, estado, ciudad, direccion, referencia, principal) VALUES
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C001' LIMIT 1), 'Región Metropolitana', 'Santiago', 'Av. Providencia 1240, Depto 604', 'Frente a metro Manuel Montt', true),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C002' LIMIT 1), 'Región Metropolitana', 'Las Condes', 'Av. Apoquindo 4500, Oficina 802', 'Torre Titanium', true),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C003' LIMIT 1), 'Valparaíso', 'Viña del Mar', 'Calle 7 Norte 650', 'Sede Club Andes', true),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C004' LIMIT 1), 'Biobío', 'Concepción', 'Barros Arana 890', 'Cerca de Plaza Independencia', true),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C005' LIMIT 1), 'Región Metropolitana', 'Ñuñoa', 'Av. Grecia 2004', 'Gimnasio Box Elite', true);

-- ---------------------------------------------------------------------
-- 6. ETAPAS DE VENTA (PIPELINE CRM)
-- ---------------------------------------------------------------------
INSERT INTO public.etapas_venta (nombre, orden, probabilidad) VALUES
  ('Lead Inicial', 1, 10.00),
  ('Calificación y Propuesta', 2, 40.00),
  ('Negociación Comercial', 3, 75.00),
  ('Cerrada / Ganada', 4, 100.00),
  ('Cerrada / Perdida', 5, 0.00)
ON CONFLICT (nombre) DO NOTHING;

-- ---------------------------------------------------------------------
-- 7. PROMOCIONES Y DESCUENTOS ACTIVOS
-- ---------------------------------------------------------------------
INSERT INTO public.promociones (codigo, nombre, tipo, valor, fecha_inicio, fecha_fin) VALUES
  ('VANTAGE20', 'Drop 2026 Atletas (20% OFF)', 'porcentaje', 20.00, '2026-01-01', '2026-12-31'),
  ('MATCHDAY30', 'Descuento Especial Línea Matchday (30% OFF)', 'porcentaje', 30.00, '2026-03-01', '2026-11-30'),
  ('WELCOME10', 'Bono Bienvenida Primer Pedido ($10 USD)', 'monto_fijo', 10.00, '2026-01-01', '2026-12-31')
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8. CAMPAÑAS DE MARKETING Y VENTAS
-- ---------------------------------------------------------------------
INSERT INTO public.campana (id_cliente, asesor_id, etapa_id, titulo, monto_estimado, origen_lead, fecha_cierre_est) VALUES
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C003' LIMIT 1), (SELECT usuario_id FROM public.usuarios WHERE email = 'marketing@vantage.com' LIMIT 1), (SELECT etapa_id FROM public.etapas_venta WHERE orden = 3 LIMIT 1), 'Dotación Deportiva Oficial Club Deportivo Andes 2026', 2450.00, 'web', '2026-11-15'),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C005' LIMIT 1), (SELECT usuario_id FROM public.usuarios WHERE email = 'carlos.mendoza@vantage.com' LIMIT 1), (SELECT etapa_id FROM public.etapas_venta WHERE orden = 2 LIMIT 1), 'Campaña Equipamiento Pro Combat para Gimnasios Elite', 1890.00, 'referido', '2026-11-20'),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C001' LIMIT 1), (SELECT usuario_id FROM public.usuarios WHERE email = 'marketing@vantage.com' LIMIT 1), (SELECT etapa_id FROM public.etapas_venta WHERE orden = 4 LIMIT 1), 'Drop Exclusivo Zapatillas Nitro Speed - Comunidad Running', 580.00, 'redes_sociales', '2026-11-05'),
  ((SELECT id_cliente FROM public.cliente WHERE codigo = 'C002' LIMIT 1), (SELECT usuario_id FROM public.usuarios WHERE email = 'sofia.valenzuela@vantage.com' LIMIT 1), (SELECT etapa_id FROM public.etapas_venta WHERE orden = 4 LIMIT 1), 'Pack Rendimiento Seamless High-Waist para Atletas', 340.00, 'tienda_fisica', '2026-11-02');

-- ---------------------------------------------------------------------
-- 9. ÓRDENES Y PEDIDOS DE VENTAS
-- ---------------------------------------------------------------------
INSERT INTO public.orden (codigo, id_cliente, id_direccion, id_promocion, id_campana, fecha_orden, estado, subtotal, descuento, total) VALUES
  ('ORD-2026-001', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C001' LIMIT 1), (SELECT direccion_id FROM public.direcciones_cliente WHERE id_cliente = (SELECT id_cliente FROM public.cliente WHERE codigo = 'C001' LIMIT 1) LIMIT 1), (SELECT promocion_id FROM public.promociones WHERE codigo = 'VANTAGE20' LIMIT 1), NULL, now() - interval '2 days', 'entregado', 169.89, 33.98, 135.91),
  ('ORD-2026-002', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C002' LIMIT 1), (SELECT direccion_id FROM public.direcciones_cliente WHERE id_cliente = (SELECT id_cliente FROM public.cliente WHERE codigo = 'C002' LIMIT 1) LIMIT 1), NULL, NULL, now() - interval '1 day', 'enviado', 113.40, 0.00, 113.40),
  ('ORD-2026-003', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C003' LIMIT 1), (SELECT direccion_id FROM public.direcciones_cliente WHERE id_cliente = (SELECT id_cliente FROM public.cliente WHERE codigo = 'C003' LIMIT 1) LIMIT 1), (SELECT promocion_id FROM public.promociones WHERE codigo = 'MATCHDAY30' LIMIT 1), NULL, now() - interval '6 hours', 'pagado', 749.85, 224.95, 524.90),
  ('ORD-2026-004', (SELECT id_cliente FROM public.cliente WHERE codigo = 'C004' LIMIT 1), (SELECT direccion_id FROM public.direcciones_cliente WHERE id_cliente = (SELECT id_cliente FROM public.cliente WHERE codigo = 'C004' LIMIT 1) LIMIT 1), (SELECT promocion_id FROM public.promociones WHERE codigo = 'WELCOME10' LIMIT 1), NULL, now() - interval '1 hour', 'pendiente', 49.99, 10.00, 39.99)
ON CONFLICT (codigo) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. DETALLE DE ÓRDENES
-- ---------------------------------------------------------------------
INSERT INTO public.orden_detalle (id_orden, id_producto, variante_id, cantidad, precio_unitario) VALUES
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-001' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P004' LIMIT 1), (SELECT variante_id FROM public.variantes_producto WHERE sku = 'VAN-P004-42-ORG' LIMIT 1), 1, 119.90),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-001' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), (SELECT variante_id FROM public.variantes_producto WHERE sku = 'VAN-P001-M-BLK' LIMIT 1), 1, 49.99),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-002' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P008' LIMIT 1), NULL, 2, 44.90),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-002' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P006' LIMIT 1), NULL, 1, 22.00),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-003' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), (SELECT variante_id FROM public.variantes_producto WHERE sku = 'VAN-P001-M-BLK' LIMIT 1), 10, 49.99),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-003' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P003' LIMIT 1), (SELECT variante_id FROM public.variantes_producto WHERE sku = 'VAN-P003-T5-WHT' LIMIT 1), 5, 39.99),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-004' LIMIT 1), (SELECT id_producto FROM public.producto WHERE codigo = 'P001' LIMIT 1), (SELECT variante_id FROM public.variantes_producto WHERE sku = 'VAN-P001-S-BLK' LIMIT 1), 1, 49.99);

-- ---------------------------------------------------------------------
-- 11. PAGOS REGISTRADOS
-- ---------------------------------------------------------------------
INSERT INTO public.pagos (id_orden, metodo_pago, referencia_pasarela, monto, estado, fecha_pago) VALUES
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-001' LIMIT 1), 'tarjeta', 'PAY-TRANS-9812401', 135.91, 'confirmado', now() - interval '2 days'),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-002' LIMIT 1), 'transferencia', 'TRF-BANCO-771203', 113.40, 'confirmado', now() - interval '1 day'),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-003' LIMIT 1), 'zelle', 'ZLL-901823-CORP', 524.90, 'confirmado', now() - interval '5 hours')
ON CONFLICT (referencia_pasarela) DO NOTHING;

-- ---------------------------------------------------------------------
-- 12. ENVÍOS Y SEGUIMIENTO (LOGÍSTICA)
-- ---------------------------------------------------------------------
INSERT INTO public.envios (id_orden, empresa_envio, numero_guia, estado, fecha_despacho, fecha_entrega) VALUES
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-001' LIMIT 1), 'Chilexpress', 'CHX-9988112233', 'entregado', now() - interval '2 days', now() - interval '1 day'),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-002' LIMIT 1), 'Starken', 'STK-4455667788', 'en_transito', now() - interval '18 hours', now() + interval '1 day'),
  ((SELECT id_orden FROM public.orden WHERE codigo = 'ORD-2026-003' LIMIT 1), 'Vantage Logistics Pro', 'VAN-EXP-00192', 'preparando', now() - interval '2 hours', NULL)
ON CONFLICT (numero_guia) DO NOTHING;

-- ---------------------------------------------------------------------
-- 13. PROVEEDORES DE SUMINISTROS DEPORTIVOS
-- ---------------------------------------------------------------------
INSERT INTO public.proveedores (nombre_empresa, contacto_nombre, telefono, email, direccion, activo) VALUES
  ('Textiles Técnicos del Sur SpA', 'Rodrigo Valenzuela', '+56 2 2890 1200', 'contacto@textilestecnicos.cl', 'Parque Industrial Quilicura Lote 4', true),
  ('Sport Soles & Polymers Corp', 'Ana María Bianchi', '+56 2 2760 9000', 'ventas@sportsoles.com', 'Av. Marathon 1900, Macul', true)
ON CONFLICT DO NOTHING;

COMMIT;
