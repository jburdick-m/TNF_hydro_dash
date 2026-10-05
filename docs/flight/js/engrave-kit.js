// Window Atlas: shared engraving kit + registry for bespoke landmark plates.
//
// Bespoke plates live in js/plates-*.js and register a builder per POI id:
//   BESPOKE['lamoille-canyon'] = (K) => '<svg body markup>';   // viewBox 0 0 120 72, stroke = currentColor
// window.illo(kind, {id}) returns the bespoke plate when one exists for that id, else the generic kind plate
// from js/illustrations.js. Builders run once on first use and are cached.
(function () {
  const BESPOKE = (window.BESPOKE = window.BESPOKE || {});
  const ALIAS = (window.BESPOKE_ALIAS = window.BESPOKE_ALIAS || {}); // poi id -> plate id (e.g. both divide crossings)
  const cache = {};
  let uid = 0;
  const r2 = (n) => Math.round(n * 100) / 100;

  const K = {
    // deterministic random in [0,1) from a string or number seed
    rng(seed) {
      let s = typeof seed === 'string' ? Array.from(seed).reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 2166136261) : seed >>> 0;
      return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    },
    // skyline through control points [[x,y],...] (sorted by x), cosine-eased, roughened by noise of amplitude `rough`
    ridge(rng, ctrl, rough = 0.8, step = 1.2) {
      const out = [];
      for (let i = 0; i < ctrl.length - 1; i++) {
        const [x0, y0] = ctrl[i], [x1, y1] = ctrl[i + 1];
        for (let x = x0; x < x1; x += step) {
          const t = (x - x0) / (x1 - x0), e = (1 - Math.cos(Math.PI * t)) / 2;
          out.push([x, y0 + (y1 - y0) * e + (rng() - 0.5) * rough]);
        }
      }
      out.push(ctrl[ctrl.length - 1].slice());
      return out;
    },
    // SVG path data from points
    d(pts, close) { return 'M' + pts.map((p) => r2(p[0]) + ' ' + r2(p[1])).join('L') + (close ? 'Z' : ''); },
    // stroked line/polygon; o = {w, op, fill, fop, dash}
    path(pts, o = {}) {
      return '<path d="' + K.d(pts, o.close) + '" stroke-width="' + (o.w || 0.9) + '"' + (o.op != null ? ' stroke-opacity="' + o.op + '"' : '') +
        (o.fill ? ' fill="currentColor" fill-opacity="' + (o.fop || 0.15) + '"' : '') + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.none ? ' stroke="none"' : '') + '/>';
    },
    // parallel hatching clipped to polygon `poly`; o = {angle (deg, 0 = horizontal), gap, w, op, jitter, rng, breaks}
    hatch(poly, o = {}) {
      const id = 'ek' + (uid++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
      const a = ((o.angle || 0) * Math.PI) / 180, gap = o.gap || 1.4, w = o.w || 0.35, rng = o.rng || Math.random;
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      let lines = '';
      for (let t = -R; t <= R; t += gap) {
        const j = (o.jitter || 0) * (rng() - 0.5);
        const px = cx - sa * (t + j), py = cy + ca * (t + j);
        if (o.breaks && rng() < o.breaks) { // broken ruling (shimmer on water)
          const m = (rng() - 0.5) * R;
          lines += 'M' + r2(px - ca * R) + ' ' + r2(py - sa * R) + 'L' + r2(px + ca * (m - 1.5)) + ' ' + r2(py + sa * (m - 1.5)) +
            'M' + r2(px + ca * (m + 1.5)) + ' ' + r2(py + sa * (m + 1.5)) + 'L' + r2(px + ca * R) + ' ' + r2(py + sa * R);
        } else lines += 'M' + r2(px - ca * R) + ' ' + r2(py - sa * R) + 'L' + r2(px + ca * R) + ' ' + r2(py + sa * R);
      }
      return '<clipPath id="' + id + '"><path d="' + K.d(poly, true) + '"/></clipPath><path clip-path="url(#' + id + ')" d="' + lines + '" stroke-width="' + w + '"' + (o.op != null ? ' stroke-opacity="' + o.op + '"' : '') + '/>';
    },
    // horizontal engraved ruling between y0..y1 (sky, still water); o = {gap, w, op, breaks, rng, taper}
    ruling(x0, x1, y0, y1, o = {}) {
      const gap = o.gap || 1.2, rng = o.rng || Math.random;
      let d = '';
      for (let y = y0; y <= y1; y += gap) {
        const inset = o.taper ? o.taper * Math.abs((y - (y0 + y1) / 2) / ((y1 - y0) / 2 || 1)) : 0;
        let xa = x0 + inset + rng() * 1.5, xb = x1 - inset - rng() * 1.5;
        if (o.breaks && rng() < o.breaks) { const m = xa + (xb - xa) * rng(); d += 'M' + r2(xa) + ' ' + r2(y) + 'H' + r2(m - 1.2) + 'M' + r2(m + 1.2) + ' ' + r2(y) + 'H' + r2(xb); } else d += 'M' + r2(xa) + ' ' + r2(y) + 'H' + r2(xb);
      }
      return '<path d="' + d + '" stroke-width="' + (o.w || 0.3) + '"' + (o.op != null ? ' stroke-opacity="' + o.op + '"' : '') + '/>';
    },
    // fall-line strokes hanging from a skyline (engraved mountain flanks). Light from the upper left:
    // slopes descending to the right are in shadow (denser, longer strokes). o = {gap, w, op, len, base, rng, shadowOnly}
    flank(sky, o = {}) {
      const rng = o.rng || Math.random, gap = o.gap || 1.1, len = o.len || 8, base = o.base;
      let d = '', acc = 0;
      for (let i = 1; i < sky.length; i++) {
        const [x0, y0] = sky[i - 1], [x1, y1] = sky[i], seg = Math.hypot(x1 - x0, y1 - y0);
        acc += seg;
        const shadow = y1 > y0; // descending to the right
        const step = shadow ? gap : gap * 2.2;
        if (acc < step || (o.shadowOnly && !shadow)) continue;
        acc = 0;
        let L = len * (shadow ? 1 : 0.55) * (0.6 + rng() * 0.6);
        if (base != null) L = Math.min(L, base - y1);
        if (L <= 0.4) continue;
        const dx = (shadow ? 0.18 : -0.12) * L;
        d += 'M' + r2(x1) + ' ' + r2(y1 + 0.3) + 'L' + r2(x1 + dx) + ' ' + r2(y1 + L);
      }
      return '<path d="' + d + '" stroke-width="' + (o.w || 0.35) + '"' + (o.op != null ? ' stroke-opacity="' + o.op + '"' : '') + '/>';
    },
    // dots scattered inside polygon (sand, salt crust, sage); o = {n, r, op, rng}
    stipple(poly, o = {}) {
      const rng = o.rng || Math.random, n = o.n || 80, r = o.r || 0.28;
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
      let d = '', k = 0, tries = 0;
      while (k < n && tries++ < n * 6) { const x = x0 + rng() * (x1 - x0), y = y0 + rng() * (y1 - y0); if (inside(x, y)) { d += 'M' + r2(x) + ' ' + r2(y) + 'h0.01'; k++; } }
      return '<path d="' + d + '" stroke-width="' + r * 2 + '" stroke-linecap="round"' + (o.op != null ? ' stroke-opacity="' + o.op + '"' : '') + '/>';
    },
    // soft vignette mask so plates fade at the edges like a printed vignette
    vignetteOpen() { const id = 'ev' + (uid++).toString(36) + Math.floor(Math.random() * 1e6).toString(36); return '<defs><radialGradient id="' + id + 'g" cx="50%" cy="52%" r="62%"><stop offset="72%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/></radialGradient><mask id="' + id + '"><rect width="120" height="72" fill="url(#' + id + 'g)"/></mask></defs><g mask="url(#' + id + ')">'; },
    vignetteClose() { return '</g>'; },
  };
  window.ENGRAVE = K;

  function svg(body, cls) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72" class="' + (cls || 'illo illo-bespoke') + '" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  function bespoke(id) {
    const key = ALIAS[id] || id;
    if (!BESPOKE[key]) return null;
    if (!(key in cache)) { try { cache[key] = BESPOKE[key](K); } catch (e) { console.warn('plate', key, e); cache[key] = null; } }
    return cache[key];
  }
  window.hasBespoke = (id) => !!BESPOKE[ALIAS[id] || id];

  // Wrap window.illo (assigned later by js/illustrations.js) so bespoke plates win when opts.id has one.
  let base = window.illo;
  const wrapped = function (kind, opts) {
    const id = opts && opts.id;
    const b = id ? bespoke(id) : null;
    if (b) return svg(b, opts.className == null ? 'illo illo-bespoke illo-' + kind : opts.className);
    return base ? base(kind, opts) : '';
  };
  try {
    Object.defineProperty(window, 'illo', { configurable: true, get: () => (base || Object.keys(BESPOKE).length ? wrapped : undefined), set: (fn) => { base = fn; } });
  } catch (e) { /* leave illo alone */ }
})();
