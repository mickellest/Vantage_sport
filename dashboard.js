/* ==========================================================================
   VantageAnalytics — Gráficas de Ventas, Pedidos y Compras a Proveedores
   Lee datos REALES de Supabase. Muestra porcentajes (%) y datos absolutos.
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
  const fmtDOP = n => {
    if (n == null || isNaN(n)) return '—';
    const val = Math.round(Number(n));
    return '$' + new Intl.NumberFormat('en-US').format(val);
  };

  const fmtN   = n  => (n == null || isNaN(n)) ? '—' : new Intl.NumberFormat('es').format(n);
  
  function pct(part, total) {
    const p = parseFloat(part) || 0;
    const t = parseFloat(total) || 0;
    if (t <= 0) return '0.0%';
    return ((p / t) * 100).toFixed(1) + '%';
  }

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '—'; };
  const sb  = ()      => window._supabase || null;

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
    const cancIng   = cancelled.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
    const ticket    = paid.length ? totalIng / paid.length : 0;
    const rateCobro = pct(paid.length, all.length);

    /* Mejor mes */
    const byMonth = groupBy(paid, 'fecha_orden');
    let bestM = '', bestV = 0;
    Object.entries(byMonth).forEach(([m, rows]) => {
      const v = rows.reduce((s,o) => s + (parseFloat(o.total)||0), 0);
      if (v > bestV) { bestV = v; bestM = m; }
    });

    set('kpi-v-ingresos',     fmtDOP(totalIng));
    set('kpi-v-ingresos-sub', `${rateCobro} de volumen cobrado exitosamente`);
    set('kpi-v-ticket',       fmtDOP(ticket));
    set('kpi-v-ticket-sub',   `${fmtN(paid.length)} órdenes cobradas en total`);
    set('kpi-v-pagadas',      `${rateCobro} (${fmtN(paid.length)} / ${fmtN(all.length)})`);
    set('kpi-v-pagadas-sub',  `${pct(cancelled.length, all.length)} canceladas (${fmtDOP(cancIng)})`);
    set('kpi-v-mejor-mes',    bestM ? monthLabel(bestM) : '—');
    set('kpi-v-mejor-mes-val', bestV ? `${fmtDOP(bestV)} (${pct(bestV, totalIng)} del total)` : 'sin datos');

    /* Meses a mostrar */
    const months = lastNMonths(nMonths(days));

    /* Bar — ingresos mensuales con % del período */
    mkChart('chart-ventas-bar', {
      type: 'bar',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: [{
          label: 'Ingresos ($)',
          data: months.map(m => (byMonth[m]||[]).reduce((s,o) => s+(parseFloat(o.total)||0), 0)),
          backgroundColor: LIME_A,
          borderColor: LIME,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        ...baseBar,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.raw || 0;
                return `Ingresos: ${fmtDOP(val)} (${pct(val, totalIng)} del período)`;
              }
            }
          }
        },
        scales: {
          x: { grid: gridOpts },
          y: { grid: gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Donut — métodos de pago con % en labels y tooltips */
    const { data: pagos } = await client.from('pagos').select('metodo_pago, monto');
    const pagoMap = {};
    (pagos||[]).forEach(p => {
      const k = p.metodo_pago || 'Sin método';
      pagoMap[k] = (pagoMap[k]||0) + (parseFloat(p.monto)||0);
    });
    const pKeys = Object.keys(pagoMap);
    const totalPagos = Object.values(pagoMap).reduce((a, b) => a + b, 0);
    const pLabelsConPct = pKeys.map(k => `${k} (${pct(pagoMap[k], totalPagos)})`);

    mkChart('chart-ventas-metodos', {
      type: 'doughnut',
      data: {
        labels: pLabelsConPct.length ? pLabelsConPct : ['Sin datos (0%)'],
        datasets: [{
          data: pKeys.length ? pKeys.map(k=>pagoMap[k]) : [1],
          backgroundColor: PALETTE,
          borderWidth: 2,
          borderColor: '#f2f1eb'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const originalLabel = pKeys[ctx.dataIndex] || ctx.label;
                const val = ctx.raw || 0;
                return `${originalLabel}: ${fmtDOP(val)} (${pct(val, totalPagos)} del monto total)`;
              }
            }
          }
        }
      }
    });

    /* Línea acumulada con % de avance */
    const months12 = lastNMonths(12);
    const byM12    = groupBy(paid, 'fecha_orden');
    let acum = 0;
    const mesVals = months12.map(m => (byM12[m]||[]).reduce((s,o) => s+(parseFloat(o.total)||0), 0));
    const acumVals = months12.map(m => {
      acum += (byM12[m]||[]).reduce((s,o) => s+(parseFloat(o.total)||0), 0);
      return acum;
    });
    const totalAcumFinal = acumVals[acumVals.length - 1] || 1;

    mkChart('chart-ventas-linea', {
      type: 'line',
      data: {
        labels: months12.map(m => monthLabel(m)),
        datasets: [{
          label: 'Acumulado ($)',
          data: acumVals,
          borderColor: LIME, backgroundColor: LIME_A,
          tension: 0.4, pointBackgroundColor: LIME, pointRadius:4, fill:true
        }, {
          label: 'Venta del mes ($)',
          data: mesVals,
          borderColor: BLUE, backgroundColor: BLUE_A,
          tension: 0.3, pointBackgroundColor: BLUE, pointRadius:3, fill:false
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'top', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.raw || 0;
                if (ctx.datasetIndex === 0) {
                  return `Acumulado: ${fmtDOP(val)} (${pct(val, totalAcumFinal)} del total anual)`;
                }
                return `Mes: ${fmtDOP(val)} (${pct(val, totalIng)} del total período)`;
              }
            }
          }
        },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Pie — estados con % en labels y tooltips */
    const estadoMap = {};
    all.forEach(o => { estadoMap[o.estado] = (estadoMap[o.estado]||0)+1; });
    const eKeys = Object.keys(estadoMap);
    const totalEst = all.length || 1;
    const eLabelsConPct = eKeys.map(k => `${k} (${pct(estadoMap[k], totalEst)})`);

    mkChart('chart-ventas-estados', {
      type: 'pie',
      data: {
        labels: eLabelsConPct.length ? eLabelsConPct : ['Sin datos (0%)'],
        datasets: [{
          data: eKeys.length ? eKeys.map(k=>estadoMap[k]) : [1],
          backgroundColor: eKeys.map(k => ESTADO_COLOR[k]||PURPLE),
          borderWidth:2, borderColor:'#f2f1eb'
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const originalLabel = eKeys[ctx.dataIndex] || ctx.label;
                const count = ctx.raw || 0;
                return `${originalLabel}: ${fmtN(count)} órdenes (${pct(count, totalEst)} del total)`;
              }
            }
          }
        }
      }
    });

    /* Tabla detalle mensual con % de participación y cancelación */
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
        const pIngPct = pct(ing, totalIng);
        const pCancPct = pct(cRows.length, rows.length);
        return `<tr>
          <td><strong>${monthLabel(m)}</strong></td>
          <td>${fmtN(rows.length)}</td>
          <td>${fmtDOP(ing)} <small style="color:var(--lime,#d4ff3f);font-weight:700">(${pIngPct})</small></td>
          <td>${fmtDOP(pRows.length ? ing/pRows.length : 0)}</td>
          <td>${fmtN(cRows.length)} <small style="color:var(--orange,#fc6536)">(${pCancPct})</small></td>
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

    const all        = orders || [];
    const entregados = all.filter(o => o.estado === 'entregado').length;
    const cancelados = all.filter(o => o.estado === 'cancelado').length;
    const pendientes = all.filter(o => o.estado === 'pendiente').length;
    const pagados    = all.filter(o => o.estado === 'pagado').length;
    const enviados   = all.filter(o => o.estado === 'enviado').length;
    const total      = all.length;

    set('kpi-ped-total',          `${fmtN(total)}`);
    set('kpi-ped-total-sub',      `${pct(entregados, total)} completados con éxito`);
    set('kpi-ped-entregados',     `${pct(entregados, total)}`);
    set('kpi-ped-entregados-pct', `${fmtN(entregados)} de ${fmtN(total)} pedidos entregados`);
    set('kpi-ped-cancelados',     `${pct(cancelados, total)}`);
    set('kpi-ped-cancelados-pct', `${fmtN(cancelados)} pedidos cancelados`);
    set('kpi-ped-pendientes',     `${pct(pendientes, total)}`);
    set('kpi-ped-pendientes-sub', `${fmtN(pendientes)} pedidos pendientes de preparar`);

    /* Meses */
    const months = lastNMonths(nMonths(days));

    /* Stacked bar por estado con % del mes en tooltip */
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
        plugins:{
          legend:{ position:'top', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const mesIdx = ctx.dataIndex;
                const m = months[mesIdx];
                const totalMes = (byMonth[m]||[]).length;
                const val = ctx.raw || 0;
                return `${ctx.dataset.label}: ${val} pedidos (${pct(val, totalMes)} del mes)`;
              }
            }
          }
        },
        scales:{
          x:{ stacked:true, grid:gridOpts },
          y:{ stacked:true, grid:gridOpts, ticks:{ stepSize:1 } }
        }
      }
    });

    /* Donut estados con % en leyenda y tooltip */
    const estadoMap = {};
    all.forEach(o => { estadoMap[o.estado] = (estadoMap[o.estado]||0)+1; });
    const eKeys = Object.keys(estadoMap);
    const eLabelsConPct = eKeys.map(k => `${k} (${pct(estadoMap[k], total)})`);

    mkChart('chart-pedidos-estados', {
      type: 'doughnut',
      data: {
        labels: eLabelsConPct.length ? eLabelsConPct : ['Sin datos (0%)'],
        datasets: [{
          data: eKeys.length ? eKeys.map(k=>estadoMap[k]) : [1],
          backgroundColor: eKeys.map(k => ESTADO_COLOR[k]||PURPLE),
          borderWidth:2, borderColor:'#f2f1eb'
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const originalLabel = eKeys[ctx.dataIndex] || ctx.label;
                const count = ctx.raw || 0;
                return `${originalLabel}: ${fmtN(count)} pedidos (${pct(count, total)} del total)`;
              }
            }
          }
        }
      }
    });

    /* Línea — ticket promedio por mes */
    const paidOrders = all.filter(o => ['pagado','enviado','entregado'].includes(o.estado));
    const pByMonth   = groupBy(paidOrders, 'fecha_orden');
    const overallTicket = paidOrders.length ? paidOrders.reduce((s,o)=>s+(parseFloat(o.total)||0),0)/paidOrders.length : 1;

    mkChart('chart-pedidos-ticket', {
      type: 'line',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: [{
          label: 'Ticket prom. ($)',
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
        plugins:{
          legend:{ display:false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.raw || 0;
                const relPct = overallTicket > 0 ? ((val / overallTicket) * 100).toFixed(1) + '%' : '100%';
                return `Ticket: ${fmtDOP(val)} (${relPct} vs promedio general)`;
              }
            }
          }
        },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Bar — top 5 clientes por volumen de órdenes con % */
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
        plugins:{
          legend:{ display:false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const count = ctx.raw || 0;
                return `${count} pedidos (${pct(count, total)} de todas las órdenes)`;
              }
            }
          }
        },
        scales:{ x:{ grid:gridOpts }, y:{ grid:{ display:false } } }
      }
    });

    /* Tabla últimos 30 pedidos con badge de estado */
    const tbody = document.getElementById('pedidos-recent-body');
    const recent = [...all].sort((a,b) => new Date(b.fecha_orden)-new Date(a.fecha_orden)).slice(0,30);
    if (!recent.length) {
      emptyRow('pedidos-recent-body', 4, 'No hay pedidos en este período.');
    } else {
      const badgeColor = est => ESTADO_COLOR[est]||'#aaa';
      tbody.innerHTML = recent.map(o => {
        const color = badgeColor(o.estado);
        return `<tr>
          <td><strong>${o.codigo||o.id_orden}</strong></td>
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
    const recibidas = all.filter(c => c.estado === 'recibido').length;
    const totalProvRegistrados = (proveedores||[]).length || 1;

    set('kpi-c-total',           fmtDOP(totalInv));
    set('kpi-c-total-sub',       `${fmtN(all.length)} órdenes de abastecimiento`);
    set('kpi-c-ordenes',         `${fmtN(all.length)}`);
    set('kpi-c-ordenes-sub',     `${pct(recibidas, all.length)} recibidas en almacén`);
    set('kpi-c-promedio',        fmtDOP(promedio));
    set('kpi-c-promedio-sub',    `inversión media por compra`);
    set('kpi-c-proveedores',     `${fmtN(provUniq.size)} proveedores`);
    set('kpi-c-proveedores-sub', `${pct(provUniq.size, totalProvRegistrados)} del total registrado activo`);

    const months = lastNMonths(nMonths(days));

    /* Bar — compras por mes con % */
    const byMonth = groupBy(all, 'fecha_pedido');
    mkChart('chart-compras-bar', {
      type: 'bar',
      data: {
        labels: months.map(m => monthLabel(m)),
        datasets: [{
          label: 'Inversión ($)',
          data: months.map(m => (byMonth[m]||[]).reduce((s,c)=>s+(parseFloat(c.total_pedido)||0),0)),
          backgroundColor: BLUE_A,
          borderColor: BLUE,
          borderWidth: 2, borderRadius: 6
        }]
      },
      options: {
        ...baseBar,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const val = ctx.raw || 0;
                return `Inversión: ${fmtDOP(val)} (${pct(val, totalInv)} del gasto total)`;
              }
            }
          }
        },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Donut — gasto por proveedor con % en leyenda y tooltip */
    const provGasto = {};
    all.forEach(c => {
      const k = provMap[c.proveedor_id] || 'Desconocido';
      provGasto[k] = (provGasto[k]||0) + (parseFloat(c.total_pedido)||0);
    });
    const pgKeys = Object.keys(provGasto).sort((a,b) => provGasto[b]-provGasto[a]).slice(0,8);
    const pgLabelsConPct = pgKeys.map(k => `${k.slice(0, 16)} (${pct(provGasto[k], totalInv)})`);

    mkChart('chart-compras-proveedores', {
      type: 'doughnut',
      data: {
        labels: pgLabelsConPct.length ? pgLabelsConPct : ['Sin datos (0%)'],
        datasets: [{
          data: pgKeys.length ? pgKeys.map(k=>provGasto[k]) : [1],
          backgroundColor: PALETTE,
          borderWidth: 2,
          borderColor: '#f2f1eb'
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip:{
            callbacks:{
              label: ctx => {
                const originalName = pgKeys[ctx.dataIndex] || ctx.label;
                const val = ctx.raw || 0;
                return `${originalName}: ${fmtDOP(val)} (${pct(val, totalInv)} del presupuesto)`;
              }
            }
          }
        }
      }
    });

    /* Línea — compras vs ventas con ratio % */
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
            label: 'Compras ($)',
            data: months12.map(m => (cByM12[m]||[]).reduce((s,c)=>s+(parseFloat(c.total_pedido)||0),0)),
            borderColor: BLUE, backgroundColor: BLUE_A,
            tension:0.4, pointBackgroundColor:BLUE, pointRadius:4, fill:true
          },
          {
            label: 'Ventas ($)',
            data: months12.map(m => (vByM12[m]||[]).reduce((s,o)=>s+(parseFloat(o.total)||0),0)),
            borderColor: LIME, backgroundColor: LIME_A,
            tension:0.4, pointBackgroundColor:LIME, pointRadius:4, fill:true
          }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'top', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${fmtDOP(ctx.raw || 0)}`,
              afterBody: ctxList => {
                if (!ctxList || !ctxList.length) return [];
                const mesIdx = ctxList[0].dataIndex;
                const m = months12[mesIdx];
                const cVal = (cByM12[m]||[]).reduce((s,c)=>s+(parseFloat(c.total_pedido)||0),0);
                const vVal = (vByM12[m]||[]).reduce((s,o)=>s+(parseFloat(o.total)||0),0);
                if (vVal > 0) {
                  return [`Ratio Compras / Ventas: ${pct(cVal, vVal)}`];
                }
                return [];
              }
            }
          }
        },
        scales:{
          x:{ grid:gridOpts },
          y:{ grid:gridOpts, ticks:{ callback: v => fmtDOP(v) } }
        }
      }
    });

    /* Pie — estado de órdenes de compra con % */
    const estMap = {};
    all.forEach(c => { estMap[c.estado] = (estMap[c.estado]||0)+1; });
    const estKeys = Object.keys(estMap);
    const totalCompras = all.length || 1;
    const estLabelsConPct = estKeys.map(k => `${k} (${pct(estMap[k], totalCompras)})`);

    mkChart('chart-compras-estados', {
      type: 'pie',
      data: {
        labels: estLabelsConPct.length ? estLabelsConPct : ['Sin datos (0%)'],
        datasets: [{
          data: estKeys.length ? estKeys.map(k=>estMap[k]) : [1],
          backgroundColor: [YELLOW, GREEN, LIME, ORANGE, PURPLE].slice(0, Math.max(estKeys.length,1)),
          borderWidth:2, borderColor:'#f2f1eb'
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ position:'bottom', labels:{ color:'#5c655d', boxWidth:12 } },
          tooltip: {
            callbacks: {
              label: ctx => {
                const originalLabel = estKeys[ctx.dataIndex] || ctx.label;
                const count = ctx.raw || 0;
                return `${originalLabel}: ${fmtN(count)} órdenes (${pct(count, totalCompras)} del total)`;
              }
            }
          }
        }
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
        const pctGasto = pct(c.total_pedido, totalInv);
        return `<tr>
          <td><strong>#${c.orden_id}</strong></td>
          <td>${provMap[c.proveedor_id]||'—'}</td>
          <td>${localDate(c.fecha_pedido)}</td>
          <td>${fmtDOP(parseFloat(c.total_pedido)||0)} <small style="color:#4EB8FF;font-weight:700">(${pctGasto})</small></td>
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
