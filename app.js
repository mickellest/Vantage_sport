
const supabaseUrl = 'https://kwyycebjmdgxihbtjwqy.supabase.co';
const supabaseKey = 'sb_publishable_XWP4yM1-sYMwkJN5s6_I3w_gWDq6gNr';
const sbClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ---------- Estado de la aplicación ---------- */
let db = {
  categoria: [], producto: [], cliente: [], cliente_telefono: [], orden: [], orden_detalle: []
};
let cart = {};      // { id_producto: cantidad }
let view = 'tienda';
let cat = 'ALL';
let q = '';
let last = null;    // última orden creada

// Emojis de muestra (ya que no son columnas en la BD)
const emojis = {
  'P001': '🎧', 'P002': '⌨️', 'P003': '⌚', 'P004': '💡', 'P005': '☕',
  'P006': '🍳', 'P007': '⚽', 'P008': '🧘', 'P009': '👟', 'P010': '📕',
  'P011': '📘', 'P012': '🌍'
};

async function init() {
  const app = document.querySelector('#app');
  if (app) app.innerHTML = '<h2 style="text-align:center; padding-top:40px;">Cargando base de datos...</h2>';

  const tablas = ['categoria', 'producto', 'cliente', 'cliente_telefono', 'orden', 'orden_detalle'];
  for (const t of tablas) {
    const { data } = await sbClient.from(t).select('*');
    if (data) db[t] = data;
  }

  // Asignar emojis
  db.producto.forEach(p => p._e = emojis[p.id_producto] || '📦');

  render();
}

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);

const money = n => '$' + Number(n).toFixed(2);

const esc = s => String(s).replace(/[&<>"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
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

async function checkout() {
  let idc = $('#cs').value;

  // Cliente nuevo: crea cliente y teléfono en Supabase
  if (idc === 'NEW') {
    const n1 = $('#n1').value.trim();
    const a1 = $('#a1').value.trim();
    const tel = $('#tel').value.trim();

    if (!n1 || !a1 || !tel) {
      return toast('Completa los campos obligatorios');
    }

    idc = nextId(db.cliente, 'id_cliente', 'C');
    const newCliente = { id_cliente: idc, nom1_cliente: n1, nom2_cliente: $('#n2').value.trim(), ape1_cliente: a1, ape2_cliente: $('#a2').value.trim() };

    await sbClient.from('cliente').insert([newCliente]);
    db.cliente.push(newCliente);

    const newTel = { id_telefono: nextId(db.cliente_telefono, 'id_telefono', 'T'), id_cliente: idc, numero_telefono: tel };
    await sbClient.from('cliente_telefono').insert([newTel]);
    db.cliente_telefono.push(newTel);
  }

  // Crea la orden y sus líneas de detalle en Supabase
  const ido = nextId(db.orden, 'id_orden', 'O');
  const newOrden = { id_orden: ido, id_cliente: idc };
  await sbClient.from('orden').insert([newOrden]);
  db.orden.push(newOrden);

  const detalles = Object.entries(cart).map(([id, n]) => ({ id_orden: ido, id_producto: id, cantidad: n }));
  await sbClient.from('orden_detalle').insert(detalles);
  detalles.forEach(d => db.orden_detalle.push(d));

  cart = {};
  last = ido;
  render();
}

/* =====================================================
   Vistas
   ===================================================== */
function renderNav() {
  const tabs = [
    ['tienda', 'Tienda'],
    ['carrito', 'Carrito'],
    ['ordenes', 'Órdenes']
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
  if (last) {
    return `
      <div class="panel">
        <h2 class="ok">✔ Orden ${last} creada exitosamente en Supabase</h2>
        <button class="btn" onclick="last=null; go('ordenes')">Ver órdenes</button>
        <button class="btn sec" onclick="last=null; go('tienda')">Seguir comprando</button>
      </div>
    `;
  }

  const ids = Object.keys(cart);

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

/* ---------- Render principal ---------- */
function render() {
  renderNav();

  $('#app').innerHTML = {
    tienda: vTienda,
    carrito: vCarrito,
    ordenes: vOrdenes
  }[view]();

  if (view === 'carrito' && !last && Object.keys(cart).length) {
    render2();
  }
}

// Inicializar la conexión y descargar datos antes de renderizar
init();
