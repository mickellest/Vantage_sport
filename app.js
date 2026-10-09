/* =====================================================
   Base de datos en memoria (persistida en localStorage)
   Tablas: categoria, producto, cliente, cliente_telefono,
           orden, orden_detalle
   ===================================================== */
const KEY = 'ecom_demo_v1';

const SEED = () => ({
  categoria: [
    { id_categoria: 'CAT01', nombre_categoria: 'Tecnología' },
    { id_categoria: 'CAT02', nombre_categoria: 'Hogar' },
    { id_categoria: 'CAT03', nombre_categoria: 'Deportes' },
    { id_categoria: 'CAT04', nombre_categoria: 'Libros' }
  ],

  // [id, nombre, precio, categoría, emoji]
  producto: [
    ['P001', 'Auriculares Bluetooth', 59.9, 'CAT01', '🎧'],
    ['P002', 'Teclado mecánico', 89.5, 'CAT01', '⌨️'],
    ['P003', 'Smartwatch', 129, 'CAT01', '⌚'],
    ['P004', 'Lámpara de escritorio', 34.99, 'CAT02', '💡'],
    ['P005', 'Cafetera italiana', 27.5, 'CAT02', '☕'],
    ['P006', 'Set de sartenes', 74, 'CAT02', '🍳'],
    ['P007', 'Balón de fútbol', 22, 'CAT03', '⚽'],
    ['P008', 'Mat de yoga', 31.25, 'CAT03', '🧘'],
    ['P009', 'Zapatillas running', 98, 'CAT03', '👟'],
    ['P010', 'Novela de misterio', 14.9, 'CAT04', '📕'],
    ['P011', 'Guía de programación', 42, 'CAT04', '📘'],
    ['P012', 'Atlas del mundo', 36.5, 'CAT04', '🌍']
  ].map(p => ({
    id_producto: p[0],
    nombre_producto: p[1],
    precio_actual: p[2],
    id_categoria: p[3],
    _e: p[4] // emoji (solo visual, no es columna)
  })),

  cliente: [
    { id_cliente: 'C001', nom1_cliente: 'María', nom2_cliente: 'José', ape1_cliente: 'Pérez', ape2_cliente: 'Rojas' },
    { id_cliente: 'C002', nom1_cliente: 'Carlos', nom2_cliente: '', ape1_cliente: 'Gómez', ape2_cliente: 'Díaz' },
    { id_cliente: 'C003', nom1_cliente: 'Lucía', nom2_cliente: 'Andrea', ape1_cliente: 'Soto', ape2_cliente: 'Vega' }
  ],

  cliente_telefono: [
    { id_telefono: 'T001', id_cliente: 'C001', numero_telefono: '+56 9 1234 5678' },
    { id_telefono: 'T002', id_cliente: 'C001', numero_telefono: '+56 2 2345 6789' },
    { id_telefono: 'T003', id_cliente: 'C002', numero_telefono: '+56 9 8765 4321' },
    { id_telefono: 'T004', id_cliente: 'C003', numero_telefono: '+56 9 5555 0101' }
  ],

  orden: [
    { id_orden: 'O001', id_cliente: 'C001' },
    { id_orden: 'O002', id_cliente: 'C002' },
    { id_orden: 'O003', id_cliente: 'C003' }
  ],

  orden_detalle: [
    { id_orden: 'O001', id_producto: 'P001', cantidad: 1 },
    { id_orden: 'O001', id_producto: 'P010', cantidad: 2 },
    { id_orden: 'O002', id_producto: 'P007', cantidad: 3 },
    { id_orden: 'O002', id_producto: 'P008', cantidad: 1 },
    { id_orden: 'O003', id_producto: 'P003', cantidad: 1 },
    { id_orden: 'O003', id_producto: 'P005', cantidad: 2 },
    { id_orden: 'O003', id_producto: 'P012', cantidad: 1 }
  ]
});

/* ---------- Estado de la aplicación ---------- */
let db;
let cart = {};      // { id_producto: cantidad }
let view = 'tienda';
let cat = 'ALL';
let q = '';
let last = null;    // última orden creada

try {
  db = JSON.parse(localStorage.getItem(KEY));
} catch (e) { }

if (!db || !db.producto) {
  db = SEED();
}

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) { }
};

const money = n => '$' + Number(n).toFixed(2);

const esc = s => String(s).replace(/[&<>"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;'
}[c]));

const prod = id => db.producto.find(p => p.id_producto === id);
const cli = id => db.cliente.find(c => c.id_cliente === id);

const nom = c => c
  ? [c.nom1_cliente, c.nom2_cliente, c.ape1_cliente, c.ape2_cliente].filter(Boolean).join(' ')
  : '—';

const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);

const cartTotal = () => Object.entries(cart)
  .reduce((a, [id, n]) => a + prod(id).precio_actual * n, 0);

// Genera el siguiente id: prefijo + número de 3 dígitos (p. ej. C004)
const nextId = (arr, k, pre) => {
  const max = Math.max(0, ...arr.map(x => +x[k].slice(pre.length) || 0));
  return pre + String(max + 1).padStart(3, '0');
};

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- Acciones ---------- */
function go(v) {
  view = v;
  render();
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

// Re-renderiza conservando el foco y el cursor del buscador
function keep() {
  const pos = $('#q').selectionStart;
  render();
  const i = $('#q');
  i.focus();
  i.setSelectionRange(pos, pos);
}

function render2() {
  $('#nf').style.display = $('#cs').value === 'NEW' ? 'grid' : 'none';
}

function checkout() {
  let idc = $('#cs').value;

  // Cliente nuevo: crea cliente y teléfono
  if (idc === 'NEW') {
    const n1 = $('#n1').value.trim();
    const a1 = $('#a1').value.trim();
    const tel = $('#tel').value.trim();

    if (!n1 || !a1 || !tel) {
      return toast('Completa los campos obligatorios');
    }

    idc = nextId(db.cliente, 'id_cliente', 'C');

    db.cliente.push({
      id_cliente: idc,
      nom1_cliente: n1,
      nom2_cliente: $('#n2').value.trim(),
      ape1_cliente: a1,
      ape2_cliente: $('#a2').value.trim()
    });

    db.cliente_telefono.push({
      id_telefono: nextId(db.cliente_telefono, 'id_telefono', 'T'),
      id_cliente: idc,
      numero_telefono: tel
    });
  }

  // Crea la orden y sus líneas de detalle
  const ido = nextId(db.orden, 'id_orden', 'O');
  db.orden.push({ id_orden: ido, id_cliente: idc });

  Object.entries(cart).forEach(([id, n]) => {
    db.orden_detalle.push({ id_orden: ido, id_producto: id, cantidad: n });
  });

  cart = {};
  last = ido;
  save();
  render();
}

function copySql() {
  try {
    navigator.clipboard.writeText(sql());
    toast('SQL copiado');
  } catch (e) {
    const r = document.createRange();
    r.selectNode($('#sql'));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  }
}

/* =====================================================
   Vistas
   ===================================================== */
function renderNav() {
  const tabs = [
    ['tienda', 'Tienda'],
    ['carrito', 'Carrito'],
    ['ordenes', 'Órdenes'],
    ['bd', 'Base de datos']
  ];

  $('#nav').innerHTML = tabs.map(([k, l]) => `
    <button class="${view === k ? 'on' : ''}" onclick="go('${k}')">${l}${k === 'carrito' && cartCount() ? `<span class="badge">${cartCount()}</span>` : ''}</button>
  `).join('');
}

/* ---------- Tienda ---------- */
function vTienda() {
  const list = db.producto.filter(p =>
    (cat === 'ALL' || p.id_categoria === cat) &&
    p.nombre_producto.toLowerCase().includes(q.toLowerCase())
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
        <b>${esc(p.nombre_producto)}</b>
        <div class="row">
          <span class="price">${money(p.precio_actual)}</span>
          <button class="btn" onclick="add('${p.id_producto}')">Agregar</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <h2>Catálogo</h2>
    <input id="q" placeholder="Buscar productos…" value="${esc(q)}" oninput="q = this.value; keep()">

    <div class="chips">
      <button class="chip ${cat === 'ALL' ? 'on' : ''}" onclick="cat='ALL'; render()">Todas</button>
      ${chips}
    </div>

    <div class="grid">
      ${cards || '<p class="mu">Sin resultados.</p>'}
    </div>
  `;
}

/* ---------- Carrito ---------- */
function vCarrito() {
  // Confirmación tras comprar
  if (last) {
    return `
      <div class="panel">
        <h2 class="ok">✔ Orden ${last} creada</h2>
        <p>Se guardó en las tablas <code>orden</code> y <code>orden_detalle</code>.</p>
        <button class="btn" onclick="last=null; go('ordenes')">Ver órdenes</button>
        <button class="btn sec" onclick="last=null; go('tienda')">Seguir comprando</button>
      </div>
    `;
  }

  const ids = Object.keys(cart);

  // Carrito vacío
  if (!ids.length) {
    return `
      <h2>Carrito</h2>
      <div class="panel mu">Tu carrito está vacío.</div>
      <button class="btn" onclick="go('tienda')">Ir a la tienda</button>
    `;
  }

  const lines = ids.map(id => {
    const p = prod(id);
    return `
      <div class="line">
        <span style="font-size:28px">${p._e || '📦'}</span>
        <div style="flex:1">
          <b>${esc(p.nombre_producto)}</b>
          <div class="mu">${money(p.precio_actual)} c/u</div>
        </div>
        <div class="qty">
          <button onclick="setQty('${id}', -1)">−</button>
          ${cart[id]}
          <button onclick="setQty('${id}', 1)">+</button>
        </div>
        <b style="width:80px; text-align:right">${money(p.precio_actual * cart[id])}</b>
      </div>
    `;
  }).join('');

  const clientes = db.cliente.map(c =>
    `<option value="${c.id_cliente}">${esc(nom(c))}</option>`
  ).join('');

  return `
    <h2>Carrito</h2>

    <div class="panel">
      ${lines}
      <div class="row" style="margin-top:10px">
        <span>Total</span>
        <span class="price">${money(cartTotal())}</span>
      </div>
    </div>

    <div class="panel">
      <h2 style="font-size:17px">Datos del cliente</h2>

      <label>Cliente</label>
      <select id="cs" onchange="render2()">
        <option value="NEW">➕ Nuevo cliente</option>
        ${clientes}
      </select>

      <div class="form" id="nf">
        <div><label>Primer nombre *</label><input id="n1"></div>
        <div><label>Segundo nombre</label><input id="n2"></div>
        <div><label>Primer apellido *</label><input id="a1"></div>
        <div><label>Segundo apellido</label><input id="a2"></div>
        <div><label>Teléfono *</label><input id="tel" type="tel"></div>
      </div>

      <button class="btn" onclick="checkout()">Confirmar compra</button>
    </div>
  `;
}

/* ---------- Órdenes ---------- */
function vOrdenes() {
  const total = idOrden => db.orden_detalle
    .filter(d => d.id_orden === idOrden)
    .reduce((a, d) => a + prod(d.id_producto).precio_actual * d.cantidad, 0);

  const orders = [...db.orden].reverse().map(o => {
    const telefonos = db.cliente_telefono
      .filter(t => t.id_cliente === o.id_cliente)
      .map(t => t.numero_telefono)
      .join(' · ');

    const detalle = db.orden_detalle
      .filter(d => d.id_orden === o.id_orden)
      .map(d => {
        const p = prod(d.id_producto);
        return `
          <div class="line">
            <span>${p._e || ''}</span>
            <span style="flex:1">${esc(p.nombre_producto)}</span>
            <span class="mu">${d.cantidad} × ${money(p.precio_actual)}</span>
            <b>${money(d.cantidad * p.precio_actual)}</b>
          </div>
        `;
      }).join('');

    return `
      <div class="panel">
        <div class="row">
          <b>${o.id_orden}</b>
          <span class="price">${money(total(o.id_orden))}</span>
        </div>
        <div class="mu">${esc(nom(cli(o.id_cliente)))} · ${esc(telefonos)}</div>
        ${detalle}
      </div>
    `;
  }).join('');

  return `<h2>Órdenes</h2>${orders}`;
}

/* ---------- Base de datos ---------- */
const TABLAS = ['categoria', 'producto', 'cliente', 'cliente_telefono', 'orden', 'orden_detalle'];

const DDL = `CREATE TABLE categoria (
  id_categoria TEXT PRIMARY KEY,
  nombre_categoria TEXT NOT NULL
);
CREATE TABLE producto (
  id_producto TEXT PRIMARY KEY,
  nombre_producto TEXT NOT NULL,
  precio_actual NUMERIC NOT NULL,
  id_categoria TEXT REFERENCES categoria(id_categoria)
);
CREATE TABLE cliente (
  id_cliente TEXT PRIMARY KEY,
  nom1_cliente TEXT NOT NULL,
  nom2_cliente TEXT,
  ape1_cliente TEXT NOT NULL,
  ape2_cliente TEXT
);
CREATE TABLE cliente_telefono (
  id_telefono TEXT PRIMARY KEY,
  id_cliente TEXT REFERENCES cliente(id_cliente),
  numero_telefono TEXT NOT NULL
);
CREATE TABLE orden (
  id_orden TEXT PRIMARY KEY,
  id_cliente TEXT REFERENCES cliente(id_cliente)
);
CREATE TABLE orden_detalle (
  id_orden TEXT REFERENCES orden(id_orden),
  id_producto TEXT REFERENCES producto(id_producto),
  cantidad INT4 NOT NULL,
  PRIMARY KEY (id_orden, id_producto)
);
`;

// Columnas reales de una fila (ignora las que empiezan con "_")
const columnas = row => Object.keys(row).filter(k => k[0] !== '_');

function sql() {
  const val = x => typeof x === 'number'
    ? x
    : "'" + String(x).replace(/'/g, "''") + "'";

  let s = DDL + '\n';

  TABLAS.forEach(t => {
    db[t].forEach(r => {
      const k = columnas(r);
      s += `INSERT INTO ${t} (${k.join(', ')}) VALUES (${k.map(c => val(r[c])).join(', ')});\n`;
    });
    s += '\n';
  });

  return s;
}

function vBd() {
  const tablas = TABLAS.map(t => {
    const k = columnas(db[t][0] || {});
    return `
      <div class="panel">
        <b>${t}</b> <span class="mu">(${db[t].length} filas)</span>
        <div class="scroll">
          <table>
            <tr>${k.map(c => `<th>${c}</th>`).join('')}</tr>
            ${db[t].map(r => `<tr>${k.map(c => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}
          </table>
        </div>
      </div>
    `;
  }).join('');

  return `
    <h2>Base de datos</h2>

    <div class="row" style="justify-content:flex-start; margin-bottom:14px">
      <button class="btn" onclick="copySql()">Copiar SQL</button>
      <button class="btn sec"
              onclick="if (confirm('¿Restaurar datos de ejemplo?')) { db = SEED(); cart = {}; save(); render(); }">
        Restaurar ejemplo
      </button>
    </div>

    ${tablas}

    <h2>Script SQL (PostgreSQL)</h2>
    <pre id="sql">${esc(sql())}</pre>
  `;
}

/* ---------- Render principal ---------- */
function render() {
  renderNav();

  $('#app').innerHTML = {
    tienda: vTienda,
    carrito: vCarrito,
    ordenes: vOrdenes,
    bd: vBd
  }[view]();

  if (view === 'carrito' && !last && Object.keys(cart).length) {
    render2();
  }
}

render();
