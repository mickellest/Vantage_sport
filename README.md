# Vantage Sport — Marketplace Deportivo & Panel Administrativo (Supabase)

Plataforma integral de comercio electrónico deportivo (**Vantage Sport**) con tienda estilo Marketplace para clientes (`tienda.html`) y Panel de Marketing / Gestión Administrativa (`index.html`), conectada en tiempo real a **PostgreSQL en Supabase**.

## Estructura del Proyecto

- **`tienda.html` / `tienda.js` / `tienda.css`**: Tienda Oficial para clientes con catálogo conectado a Supabase (`producto`, `categoria`, `variantes_producto`, `promociones`), comparador técnico, preguntas al vendedor con validación de sesión, carrito, Checkout transaccional BPMN (`orden`, `orden_detalle`, `pagos`, `envios`) y seguimiento de pedidos (**"📦 Mis Pedidos"**).
- **`index.html` / `Java.js` / `styles.css`**: Panel Administrativo y Marketing Studio con gestión CRUD dinámica de 12 módulos (`campana`, `cliente`, `promociones`, `categoria`, `producto`, `variantes_producto`, `orden`, `orden_detalle`, `pagos`, `envios`, `proveedores`, `ordenes_suministro`).
- **`supabase-config.js`**: Configuración de conexión a Supabase (`SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`).
- **`database/`**:
  - [`esquema_unificado.sql`](database/esquema_unificado.sql): DDL completo de las 18 tablas unificadas, triggers, políticas RLS y funciones RPC.
  - [`seed_unificado.sql`](database/seed_unificado.sql): Datos de prueba completos para el catálogo deportivo, variantes, clientes, campañas, órdenes, pagos, envíos y proveedores.
  - [`migrations/crear_usuario_admin.sql`](database/migrations/crear_usuario_admin.sql): Script para crear el rol `administrador`, el usuario `admin` y las funciones RPC de autenticación y checkout BPMN (`autenticar_usuario`, `registrar_cliente_tienda`, `procesar_checkout_completo`).

## Credenciales de Acceso (Rol Administrador)

| Campo | Valor |
|---|---|
| **Usuario / Email** | `admin` (o `admin@vantage.com`) |
| **Contraseña** | `admin` |
| **Rol** | `administrador` |

## Documentación

- [📘 Documentación de la Base de Datos y Cumplimiento BPMN (v2.0)](docs/DOCUMENTACION_BASE_DATOS.md)
