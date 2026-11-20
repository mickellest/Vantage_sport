/* ==========================================================================
   VantageAnalytics — Gráficas de Ventas, Pedidos y Compras a Proveedores
   Lee datos REALES de Supabase. No inserta datos.
   ========================================================================== */
(() => {
  'use strict';

  /* ── Paleta Vantage ──────────────────────────────────────────────── */
  const LIME   = '#d4ff3f';
  const ORANGE = '#fc6536';
  const BLUE   = '#4EB8FF';
  const GREEN  = '#52d68a';
  const YELLOW = '#FFD14E';
  const PURPLE = '#B87EFF';
  const INK    = '#191e1b';

  const LIME_A   = 'rgba(212,255,63,0.18)';
  const ORG_A    = 'rgba(252,101,54,0.18)';
  const BLUE_A   = 'rgba(78,184,255,0.18)';
  const GREEN_A  = 'rgba(82,214,138,0.18)';
  const YELLOW_A = 'rgba(255,209,78,0.18)';
  const PURPLE_A = 'rgba(184,126,255,0.18)';

  const PALETTE = [LIME, ORANGE, BLUE, PURPLE, GREEN, YELLOW, '#FF4EC0', '#4E8AFF'];

  /* Estado orden → color */
  const ESTADO_COLOR = {
    pendiente:  YELLOW,
    pagado:     LIME,
    enviado:    BLUE,
    entregado:  GREEN,
    cancelado:  ORANGE
  };

  /* ── Chart.js global defaults ────────────────────────────────────── */
  function applyDefaults() {
    if (!window.Chart) return;
    Chart.defaults.color       = '#6a7368';
    Chart.defaults.borderColor = 'rgba(0,0,0,0.06)';
    Chart.defaults.font.family = "'DM Sans', sans-serif";
    Chart.defaults.font.size   = 12;
  }

  /* ── Chart instance registry ─────────────────────────────────────── */
  const registry = {};
  function mkChart(id, config) {
    if (registry[id]) { registry[id].destroy(); delete registry[id]; }
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    registry[id] = new Chart(canvas, config);
    return registry[id];
  }

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const fmtDOP = n =>
    (n == null || isNaN(n)) ? '—'
      : new Intl.NumberFormat('es-DO', { style:'currency', currency:'DOP', maximumFractionDigits:0 }).format(n);

  const fmtN   = n  => (n == null || isNaN(n)) ? '—' : new Intl.NumberFormat('es').format(n);
  const fmtPct = n  => (n == null || isNaN(n)) ? '—' : n.toFixed(1) + '%';
  const set    = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '—'; };
  const sb     = ()      => window._supabase || null;

  function isoMonth(d) { return d ? String(d).slice(0,7) : null; }
  function monthLabel(ym) {
    const d = new Date(ym + '-02');
    return new Intl.DateTimeFormat('es', { month:'short', year:'2-digit' }).format(d);
  }
  function localDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
  }
  function groupBy(rows, field) {
    const m = {};
    rows.forEach(r => {
      const k = isoMonth(r[field]);
      if (!k) return;
      if (!m[k]) m[k] = [];
      m[k].push(r);
    });
    return m;
  }
  function lastNMonths(n) {
    const out = [], now = new Date();
    for (let i = n-1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    return out;
  }
  function emptyRow(id, cols, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<tr><td colspan="${cols}" class="table-placeholder">${msg}</td></tr>`;
  }
  function sinceDate(days) {
    const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
  }

  /* periodo → meses a mostrar */
  function nMonths(days) {
    if (days <= 30)  return 1;
    if (days <= 90)  return 3;
    if (days <= 180) return 6;
    return 12;
  }

  /* Period pill helper */
  function wirePills(containerId, callback) {
    const c = document.getElementById(containerId);
    if (!c || c.dataset.wired) return;
    c.dataset.wired = '1';
    c.addEventListener('click', e => {
      const btn = e.target.closest('.period-pill');
      if (!btn) return;
      c.querySelectorAll('.period-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(parseInt(btn.dataset.days, 10) || 365);
    });
  }

  /* Shared chart options */
  const gridOpts = { color:'rgba(0,0,0,0.06)' };
  const baseBar  = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend:{ display:false } },
    scales: { x:{ grid:gridOpts }, y:{ grid:gridOpts } }
  };

  /* ══════════════════════════════════════════════════════════════════
     1.  VENTAS
     ══════════════════════════════════════════════════════════════════ */
  async function loadVentas(days = 365) {
    applyDefaults();
    const client = sb(); if (!client) return;

    const { data: orders } = await client
      .from('orden')
      .select('id_orden, total, estado, fecha_orden')
      .gte('fecha_orden', sinceDate(days));

    const all       = orders || [];
    const paid      = all.filter(o => ['pagado','enviado','entregado'].includes(o.estado));
    const cancelled = all.filter(o => o.estado === 'cancelado');
    const totalIng  = paid.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
    const ticket    = paid.length ? totalIng / paid.length : 0;

    /* Mejor mes */
    const byMonth = groupBy(paid, 'fecha_orden');
    let bestM = '', bestV = 0;
    Object.entries(byMonth).forEach(([m, rows]) => {
      const v = rows.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
      if (v > bestV) { bestV = v; bestM = m; }
    });

    set('kpi-v-ingresos',     fmtDOP(totalIng));
    set('kpi-v-ticket',       fmtDOP(ticket));
    set('kpi-v-pagadas',      fmtN(paid.length));
    set('kpi-v-mejor-mes',    bestM ? monthLabel(bestM) : '—');
    set('kpi-v-mejor-mes-val', bestV ? fmtDOP(bestV) : 'sin datos');

    /* Meses a mostrar */
    const months = lastNMonths(nMonths(days));

    /* Bar — ingresos mensuales */
    mkChart('chart-ventas-bar', {
      type: 'bar',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: [{
          label: 'Ingresos (DOP)',
          data: months.map(m => (byMonth[m]||[]).reduce((s,o) => s+(parseFloat(o.total)||0), 0)),
          backgroundColor: LIME_A,
          borderColor: LIME,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        ...baseBar,
        scales: {
          x: { grid: gridOpts },
          y: { grid: gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Donut — métodos de pago */
    const { data: pagos } = await client.from('pagos').select('metodo_pago, monto');
    const pagoMap = {};
    (pagos||[]).forEach(p => {
      const k = p.metodo_pago || 'Sin método';
      pagoMap[k] = (pagoMap[k]||0) + (parseFloat(p.monto)||0);
    });
    const pLabels = Object.keys(pagoMap);
    mkChart('chart-ventas-metodos', {
      type: 'doughnut',
      data: {
        labels: pLabels.length ? pLabels : ['Sin datos'],
        datasets: [{ data: pLabels.length ? pLabels.map(k=>pagoMap[k]) : [1],
          backgroundColor: PALETTE, borderWidth:2, borderColor:'#f2f1eb' }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip:{ callbacks:{ label: ctx => `${ctx.label}: ${fmtDOP(ctx.raw)}` } }
        }
      }
    });

    /* Línea acumulada */
    const months12 = lastNMonths(12);
    const byM12    = groupBy(paid, 'fecha_orden');
    let acum = 0;
    mkChart('chart-ventas-linea', {
      type: 'line',
      data: {
        labels: months12.map(m => monthLabel(m)),
        datasets: [{
          label: 'Acumulado (DOP)',
          data: months12.map(m => {
            acum += (byM12[m]||[]).reduce((s,o) => s+(parseFloat(o.total)||0), 0);
            return acum;
          }),
          borderColor: LIME, backgroundColor: LIME_A,
          tension: 0.4, pointBackgroundColor: LIME, pointRadius:4, fill:true
        }, {
          label: 'Mes actual (DOP)',
          data: months12.map(m => (byM12[m]||[]).reduce((s,o) => s+(parseFloat(o.total)||0), 0)),
          borderColor: BLUE, backgroundColor: BLUE_A,
          tension: 0.3, pointBackgroundColor: BLUE, pointRadius:3, fill:false
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ color:'#5c655d', boxWidth:12 } } },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Pie — estados */
    const estadoMap = {};
    all.forEach(o => { estadoMap[o.estado] = (estadoMap[o.estado]||0)+1; });
    const eKeys = Object.keys(estadoMap);
    mkChart('chart-ventas-estados', {
      type: 'pie',
      data: {
        labels: eKeys.length ? eKeys : ['Sin datos'],
        datasets: [{ data: eKeys.length ? eKeys.map(k=>estadoMap[k]) : [1],
          backgroundColor: eKeys.map(k => ESTADO_COLOR[k]||PURPLE),
          borderWidth:2, borderColor:'#f2f1eb' }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } } }
      }
    });

    /* Tabla detalle mensual */
    const allByMonth = groupBy(all, 'fecha_orden');
    const sortedAll  = Object.keys(allByMonth).sort().reverse();
    const tbody = document.getElementById('ventas-mensual-body');
    if (!sortedAll.length) {
      emptyRow('ventas-mensual-body', 5, 'No hay datos en este período.');
    } else {
      tbody.innerHTML = sortedAll.map(m => {
        const rows  = allByMonth[m];
        const pRows = rows.filter(o => ['pagado','enviado','entregado'].includes(o.estado));
        const cRows = rows.filter(o => o.estado === 'cancelado');
        const ing   = pRows.reduce((s,o) => s+(parseFloat(o.total)||0), 0);
        return `<tr>
          <td>${monthLabel(m)}</td>
          <td>${fmtN(rows.length)}</td>
          <td>${fmtDOP(ing)}</td>
          <td>${fmtDOP(pRows.length ? ing/pRows.length : 0)}</td>
          <td>${fmtN(cRows.length)}</td>
        </tr>`;
      }).join('');
    }

    wirePills('ventas-period-pills', d => loadVentas(d));
  }

  /* ══════════════════════════════════════════════════════════════════
     2.  PEDIDOS
     ══════════════════════════════════════════════════════════════════ */
  async function loadPedidos(days = 365) {
    applyDefaults();
    const client = sb(); if (!client) return;

    const [{ data: orders }, { data: clientes }] = await Promise.all([
      client.from('orden').select('id_orden, codigo, total, estado, fecha_orden, id_cliente').gte('fecha_orden', sinceDate(days)),
      client.from('clientes').select('cliente_id, nombre_completo, email').limit(500)
    ]);

    const all       = orders || [];
    const entregados = all.filter(o => o.estado === 'entregado').length;
    const cancelados = all.filter(o => o.estado === 'cancelado').length;
    const pendientes = all.filter(o => o.estado === 'pendiente').length;
    const total      = all.length;

    set('kpi-ped-total',          fmtN(total));
    set('kpi-ped-entregados',     fmtN(entregados));
    set('kpi-ped-entregados-pct', total ? fmtPct(entregados/total*100)+' completados' : '—');
    set('kpi-ped-cancelados',     fmtN(cancelados));
    set('kpi-ped-cancelados-pct', total ? fmtPct(cancelados/total*100)+' del total'  : '—');
    set('kpi-ped-pendientes',     fmtN(pendientes));

    /* Meses */
    const months = lastNMonths(nMonths(days));

    /* Stacked bar por estado */
    const estados = ['pendiente','pagado','enviado','entregado','cancelado'];
    const byMonth = groupBy(all, 'fecha_orden');

    mkChart('chart-pedidos-bar', {
      type: 'bar',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: estados.map(est => ({
          label: est.charAt(0).toUpperCase() + est.slice(1),
          data: months.map(m => (byMonth[m]||[]).filter(o => o.estado === est).length),
          backgroundColor: ESTADO_COLOR[est] + 'CC',
          borderColor: ESTADO_COLOR[est],
          borderWidth: 1,
          borderRadius: 3
        }))
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ color:'#5c655d', boxWidth:12 } } },
        scales:{
          x:{ stacked:true, grid:gridOpts },
          y:{ stacked:true, grid:gridOpts, ticks:{ stepSize:1 } }
        }
      }
    });

    /* Donut estados */
    const estadoMap = {};
    all.forEach(o => { estadoMap[o.estado] = (estadoMap[o.estado]||0)+1; });
    const eKeys = Object.keys(estadoMap);
    mkChart('chart-pedidos-estados', {
      type: 'doughnut',
      data: {
        labels: eKeys.length ? eKeys : ['Sin datos'],
        datasets: [{ data: eKeys.length ? eKeys.map(k=>estadoMap[k]) : [1],
          backgroundColor: eKeys.map(k => ESTADO_COLOR[k]||PURPLE),
          borderWidth:2, borderColor:'#f2f1eb' }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } } }
      }
    });

    /* Línea — ticket promedio por mes */
    const paidOrders = all.filter(o => ['pagado','enviado','entregado'].includes(o.estado));
    const pByMonth   = groupBy(paidOrders, 'fecha_orden');
    mkChart('chart-pedidos-ticket', {
      type: 'line',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: [{
          label: 'Ticket prom. (DOP)',
          data: months.map(m => {
            const rows = pByMonth[m]||[];
            const sum  = rows.reduce((s,o) => s+(parseFloat(o.total)||0), 0);
            return rows.length ? sum/rows.length : 0;
          }),
          borderColor: ORANGE, backgroundColor: ORG_A,
          tension:0.4, pointBackgroundColor:ORANGE, pointRadius:4, fill:true
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Bar — top 5 clientes por volumen de órdenes */
    const clientMap = {};
    (clientes||[]).forEach(c => {
      clientMap[c.cliente_id] = c.nombre_completo || c.email || `#${c.cliente_id}`;
    });
    const clientOrders = {};
    all.forEach(o => {
      if (!o.id_cliente) return;
      clientOrders[o.id_cliente] = (clientOrders[o.id_cliente]||0) + 1;
    });
    const top5 = Object.entries(clientOrders)
      .sort((a,b) => b[1]-a[1]).slice(0,5);

    mkChart('chart-pedidos-clientes', {
      type: 'bar',
      data: {
        labels: top5.map(([id]) => (clientMap[id]||`#${id}`).slice(0,18)),
        datasets: [{
          label: 'Pedidos',
          data: top5.map(([,n]) => n),
          backgroundColor: PALETTE.slice(0,5).map(c => c+'CC'),
          borderColor: PALETTE.slice(0,5),
          borderWidth: 2, borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{ x:{ grid:gridOpts }, y:{ grid:{ display:false } } }
      }
    });

    /* Tabla últimos 30 pedidos */
    const tbody = document.getElementById('pedidos-recent-body');
    const recent = [...all].sort((a,b) => new Date(b.fecha_orden)-new Date(a.fecha_orden)).slice(0,30);
    if (!recent.length) {
      emptyRow('pedidos-recent-body', 4, 'No hay pedidos en este período.');
    } else {
      const badgeColor = est => ESTADO_COLOR[est]||'#aaa';
      tbody.innerHTML = recent.map(o => {
        const color = badgeColor(o.estado);
        return `<tr>
          <td>${o.codigo||o.id_orden}</td>
          <td>${localDate(o.fecha_orden)}</td>
          <td>${fmtDOP(parseFloat(o.total)||0)}</td>
          <td><span class="envio-badge" style="background:${color}22;color:${color};border-color:${color}44">${o.estado}</span></td>
        </tr>`;
      }).join('');
    }

    wirePills('pedidos-period-pills', d => loadPedidos(d));
  }

  /* ══════════════════════════════════════════════════════════════════
     3.  COMPRAS A PROVEEDORES
     ══════════════════════════════════════════════════════════════════ */
  async function loadCompras(days = 365) {
    applyDefaults();
    const client = sb(); if (!client) return;

    const [{ data: compras }, { data: proveedores }, { data: ventas }] = await Promise.all([
      client.from('ordenes_suministro').select('orden_id, proveedor_id, fecha_pedido, total_pedido, estado').gte('fecha_pedido', sinceDate(days)),
      client.from('proveedores').select('proveedor_id, nombre_empresa').limit(200),
      client.from('orden').select('total, estado, fecha_orden').gte('fecha_orden', sinceDate(days))
    ]);

    const all       = compras   || [];
    const provMap   = {};
    (proveedores||[]).forEach(p => { provMap[p.proveedor_id] = p.nombre_empresa || `#${p.proveedor_id}`; });

    const totalInv  = all.reduce((s,c) => s+(parseFloat(c.total_pedido)||0), 0);
    const promedio  = all.length ? totalInv / all.length : 0;
    const provUniq  = new Set(all.map(c => c.proveedor_id).filter(Boolean));

    set('kpi-c-total',       fmtDOP(totalInv));
    set('kpi-c-ordenes',     fmtN(all.length));
    set('kpi-c-promedio',    fmtDOP(promedio));
    set('kpi-c-proveedores', fmtN(provUniq.size));

    const months = lastNMonths(nMonths(days));

    /* Bar — compras por mes */
    const byMonth = groupBy(all, 'fecha_pedido');
    mkChart('chart-compras-bar', {
      type: 'bar',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: [{
          label: 'Inversión (DOP)',
          data: months.map(m => (byMonth[m]||[]).reduce((s,c)=>s+(parseFloat(c.total_pedido)||0),0)),
          backgroundColor: BLUE_A,
          borderColor: BLUE,
          borderWidth: 2, borderRadius: 6
        }]
      },
      options: {
        ...baseBar,
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Donut — gasto por proveedor */
    const provGasto = {};
    all.forEach(c => {
      const k = provMap[c.proveedor_id] || 'Desconocido';
      provGasto[k] = (provGasto[k]||0) + (parseFloat(c.total_pedido)||0);
    });
    const pgKeys = Object.keys(provGasto).sort((a,b) => provGasto[b]-provGasto[a]).slice(0,8);
    mkChart('chart-compras-proveedores', {
      type: 'doughnut',
      data: {
        labels: pgKeys.length ? pgKeys : ['Sin datos'],
        datasets: [{ data: pgKeys.length ? pgKeys.map(k=>provGasto[k]) : [1],
          backgroundColor: PALETTE, borderWidth:2, borderColor:'#f2f1eb' }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip:{ callbacks:{ label: ctx => `${ctx.label}: ${fmtDOP(ctx.raw)}` } }
        }
      }
    });

    /* Línea — compras vs ventas por mes (12 meses) */
    const months12  = lastNMonths(12);
    const cByM12    = groupBy(all, 'fecha_pedido');
    const vAll      = (ventas||[]).filter(o => ['pagado','enviado','entregado'].includes(o.estado));
    const vByM12    = groupBy(vAll, 'fecha_orden');
    mkChart('chart-compras-vs-ventas', {
      type: 'line',
      data: {
        labels: months12.map(m => monthLabel(m)),
        datasets: [
          {
            label: 'Compras (DOP)',
            data: months12.map(m => (cByM12[m]||[]).reduce((s,c)=>s+(parseFloat(c.total_pedido)||0),0)),
            borderColor: BLUE, backgroundColor: BLUE_A,
            tension:0.4, pointBackgroundColor:BLUE, pointRadius:4, fill:true
          },
          {
            label: 'Ventas (DOP)',
            data: months12.map(m => (vByM12[m]||[]).reduce((s,o)=>s+(parseFloat(o.total)||0),0)),
            borderColor: LIME, backgroundColor: LIME_A,
            tension:0.4, pointBackgroundColor:LIME, pointRadius:4, fill:true
          }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'top', labels:{ color:'#5c655d', boxWidth:12 } } },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Pie — estado de órdenes de compra */
    const estMap = {};
    all.forEach(c => { estMap[c.estado] = (estMap[c.estado]||0)+1; });
    const estKeys = Object.keys(estMap);
    mkChart('chart-compras-estados', {
      type: 'pie',
      data: {
        labels: estKeys.length ? estKeys : ['Sin datos'],
        datasets: [{ data: estKeys.length ? estKeys.map(k=>estMap[k]) : [1],
          backgroundColor: [YELLOW, GREEN, LIME, ORANGE, PURPLE].slice(0, Math.max(estKeys.length,1)),
          borderWidth:2, borderColor:'#f2f1eb' }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } } }
      }
    });

    /* Tabla órdenes recientes */
    const recent = [...all].sort((a,b) => new Date(b.fecha_pedido)-new Date(a.fecha_pedido)).slice(0,20);
    const tbody = document.getElementById('compras-recent-body');
    if (!recent.length) {
      emptyRow('compras-recent-body', 5, 'No hay órdenes de compra en este período.');
    } else {
      tbody.innerHTML = recent.map(c => {
        const color = { pendiente:YELLOW, recibido:GREEN, cancelado:ORANGE }[c.estado] || PURPLE;
        return `<tr>
          <td>#${c.orden_id}</td>
          <td>${provMap[c.proveedor_id]||'—'}</td>
          <td>${localDate(c.fecha_pedido)}</td>
          <td>${fmtDOP(parseFloat(c.total_pedido)||0)}</td>
          <td><span class="envio-badge" style="background:${color}22;color:${color};border-color:${color}44">${c.estado||'—'}</span></td>
        </tr>`;
      }).join('');
    }

    wirePills('compras-period-pills', d => loadCompras(d));
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  window.VantageAnalytics = {
    loadVentas,
    loadPedidos,
    loadCompras
  };

})();
