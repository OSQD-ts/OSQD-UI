/*
 * demo-kit.js: shared helpers for the sample sites in examples/.
 *
 * Plain JavaScript that emits the same markup and classes as the kit's React components, so a
 * page with no build step can show charts, date pickers, a log viewer and the rest. Interactive
 * pieces that exist as custom elements (dialog, tabs, dropdown, toasts, command palette, sortable
 * table, copy, theme select, tag input) come from assets/osqd-ui-elements.js instead.
 *
 * Everything is exposed on window.OQX.
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const toast = (title, color = "success", message) => (window.OQ?.toast ? window.OQ.toast({ title, message, color }) : console.log(title));
  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };
  const findAll = (text, q) => {
    if (!q) return [];
    const hay = text.toLowerCase(), n = q.toLowerCase(), out = [];
    for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + n.length)) out.push(i);
    return out;
  };
  const mark = (text, q, cls, current = -1) => {
    const hits = findAll(text, q);
    if (!hits.length) return esc(text);
    let out = "", at = 0;
    hits.forEach((s, i) => { out += esc(text.slice(at, s)) + `<mark class="${cls}${i === current ? " is-current" : ""}">${esc(text.slice(s, s + q.length))}</mark>`; at = s + q.length; });
    return out + esc(text.slice(at));
  };
  const ICONS = {
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m6 15 6-6 6 6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  };
  const icon = (name, cls = "oq-icon") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;

  /* ================= Charts (lifted from preview-charts.html; markup = src/react/charts) ================= */
  /* ---------- Chart maths: the same as src/react/charts/scale.ts ---------- */
  function niceTicks(min, max, count = 5) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return { ticks: [0, 1], min: 0, max: 1 };
    if (min > max) [min, max] = [max, min];
    if (min === max) { if (min > 0) min = 0; else if (max < 0) max = 0; else max = 1; }
    const raw = (max - min) / Math.max(1, count);
    const mag = 10 ** Math.floor(Math.log10(raw));
    const norm = raw / mag;
    const step = (norm >= Math.sqrt(50) ? 10 : norm >= Math.sqrt(10) ? 5 : norm >= Math.sqrt(2) ? 2 : 1) * mag;
    const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
    const digits = Math.max(0, -Math.floor(Math.log10(step)) + 1);
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(digits)));
    return { ticks, min: ticks[0], max: ticks[ticks.length - 1] };
  }
  const lin = ([d0, d1], [r0, r1]) => (v) => r0 + (v - d0) * (d1 === d0 ? 0 : (r1 - r0) / (d1 - d0));
  const band = (n, [r0, r1], pad = 0.28) => { const step = n ? (r1 - r0) / n : 0, w = step * (1 - pad); return { step, width: w, start: (i) => r0 + i * step + (step - w) / 2 }; };
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format;
  const full = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format;
  const colorOf = (s, i) => s.color ?? `var(--oq-series-${(i % 8) + 1})`;
  const axisW = (labels) => Math.max(28, Math.ceil(Math.max(...labels.map((l) => String(l).length), 1) * 6.5) + 10);
  function barPath(vertical, cross, t, from, to) {
    const r = Math.min(4, t / 2, Math.abs(to - from)), d = to < from ? -1 : 1;
    if (vertical) { const x = cross, w = t; return `M${x},${from} L${x},${to - d * r} Q${x},${to} ${x + r},${to} L${x + w - r},${to} Q${x + w},${to} ${x + w},${to - d * r} L${x + w},${from} Z`; }
    const y = cross, h = t; return `M${from},${y} L${to - d * r},${y} Q${to},${y} ${to},${y + r} L${to},${y + h - r} Q${to},${y + h} ${to - d * r},${y + h} L${from},${y + h} Z`;
  }

  /* ---------- Shared chart pieces (markup identical to the React components) ---------- */
  const legendHTML = (items, hidden) => `<div class="oq-chart__legend">${items.map((it) =>
    `<button type="button" class="oq-chart__legend-item" aria-pressed="${!hidden.has(it.key)}" data-legend="${esc(it.key)}"><span class="oq-chart__swatch" style="background:${it.color}"></span>${esc(it.label)}${it.value !== undefined ? `<span class="oq-chart__legend-value">${esc(it.value)}</span>` : ""}</button>`).join("")}</div>`;
  const tooltipHTML = (tip, width) => {
    if (!tip) return "";
    const flip = tip.flip ?? tip.x > width / 2;
    return `<div class="oq-chart__tooltip" role="presentation" style="left:${tip.x}px;top:${tip.y}px;transform:translate(${flip ? "calc(-100% - 12px)" : "12px"},-50%)"><div class="oq-chart__tooltip-title">${esc(tip.title)}</div>${tip.rows.map((r) =>
      `<div class="oq-chart__tooltip-row"><span class="oq-chart__swatch" style="background:${r.color}"></span><span class="oq-chart__tooltip-label">${esc(r.label)}</span><span class="oq-chart__tooltip-value">${esc(r.value)}</span></div>`).join("")}</div>`;
  };
  const tableHTML = (caption, cols, rows) => `<details class="oq-chart__table"><summary>View as table</summary><div class="oq-table-wrap"><table class="oq-table oq-table--dense"><caption class="oq-sr-only">${esc(caption)}</caption><thead><tr>${cols.map((c, i) => `<th scope="col"${i ? ' class="oq-num"' : ""}>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td class="oq-num">${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join("")}</tr>`).join("")}</tbody></table></div></details>`;

  /**
   * Mounts a chart: the plot redraws on hover and resize, the legend on toggle, the table once.
   * `renderPlot(state, width)` returns { svg, tip } and gets `state.hidden` / `state.active`.
   */
  function mount(el, { kind, label, legend, table, renderPlot, onPointer }) {
    const state = { hidden: new Set(), active: null };
    el.className = `oq-chart oq-chart--${kind}`;
    el.innerHTML = `<div class="oq-chart__plot"${onPointer?.keys ? ' tabindex="0"' : ""}></div>${legend ? '<div data-legend-host></div>' : ""}${table}`;
    const plot = el.firstElementChild;
    let width = el.clientWidth || 600;
    const draw = () => {
      const { svg, tip, w } = renderPlot(state, width);
      plot.innerHTML = svg + tooltipHTML(tip, w ?? width);
      $("svg", plot)?.setAttribute("aria-label", label);
    };
    const renderLegend = () => { const host = $("[data-legend-host]", el); if (host) host.innerHTML = legend(state); };
    draw(); renderLegend();
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-legend]"); if (!b) return;
      const k = b.dataset.legend;
      state.hidden.has(k) ? state.hidden.delete(k) : state.hidden.add(k);
      draw(); renderLegend();
    });
    plot.addEventListener("mouseleave", () => { state.active = null; draw(); });
    if (onPointer) {
      plot.addEventListener("mousemove", (e) => { const a = onPointer.move(e, plot, state, width); if (a !== state.active) { state.active = a; draw(); } });
      if (onPointer.keys) {
        plot.addEventListener("keydown", (e) => { const a = onPointer.keys(e, state); if (a !== undefined) { e.preventDefault(); state.active = a; draw(); } });
        plot.addEventListener("blur", () => { state.active = null; draw(); });
      }
    }
    new ResizeObserver(() => { const w = Math.round(el.clientWidth); if (w && w !== width) { width = w; draw(); } }).observe(el);
    return { redraw: (next) => { if (next) Object.assign(state, next); draw(); renderLegend(); }, state };
  }

  /* ---------- Bar chart ---------- */
  function barChart(el, { data, x, series, label, height = 240, stacked = false, orientation = "vertical", fmt = full }) {
    const vertical = orientation === "vertical";
    const cats = data.map((r) => r[x]);
    const legend = series.length > 1 ? (st) => legendHTML(series.map((s, i) => ({ key: s.key, label: s.label, color: colorOf(s, i) })), st.hidden) : null;
    let geo = null;
    const renderPlot = (st, width) => {
      const shown = series.map((s, i) => ({ ...s, fill: colorOf(s, i) })).filter((s) => !st.hidden.has(s.key));
      let lo = 0, hi = 0;
      for (const r of data) {
        if (stacked) { const sum = shown.reduce((a, s) => a + Math.max(0, r[s.key]), 0); hi = Math.max(hi, sum); }
        else for (const s of shown) { hi = Math.max(hi, r[s.key]); lo = Math.min(lo, r[s.key]); }
      }
      const t = niceTicks(lo, hi, vertical ? Math.max(3, Math.round(height / 50)) : Math.max(3, Math.round(width / 110)));
      const tl = t.ticks.map(compact);
      const m = vertical ? { top: 10, right: 12, bottom: 26, left: axisW(tl) } : { top: 6, right: 16, bottom: 24, left: Math.min(160, axisW(cats)) };
      const pw = Math.max(10, width - m.left - m.right), ph = Math.max(10, height - m.top - m.bottom);
      const val = vertical ? lin([t.min, t.max], [m.top + ph, m.top]) : lin([t.min, t.max], [m.left, m.left + pw]);
      const b = vertical ? band(data.length, [m.left, m.left + pw]) : band(data.length, [m.top, m.top + ph]);
      geo = { vertical, b, m, pw, ph };
      const every = vertical ? Math.max(1, Math.ceil((Math.max(...cats.map((c) => String(c).length)) * 6.5 + 8) / b.step)) : 1;
      let svg = `<svg class="oq-chart__svg" width="${width}" height="${height}" role="img"><g class="oq-chart__grid" aria-hidden="true">`;
      t.ticks.forEach((v, i) => {
        svg += vertical
          ? `<line x1="${m.left}" x2="${m.left + pw}" y1="${val(v)}" y2="${val(v)}"${v === 0 ? " data-zero" : ""}/><text class="oq-chart__tick" x="${m.left - 8}" y="${val(v)}" dy="0.32em" text-anchor="end">${tl[i]}</text>`
          : `<line y1="${m.top}" y2="${m.top + ph}" x1="${val(v)}" x2="${val(v)}"${v === 0 ? " data-zero" : ""}/><text class="oq-chart__tick" y="${m.top + ph + 16}" x="${val(v)}" text-anchor="middle">${tl[i]}</text>`;
      });
      svg += "</g>";
      data.forEach((r, i) => {
        const start = b.start(i);
        const gw = stacked ? b.width : (b.width - 2 * (shown.length - 1)) / Math.max(1, shown.length);
        const hov = vertical ? `x="${start - (b.step - b.width) / 2}" y="${m.top}" width="${b.step}" height="${ph}"` : `y="${start - (b.step - b.width) / 2}" x="${m.left}" height="${b.step}" width="${pw}"`;
        svg += `<g class="oq-chart__band"${st.active === i ? " data-active" : ""}><rect class="oq-chart__hover" ${hov}/>`;
        let pos = 0;
        shown.forEach((s, j) => {
          const v = r[s.key];
          let from, to, cross;
          if (stacked) { from = val(pos); to = val(pos + v); if (pos !== 0) from += (to > from ? 1 : -1) * 2; pos += v; cross = start; }
          else { from = val(0); to = val(v); cross = start + j * (gw + 2); }
          if (v && Math.abs(to - from) >= 0.5) svg += `<path class="oq-chart__bar" d="${barPath(vertical, cross, gw, from, to)}" style="fill:${s.fill}"/>`;
        });
        if (i % every === 0) svg += vertical
          ? `<text class="oq-chart__tick" x="${start + b.width / 2}" y="${m.top + ph + 17}" text-anchor="middle">${esc(cats[i])}</text>`
          : `<text class="oq-chart__tick" x="${m.left - 8}" y="${start + b.width / 2}" dy="0.32em" text-anchor="end">${esc(cats[i])}</text>`;
        svg += "</g>";
      });
      svg += "</svg>";
      let tip = null;
      if (st.active !== null) {
        const r = data[st.active], along = b.start(st.active) + b.width / 2;
        const vals = shown.map((s) => r[s.key]);
        const end = stacked ? vals.reduce((a, v) => a + Math.max(0, v), 0) : Math.max(0, ...vals);
        const flip = along > width / 2;
        const edge = flip ? b.start(st.active) - (b.step - b.width) / 2 : b.start(st.active) + b.width + (b.step - b.width) / 2;
        tip = { flip: vertical ? flip : undefined, x: vertical ? edge : Math.min(width - 8, val(end)), y: vertical ? m.top + 16 : along, title: cats[st.active], rows: shown.map((s) => ({ label: s.label, color: s.fill, value: fmt(r[s.key]) })) };
      }
      return { svg, tip };
    };
    return mount(el, {
      kind: "bar", label, legend,
      table: tableHTML(label, [x, ...series.map((s) => s.label)], data.map((r) => [r[x], ...series.map((s) => fmt(r[s.key]))])),
      renderPlot,
      onPointer: {
        move: (e, plot) => {
          if (!geo) return null;
          const box = plot.getBoundingClientRect();
          const p = geo.vertical ? e.clientX - box.left - geo.m.left : e.clientY - box.top - geo.m.top;
          const i = Math.floor(p / geo.b.step);
          return i >= 0 && i < data.length ? i : null;
        },
      },
    });
  }

  /* ---------- Line / area ---------- */
  function xyChart(el, { mode = "line", data, x, series, label, height = 240, stacked = false, fmt = full, points }) {
    const cats = data.map((r) => r[x]);
    const n = data.length;
    const legend = series.length > 1 ? (st) => legendHTML(series.map((s, i) => ({ key: s.key, label: s.label, color: colorOf(s, i) })), st.hidden) : null;
    let geo = null;
    const renderPlot = (st, width) => {
      const shown = series.map((s, i) => ({ ...s, fill: colorOf(s, i) })).filter((s) => !st.hidden.has(s.key));
      const stack = mode === "area" && stacked;
      const tops = shown.map(() => []), bots = shown.map(() => []);
      for (let i = 0; i < n; i++) { let acc = 0; shown.forEach((s, j) => { bots[j][i] = stack ? acc : 0; acc = stack ? acc + data[i][s.key] : data[i][s.key]; tops[j][i] = acc; }); }
      const flat = tops.flat();
      const t = niceTicks(Math.min(0, ...flat), Math.max(0, ...flat), Math.max(3, Math.round(height / 50)));
      const tl = t.ticks.map(compact);
      const m = { top: 10, right: 14, bottom: 26, left: axisW(tl) };
      const pw = Math.max(10, width - m.left - m.right), ph = Math.max(10, height - m.top - m.bottom);
      const xs = (i) => m.left + (n > 1 ? (i / (n - 1)) * pw : pw / 2);
      const ys = lin([t.min, t.max], [m.top + ph, m.top]);
      geo = { m, pw };
      const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
      const every = Math.max(1, Math.ceil((Math.max(...cats.map((c) => String(c).length)) * 6.5 + 10) / (n > 1 ? pw / (n - 1) : pw)));
      let svg = `<svg class="oq-chart__svg" width="${width}" height="${height}" role="img"><g class="oq-chart__grid" aria-hidden="true">`;
      t.ticks.forEach((v, i) => { svg += `<line x1="${m.left}" x2="${m.left + pw}" y1="${ys(v)}" y2="${ys(v)}"${v === 0 ? " data-zero" : ""}/><text class="oq-chart__tick" x="${m.left - 8}" y="${ys(v)}" dy="0.32em" text-anchor="end">${tl[i]}</text>`; });
      cats.forEach((c, i) => { if (i % every === 0) svg += `<text class="oq-chart__tick" x="${xs(i)}" y="${m.top + ph + 17}" text-anchor="middle">${esc(c)}</text>`; });
      svg += "</g>";
      if (mode === "area") shown.forEach((s, j) => {
        const back = bots[j].map((v, i) => [i, v]).reverse().map(([i, v]) => `L${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
        svg += `<path class="oq-chart__area${stack ? " oq-chart__area--stacked" : ""}" d="${path(tops[j])} ${back} Z" style="fill:${s.fill}"/>`;
      });
      shown.forEach((s, j) => { svg += `<path class="oq-chart__line" d="${path(tops[j])}" style="stroke:${s.fill}"/>`; });
      if (points ?? n <= 24) shown.forEach((s, j) => tops[j].forEach((v, i) => { svg += `<circle class="oq-chart__point" cx="${xs(i)}" cy="${ys(v)}" r="2.5" style="fill:${s.fill}"/>`; }));
      let tip = null;
      if (st.active !== null) {
        const a = st.active;
        svg += `<g class="oq-chart__focus" aria-hidden="true"><line class="oq-chart__crosshair" x1="${xs(a)}" x2="${xs(a)}" y1="${m.top}" y2="${m.top + ph}"/>${shown.map((s, j) => `<circle class="oq-chart__dot" cx="${xs(a)}" cy="${ys(tops[j][a])}" r="4.5" style="fill:${s.fill}"/>`).join("")}</g>`;
        tip = { x: xs(a), y: m.top + ph / 2, title: cats[a], rows: shown.map((s) => ({ label: s.label, color: s.fill, value: fmt(data[a][s.key]) })) };
      }
      return { svg: svg + "</svg>", tip };
    };
    return mount(el, {
      kind: mode, label, legend,
      table: tableHTML(label, [x, ...series.map((s) => s.label)], data.map((r) => [r[x], ...series.map((s) => fmt(r[s.key]))])),
      renderPlot,
      onPointer: {
        move: (e, plot) => {
          if (!geo || n < 1) return null;
          const px = e.clientX - plot.getBoundingClientRect().left;
          return Math.max(0, Math.min(n - 1, Math.round(((px - geo.m.left) / geo.pw) * (n - 1))));
        },
        keys: (e, st) => {
          if (e.key === "ArrowRight") return Math.min(n - 1, (st.active ?? -1) + 1);
          if (e.key === "ArrowLeft") return Math.max(0, (st.active ?? n) - 1);
          if (e.key === "Escape") return null;
          return undefined;
        },
      },
    });
  }

  /* ================= Calendar and pickers (lifted from preview-charts.html; markup = src/react/DatePicker.tsx) ================= */
  /* ---------- Calendar + pickers: the same markup as src/react/DatePicker.tsx ---------- */
  const DAY = 86400000;
  const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const eod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
  const addM = (d, n) => { const f = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes()); f.setDate(Math.min(d.getDate(), new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate())); return f; };
  const same = (a, b) => !!a && !!b && sod(a).getTime() === sod(b).getTime();
  const sow = (d, ws = 1) => sod(addD(d, -((d.getDay() - ws + 7) % 7)));
  const matrix = (y, m, ws = 1) => { const s = sow(new Date(y, m, 1), ws); return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => new Date(s.getFullYear(), s.getMonth(), s.getDate() + w * 7 + i))); };
  const norm = (a, b) => (sod(a) <= sod(b) ? { from: a, to: b } : { from: b, to: a });
  const rpos = (d, from, to) => {
    if (!from || !to) return same(d, from) ? "single" : null;
    const { from: a, to: b } = norm(from, to), x = sod(d).getTime();
    if (same(a, b) && same(d, a)) return "single";
    if (x === sod(a).getTime()) return "start";
    if (x === sod(b).getTime()) return "end";
    return x > sod(a).getTime() && x < sod(b).getTime() ? "middle" : null;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const timeOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const setT = (d, hm) => { const [h, m] = hm.split(":").map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0); };
  const titleF = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const fullF = new Intl.DateTimeFormat("en-US", { dateStyle: "full" });
  const wd = (style) => Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat("en-US", { weekday: style }).format(new Date(2024, 0, 8 + i)));
  const chevL = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  const chevR = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const calIcon = '<svg class="oq-icon oq-datepicker__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

  /**
   * A calendar in `host`. opts: { months, selected, range, min, max, isDisabled, onSelect, onEscape, autoFocus }.
   * Keyboard per the WAI-ARIA date grid.
   */
  function calendar(host, opts) {
    const st = { month: new Date((opts.selected ?? opts.range?.from ?? new Date()).getFullYear(), (opts.selected ?? opts.range?.from ?? new Date()).getMonth() - (opts.startOffset ?? 0), 1), focus: sod(opts.selected ?? opts.range?.from ?? new Date()), hover: null, keyboard: !!opts.autoFocus };
    const months = opts.months ?? 1, today = new Date();
    const disabled = (d) => (opts.min && sod(d) < sod(opts.min)) || (opts.max && sod(d) > sod(opts.max)) || (opts.isDisabled ? opts.isDisabled(d) : false);
    const render = () => {
      const shown = Array.from({ length: months }, (_, i) => addM(st.month, i));
      const first = shown[0], last = shown[shown.length - 1];
      const fm = new Date(st.focus.getFullYear(), st.focus.getMonth(), 1);
      if (fm < first) st.month = fm; else if (fm > last) st.month = addM(fm, -(months - 1));
      const vis = Array.from({ length: months }, (_, i) => addM(st.month, i));
      const range = opts.range, rto = range ? (range.to ?? st.hover) : null;
      const short = wd("short"), long = wd("long");
      let h = `<div class="oq-calendar${months === 2 ? " oq-calendar--double" : ""}"><div class="oq-calendar__header"><button type="button" class="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" aria-label="Previous month" data-step="-1">${chevL}</button>`;
      h += vis.map((m) => `<div class="oq-calendar__title" aria-live="polite">${titleF.format(m)}</div>`).join("");
      h += `<button type="button" class="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" aria-label="Next month" data-step="1">${chevR}</button></div><div class="oq-calendar__months">`;
      for (const m of vis) {
        h += `<table class="oq-calendar__grid" role="grid" aria-label="${titleF.format(m)}"><thead><tr>${short.map((w, i) => `<th scope="col" class="oq-calendar__weekday" abbr="${long[i]}">${w}</th>`).join("")}</tr></thead><tbody>`;
        for (const week of matrix(m.getFullYear(), m.getMonth())) {
          h += "<tr>";
          for (const d of week) {
            const out = d.getMonth() !== m.getMonth();
            if (out && months === 2) { h += "<td></td>"; continue; }
            const pos = range ? rpos(d, range.from, rto) : null;
            const sel = range ? pos !== null && pos !== "middle" : same(d, opts.selected);
            const foc = same(d, st.focus) && !out;
            const attrs = [foc && 'data-focus="true"', same(d, today) && 'data-today="true" aria-current="date"', out && 'data-outside="true"', sel && 'data-selected="true"', pos && `data-range="${pos}"`, range && !range.to && pos && 'data-preview="true"', disabled(d) && "disabled"].filter(Boolean).join(" ");
            h += `<td role="gridcell" aria-selected="${sel || pos === "middle"}"><button type="button" class="oq-calendar__day" tabindex="${foc ? 0 : -1}" data-date="${d.getTime()}" aria-label="${fullF.format(d)}" ${attrs}>${d.getDate()}</button></td>`;
          }
          h += "</tr>";
        }
        h += "</tbody></table>";
      }
      host.innerHTML = h + "</div></div>";
      if (st.keyboard) $('button[data-focus="true"]', host)?.focus();
    };
    host.addEventListener("click", (e) => {
      const s = e.target.closest("[data-step]");
      if (s) { const n = Number(s.dataset.step); st.month = addM(st.month, n); st.focus = addM(st.focus, n); st.keyboard = false; render(); return; }
      const b = e.target.closest("[data-date]");
      if (b && !b.disabled) { const d = new Date(Number(b.dataset.date)); st.focus = d; opts.onSelect(d); }
    });
    host.addEventListener("mouseover", (e) => {
      if (!opts.range || opts.range.to || !opts.range.from) return;
      const b = e.target.closest("[data-date]"); const d = b ? new Date(Number(b.dataset.date)) : null;
      if (!same(d, st.hover)) { st.hover = d; render(); }
    });
    host.addEventListener("keydown", (e) => {
      const k = e.key, f = st.focus;
      const map = { ArrowLeft: () => addD(f, -1), ArrowRight: () => addD(f, 1), ArrowUp: () => addD(f, -7), ArrowDown: () => addD(f, 7), PageUp: () => addM(f, e.shiftKey ? -12 : -1), PageDown: () => addM(f, e.shiftKey ? 12 : 1), Home: () => sow(f), End: () => addD(sow(f), 6) };
      if (map[k]) { e.preventDefault(); st.focus = map[k](); st.keyboard = true; if (opts.range && opts.range.from && !opts.range.to) st.hover = st.focus; render(); }
      else if ((k === "Enter" || k === " ") && e.target.closest("[data-date]")) { e.preventDefault(); if (!disabled(f)) opts.onSelect(f); }
      else if (k === "Escape" && opts.onEscape) { e.preventDefault(); opts.onEscape(); }
    });
    render();
    return { render, st, set: (o) => { Object.assign(opts, o); render(); } };
  }

  /** Popover plumbing shared by both pickers: outside click and Escape close it. */
  function pickerShell(host, { range, placeholder }) {
    host.className = `oq-datepicker${range ? " oq-rangepicker" : ""}`;
    host.innerHTML = `<button type="button" class="oq-input oq-datepicker__trigger" aria-haspopup="dialog" aria-expanded="false">${calIcon}<span class="oq-datepicker__placeholder">${placeholder}</span></button>`;
    const trigger = host.firstElementChild;
    let panel = null;
    const close = (refocus = true) => { panel?.remove(); panel = null; trigger.setAttribute("aria-expanded", "false"); if (refocus) trigger.focus(); };
    document.addEventListener("mousedown", (e) => { if (panel && !host.contains(e.target)) close(false); });
    const open = (build) => { close(false); panel = document.createElement("div"); panel.className = "oq-datepicker__panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", range ? "Choose date range" : "Choose date"); host.append(panel); trigger.setAttribute("aria-expanded", "true"); build(panel); };
    const show = (text) => { const span = trigger.lastElementChild; span.className = text ? "oq-datepicker__value" : "oq-datepicker__placeholder"; span.textContent = text || placeholder; };
    return { trigger, open, close, show, isOpen: () => !!panel };
  }

  function datePicker(host, { value = null, withTime = false, min, max, isDisabled, placeholder = "Select date" } = {}) {
    const f = new Intl.DateTimeFormat("en-US", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
    const p = pickerShell(host, { placeholder });
    const set = (v) => { value = v; p.show(v ? f.format(v) : ""); };
    set(value);
    p.trigger.addEventListener("click", () => {
      if (p.isOpen()) return p.close(false);
      p.open((panel) => {
        const calHost = document.createElement("div"); panel.append(calHost);
        const cal = calendar(calHost, { selected: value, min, max, isDisabled, autoFocus: true, onEscape: () => p.close(),
          onSelect: (d) => { set(withTime ? setT(d, value ? timeOf(value) : "09:00") : sod(d)); cal.set({ selected: value }); if (!withTime) p.close(); } });
        panel.insertAdjacentHTML("beforeend", `<div class="oq-datepicker__footer">${withTime ? `<input type="time" class="oq-input oq-sm oq-datepicker__time" aria-label="Time" value="${value ? timeOf(value) : ""}">` : ""}<span class="oq-spacer"></span><button type="button" class="oq-btn oq-btn--ghost oq-neutral oq-sm" data-act="clear">Clear</button><button type="button" class="oq-btn oq-btn--ghost oq-sm" data-act="today">Today</button>${withTime ? '<button type="button" class="oq-btn oq-sm" data-act="done">Done</button>' : ""}</div>`);
        $("input[type=time]", panel)?.addEventListener("change", (e) => set(setT(value ?? sod(new Date()), e.target.value)));
        panel.addEventListener("click", (e) => {
          const a = e.target.closest("[data-act]")?.dataset.act;
          if (a === "clear") { set(null); p.close(); }
          if (a === "today") { set(withTime ? setT(new Date(), timeOf(new Date())) : sod(new Date())); p.close(); }
          if (a === "done") p.close();
        });
      });
    });
    return { get: () => value };
  }

  const presets = [
    { key: "24h", label: "Last 24 hours", range: (now) => ({ from: new Date(now.getTime() - DAY), to: now }) },
    { key: "7d", label: "Last 7 days", range: (now) => ({ from: sod(addD(now, -6)), to: eod(now) }) },
    { key: "30d", label: "Last 30 days", range: (now) => ({ from: sod(addD(now, -29)), to: eod(now) }) },
    { key: "month", label: "This month", range: (now) => ({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: eod(now) }) },
  ];

  function rangePicker(host, { value = null, withTime = false, preset = null, onChange = () => {}, placeholder = "Select range" } = {}) {
    const f = new Intl.DateTimeFormat("en-US", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
    const fmtR = (r) => (f.formatRange ? f.formatRange(r.from, r.to) : `${f.format(r.from)} – ${f.format(r.to)}`);
    const p = pickerShell(host, { range: true, placeholder });
    const show = () => p.show(preset ? presets.find((x) => x.key === preset).label : value ? fmtR(value) : "");
    const commit = (r, key = null) => { value = r; preset = key; show(); onChange(r, key); p.close(); };
    show();
    p.trigger.addEventListener("click", () => {
      if (p.isOpen()) return p.close(false);
      const draft = { from: value?.from ?? null, to: value?.to ?? null };
      p.open((panel) => {
        panel.innerHTML = `<div class="oq-rangepicker__body"><div class="oq-datepicker__presets" role="listbox" aria-label="Quick ranges">${presets.map((x) => `<button type="button" role="option" class="oq-datepicker__preset" data-preset="${x.key}" aria-selected="${preset === x.key}">${x.label}</button>`).join("")}<button type="button" role="option" class="oq-datepicker__preset" data-preset="" aria-selected="${!preset}">Custom</button></div><div data-cal></div></div><div class="oq-datepicker__footer"><span class="oq-small oq-muted oq-rangepicker__summary"></span><span data-times class="oq-row oq-gap-1"></span><span class="oq-spacer"></span><button type="button" class="oq-btn oq-btn--ghost oq-neutral oq-sm" data-act="cancel">Cancel</button>${withTime ? '<button type="button" class="oq-btn oq-sm" data-act="apply" disabled>Apply</button>' : ""}</div>`;
        const summary = () => {
          $(".oq-rangepicker__summary", panel).textContent = draft.from && draft.to ? fmtR(norm(draft.from, draft.to)) : draft.from ? "Pick the end date" : "Pick the start date";
          if (withTime) {
            const ready = draft.from && draft.to;
            $("[data-times]", panel).innerHTML = ready ? `<input type="time" class="oq-input oq-sm oq-datepicker__time" aria-label="Start time" data-t="from" value="${timeOf(draft.from)}"><span class="oq-faint">–</span><input type="time" class="oq-input oq-sm oq-datepicker__time" aria-label="End time" data-t="to" value="${timeOf(draft.to)}">` : "";
            $("[data-act=apply]", panel).disabled = !ready;
          }
        };
        const cal = calendar($("[data-cal]", panel), { months: 2, range: draft, startOffset: 0, autoFocus: true, onEscape: () => p.close(),
          onSelect: (d) => {
            if (!draft.from || draft.to) { draft.from = d; draft.to = null; preset = null; $$("[data-preset]", panel).forEach((x) => x.setAttribute("aria-selected", String(!x.dataset.preset))); }
            else { const n = norm(draft.from, d); draft.from = sod(n.from); draft.to = eod(n.to); if (!withTime) return commit({ from: draft.from, to: draft.to }); }
            cal.set({ range: draft }); summary();
          } });
        if (value) { cal.st.month = addM(new Date(value.to.getFullYear(), value.to.getMonth(), 1), -1); cal.render(); }
        else { cal.st.month = addM(new Date(new Date().getFullYear(), new Date().getMonth(), 1), -1); cal.render(); }
        summary();
        panel.addEventListener("change", (e) => { const t = e.target.dataset.t; if (t) { draft[t] = setT(draft[t], e.target.value); summary(); } });
        panel.addEventListener("click", (e) => {
          const pr = e.target.closest("[data-preset]");
          if (pr) { if (pr.dataset.preset) { const x = presets.find((q) => q.key === pr.dataset.preset); commit(x.range(new Date()), x.key); } else { preset = null; $$("[data-preset]", panel).forEach((b) => b.setAttribute("aria-selected", String(b === pr))); } return; }
          const a = e.target.closest("[data-act]")?.dataset.act;
          if (a === "cancel") p.close();
          if (a === "apply" && draft.from && draft.to) commit(norm(draft.from, draft.to));
        });
      });
    });
    return { get: () => value };
  }

  /* ================= JSON inspector (markup = src/react/data/JsonInspector.tsx) ================= */
  /** jsonInspector(host, value, { maxHeight, depth }) → { set(value) } */
  function jsonInspector(host, value, { maxHeight = 420, depth = 1 } = {}) {
    host.innerHTML = `
      <div class="oq-json">
        <div class="oq-json__toolbar">
          <div class="oq-input-group oq-json__search"><span class="oq-addon oq-addon--plain">${icon("search", "oq-icon oq-sm")}</span><input class="oq-input oq-sm" type="search" placeholder="Filter keys and values" aria-label="Filter JSON" data-q></div>
          <span class="oq-spacer"></span>
          <div class="oq-segmented" role="group" aria-label="Expand to depth"><button data-d="1">1</button><button data-d="2">2</button><button data-d="99">All</button></div>
          <button class="oq-btn oq-btn--ghost oq-neutral oq-sm" data-d="0">Collapse</button>
        </div>
        <ul class="oq-json__tree" role="tree" aria-label="JSON" style="max-height:${maxHeight}px"></ul>
      </div>`;
    const tree = $(".oq-json__tree", host);
    const type = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
    const path = (segs) => "$" + segs.map((s) => (typeof s === "number" ? `[${s}]` : /^[A-Za-z_$][\w$]*$/.test(s) ? `.${s}` : `[${JSON.stringify(s)}]`)).join("");
    const kids = (v) => (Array.isArray(v) ? v.map((x, i) => [i, x]) : v && typeof v === "object" ? Object.entries(v) : []);
    const prev = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));
    let expanded = new Set(), q = "", focus = 0, rows = [];
    const expandTo = (d) => {
      expanded = new Set(["$"]);
      const walk = (v, segs, k) => { const t = type(v); if (k >= d || (t !== "object" && t !== "array")) return; expanded.add(path(segs)); kids(v).forEach(([key, c]) => walk(c, [...segs, key], k + 1)); };
      walk(value, [], -1);
    };
    const hit = (k, v) => (k !== null && String(k).toLowerCase().includes(q)) || (type(v) !== "object" && type(v) !== "array" && prev(v).toLowerCase().includes(q));
    function build() {
      rows = [];
      let keep = null;
      if (q) {
        keep = new Set();
        const walk = (v, segs, k) => { let any = hit(k, v); kids(v).forEach(([kk, c]) => { if (walk(c, [...segs, kk], kk)) any = true; }); if (any) keep.add(path(segs)); return any; };
        walk(value, [], null);
      }
      const visit = (v, segs, k, d) => {
        const id = path(segs);
        if (keep && !keep.has(id)) return;
        const t = type(v);
        if (d >= 0) rows.push({ id, k, v, t, depth: d });
        if ((keep || expanded.has(id)) && (t === "object" || t === "array")) kids(v).forEach(([kk, c]) => visit(c, [...segs, kk], kk, d + 1));
      };
      visit(value, [], null, -1);
    }
    function render() {
      build();
      focus = Math.min(focus, Math.max(0, rows.length - 1));
      tree.innerHTML = rows.length ? rows.map((n, i) => {
        const size = kids(n.v).length, cont = (n.t === "object" || n.t === "array") && size > 0, open = q || expanded.has(n.id);
        const val = n.t === "object" || n.t === "array"
          ? `<span class="oq-json__meta"><span class="oq-json__brace">${open && size ? (n.t === "array" ? "[" : "{") : n.t === "array" ? "[ ]" : "{ }"}</span>${size} ${n.t === "array" ? (size === 1 ? "item" : "items") : size === 1 ? "key" : "keys"}</span>`
          : `<span class="oq-json__value is-${n.t}">${mark(prev(n.v), q, "oq-json__match")}</span>`;
        return `<li role="treeitem" aria-level="${n.depth + 1}" ${cont ? `aria-expanded="${!!open}"` : ""} tabindex="${i === focus ? 0 : -1}" data-i="${i}" class="oq-json__row${q && hit(n.k, n.v) ? " is-hit" : ""}" style="padding-left: calc(${n.depth} * 16px + 6px)">` +
          `<span class="oq-json__twisty" aria-hidden="true">${cont ? '<svg class="oq-icon" style="width:12px;height:12px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>' : ""}</span>` +
          `<span class="oq-json__key${typeof n.k === "number" ? " is-index" : ""}">${mark(String(n.k), q, "oq-json__match")}</span><span class="oq-json__colon">:</span>${val}` +
          `<span class="oq-json__actions"><button class="oq-json__action" tabindex="-1" data-act="path">Path</button><button class="oq-json__action" tabindex="-1" data-act="value">Copy</button></span></li>`;
      }).join("") : `<li class="oq-json__empty">Nothing matches</li>`;
    }
    const copy = async (kind, n, btn) => {
      await copyText(kind === "path" ? n.id : typeof n.v === "string" ? n.v : JSON.stringify(n.v, null, 2));
      if (btn) { btn.textContent = "Copied"; setTimeout(() => (btn.textContent = kind === "path" ? "Path" : "Copy"), 1200); }
      else toast(kind === "path" ? `Copied ${n.id}` : "Copied value");
    };
    const focusRow = (i) => { focus = Math.max(0, Math.min(rows.length - 1, i)); render(); tree.querySelector(`[data-i="${focus}"]`)?.focus(); };
    const toggle = (n, open) => { if (open ?? !expanded.has(n.id)) expanded.add(n.id); else expanded.delete(n.id); };
    tree.addEventListener("click", (e) => {
      const li = e.target.closest("[data-i]"); if (!li) return;
      const n = rows[+li.dataset.i], act = e.target.closest("[data-act]");
      if (act) return copy(act.dataset.act, n, act);
      focus = +li.dataset.i;
      if (!q && kids(n.v).length) toggle(n);
      render(); tree.querySelector(`[data-i="${focus}"]`)?.focus();
    });
    tree.addEventListener("keydown", (e) => {
      const n = rows[focus]; if (!n) return;
      const cont = kids(n.v).length > 0 && (n.t === "object" || n.t === "array"), open = q || expanded.has(n.id);
      if (e.key === "ArrowDown") focusRow(focus + 1);
      else if (e.key === "ArrowUp") focusRow(focus - 1);
      else if (e.key === "Home") focusRow(0);
      else if (e.key === "End") focusRow(rows.length - 1);
      else if (e.key === "ArrowRight") { if (cont && !open) { toggle(n, true); focusRow(focus); } else if (cont) focusRow(focus + 1); }
      else if (e.key === "ArrowLeft") { if (cont && open && !q) { toggle(n, false); focusRow(focus); } else { for (let i = focus - 1; i >= 0; i--) if (rows[i].depth < n.depth) { focusRow(i); break; } } }
      else if (e.key === "Enter" || e.key === " ") { if (cont && !q) { toggle(n); focusRow(focus); } }
      else if (e.key === "c") copy("value", n);
      else if (e.key === "p") copy("path", n);
      else return;
      e.preventDefault();
    });
    tree.addEventListener("focusin", (e) => { const li = e.target.closest("[data-i]"); if (li) focus = +li.dataset.i; });
    $("[data-q]", host).addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); render(); });
    host.addEventListener("click", (e) => { const b = e.target.closest("button[data-d]"); if (!b) return; expandTo(+b.dataset.d); render(); });
    expandTo(depth); render();
    return { set: (v) => { value = v; q = ""; $("[data-q]", host).value = ""; focus = 0; expandTo(depth); render(); } };
  }

  /* ================= Log viewer (markup = src/react/data/LogViewer.tsx) ================= */
  const pad2 = (n, w = 2) => String(n).padStart(w, "0");
  const logTime = (t) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad2(d.getMilliseconds(), 3)}`; };
  /**
   * logViewer(host, { lines, height, onSelect(line), filter(line), stacked }) → { push(newLines), refilter(), select(i), setPaused(bool) }
   * Lines are { t, level, source, msg }. Clicking a line selects it and calls onSelect.
   * `stacked` is a media query: while it matches, each line takes two rows (time, level and source
   * over the message), still virtualised, so a phone shows whole messages without wrap mode.
   */
  function logViewer(host, { lines = [], height = 360, onSelect = () => {}, filter = () => true, max = 20000, stacked = null } = {}) {
    const levels = ["debug", "info", "warn", "error", "fatal"];
    const stack = stacked ? matchMedia(stacked) : null;
    let LH = stack?.matches ? 46 : 22;
    const H = height;
    // `active` is an index into `shown`; `picked` is the line itself, so the selection survives `shown` being rebuilt.
    let follow = true, wrap = false, query = "", matchI = 0, active = -1, picked = null, unseen = 0, scrollTop = 0, programmatic = false, shown = [], matches = [];
    const on = new Set(levels);
    host.innerHTML = `
      <div class="oq-log">
        <div class="oq-log__toolbar">
          <div class="oq-input-group oq-log__search">
            <input class="oq-input oq-sm" type="search" placeholder="Find in results…" aria-label="Find in log" data-q>
            <span class="oq-addon oq-addon--plain oq-mono" data-n></span>
            <button class="oq-btn oq-btn--ghost oq-neutral oq-sm" aria-label="Previous match" data-prev>${icon("chevronUp", "oq-icon oq-sm")}</button>
            <button class="oq-btn oq-btn--ghost oq-neutral oq-sm" aria-label="Next match" data-next>${icon("chevronDown", "oq-icon oq-sm")}</button>
          </div>
          <div class="oq-log__levels" role="group" aria-label="Levels" data-levels></div>
          <span class="oq-spacer"></span>
          <button class="oq-btn oq-btn--ghost oq-danger oq-sm" data-err>Next error</button>
          <label class="oq-check oq-small"><input type="checkbox" role="switch" class="oq-switch" data-wrap> Wrap</label>
          <label class="oq-check oq-small"><input type="checkbox" role="switch" class="oq-switch" data-follow checked> Follow</label>
        </div>
        <div class="oq-log__frame">
          <div class="oq-log__viewport" role="log" tabindex="0" style="height:${H}px"><div style="position:relative" data-inner><div data-rows></div></div></div>
        </div>
      </div>`;
    const log = $(".oq-log", host), vp = $(".oq-log__viewport", host), inner = $("[data-inner]", host), rowsEl = $("[data-rows]", host), frame = $(".oq-log__frame", host);
    log.classList.toggle("sx-log-stacked", LH > 22);
    stack?.addEventListener("change", () => { LH = stack.matches ? 46 : 22; log.classList.toggle("sx-log-stacked", stack.matches); paint(); if (follow) toBottom(); });
    const lineHtml = (l, i) => {
      const occ = matches.length && matches[matchI] && matches[matchI][0] === i ? matches[matchI][1] : -1;
      return `<div class="oq-log__line${i === active ? " is-active" : ""}" data-level="${l.level}" data-line="${i}"${wrap ? "" : ` style="height:${LH}px"`}>` +
        `<span class="oq-log__time">${logTime(l.t)}</span><span class="oq-log__level">${l.level}</span><span class="oq-log__source">${esc(l.source)}</span>` +
        `<span class="oq-log__msg">${mark(l.msg, query, "oq-log__match", occ)}</span><button class="oq-log__copy" data-copy="${i}">Copy</button></div>`;
    };
    function recompute() {
      shown = lines.filter((l) => on.has(l.level) && filter(l));
      active = picked ? shown.indexOf(picked) : -1;
      matches = [];
      if (query) shown.forEach((l, i) => findAll(l.msg, query).forEach((_, k) => matches.push([i, k])));
      if (matchI >= matches.length) matchI = Math.max(0, matches.length - 1);
      const counts = Object.fromEntries(levels.map((lv) => [lv, 0]));
      lines.forEach((l) => { if (filter(l)) counts[l.level]++; });
      $("[data-levels]", host).innerHTML = levels.map((lv) => `<button class="oq-chip oq-sm oq-log__chip" data-level="${lv}" aria-pressed="${on.has(lv)}">${lv} <span class="oq-log__count">${counts[lv].toLocaleString("en-US")}</span></button>`).join("");
      $("[data-n]", host).textContent = query ? `${matches.length ? matchI + 1 : 0}/${matches.length}` : "";
    }
    function paint() {
      if (!shown.length) { inner.style.height = ""; rowsEl.style.transform = ""; rowsEl.innerHTML = `<div class="oq-log__empty">No lines match.</div>`; return; }
      if (wrap) { inner.style.height = ""; rowsEl.style.transform = ""; rowsEl.innerHTML = shown.map(lineHtml).join(""); return; }
      const total = shown.length * LH, first = Math.floor(Math.min(scrollTop, Math.max(0, total - H)) / LH);
      const start = Math.max(0, first - 12), end = Math.min(shown.length, first + Math.ceil(H / LH) + 13);
      inner.style.height = `${total}px`;
      rowsEl.style.transform = `translateY(${start * LH}px)`;
      let out = ""; for (let i = start; i < end; i++) out += lineHtml(shown[i], i);
      rowsEl.innerHTML = out;
    }
    const pill = () => {
      let p = $(".oq-log__pill", frame);
      if (!follow && unseen > 0) {
        if (!p) { p = document.createElement("button"); p.className = "oq-log__pill"; p.onclick = resume; frame.append(p); }
        p.innerHTML = `${unseen.toLocaleString("en-US")} new line${unseen === 1 ? "" : "s"} <svg class="oq-icon oq-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>`;
      } else p?.remove();
    };
    const toBottom = () => { programmatic = true; vp.scrollTop = vp.scrollHeight; scrollTop = vp.scrollTop; };
    const resume = () => { follow = true; unseen = 0; $("[data-follow]", host).checked = true; paint(); toBottom(); paint(); pill(); };
    const goLine = (i) => {
      active = i;
      picked = shown[i] ?? null;
      if (wrap) { paint(); $(`[data-line="${i}"]`, rowsEl)?.scrollIntoView({ block: "center" }); return; }
      const t = i * LH;
      if (t < vp.scrollTop || t + LH > vp.scrollTop + H) { programmatic = true; vp.scrollTop = Math.max(0, t - H / 2); scrollTop = vp.scrollTop; }
      paint();
    };
    const stopFollow = () => { follow = false; $("[data-follow]", host).checked = false; };
    vp.addEventListener("scroll", () => {
      scrollTop = vp.scrollTop;
      if (!wrap) paint();
      if (programmatic) { programmatic = false; return; }
      const atBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 4;
      if (atBottom && !follow) resume();
      else if (!atBottom && follow) { stopFollow(); pill(); }
    });
    $("[data-q]", host).addEventListener("input", (e) => { query = e.target.value; matchI = 0; recompute(); if (matches.length) { stopFollow(); goLine(matches[0][0]); } else paint(); });
    const step = (d) => { if (!matches.length) return; stopFollow(); matchI = (matchI + d + matches.length) % matches.length; recompute(); goLine(matches[matchI][0]); };
    $("[data-q]", host).addEventListener("keydown", (e) => { if (e.key === "Enter") step(e.shiftKey ? -1 : 1); });
    $("[data-prev]", host).onclick = () => step(-1);
    $("[data-next]", host).onclick = () => step(1);
    $("[data-levels]", host).addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (!b) return; on.has(b.dataset.level) ? on.delete(b.dataset.level) : on.add(b.dataset.level); recompute(); paint(); if (follow) toBottom(); });
    $("[data-err]", host).onclick = () => {
      const isErr = (l) => l.level === "error" || l.level === "fatal";
      let i = shown.findIndex((l, k) => k > active && isErr(l));
      if (i === -1) i = shown.findIndex(isErr);
      if (i !== -1) { stopFollow(); goLine(i); onSelect(shown[i]); }
    };
    $("[data-wrap]", host).onchange = (e) => { wrap = e.target.checked; log.classList.toggle("oq-log--wrap", wrap); paint(); if (follow) toBottom(); };
    $("[data-follow]", host).onchange = (e) => (e.target.checked ? resume() : (stopFollow(), pill()));
    rowsEl.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-copy]");
      if (b) {
        const l = shown[+b.dataset.copy];
        await copyText(`${logTime(l.t)} ${l.level.toUpperCase()} [${l.source}] ${l.msg}`);
        b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200);
        return;
      }
      const row = e.target.closest("[data-line]"); if (!row) return;
      stopFollow(); pill();
      active = +row.dataset.line; picked = shown[active]; paint(); onSelect(picked);
    });
    recompute(); paint(); toBottom(); paint();
    return {
      push(newLines) {
        lines.push(...newLines);
        if (lines.length > max) lines.splice(0, lines.length - max);
        recompute();
        if (follow) { paint(); toBottom(); paint(); }
        else { unseen += newLines.filter((l) => on.has(l.level) && filter(l)).length; paint(); pill(); }
      },
      refilter() { recompute(); paint(); if (follow) toBottom(); },
      get shown() { return shown; },
    };
  }

  /* ================= Notification bell (markup = src/react/layout/Notifications.tsx) ================= */
  /** notifications(root, notes) — root is .oq-notify with [data-bell], [data-count], .oq-notify__panel inside. */
  function notifications(root, notes, { allHref = "#" } = {}) {
    const btn = $("[data-bell]", root), count = $("[data-count]", root), panel = $(".oq-notify__panel", root);
    const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const dayLabel = (t) => { const days = Math.round((sod(Date.now()) - sod(t)) / 86400000); return days === 0 ? "Today" : days === 1 ? "Yesterday" : new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
    const ago = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 45 ? "now" : s < 3600 ? `${Math.round(s / 60)} min` : s < 86400 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} d`; };
    const render = () => {
      const unread = notes.filter((n) => !n.read).length;
      const head = `<div class="oq-notify__header"><h2 class="oq-notify__title">Notifications</h2><button type="button" class="oq-btn oq-btn--ghost oq-sm" data-all ${unread ? "" : "disabled"}>Mark all read</button></div>`;
      if (!notes.length) panel.innerHTML = `${head}<div class="oq-empty">${icon("bell")}<div class="oq-empty__title">You're all caught up</div><div class="oq-small">New notifications will show up here.</div></div>`;
      else {
        let body = "", last = "";
        for (const n of [...notes].sort((a, b) => b.time - a.time)) {
          const label = dayLabel(n.time);
          if (label !== last) { body += `<li class="oq-notify__group oq-overline" role="presentation">${label}</li>`; last = label; }
          body += `<li class="oq-notify__item ${n.read ? "" : "is-unread"} oq-${n.color ?? "primary"}"><span class="oq-notify__mark" aria-hidden="true"></span>` +
            `<div class="oq-notify__body">${n.read ? "" : '<span class="oq-sr-only">Unread: </span>'}<span class="oq-notify__item-title">${esc(n.title)}</span>${n.body ? `<span class="oq-notify__text">${esc(n.body)}</span>` : ""}<time class="oq-notify__time">${ago(n.time)}</time></div>` +
            `<div class="oq-notify__actions">${n.read ? "" : `<button type="button" class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral oq-sm" data-read="${n.id}" aria-label="Mark as read">${icon("check")}</button>`}<button type="button" class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral oq-sm" data-dismiss="${n.id}" aria-label="Dismiss">${icon("close")}</button></div></li>`;
        }
        panel.innerHTML = `${head}<ul class="oq-notify__list">${body}</ul><div class="oq-notify__footer"><a href="${allHref}">View all notifications</a></div>`;
      }
      count.hidden = !unread; count.textContent = unread > 99 ? "99+" : unread;
      btn.setAttribute("aria-label", unread ? `Notifications, ${unread} unread` : "Notifications");
    };
    panel.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      e.stopPropagation();
      if (t.dataset.all !== undefined) notes = notes.map((n) => ({ ...n, read: true }));
      if (t.dataset.read) notes = notes.map((n) => (n.id === t.dataset.read ? { ...n, read: true } : n));
      if (t.dataset.dismiss) notes = notes.filter((n) => n.id !== t.dataset.dismiss);
      render();
    });
    const set = (open) => { panel.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => set(panel.hidden));
    document.addEventListener("pointerdown", (e) => { if (!root.contains(e.target)) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { set(false); btn.focus(); } });
    render();
    return { add(n) { notes = [{ id: `n${Date.now()}`, time: Date.now(), ...n }, ...notes]; render(); }, toggle: () => set(panel.hidden) };
  }
  /** The bell markup, to drop into an app bar. */
  const bellHtml = () => `<div class="oq-notify"><span class="oq-badge-anchor"><button type="button" class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral" data-bell aria-expanded="false" aria-haspopup="dialog" aria-label="Notifications">${icon("bell")}</button><span class="oq-badge oq-danger" data-count aria-hidden="true" hidden></span></span><div class="oq-notify__panel" role="dialog" aria-label="Notifications" hidden></div></div>`;

  /* ================= Context menu (markup = src/react/layout/ContextMenu.tsx) ================= */
  /**
   * contextMenu(container, targetSelector, { items: [{ act, label, danger, disabled, hint }|"-"], title(target), onAction(act, target) })
   * Opens on right-click, Shift+F10, the Menu key and a long press (touch) over a target inside
   * container, or from script with open(target). On a phone it rises as an action sheet.
   */
  function contextMenu(container, selector, { items, title, onAction }) {
    const menu = document.createElement("div");
    menu.className = "oq-menu oq-context-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;
    document.body.append(menu);
    let current = null, back = null;
    const render = (target) => {
      menu.innerHTML = (title ? `<div class="oq-menu__label oq-overline">${esc(title(target))}</div>` : "") + items.map((it) => it === "-" ? '<div class="oq-menu__sep" role="separator"></div>' :
        `<button type="button" class="oq-menu__item${it.danger ? " oq-danger" : ""}" role="menuitem" tabindex="-1" data-act="${esc(it.act)}"${(typeof it.disabled === "function" ? it.disabled(target) : it.disabled) ? " disabled" : ""}>${esc(it.label)}${it.hint ? `<span class="oq-menu__hint">${esc(it.hint)}</span>` : ""}</button>`).join("");
    };
    const close = () => { if (menu.hidden) return; menu.hidden = true; scrim.classList.remove("is-open"); current?.removeAttribute("data-menu-open"); back?.focus?.({ preventScroll: true }); current = null; };
    const phone = matchMedia("(max-width: 640px)");
    const scrim = document.createElement("div");
    scrim.className = "sx-scrim";
    document.body.append(scrim);
    const open = (target, x, y) => {
      if (x === undefined) { const r = target.getBoundingClientRect(); x = r.left + 16; y = r.top + Math.min(r.height, 28); }
      current = target; back = document.activeElement;
      target.setAttribute("data-menu-open", "");
      render(target);
      menu.hidden = false;
      const sheet = phone.matches;
      menu.classList.toggle("sx-menu-sheet", sheet);
      scrim.classList.toggle("is-open", sheet);
      if (sheet) { Object.assign(menu.style, { left: "", top: "", visibility: "visible" }); menu.querySelector(".oq-menu__item:not(:disabled)")?.focus({ preventScroll: true }); return; }
      menu.style.visibility = "hidden";
      const { width: w, height: h } = menu.getBoundingClientRect(), m = 8;
      let left = x + w + m > innerWidth ? x - w : x, top = y + h + m > innerHeight ? y - h : y;
      left = Math.max(m, Math.min(left, innerWidth - w - m)); top = Math.max(m, Math.min(top, innerHeight - h - m));
      Object.assign(menu.style, { left: `${left}px`, top: `${top}px`, visibility: "visible" });
      menu.querySelector(".oq-menu__item:not(:disabled)")?.focus();
    };
    container.addEventListener("contextmenu", (e) => { const t = e.target.closest(selector); if (!t) return; e.preventDefault(); open(t, e.clientX, e.clientY); });
    container.addEventListener("keydown", (e) => {
      const t = e.target.closest(selector); if (!t) return;
      if ((e.shiftKey && e.key === "F10") || e.key === "ContextMenu") { e.preventDefault(); const r = t.getBoundingClientRect(); open(t, r.left + 16, r.top + Math.min(r.height, 28)); }
    });
    menu.addEventListener("click", (e) => { const b = e.target.closest(".oq-menu__item"); if (!b || b.disabled) return; const t = current; close(); onAction(b.dataset.act, t); });
    menu.addEventListener("keydown", (e) => {
      const list = $$(".oq-menu__item:not(:disabled)", menu), i = list.indexOf(document.activeElement), go = (n) => list[(n + list.length) % list.length]?.focus();
      if (e.key === "ArrowDown") go(i + 1); else if (e.key === "ArrowUp") go(i - 1); else if (e.key === "Home") go(0); else if (e.key === "End") go(list.length - 1);
      else if (e.key === "Escape" || e.key === "Tab") close(); else return;
      e.preventDefault();
    });
    menu.addEventListener("contextmenu", (e) => e.preventDefault());
    // Long press: touch only (a mouse has its right button). It opens after 500 ms held still;
    // moving the finger is a scroll, so it cancels. The click that follows the press is eaten.
    let press = null, pressed = false;
    container.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      const t = e.target.closest(selector); if (!t || e.target.closest("button, a, input, select")) return;
      press = { t, x: e.clientX, y: e.clientY, timer: setTimeout(() => { pressed = true; navigator.vibrate?.(10); open(t, press.x, press.y); press = null; }, 500) };
    });
    const cancel = () => { if (press) clearTimeout(press.timer); press = null; };
    container.addEventListener("pointermove", (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) cancel(); });
    container.addEventListener("pointerup", cancel);
    container.addEventListener("pointercancel", cancel);
    container.addEventListener("click", (e) => { if (pressed) { pressed = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target)) close(); });
    addEventListener("scroll", () => { if (!menu.classList.contains("sx-menu-sheet")) close(); }, true);
    addEventListener("resize", close);
    return { open, close };
  }

  /* ================= Shortcuts registry + overlay (markup = src/react/layout/Shortcuts.tsx) ================= */
  /** shortcuts(list) — list of { keys: "?"|"g d"|"mod+k", label, group, run }. "?" opens the overlay. */
  function shortcuts(list) {
    const mac = /mac|iphone|ipad/i.test(navigator.platform);
    const fmt = (combo) => combo.split(" ").map((chord) => chord.split("+").map((p) => ({ mod: mac ? "⌘" : "Ctrl", shift: mac ? "⇧" : "Shift", escape: "Esc" })[p] ?? (p.length === 1 ? p.toUpperCase() : p)));
    const all = [{ keys: "?", label: "Show keyboard shortcuts", group: "General", run: () => toggle() }, ...list];
    const dlg = document.createElement("dialog");
    dlg.className = "oq-dialog";
    dlg.style.setProperty("--w", "720px");
    const groups = new Map();
    for (const s of all) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
    dlg.innerHTML = `<div class="oq-dialog__header"><h3 class="oq-dialog__title">Keyboard shortcuts</h3><button class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral oq-sm oq-dialog__close" data-close aria-label="Close">${icon("close")}</button></div>` +
      `<div class="oq-dialog__body"><div class="oq-shortcuts">${[...groups].map(([g, items]) => `<section class="oq-shortcuts__group"><div class="oq-overline">${esc(g)}</div>${items.map((s) => `<div class="oq-shortcuts__row"><span>${esc(s.label)}</span><span class="oq-shortcuts__keys">${fmt(s.keys).map((chord, i) => (i ? '<span class="oq-faint">then</span>' : "") + chord.map((k) => `<kbd class="oq-kbd">${esc(k)}</kbd>`).join("")).join("")}</span></div>`).join("")}</section>`).join("")}</div></div>`;
    document.body.append(dlg);
    dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
    const toggle = () => (dlg.open ? dlg.close() : dlg.showModal());
    const typing = (el) => el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
    let pending = null, timer = 0;
    document.addEventListener("keydown", (e) => {
      if (typing(e.target) || e.altKey) return;
      if (document.querySelector("dialog[open]") && !dlg.open) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
      const combo = `${e.ctrlKey || e.metaKey ? "mod+" : ""}${key === "?" ? "?" : key}`;
      const seq = pending ? `${pending} ${combo}` : combo;
      const hit = all.find((s) => s.keys === seq);
      if (hit?.run) { e.preventDefault(); pending = null; hit.run(); return; }
      if (all.some((s) => s.keys.startsWith(`${seq} `))) { pending = seq; clearTimeout(timer); timer = setTimeout(() => (pending = null), 900); e.preventDefault(); return; }
      pending = null;
    });
    return { toggle };
  }

  /* ================= Sidebar rail / drawer (classes = styles/layout.css) ================= */
  /** railShell(shell, { railBtn, menuBtn, backdrop, storageKey }) */
  function railShell(shell, { railBtn, menuBtn, backdrop, storageKey = "oq-samples-rail" } = {}) {
    const narrow = matchMedia("(max-width: 760px)");
    const setRail = (on) => {
      shell.classList.toggle("oq-shell--rail", on);
      if (railBtn) { railBtn.setAttribute("aria-pressed", String(on)); railBtn.setAttribute("aria-label", on ? "Expand sidebar" : "Collapse sidebar"); railBtn.dataset.tip = on ? "Expand sidebar ( [ )" : "Collapse sidebar ( [ )"; }
      try { localStorage.setItem(storageKey, on ? "1" : "0"); } catch {}
    };
    const setDrawer = (open) => { shell.classList.toggle("oq-shell--drawer-open", open); menuBtn?.setAttribute("aria-expanded", String(open)); };
    railBtn?.addEventListener("click", () => setRail(!shell.classList.contains("oq-shell--rail")));
    menuBtn?.addEventListener("click", () => setDrawer(!shell.classList.contains("oq-shell--drawer-open")));
    backdrop?.addEventListener("click", () => setDrawer(false));
    narrow.addEventListener("change", () => setDrawer(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setDrawer(false); });
    try { if (localStorage.getItem(storageKey) === "1") setRail(true); } catch {}
    return { toggle: () => (narrow.matches ? setDrawer(!shell.classList.contains("oq-shell--drawer-open")) : setRail(!shell.classList.contains("oq-shell--rail"))), setRail, setDrawer };
  }

  /* ================= Key–value editor and IP / CIDR fields (markup = src/react/forms) ================= */
  const F = () => window.OQForms ?? {};
  const kvIcon = { up: icon("chevronUp", "oq-icon oq-sm"), down: icon("chevronDown", "oq-icon oq-sm"),
    trash: '<svg class="oq-icon oq-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
    plus: '<svg class="oq-icon oq-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' };
  /** kvEditor(root, pairs, opts) — root gets class oq-kv. onChange(pairs) after every edit. Returns { problems() }. */
  function kvEditor(root, pairs, { caseInsensitive = false, keyPattern, keyPatternMessage, keyPlaceholder = "KEY", valuePlaceholder = "value", onChange = () => {} } = {}) {
    root.classList.add("oq-kv");
    const problems = () => (F().keyValueProblems ? F().keyValueProblems(pairs, { caseInsensitive, keyPattern, keyPatternMessage }) : []);
    const render = (focus) => {
      const p = problems();
      root.innerHTML = (pairs.length ? '<div class="oq-kv__head" aria-hidden="true"><span>Key</span><span>Value</span></div>' : "") +
        pairs.map((x, i) => `<div class="oq-kv__row ${p[i] ? "is-invalid" : ""}">
          <input class="oq-input oq-sm oq-input--mono oq-kv__key" data-i="${i}" data-k="key" value="${esc(x.key)}" placeholder="${keyPlaceholder}" aria-label="Key ${i + 1}" ${p[i] ? 'aria-invalid="true"' : ""}>
          <input class="oq-input oq-sm oq-input--mono oq-kv__value" data-i="${i}" data-k="value" value="${esc(x.value)}" placeholder="${valuePlaceholder}" aria-label="Value ${i + 1}">
          <span class="oq-kv__actions">
            <button type="button" class="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" data-move="-1" data-i="${i}" aria-label="Move row ${i + 1} up" ${i === 0 ? "disabled" : ""}>${kvIcon.up}</button>
            <button type="button" class="oq-btn oq-btn--ghost oq-neutral oq-btn--icon oq-sm" data-move="1" data-i="${i}" aria-label="Move row ${i + 1} down" ${i === pairs.length - 1 ? "disabled" : ""}>${kvIcon.down}</button>
            <button type="button" class="oq-btn oq-btn--ghost oq-danger oq-btn--icon oq-sm" data-remove data-i="${i}" aria-label="Remove row ${i + 1}">${kvIcon.trash}</button>
          </span>
          ${p[i] ? `<span class="oq-kv__problem">${esc(p[i])}</span>` : ""}
        </div>`).join("") +
        `<button type="button" class="oq-btn oq-btn--ghost oq-sm oq-kv__add" data-add>${kvIcon.plus}Add row</button>`;
      if (focus) { const el = $(focus, root); if (el) { el.focus(); const n = el.value.length; el.setSelectionRange?.(n, n); } }
    };
    root.addEventListener("input", (e) => {
      const el = e.target; if (!el.dataset.k) return;
      e.stopPropagation();
      pairs[+el.dataset.i][el.dataset.k] = el.value;
      render(`[data-i="${el.dataset.i}"][data-k="${el.dataset.k}"]`);
      onChange(pairs);
    });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const i = +b.dataset.i;
      if (b.dataset.add !== undefined) { pairs.push({ key: "", value: "" }); render(`[data-i="${pairs.length - 1}"][data-k="key"]`); }
      else if (b.dataset.remove !== undefined) { pairs.splice(i, 1); render(); }
      else if (b.dataset.move) { const j = i + +b.dataset.move; [pairs[i], pairs[j]] = [pairs[j], pairs[i]]; render(`[data-i="${j}"][data-move="${b.dataset.move}"]`); }
      else return;
      onChange(pairs);
    });
    render();
    return { problems: () => problems().filter(Boolean), get pairs() { return pairs; } };
  }

  /** ipField(box) — box is .oq-field[data-ip="ip"|"cidr"] with an .oq-ip input group and an .oq-help. Returns check() → ok. */
  function ipField(box) {
    const input = $("input", box), tag = $(".oq-ip__version", box), help = $(".oq-help", box);
    const check = () => {
      const raw = input.value.trim();
      let ok = false, msg = "", info = "";
      if (box.dataset.ip === "ip") {
        const v = raw ? F().ipVersion(raw) : null;
        ok = v !== null;
        tag.textContent = v ? `IPv${v}` : "IP";
        msg = raw && !ok ? "Not an IPv4 or IPv6 address." : "";
        info = ok ? (v === 4 ? "IPv4 address." : "IPv6 address.") : "IPv4 or IPv6.";
      } else {
        const c = raw ? F().parseCidr(raw) : null;
        ok = c !== null;
        tag.textContent = c ? `IPv${c.version}` : "CIDR";
        msg = raw && !ok ? (raw.includes("/") ? "Not a valid CIDR block: the prefix goes up to /32 (IPv4) or /128 (IPv6)." : "Add a prefix length, e.g. /24.") : "";
        if (c) {
          const count = F().formatAddressCount(c.size);
          info = c.version === 4
            ? `<span class="oq-mono">${c.network} – ${c.broadcast}</span> · ${count} ${c.size === 1n ? "address" : "addresses"}${c.hostBitsSet ? ` <span class="oq-ip__warn">· host bits set; the network is <span class="oq-mono">${c.network}/${c.prefix}</span></span>` : ""}`
            : `IPv6 /${c.prefix} · ${count} addresses`;
        } else info = "e.g. 10.0.0.0/8";
      }
      tag.classList.toggle("is-ok", ok);
      box.classList.toggle("is-invalid", Boolean(msg));
      input.setAttribute("aria-invalid", String(Boolean(msg)));
      help.innerHTML = msg ? esc(msg) : info;
      return ok || !raw;
    };
    input.addEventListener("input", check);
    check();
    return { check };
  }

  /* ================= Query bar (markup = src/react/forms/QueryBuilder.tsx) ================= */
  /**
   * queryBar(host, { fields, text, placeholder, label, onChange(terms) }) → { terms, set(text) }
   * fields: [{ name, label, type: "enum"|"string"|"number"|"boolean", options }]
   */
  function queryBar(host, { fields, text = "", placeholder = "Filter… e.g. status:open", label = "Filter", onChange = () => {} }) {
    const Q = F();
    const id = `qb${Math.random().toString(36).slice(2, 7)}`;
    host.innerHTML = `<div class="oq-query"><div class="oq-query__box">${icon("search", "oq-query__icon")}<input class="oq-query__input" role="combobox" aria-label="${esc(label)}" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list" autocomplete="off" spellcheck="false"></div><ul class="oq-listbox" id="${id}-list" role="listbox" hidden></ul></div>`;
    const root = $(".oq-query", host), box = $(".oq-query__box", host), input = $("input", host), list = $(".oq-listbox", host);
    let terms = Q.parseFilterText(text, fields), draft = "", open = false, active = 0;
    const DRAFT = /^(-|!)?([A-Za-z_][\w.]*)?$/;
    const DRAFT_VALUE = /^(-|!)?([A-Za-z_][\w.]*)(!=|>=|<=|:|>|<|~)(.*)$/;
    const suggestions = () => {
      const out = [];
      const vm = DRAFT_VALUE.exec(draft);
      if (vm) {
        const [, neg = "", name, sym, raw] = vm;
        const field = fields.find((f) => f.name === name);
        const parts = raw.split(","); const partial = parts.pop().toLowerCase();
        for (const o of field?.options ?? []) if (!parts.includes(o) && o.toLowerCase().includes(partial))
          out.push({ label: esc(o), hint: field.label, draft: `${neg}${name}${sym}${[...parts, o].join(",")}`, commit: true });
        return out;
      }
      const m = DRAFT.exec(draft);
      if (m) {
        const [, neg = "", partial = ""] = m;
        for (const f of fields) {
          if (partial && !f.name.toLowerCase().startsWith(partial.toLowerCase()) && !f.label.toLowerCase().startsWith(partial.toLowerCase())) continue;
          const sym = f.type === "number" ? ">" : ":";
          out.push({ label: `<span class="oq-mono">${neg}${f.name}${sym}</span><span class="oq-faint"> ${esc(f.label)}</span>`, hint: f.type, draft: `${neg}${f.name}${sym}` });
        }
      }
      if (draft.trim() && !draft.trim().startsWith("-")) out.push({ label: `Search all text for “${esc(draft.trim())}”`, hint: "text", draft: draft.includes(" ") ? `"${draft.trim()}"` : draft.trim(), commit: true });
      return out;
    };
    const valueText = (v) => (Array.isArray(v) ? v.join(", ") : String(v));
    const render = (notify = true) => {
      $$(".oq-query__term", box).forEach((el) => el.remove());
      input.insertAdjacentHTML("beforebegin", terms.map((t, i) => {
        const field = fields.find((f) => f.name === t.field);
        const unknown = t.op !== "text" && !field;
        const opLabel = t.op === "ne" && Array.isArray(t.value) ? "not in" : Q.FILTER_OP_SYMBOL[t.op];
        return `<span class="oq-query__term ${t.op === "text" ? "oq-query__term--text" : ""} ${unknown ? "is-unknown" : ""}" ${unknown ? `title="Unknown field “${esc(t.field)}”"` : ""}>` +
          (t.op !== "text" ? `<button type="button" class="oq-query__field" data-edit="${i}">${esc(field?.label ?? t.field)}</button><button type="button" class="oq-query__op" data-op="${i}" aria-label="Operator ${opLabel}. Click to change.">${opLabel}</button>` : "") +
          `<button type="button" class="oq-query__value" data-edit="${i}">${t.op === "text" ? `“${esc(valueText(t.value))}”` : esc(valueText(t.value))}</button>` +
          `<button type="button" class="oq-query__remove" data-remove="${i}" aria-label="Remove filter ${esc(Q.formatFilterTerm(t))}">${icon("close")}</button></span>`;
      }).join(""));
      input.placeholder = terms.length ? "" : placeholder;
      input.value = draft;
      renderList();
      if (notify) onChange(terms);
    };
    const renderList = () => {
      const s = suggestions(), show = open && s.length > 0;
      list.hidden = !show;
      input.setAttribute("aria-expanded", String(show));
      list.innerHTML = s.map((x, i) => `<li class="oq-option" role="option" id="${id}-s${i}" data-s="${i}" aria-selected="${i === active}" ${i === active ? 'data-active="true"' : ""}><span class="oq-truncate">${x.label}</span><span class="oq-option__hint">${esc(x.hint)}</span></li>`).join("");
      if (show) input.setAttribute("aria-activedescendant", `${id}-s${active}`); else input.removeAttribute("aria-activedescendant");
    };
    const commitDraft = (t) => { const parsed = Q.parseFilterText(t, fields); if (parsed.length) terms = [...terms, ...parsed]; draft = ""; active = 0; render(); };
    const apply = (x) => { if (x.commit) commitDraft(x.draft); else { draft = x.draft; active = 0; render(false); } input.focus(); };
    const editAt = (i) => { draft = Q.formatFilterTerm(terms[i]); terms = terms.filter((_, j) => j !== i); open = true; render(); input.focus(); };
    box.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) { input.focus(); return; }
      if (b.dataset.remove) { terms = terms.filter((_, j) => j !== +b.dataset.remove); render(); }
      else if (b.dataset.edit) editAt(+b.dataset.edit);
      else if (b.dataset.op) {
        const i = +b.dataset.op, t = terms[i];
        const ops = Q.filterOpsFor(fields.find((f) => f.name === t.field));
        const op = ops[(ops.indexOf(t.op) + 1) % ops.length];
        let value = t.value;
        if (op === "in" && !Array.isArray(value)) value = [value];
        else if (op !== "in" && op !== "ne" && Array.isArray(value)) value = value[0] ?? "";
        terms = terms.map((x, j) => (j === i ? { ...x, op, value } : x)); render();
      }
    });
    input.addEventListener("input", () => { draft = input.value; open = true; active = 0; renderList(); });
    input.addEventListener("focus", () => { open = true; renderList(); });
    input.addEventListener("keydown", (e) => {
      const s = suggestions();
      if (e.key === "ArrowDown") { e.preventDefault(); open = true; active = Math.min(active + 1, s.length - 1); renderList(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); renderList(); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const x = open ? s[active] : undefined;
        if (x && (active > 0 || !DRAFT_VALUE.test(draft) || x.commit)) apply(x); else commitDraft(draft);
      } else if (e.key === "Tab" && open && draft && s[active] && !s[active].commit) { e.preventDefault(); apply(s[active]); }
      else if (e.key === "Escape") { open = false; renderList(); }
      else if (e.key === "Backspace" && draft === "" && terms.length) { e.preventDefault(); editAt(terms.length - 1); }
    });
    list.addEventListener("mousedown", (e) => e.preventDefault());
    list.addEventListener("click", (e) => { const li = e.target.closest("[data-s]"); if (li) apply(suggestions()[+li.dataset.s]); });
    document.addEventListener("mousedown", (e) => { if (!root.contains(e.target)) { open = false; renderList(); } });
    render(false);
    return { get terms() { return terms; }, set(t) { terms = Q.parseFilterText(t, fields); draft = ""; render(); }, focus: () => input.focus() };
  }

  /** matchTerms(terms, row, textOf) — does a row pass every filter term? (the in-browser reading of the same JQL) */
  function matchTerms(terms, row, textOf = (r) => Object.values(r).join(" ")) {
    const norm = (v) => (typeof v === "string" ? v.toLowerCase() : v);
    return terms.every((t) => {
      if (t.op === "text") return textOf(row).toLowerCase().includes(String(t.value).toLowerCase());
      const v = row[t.field];
      const vals = (Array.isArray(t.value) ? t.value : [t.value]).map(norm);
      switch (t.op) {
        case "eq": return vals.includes(norm(v));
        case "in": return vals.includes(norm(v));
        case "ne": return !vals.includes(norm(v));
        case "gt": return v > t.value;
        case "gte": return v >= t.value;
        case "lt": return v < t.value;
        case "lte": return v <= t.value;
        case "contains": return vals.some((x) => String(v ?? "").toLowerCase().includes(String(x)));
        default: return true;
      }
    });
  }

  /* ================= Split pane (classes = styles/layout.css, behaviour = src/react/layout/SplitPane.tsx) ================= */
  /** splitPane(split) — split is .oq-split[data-min][data-max][data-key] with pane, handle, pane children. */
  function splitPane(split) {
    const handle = [...split.children].find((c) => c.classList.contains("oq-split__handle"));
    const vertical = split.classList.contains("oq-split--vertical");
    const min = +split.dataset.min || 10, max = +split.dataset.max || 90, key = split.dataset.key;
    let size = parseFloat(split.style.getPropertyValue("--split")) || 50, collapsed = false;
    try { const saved = key && parseFloat(localStorage.getItem(key) ?? ""); if (saved) size = Math.min(max, Math.max(min, saved)); } catch {}
    const apply = () => {
      split.style.setProperty("--split", `${collapsed ? 0 : size}%`);
      split.classList.toggle("is-collapsed", collapsed);
      handle.setAttribute("aria-valuenow", String(Math.round(collapsed ? 0 : size)));
    };
    const set = (v) => { size = Math.min(max, Math.max(min, v)); collapsed = false; apply(); try { if (key) localStorage.setItem(key, size.toFixed(2)); } catch {} };
    handle.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; e.preventDefault(); handle.setPointerCapture(e.pointerId); handle.focus(); split.classList.add("is-dragging"); });
    handle.addEventListener("pointermove", (e) => {
      if (!split.classList.contains("is-dragging")) return;
      const r = split.getBoundingClientRect();
      set(vertical ? ((e.clientY - r.top) / r.height) * 100 : ((e.clientX - r.left) / r.width) * 100);
    });
    const end = (e) => { if (split.classList.contains("is-dragging")) { handle.releasePointerCapture(e.pointerId); split.classList.remove("is-dragging"); } };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("dblclick", () => { collapsed = !collapsed; apply(); });
    handle.addEventListener("keydown", (e) => {
      const by = e.shiftKey ? 20 : 2;
      const k = { [vertical ? "ArrowUp" : "ArrowLeft"]: -by, [vertical ? "ArrowDown" : "ArrowRight"]: by }[e.key];
      if (k) set(size + k); else if (e.key === "Home") set(min); else if (e.key === "End") set(max);
      else if (e.key === "Enter") { collapsed = !collapsed; apply(); } else return;
      e.preventDefault();
    });
    apply();
    return { set };
  }

  /* ================= Bottom sheet (classes = examples/lib/samples.css) ================= */
  /**
   * sheet(panel, { title, query }) → { open(), close(), active }
   * While `query` matches (a phone), `panel` becomes a sheet that rises from the bottom over a scrim,
   * with a grab bar and a close button; Escape, the scrim and the button close it, and the page
   * behind does not scroll. Above the breakpoint it is left alone (open/close do nothing).
   */
  function sheet(panel, { title = "", query = "(max-width: 640px)" } = {}) {
    const mq = matchMedia(query);
    const scrim = document.createElement("div");
    scrim.className = "sx-scrim";
    panel.before(scrim);
    const bar = document.createElement("div");
    bar.className = "sx-sheet__bar";
    bar.innerHTML = `<span class="oq-strong oq-small oq-grow">${esc(title)}</span><button type="button" class="oq-btn oq-btn--icon oq-btn--ghost oq-neutral" aria-label="Close">${icon("close")}</button>`;
    panel.prepend(bar);
    let back = null;
    const apply = () => { panel.classList.toggle("sx-sheet", mq.matches); if (!mq.matches) close(); };
    const open = () => {
      if (!mq.matches) return;
      back = document.activeElement;
      panel.classList.add("is-open"); scrim.classList.add("is-open");
      panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", title);
      document.documentElement.style.overflow = "hidden";
      $("button", bar).focus({ preventScroll: true });
    };
    function close() {
      if (!panel.classList.contains("is-open")) return;
      panel.classList.remove("is-open"); scrim.classList.remove("is-open");
      panel.removeAttribute("role"); panel.removeAttribute("aria-modal");
      document.documentElement.style.overflow = "";
      back?.focus?.({ preventScroll: true });
    }
    $("button", bar).onclick = close;
    scrim.onclick = close;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    mq.addEventListener("change", apply);
    apply();
    return { open, close, get active() { return mq.matches; } };
  }

  window.OQX = {
    $, $$, esc, rng, toast, copyText, mark, icon,
    niceTicks, barChart, xyChart, calendar, datePicker, rangePicker, presets,
    jsonInspector, logViewer, logTime, notifications, bellHtml, contextMenu, shortcuts, railShell, kvEditor, ipField, queryBar, matchTerms, splitPane,
    sheet,
  };
})();
