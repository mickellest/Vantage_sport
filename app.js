/* =====================================================
   Vantage Sport - Frontend & Conexión Supabase CRUD
   ===================================================== */

const supabaseUrl = 'https://kwyycebjmdgxihbtjwqy.supabase.co';
const supabaseKey = 'sb_publishable_XWP4yM1-sYMwkJN5s6_I3w_gWDq6gNr';
const sbClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ---------- Estado de la aplicación ---------- */
let db = {
  categoria: [],
  producto: [],
  cliente: [],
  cliente_telefono: [],
  orden: [],
  orden_detalle: []
};

let cart = {};              // { id_producto: cantidad }
let view = 'tienda';        // 'tienda' | 'carrito' | 'ordenes' | 'admin'
let cat = 'ALL';            // Filtro categoría tienda
let q = '';                 // Buscador tienda
let last = null;            // Última orden creada

/* Estado de la Vista CRUD */
let adminTable = 'producto';
let adminSearch = '';

// Emojis iniciales por defecto
const defaultEmojis = {
  'P001': '🎧', 'P002': '⌨️', 'P003': '⌚', 'P004': '💡', 'P005': '☕',
  'P006': '🍳', 'P007': '⚽', 'P008': '🧘', 'P009': '👟', 'P010': '📕',
  'P011': '📘', 'P012': '🌍'
};

// Cargar emojis guardados en localStorage
let storedEmojis = {};
try {
  storedEmojis = JSON.parse(localStorage.getItem('vantage_emojis') || '{}');
} catch (e) {
  storedEmojis = {};
}
const emojis = { ...defaultEmojis, ...storedEmojis };

function saveEmoji(id, emoji) {
  emojis[id] = emoji;
  storedEmojis[id] = emoji;
  try {
    localStorage.setItem('vantage_emojis', JSON.stringify(storedEmojis));
  } catch (e) {}
}

/* =====================================================
   Inicialización y Carga de Datos desde Supabase
   ===================================================== */
async function init() {
  initTheme();
  const app = document.querySelector('#app');
  if (app) {
    app.innerHTML = `
      <div style="text-align:center; padding: 60px 20px;">
        <div style="font-size: 38px; margin-bottom: 14px;">⚡</div>
        <h2 style="margin-bottom: 8px;">Conectando a Supabase...</h2>
        <p class="mu">Cargando base de datos y catálogo en tiempo real.</p>
      </div>
    `;
  }

  await reloadDB();
  render();
}

async function reloadDB(silent = false) {
  const indicator = document.querySelector('#db-indicator');
  if (indicator) indicator.style.opacity = '0.5';

  const tablas = ['categoria', 'producto', 'cliente', 'cliente_telefono', 'orden', 'orden_detalle'];
  try {
    let errores = 0;
    for (const t of tablas) {
      const { data, error } = await sbClient.from(t).select('*');
      if (error) {
        errores++;
        console.error(`Error cargando tabla ${t}:`, error);
      } else if (data) {
        db[t] = data;
      }
    }

    // Ordenar órdenes de la más reciente a la más antigua
    db.orden.sort((a, b) => String(b.fecha_orden || '').localeCompare(String(a.fecha_orden || '')));

    // Asignar emojis a productos
    db.producto.forEach(p => {
      p._e = emojis[p.id_producto] || '📦';
    });

    if (indicator) {
      indicator.style.opacity = '1';
      indicator.innerHTML = '<span class="status-dot"></span><span>Supabase DB</span>';
    }

    // Todas las tablas vacías y sin error = RLS activo sin políticas de lectura
    const todoVacio = tablas.every(t => db[t].length === 0);
    if (errores) {
      toast(`No se pudieron cargar ${errores} tabla(s). Revisa la consola.`, 'error', 5000);
    } else if (todoVacio) {
      console.warn('Supabase devolvió 0 filas en todas las tablas. Si existen datos, faltan las políticas RLS (database/migrations/001_politicas_rls.sql).');
      toast('La base respondió sin datos. Verifica las políticas RLS.', 'info', 5000);
    } else if (!silent) {
      toast('Base de datos sincronizada', 'info');
    }
  } catch (err) {
    console.error('Error general de conexión:', err);
    toast('Error conectando con la base de datos', 'error');
  }
}

/* =====================================================
   Utilidades y Formateo
   ===================================================== */
const $ = s => document.querySelector(s);
const money = n => '$' + Number(n || 0).toFixed(2);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const prod = id => db.producto.find(p => p.id_producto === id) || { nombre_producto: 'Producto no disponible', precio_actual: 0, _e: '📦' };
const fecha = f => f
  ? new Date(f).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

// Precio de una línea de orden: el congelado al comprar; si no existe, el actual del producto
const precioLinea = d => Number(d.precio_unitario ?? prod(d.id_producto)?.precio_actual ?? 0);
const totalOrden = idOrden => db.orden_detalle
  .filter(d => d.id_orden === idOrden)
  .reduce((acc, d) => acc + precioLinea(d) * (Number(d.cantidad) || 0), 0);

// Traduce errores de Supabase/PostgreSQL a mensajes legibles
function dbErrorMessage(err, fallback = 'Error en la base de datos') {
  const map = {
    '23505': 'Ya existe un registro con ese ID o clave única.',
    '23503': 'Error de relación: el registro referenciado no existe o tiene datos vinculados.',
    '23502': 'Falta un campo obligatorio.',
    '23514': 'Un valor no cumple las reglas de la tabla (por ejemplo, precio o cantidad negativos).',
    '42501': 'Permiso denegado por las políticas RLS de Supabase.',
    'PGRST202': 'La función crear_orden no existe. Ejecuta database/migrations/002_ids_fecha_precio_checkout.sql.'
  };
  return map[err?.code] || err?.message || fallback;
}
const cli = id => db.cliente.find(c => c.id_cliente === id);
const catObj = id => db.categoria.find(c => c.id_categoria === id);

const nom = c => c
  ? [c.nom1_cliente, c.nom2_cliente, c.ape1_cliente, c.ape2_cliente].filter(Boolean).join(' ')
  : '—';

const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
const cartTotal = () => Object.entries(cart)
  .reduce((a, [id, n]) => a + (prod(id)?.precio_actual || 0) * n, 0);


/* Toast Notifications */
function toast(msg, type = 'success', duration = 2400) {
  const t = $('#toast');
  if (!t) return;
  const icons = { success: '✔', error: '✖', info: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || '•'}</span> <span>${esc(msg)}</span>`;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.className = '';
  }, duration);
}

/* Manejo de Tema (Claro / Oscuro) */
function initTheme() {
  const saved = localStorage.getItem('vantage_theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  }
  updateThemeIcon();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const isDark = current === 'dark' || (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('vantage_theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = $('#theme-btn');
  if (!btn) return;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}

/* Navegación */
function go(v) {
  view = v;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================
   CONFIGURACIÓN DE TABLAS PARA CRUD
   ===================================================== */
const TABLE_CONFIG = {
  producto: {
    name: 'producto',
    label: 'Productos',
    icon: '👟',
    idKey: 'id_producto',
    idPrefix: 'P',
    title: 'Catálogo de Productos',
    desc: 'Artículos a la venta, precios actuales y categorías asociadas.',
    columns: [
      { key: 'id_producto', label: 'ID', isId: true },
      { key: '_e', label: 'Icono', format: r => `<span style="font-size:22px">${r._e || '📦'}</span>` },
      { key: 'nombre_producto', label: 'Nombre del Producto' },
      { key: 'precio_actual', label: 'Precio', format: r => `<b style="color:var(--ok)">${money(r.precio_actual)}</b>` },
      { key: 'id_categoria', label: 'Categoría', format: r => {
        const c = catObj(r.id_categoria);
        return `<span class="badge-rel">🏷️ ${esc(c ? c.nombre_categoria : r.id_categoria)}</span>`;
      }}
    ],
    fields: [
      { key: 'id_producto', label: 'ID Producto (Automático)', type: 'text', required: true, autoId: true },
      { key: 'nombre_producto', label: 'Nombre del Producto', type: 'text', placeholder: 'Ej. Balón de Fútbol Pro', required: true },
      { key: 'precio_actual', label: 'Precio Actual ($)', type: 'number', step: '0.01', min: '0', placeholder: '0.00', required: true },
      { key: 'id_categoria', label: 'Categoría', type: 'select', options: () => db.categoria.map(c => ({ value: c.id_categoria, label: `${c.id_categoria} - ${c.nombre_categoria}` })), required: true },
      { key: 'emoji', label: 'Emoji / Icono Representativo', type: 'emoji', default: '📦' }
    ]
  },
  categoria: {
    name: 'categoria',
    label: 'Categorías',
    icon: '🏷️',
    idKey: 'id_categoria',
    idPrefix: 'CAT',
    title: 'Categorías de Productos',
    desc: 'Clasificación de productos disponibles en la tienda.',
    columns: [
      { key: 'id_categoria', label: 'Código', isId: true },
      { key: 'nombre_categoria', label: 'Nombre de la Categoría' },
      { key: '_prods', label: 'Total Productos', format: r => {
        const count = db.producto.filter(p => p.id_categoria === r.id_categoria).length;
        return `<span class="badge-tag cat">${count} artículos</span>`;
      }}
    ],
    fields: [
      { key: 'id_categoria', label: 'Código Categoría (Ej. CAT05)', type: 'text', required: true, autoId: true },
      { key: 'nombre_categoria', label: 'Nombre de la Categoría', type: 'text', placeholder: 'Ej. Indumentaria Deportiva', required: true }
    ]
  },
  cliente: {
    name: 'cliente',
    label: 'Clientes',
    icon: '👥',
    idKey: 'id_cliente',
    idPrefix: 'C',
    title: 'Directorio de Clientes',
    desc: 'Información de clientes registrados para compras y órdenes.',
    columns: [
      { key: 'id_cliente', label: 'ID Cliente', isId: true },
      { key: '_nombre', label: 'Nombre Completo', format: r => `<b>${esc(nom(r))}</b>` },
      { key: '_telefonos', label: 'Teléfonos', format: r => {
        const tels = db.cliente_telefono.filter(t => t.id_cliente === r.id_cliente).map(t => t.numero_telefono);
        return tels.length ? tels.map(t => `<span class="badge-rel">📞 ${esc(t)}</span>`).join(' ') : '<span class="mu">Sin teléfonos</span>';
      }},
      { key: '_ordenes', label: 'Órdenes', format: r => {
        const ords = db.orden.filter(o => o.id_cliente === r.id_cliente).length;
        return `<span class="badge">${ords} ord.</span>`;
      }}
    ],
    fields: [
      { key: 'id_cliente', label: 'ID Cliente', type: 'text', required: true, autoId: true },
      { key: 'nom1_cliente', label: 'Primer Nombre *', type: 'text', placeholder: 'Ej. Juan', required: true },
      { key: 'nom2_cliente', label: 'Segundo Nombre', type: 'text', placeholder: 'Opcional' },
      { key: 'ape1_cliente', label: 'Primer Apellido *', type: 'text', placeholder: 'Ej. Pérez', required: true },
      { key: 'ape2_cliente', label: 'Segundo Apellido', type: 'text', placeholder: 'Opcional' }
    ]
  },
  cliente_telefono: {
    name: 'cliente_telefono',
    label: 'Teléfonos',
    icon: '📞',
    idKey: 'id_telefono',
    idPrefix: 'T',
    title: 'Teléfonos de Contacto',
    desc: 'Números de teléfono asociados a cada cliente registrado.',
    columns: [
      { key: 'id_telefono', label: 'ID Teléfono', isId: true },
      { key: 'id_cliente', label: 'Cliente Asociado', format: r => {
        const c = cli(r.id_cliente);
        return `<span class="badge-rel">👤 ${esc(c ? nom(c) : r.id_cliente)}</span>`;
      }},
      { key: 'numero_telefono', label: 'Número de Teléfono', format: r => `<b>${esc(r.numero_telefono)}</b>` }
    ],
    fields: [
      { key: 'id_telefono', label: 'ID Teléfono', type: 'text', required: true, autoId: true },
      { key: 'id_cliente', label: 'Cliente', type: 'select', options: () => db.cliente.map(c => ({ value: c.id_cliente, label: `${c.id_cliente} - ${nom(c)}` })), required: true },
      { key: 'numero_telefono', label: 'Número de Teléfono', type: 'tel', placeholder: 'Ej. +56 9 8765 4321', required: true }
    ]
  },
  orden: {
    name: 'orden',
    label: 'Órdenes',
    icon: '🧾',
    idKey: 'id_orden',
    idPrefix: 'O',
    title: 'Registro de Órdenes',
    desc: 'Cabeceras de compras realizadas por los clientes.',
    columns: [
      { key: 'id_orden', label: 'ID Orden', isId: true },
      { key: 'id_cliente', label: 'Cliente', format: r => {
        const c = cli(r.id_cliente);
        return `<span class="badge-rel">👤 ${esc(c ? nom(c) : r.id_cliente)}</span>`;
      }},
      { key: '_items', label: 'Productos / Ítems', format: r => {
        const items = db.orden_detalle.filter(d => d.id_orden === r.id_orden);
        const count = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
        return `<span class="badge-tag cat">${count} unidades</span>`;
      }},
      { key: 'fecha_orden', label: 'Fecha', format: r => `<span class="mu">${esc(fecha(r.fecha_orden))}</span>` },
      { key: '_total', label: 'Total Facturado', format: r => `<b style="color:var(--ok)">${money(totalOrden(r.id_orden))}</b>` }
    ],
    fields: [
      { key: 'id_orden', label: 'ID de la Orden', type: 'text', required: true, autoId: true },
      { key: 'id_cliente', label: 'Cliente Titular', type: 'select', options: () => db.cliente.map(c => ({ value: c.id_cliente, label: `${c.id_cliente} - ${nom(c)}` })), required: true }
    ]
  },
  orden_detalle: {
    name: 'orden_detalle',
    label: 'Detalle Órdenes',
    icon: '📋',
    idKey: 'id_orden',
    compositeKey: 'id_producto',
    title: 'Líneas de Detalle de Órdenes',
    desc: 'Desglose producto a producto comprado en cada orden.',
    columns: [
      { key: 'id_orden', label: 'ID Orden', isId: true },
      { key: 'id_producto', label: 'Producto', format: r => {
        const p = prod(r.id_producto);
        return `<span class="badge-rel">${p._e || '📦'} ${esc(p.nombre_producto)}</span>`;
      }},
      { key: 'cantidad', label: 'Cantidad', format: r => `<b>${r.cantidad} u.</b>` },
      { key: 'precio_unitario', label: 'Precio Unitario', format: r => money(precioLinea(r)) },
      { key: '_subtotal', label: 'Subtotal', format: r => `<b style="color:var(--ok)">${money(precioLinea(r) * (r.cantidad || 0))}</b>` }
    ],
    fields: [
      { key: 'id_orden', label: 'Orden', type: 'select', options: () => db.orden.map(o => ({ value: o.id_orden, label: `Orden ${o.id_orden} (${nom(cli(o.id_cliente))})` })), required: true },
      { key: 'id_producto', label: 'Producto', type: 'select', options: () => db.producto.map(p => ({ value: p.id_producto, label: `${p._e || '📦'} ${p.nombre_producto} - ${money(p.precio_actual)}` })), required: true },
      { key: 'cantidad', label: 'Cantidad', type: 'number', min: '1', step: '1', default: '1', required: true },
      { key: 'precio_unitario', label: 'Precio Unitario ($)', type: 'number', min: '0', step: '0.01', placeholder: 'Vacío = precio actual del producto' }
    ]
  }
};

/* =====================================================
   OPERACIONES CRUD (CREATE, UPDATE, DELETE)
   ===================================================== */

/* 1. Guardar Registro (Insertar o Modificar) */
async function submitCrudForm(tableName, isEdit, originalId, originalComposite) {
  const config = TABLE_CONFIG[tableName];
  if (!config) return;

  const btn = $('#modal-submit-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Guardando en Supabase...</span>';
  }

  try {
    const payload = {};
    let customEmojiVal = null;

    for (const f of config.fields) {
      if (f.type === 'emoji') {
        const emInput = $(`#field-${f.key}`);
        customEmojiVal = emInput ? emInput.value.trim() : '📦';
        continue;
      }

      const input = $(`#field-${f.key}`);
      if (!input) continue;

      let val = input.value.trim();
      if (f.required && !val) {
        toast(`El campo "${f.label}" es obligatorio`, 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '💾 Guardar Registro'; }
        return;
      }

      // Número opcional vacío: se omite para que la BD aplique su valor por defecto
      if (f.type === 'number' && val === '') continue;

      if (f.type === 'number') {
        val = Number(val);
      }
      payload[f.key] = val;
    }

    if (isEdit) {
      // UPDATE en Supabase
      let query = sbClient.from(tableName).update(payload);
      if (config.compositeKey) {
        query = query.eq(config.idKey, originalId).eq(config.compositeKey, originalComposite);
      } else {
        query = query.eq(config.idKey, originalId);
      }

      const { data, error } = await query.select();
      if (error) throw error;

      // Actualizar estado local
      const idx = db[tableName].findIndex(r => {
        if (config.compositeKey) {
          return r[config.idKey] === originalId && r[config.compositeKey] === originalComposite;
        }
        return r[config.idKey] === originalId;
      });

      if (idx !== -1) {
        db[tableName][idx] = { ...db[tableName][idx], ...payload };
      }

      if (tableName === 'producto' && customEmojiVal) {
        saveEmoji(originalId, customEmojiVal);
        db.producto.forEach(p => { if (p.id_producto === originalId) p._e = customEmojiVal; });
      }

      toast('Registro actualizado exitosamente en Supabase');
    } else {
      // INSERT en Supabase
      const { data, error } = await sbClient.from(tableName).insert([payload]).select();
      if (error) throw error;

      const newRec = data && data[0] ? data[0] : payload;
      if (tableName === 'producto' && customEmojiVal) {
        saveEmoji(newRec.id_producto, customEmojiVal);
        newRec._e = customEmojiVal;
      }
      db[tableName].push(newRec);

      toast('Nuevo registro creado exitosamente en Supabase');
    }

    closeModal();
    render();
  } catch (err) {
    console.error('Error guardando registro:', err);
    toast(dbErrorMessage(err, 'Error al guardar en Supabase'), 'error', 4000);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = isEdit ? '💾 Guardar Cambios' : '➕ Crear Registro';
    }
  }
}

/* 2. Eliminar Registro */
async function executeDelete(tableName, idVal, compositeVal) {
  const config = TABLE_CONFIG[tableName];
  if (!config) return;

  const btn = $('#modal-delete-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Eliminando...</span>';
  }

  try {
    let query = sbClient.from(tableName).delete();
    if (config.compositeKey) {
      query = query.eq(config.idKey, idVal).eq(config.compositeKey, compositeVal);
    } else {
      query = query.eq(config.idKey, idVal);
    }

    const { error } = await query;
    if (error) throw error;

    // Remover del estado local
    db[tableName] = db[tableName].filter(r => {
      if (config.compositeKey) {
        return !(r[config.idKey] === idVal && r[config.compositeKey] === compositeVal);
      }
      return r[config.idKey] !== idVal;
    });

    // Limpieza de carritos o dependencias huérfanas locales
    if (tableName === 'producto' && cart[idVal]) {
      delete cart[idVal];
    }

    toast('Registro eliminado exitosamente de Supabase');
    closeModal();
    render();
  } catch (err) {
    console.error('Error eliminando registro:', err);
    let msg = err.message || 'No se pudo eliminar el registro.';
    if (err.code === '23503') {
      msg = 'Restricción de Integridad: Este registro está vinculado a otros datos (por ejemplo órdenes, productos o teléfonos). Debes eliminar primero sus dependencias.';
    }
    toast(msg, 'error', 5000);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🗑️ Confirmar Eliminación';
    }
  }
}

/* =====================================================
   INTERFAZ DE MODALES DINÁMICOS
   ===================================================== */

function openCreateModal(tableName) {
  const config = TABLE_CONFIG[tableName];
  if (!config) return;

  const formFieldsHtml = config.fields.map(f => {
    // El ID lo genera la base de datos (secuencia + DEFAULT)
    if (f.autoId) {
      return `
        <div>
          <label>${esc(f.label)}</label>
          <input value="Se asignará automáticamente (${esc(config.idPrefix)}…)" disabled style="opacity:0.7;">
          <span class="form-help">Generado por la base de datos al guardar.</span>
        </div>
      `;
    }

    if (f.type === 'select') {
      const opts = f.options().map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
      return `
        <div>
          <label for="field-${f.key}">${esc(f.label)}</label>
          <select id="field-${f.key}" ${f.required ? 'required' : ''}>
            ${opts}
          </select>
        </div>
      `;
    }

    if (f.type === 'emoji') {
      const sampleEmojis = ['👟', '⚽', '🏀', '🎧', '⌚', '🏋️', '🚴', '🥊', '🎽', '🏆', '🥋', '🏊', '📦'];
      const buttons = sampleEmojis.map(em => `
        <button type="button" class="emoji-opt ${em === '👟' ? 'selected' : ''}" onclick="selectModalEmoji('${em}')">${em}</button>
      `).join('');

      return `
        <div style="grid-column: 1 / -1;">
          <label>${esc(f.label)}</label>
          <div class="emoji-palette" id="emoji-palette-container">${buttons}</div>
          <input id="field-${f.key}" value="👟" placeholder="O escribe tu propio emoji..." style="max-width:180px;">
        </div>
      `;
    }

    const val = f.default || '';
    return `
      <div>
        <label for="field-${f.key}">${esc(f.label)}</label>
        <input id="field-${f.key}" 
               type="${f.type}" 
               value="${esc(val)}" 
               placeholder="${esc(f.placeholder || '')}" 
               ${f.step ? `step="${f.step}"` : ''} 
               ${f.min !== undefined ? `min="${f.min}"` : ''} 
               ${f.required ? 'required' : ''}>
      </div>
    `;
  }).join('');

  showModal(`
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title-group">
          <span style="font-size:24px;">${config.icon}</span>
          <div>
            <h3 style="margin:0;">Nuevo Registro en ${esc(config.label)}</h3>
            <span class="mu" style="font-size:12px;">Inserción directa a tabla '${config.name}'</span>
          </div>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" title="Cerrar">✕</button>
      </div>

      <div class="modal-body">
        <div class="form">
          ${formFieldsHtml}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn sec" onclick="closeModal()">Cancelar</button>
        <button class="btn" id="modal-submit-btn" onclick="submitCrudForm('${tableName}', false)">
          ➕ Crear Registro
        </button>
      </div>
    </div>
  `);
}

function openEditModal(tableName, idVal, compositeVal) {
  const config = TABLE_CONFIG[tableName];
  if (!config) return;

  const record = db[tableName].find(r => {
    if (config.compositeKey) {
      return r[config.idKey] === idVal && r[config.compositeKey] === compositeVal;
    }
    return r[config.idKey] === idVal;
  });

  if (!record) {
    return toast('No se encontró el registro a editar', 'error');
  }

  const formFieldsHtml = config.fields.map(f => {
    const isPk = f.key === config.idKey || (config.compositeKey && f.key === config.compositeKey);
    const currVal = record[f.key] !== undefined ? record[f.key] : '';

    if (f.type === 'select') {
      const opts = f.options().map(o => `
        <option value="${esc(o.value)}" ${String(o.value) === String(currVal) ? 'selected' : ''}>${esc(o.label)}</option>
      `).join('');
      return `
        <div>
          <label for="field-${f.key}">${esc(f.label)}</label>
          <select id="field-${f.key}" ${isPk ? 'disabled' : ''} ${f.required ? 'required' : ''}>
            ${opts}
          </select>
        </div>
      `;
    }

    if (f.type === 'emoji') {
      const currentEmoji = record._e || emojis[idVal] || '📦';
      const sampleEmojis = ['👟', '⚽', '🏀', '🎧', '⌚', '🏋️', '🚴', '🥊', '🎽', '🏆', '🥋', '🏊', '📦'];
      const buttons = sampleEmojis.map(em => `
        <button type="button" class="emoji-opt ${em === currentEmoji ? 'selected' : ''}" onclick="selectModalEmoji('${em}')">${em}</button>
      `).join('');

      return `
        <div style="grid-column: 1 / -1;">
          <label>${esc(f.label)}</label>
          <div class="emoji-palette" id="emoji-palette-container">${buttons}</div>
          <input id="field-${f.key}" value="${esc(currentEmoji)}" style="max-width:180px;">
        </div>
      `;
    }

    return `
      <div>
        <label for="field-${f.key}">${esc(f.label)}</label>
        <input id="field-${f.key}" 
               type="${f.type}" 
               value="${esc(currVal)}" 
               ${f.step ? `step="${f.step}"` : ''} 
               ${f.min !== undefined ? `min="${f.min}"` : ''} 
               ${isPk ? 'readonly style="opacity:0.7; background:var(--bg-subtle);"' : ''}
               ${f.required ? 'required' : ''}>
        ${isPk ? '<span class="form-help">Clave primaria (no modificable).</span>' : ''}
      </div>
    `;
  }).join('');

  showModal(`
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title-group">
          <span style="font-size:24px;">✏️</span>
          <div>
            <h3 style="margin:0;">Editar Registro (${esc(idVal)})</h3>
            <span class="mu" style="font-size:12px;">Modificando en tabla '${config.name}'</span>
          </div>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" title="Cerrar">✕</button>
      </div>

      <div class="modal-body">
        <div class="form">
          ${formFieldsHtml}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn sec" onclick="closeModal()">Cancelar</button>
        <button class="btn" id="modal-submit-btn" onclick="submitCrudForm('${tableName}', true, '${esc(idVal)}', '${esc(compositeVal || '')}')">
          💾 Guardar Cambios
        </button>
      </div>
    </div>
  `);
}

function openDeleteModal(tableName, idVal, compositeVal) {
  const config = TABLE_CONFIG[tableName];
  if (!config) return;

  const record = db[tableName].find(r => {
    if (config.compositeKey) {
      return r[config.idKey] === idVal && r[config.compositeKey] === compositeVal;
    }
    return r[config.idKey] === idVal;
  });

  if (!record) return;

  // Advertencias sobre relaciones en caso de clave foránea
  let warningHtml = '';
  if (tableName === 'categoria') {
    const prodsCount = db.producto.filter(p => p.id_categoria === idVal).length;
    if (prodsCount > 0) {
      warningHtml = `
        <div class="delete-alert">
          ⚠️ <b>Atención:</b> Existen <b>${prodsCount} producto(s)</b> asignados a esta categoría. Supabase podría rechazar la eliminación si existen restricciones de clave foránea.
        </div>
      `;
    }
  } else if (tableName === 'cliente') {
    const ordsCount = db.orden.filter(o => o.id_cliente === idVal).length;
    const telsCount = db.cliente_telefono.filter(t => t.id_cliente === idVal).length;
    if (ordsCount > 0 || telsCount > 0) {
      warningHtml = `
        <div class="delete-alert">
          ⚠️ <b>Atención:</b> Este cliente tiene <b>${ordsCount} orden(es)</b> y <b>${telsCount} teléfono(s)</b> asociados en la base de datos.
        </div>
      `;
    }
  } else if (tableName === 'orden') {
    const itemsCount = db.orden_detalle.filter(d => d.id_orden === idVal).length;
    if (itemsCount > 0) {
      warningHtml = `
        <div class="delete-alert">
          ⚠️ <b>Atención:</b> Esta orden contiene <b>${itemsCount} línea(s) de detalle</b>.
        </div>
      `;
    }
  }

  const detailsPreview = Object.entries(record)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `<div><span class="mu">${esc(k)}:</span> <b>${esc(v)}</b></div>`)
    .join('');

  showModal(`
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title-group">
          <span style="font-size:24px;">🗑️</span>
          <div>
            <h3 style="margin:0; color:var(--danger)">Eliminar Registro</h3>
            <span class="mu" style="font-size:12px;">Tabla '${config.name}'</span>
          </div>
        </div>
        <button class="modal-close-btn" onclick="closeModal()" title="Cerrar">✕</button>
      </div>

      <div class="modal-body">
        <p style="margin-top:0;">¿Estás seguro de que deseas eliminar permanentemente este registro de Supabase?</p>
        
        ${warningHtml}

        <div class="delete-target-preview">
          ${detailsPreview}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn sec" onclick="closeModal()">Cancelar</button>
        <button class="btn danger" id="modal-delete-btn" onclick="executeDelete('${tableName}', '${esc(idVal)}', '${esc(compositeVal || '')}')">
          🗑️ Confirmar Eliminación
        </button>
      </div>
    </div>
  `);
}

function selectModalEmoji(emoji) {
  const input = $('#field-emoji');
  if (input) input.value = emoji;
  const container = $('#emoji-palette-container');
  if (container) {
    container.querySelectorAll('.emoji-opt').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent.trim() === emoji);
    });
  }
}

function showModal(content) {
  const root = $('#modal-root');
  if (!root) return;
  root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this) closeModal()">${content}</div>`;
}

function closeModal() {
  const root = $('#modal-root');
  if (root) root.innerHTML = '';
}

/* =====================================================
   VISTAS DE LA APLICACIÓN
   ===================================================== */

/* Barra de Navegación */
function renderNav() {
  const tabs = [
    ['tienda', '🛍️ Tienda'],
    ['carrito', '🛒 Carrito'],
    ['ordenes', '📦 Órdenes'],
    ['admin', '🗄️ Base de Datos (CRUD)']
  ];

  $('#nav').innerHTML = tabs.map(([k, label]) => `
    <button class="${view === k ? 'on' : ''}" onclick="go('${k}')">
      ${label}
      ${k === 'carrito' && cartCount() ? `<span class="badge">${cartCount()}</span>` : ''}
    </button>
  `).join('');
}

/* ---------- 1. Vista Tienda ---------- */
function vTienda() {
  const list = db.producto.filter(p =>
    (cat === 'ALL' || p.id_categoria === cat) &&
    (p.nombre_producto || '').toLowerCase().includes(q.toLowerCase())
  );

  const chips = db.categoria.map(c => `
    <button class="chip ${cat === c.id_categoria ? 'on' : ''}"
            onclick="cat='${c.id_categoria}'; render()">${esc(c.nombre_categoria)}</button>
  `).join('');

  const cards = list.map(p => {
    const categoria = db.categoria.find(c => c.id_categoria === p.id_categoria);
    return `
      <div class="card">
        <div class="pic">${p._e || '📦'}</div>
        <div class="mu">${esc(categoria ? categoria.nombre_categoria : '')}</div>
        <b style="font-size:16px;">${esc(p.nombre_producto)}</b>
        <div class="row" style="margin-top:auto; padding-top:8px;">
          <span class="price">${money(p.precio_actual)}</span>
          <button class="btn" onclick="add('${p.id_producto}')">Agregar</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
      <div>
        <h2>Catálogo de Productos</h2>
        <p class="mu" style="margin:0;">Explora y adquiere artículos deportivos en tiempo real.</p>
      </div>
      <button class="btn sec sm" onclick="go('admin'); adminTable='producto'; render();">
        ⚙️ Administrar Productos
      </button>
    </div>

    <input id="q" placeholder="Buscar productos por nombre…" value="${esc(q)}" oninput="q = this.value; keep()">

    <div class="chips">
      <button class="chip ${cat === 'ALL' ? 'on' : ''}" onclick="cat='ALL'; render()">Todas (${db.producto.length})</button>
      ${chips}
    </div>

    <div class="grid">
      ${cards || `
        <div class="panel" style="grid-column: 1 / -1; text-align:center; padding: 40px;">
          <div style="font-size:36px; margin-bottom:10px;">🔍</div>
          <p class="mu" style="margin:0 0 12px;">No se encontraron productos que coincidan con la búsqueda.</p>
          <button class="btn sec sm" onclick="q=''; cat='ALL'; render()">Restablecer filtros</button>
        </div>
      `}
    </div>
  `;
}

function add(id) {
  cart[id] = (cart[id] || 0) + 1;
  toast('Agregado al carrito');
  renderNav();
}

function setQty(id, d) {
  cart[id] = (cart[id] || 0) + d;
  if (cart[id] <= 0) {
    delete cart[id];
  }
  render();
}

function keep() {
  const pos = $('#q')?.selectionStart || 0;
  render();
  const i = $('#q');
  if (i) {
    i.focus();
    i.setSelectionRange(pos, pos);
  }
}

/* ---------- 2. Vista Carrito ---------- */
function vCarrito() {
  if (last) {
    return `
      <div class="panel" style="text-align:center; padding:40px 20px;">
        <div style="font-size:48px; margin-bottom:10px;">🎉</div>
        <h2 class="ok" style="font-size:24px;">¡Orden ${last} Creada con Éxito!</h2>
        <p class="mu" style="margin-bottom:24px;">La orden ha sido guardada en las tablas 'orden' y 'orden_detalle' de Supabase.</p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button class="btn" onclick="last=null; go('ordenes')">Ver Mis Órdenes</button>
          <button class="btn sec" onclick="last=null; go('tienda')">Continuar Comprando</button>
        </div>
      </div>
    `;
  }

  const ids = Object.keys(cart);

  if (!ids.length) {
    return `
      <h2>Carrito de Compras</h2>
      <div class="panel" style="text-align:center; padding:50px 20px;">
        <div style="font-size:44px; margin-bottom:12px;">🛒</div>
        <h3>Tu carrito está actualmente vacío</h3>
        <p class="mu" style="margin-bottom:20px;">Agrega productos desde la tienda para iniciar tu pedido.</p>
        <button class="btn" onclick="go('tienda')">Explorar Tienda</button>
      </div>
    `;
  }

  const lines = ids.map(id => {
    const p = prod(id);
    return `
      <div class="line">
        <span style="font-size:32px">${p._e || '📦'}</span>
        <div style="flex:1">
          <b>${esc(p.nombre_producto)}</b>
          <div class="mu">${money(p.precio_actual)} c/u</div>
        </div>
        <div class="qty">
          <button onclick="setQty('${id}', -1)">−</button>
          <span style="font-weight:700; width:24px; text-align:center;">${cart[id]}</span>
          <button onclick="setQty('${id}', 1)">+</button>
        </div>
        <b style="width:90px; text-align:right">${money(p.precio_actual * cart[id])}</b>
      </div>
    `;
  }).join('');

  const clientesOptions = db.cliente.map(c =>
    `<option value="${c.id_cliente}">${esc(nom(c))} (${c.id_cliente})</option>`
  ).join('');

  return `
    <h2>Carrito de Compras</h2>

    <div class="panel">
      ${lines}
      <div class="row" style="margin-top:16px; padding-top:14px; border-top:2px solid var(--bd);">
        <span style="font-size:16px; font-weight:700;">Total a Pagar</span>
        <span class="price" style="font-size:24px; color:var(--ok);">${money(cartTotal())}</span>
      </div>
    </div>

    <div class="panel">
      <h3 style="margin-bottom:14px;">Datos del Cliente para la Orden</h3>

      <label>Seleccionar Cliente</label>
      <select id="cs" onchange="renderClientFields()">
        <option value="NEW">➕ Crear Nuevo Cliente y Teléfono</option>
        ${clientesOptions}
      </select>

      <div class="form" id="nf">
        <div><label>Primer Nombre *</label><input id="n1" placeholder="Ej. Roberto"></div>
        <div><label>Segundo Nombre</label><input id="n2" placeholder="Opcional"></div>
        <div><label>Primer Apellido *</label><input id="a1" placeholder="Ej. Silva"></div>
        <div><label>Segundo Apellido</label><input id="a2" placeholder="Opcional"></div>
        <div><label>Teléfono de Contacto *</label><input id="tel" type="tel" placeholder="+56 9 1234 5678"></div>
      </div>

      <div style="margin-top:20px;">
        <button class="btn" style="width:100%; padding:12px;" onclick="checkout()">
          ✔ Confirmar y Enviar Orden a Supabase
        </button>
      </div>
    </div>
  `;
}

function renderClientFields() {
  const select = $('#cs');
  const form = $('#nf');
  if (select && form) {
    form.style.display = select.value === 'NEW' ? 'grid' : 'none';
  }
}

async function checkout() {
  const idc = $('#cs')?.value;
  if (!idc) return;

  const btn = event?.target;
  const resetBtn = () => {
    if (btn) { btn.disabled = false; btn.textContent = '✔ Confirmar y Enviar Orden a Supabase'; }
  };

  // Parámetros de public.crear_orden(p_items, p_id_cliente, p_cliente)
  const params = {
    p_items: Object.entries(cart).map(([id_producto, cantidad]) => ({ id_producto, cantidad }))
  };

  if (idc === 'NEW') {
    const cliente = {
      nom1_cliente: $('#n1').value.trim(),
      nom2_cliente: $('#n2').value.trim(),
      ape1_cliente: $('#a1').value.trim(),
      ape2_cliente: $('#a2').value.trim(),
      numero_telefono: $('#tel').value.trim()
    };
    if (!cliente.nom1_cliente || !cliente.ape1_cliente || !cliente.numero_telefono) {
      toast('Por favor completa nombre, apellido y teléfono', 'error');
      return;
    }
    params.p_cliente = cliente;
  } else {
    params.p_id_cliente = idc;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Procesando orden en Supabase...';
  }

  try {
    // Una sola transacción: cliente + teléfono + orden + detalle (todo o nada)
    const { data: orden, error } = await sbClient.rpc('crear_orden', params);
    if (error) throw error;

    cart = {};
    last = orden.id_orden;
    await reloadDB(true);
    render();
  } catch (err) {
    console.error('Error durante checkout:', err);
    toast('Error procesando la compra: ' + dbErrorMessage(err, 'Error desconocido'), 'error', 5000);
    resetBtn();
  }
}

/* ---------- 3. Vista Órdenes ---------- */
function vOrdenes() {
  const orders = db.orden.map(o => {
    const cliente = cli(o.id_cliente);
    const telefonos = db.cliente_telefono
      .filter(t => t.id_cliente === o.id_cliente)
      .map(t => t.numero_telefono)
      .join(' · ');

    const detalle = db.orden_detalle
      .filter(d => d.id_orden === o.id_orden)
      .map(d => {
        const p = prod(d.id_producto);
        const precio = precioLinea(d);
        return `
          <div class="line">
            <span>${p._e || '📦'}</span>
            <span style="flex:1">${esc(p.nombre_producto)}</span>
            <span class="mu">${d.cantidad} × ${money(precio)}</span>
            <b>${money(d.cantidad * precio)}</b>
          </div>
        `;
      }).join('');

    return `
      <div class="panel">
        <div class="row" style="margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge-id">${o.id_orden}</span>
            <span style="font-weight:700;">${esc(nom(cliente))}</span>
          </div>
          <span class="price" style="color:var(--ok)">${money(totalOrden(o.id_orden))}</span>
        </div>
        <div class="mu" style="margin-bottom:12px;">🗓️ ${esc(fecha(o.fecha_orden))} · 📞 ${esc(telefonos || 'Sin teléfono registrado')}</div>
        ${detalle || '<p class="mu">Sin ítems registrados.</p>'}
      </div>
    `;
  }).join('');

  return `
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
      <div>
        <h2>Historial de Órdenes</h2>
        <p class="mu" style="margin:0;">Listado de órdenes registradas en Supabase.</p>
      </div>
      <button class="btn sec sm" onclick="go('admin'); adminTable='orden'; render();">
        ⚙️ Gestionar Órdenes en CRUD
      </button>
    </div>
    ${orders || '<div class="panel mu" style="text-align:center; padding:40px;">No hay órdenes registradas aún.</div>'}
  `;
}

/* =====================================================
   4. VISTA CRUD DE BASE DE DATOS (ADMINISTRACIÓN)
   ===================================================== */
function vAdmin() {
  const currentConfig = TABLE_CONFIG[adminTable] || TABLE_CONFIG.producto;
  const tableData = db[adminTable] || [];

  // Filtrar registros por buscador
  const filteredData = tableData.filter(row => {
    if (!adminSearch) return true;
    const term = adminSearch.toLowerCase();
    return Object.values(row).some(val => String(val || '').toLowerCase().includes(term));
  });

  // KPI Metrics
  const statsHtml = `
    <div class="stats-grid">
      <div class="stat-card" onclick="adminTable='producto'; render()">
        <div class="stat-icon">👟</div>
        <div class="stat-content">
          <div class="stat-value">${db.producto.length}</div>
          <div class="stat-label">Productos</div>
        </div>
      </div>
      <div class="stat-card" onclick="adminTable='categoria'; render()">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
          <div class="stat-value">${db.categoria.length}</div>
          <div class="stat-label">Categorías</div>
        </div>
      </div>
      <div class="stat-card" onclick="adminTable='cliente'; render()">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">${db.cliente.length}</div>
          <div class="stat-label">Clientes</div>
        </div>
      </div>
      <div class="stat-card" onclick="adminTable='orden'; render()">
        <div class="stat-icon">🧾</div>
        <div class="stat-content">
          <div class="stat-value">${db.orden.length}</div>
          <div class="stat-label">Órdenes</div>
        </div>
      </div>
    </div>
  `;

  // Selector de Tablas (Pills)
  const pillsHtml = Object.keys(TABLE_CONFIG).map(tName => {
    const cfg = TABLE_CONFIG[tName];
    const isActive = adminTable === tName;
    const count = (db[tName] || []).length;
    return `
      <button class="table-pill ${isActive ? 'active' : ''}" onclick="adminTable='${tName}'; adminSearch=''; render();">
        <span>${cfg.icon}</span>
        <span>${cfg.label}</span>
        <span class="pill-count">${count}</span>
      </button>
    `;
  }).join('');

  // Filas de la Tabla
  const rowsHtml = filteredData.map(row => {
    const idVal = row[currentConfig.idKey];
    const compositeVal = currentConfig.compositeKey ? row[currentConfig.compositeKey] : null;

    const cellsHtml = currentConfig.columns.map(col => {
      let content = '';
      if (col.format) {
        content = col.format(row);
      } else if (col.isId) {
        content = `<span class="badge-id">${esc(row[col.key])}</span>`;
      } else {
        content = esc(row[col.key]);
      }
      return `<td>${content}</td>`;
    }).join('');

    return `
      <tr>
        ${cellsHtml}
        <td style="text-align:right;">
          <div class="row-actions">
            <button class="action-btn edit" onclick="openEditModal('${adminTable}', '${esc(idVal)}', '${esc(compositeVal || '')}')" title="Editar este registro">
              ✏️ Editar
            </button>
            <button class="action-btn del" onclick="openDeleteModal('${adminTable}', '${esc(idVal)}', '${esc(compositeVal || '')}')" title="Eliminar este registro">
              🗑️ Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="admin-header">
      <div class="admin-title-row">
        <div>
          <h2>🗄️ Administración CRUD de Base de Datos</h2>
          <p class="mu" style="margin:0;">Conectado en vivo con <b>Supabase</b> (kwyycebjmdgxihbtjwqy)</p>
        </div>
        <button class="btn sec" onclick="reloadDB(); render();" title="Recargar tablas">
          🔄 Sincronizar con Supabase
        </button>
      </div>

      ${statsHtml}

      <div class="table-pills-wrapper">
        ${pillsHtml}
      </div>

      <div class="crud-toolbar">
        <div class="crud-search-box">
          <span class="search-icon">🔍</span>
          <input id="admin-search-input" 
                 placeholder="Buscar en ${currentConfig.label.toLowerCase()}…" 
                 value="${esc(adminSearch)}" 
                 oninput="adminSearch = this.value; renderAdminTableOnly();">
        </div>

        <div class="crud-actions">
          <span class="mu" style="font-size:13px; font-weight:600;">
            ${filteredData.length} ${filteredData.length === 1 ? 'registro' : 'registros'}
          </span>
          <button class="btn" onclick="openCreateModal('${adminTable}')">
            ➕ Nuevo Registro
          </button>
        </div>
      </div>

      <div class="data-table-card">
        <div class="table-responsive" id="table-container">
          <table class="data-table">
            <thead>
              <tr>
                ${currentConfig.columns.map(c => `<th>${esc(c.label)}</th>`).join('')}
                <th style="text-align:right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `
                <tr>
                  <td colspan="${currentConfig.columns.length + 1}">
                    <div class="table-empty">
                      <div class="table-empty-icon">📭</div>
                      <b>No hay registros que coincidan</b>
                      <p class="mu" style="margin:4px 0 14px;">La tabla '${currentConfig.name}' no contiene datos para esta búsqueda.</p>
                      <button class="btn sec sm" onclick="adminSearch=''; render();">Limpiar filtro</button>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderAdminTableOnly() {
  const pos = $('#admin-search-input')?.selectionStart || 0;
  render();
  const input = $('#admin-search-input');
  if (input) {
    input.focus();
    input.setSelectionRange(pos, pos);
  }
}

/* =====================================================
   RENDER PRINCIPAL
   ===================================================== */
function render() {
  renderNav();

  const app = $('#app');
  if (!app) return;

  const views = {
    tienda: vTienda,
    carrito: vCarrito,
    ordenes: vOrdenes,
    admin: vAdmin
  };

  app.innerHTML = (views[view] || vTienda)();

  if (view === 'carrito' && !last && Object.keys(cart).length) {
    renderClientFields();
  }
}

// Iniciar aplicación
init();
