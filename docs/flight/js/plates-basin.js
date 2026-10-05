// Window Atlas: bespoke engraved plates for Northeast Nevada and Utah.
// Each builder returns SVG body markup for viewBox 0 0 120 72 (stroke = currentColor, fill none),
// drawn after the 40th Parallel Survey plates: hairline tone by density, one crisp silhouette, ruled sky
// and water, light from the upper left. Registered on window.BESPOKE (see js/engrave-kit.js).
(function () {
  'use strict';
  const B = (window.BESPOKE = window.BESPOKE || {});
  let n = 0;
  const uid = (p) => p + (n++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const r2 = (v) => Math.round(v * 100) / 100;
  const pt = (p) => r2(p[0]) + ' ' + r2(p[1]);
  const pd = (pts, close) => 'M' + pts.map(pt).join('L') + (close ? 'Z' : '');
  const S = (d, w, op, extra) => '<path d="' + d + '" stroke-width="' + w + '"' + (op != null && op < 1 ? ' stroke-opacity="' + op + '"' : '') + (extra || '') + '/>';
  const line = (pts, w, op, extra) => S(pd(pts), w, op, extra);
  const fillp = (pts, fop, w, op) => S(pd(pts, true), w == null ? 0.3 : w, op, ' fill="currentColor" fill-opacity="' + fop + '"');
  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const under = (sky, yb) => [[sky[0][0], yb == null ? 75 : yb]].concat(sky, [[sky[sky.length - 1][0], yb == null ? 75 : yb]]);
  const plate = (K, body) => K.vignetteOpen() + body + K.vignetteClose();

  // Catmull-Rom through control points
  function cr(P, k) {
    k = k || 6;
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
      }
    }
    out.push(P[P.length - 1].slice());
    return out;
  }
  function resample(pts, m) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = c[c.length - 1], out = [];
    let i = 1;
    for (let k = 0; k < m; k++) {
      const s = (L * k) / (m - 1);
      while (i < c.length - 1 && c[i] < s) i++;
      const f = (s - c[i - 1]) / (c[i] - c[i - 1] || 1);
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]);
    }
    return out;
  }
  const blend = (a, b, t) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
  const yAt = (sky, x) => { for (let i = 1; i < sky.length; i++) if (sky[i][0] >= x) { const a = sky[i - 1], b = sky[i], f = (x - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * f; } return sky[sky.length - 1][1]; };

  // mask out shapes: arrays = black polygons, {d, w} = black stroke (halo), {white: poly} = re-admit
  function knock(body, shapes) {
    const id = uid('pbm');
    let m = '';
    for (const s of shapes) {
      if (Array.isArray(s)) m += '<path d="' + pd(s, true) + '" fill="#000" stroke="none"/>';
      else if (s.white) m += '<path d="' + pd(s.white, true) + '" fill="#fff" stroke="none"/>';
      else m += '<path d="' + s.d + '" fill="' + (s.fill ? '#000' : 'none') + '" stroke="#000" stroke-width="' + s.w + '" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-6" y="-6" width="132" height="84"><rect x="-6" y="-6" width="132" height="84" fill="#fff" stroke="none"/>' + m + '</mask><g mask="url(#' + id + ')">' + body + '</g>';
  }
  function clip(poly, body) { const id = uid('pbc'); return '<clipPath id="' + id + '"><path d="' + pd(poly, true) + '"/></clipPath><g clip-path="url(#' + id + ')">' + body + '</g>'; }

  // horizontal ruling whose gap grows from g0 (y0) to g1 (y1): perspective water and flats. o.seg = dash length (shimmer)
  function prule(R, x0, x1, y0, y1, g0, g1, o) {
    o = o || {};
    let d = '', y = y0;
    while (y <= y1) {
      const xa = x0 + R() * 1.5, xb = x1 - R() * 1.5;
      let x = xa;
      while (x < xb) {
        const e = Math.min(xb, x + (o.seg ? o.seg * (0.3 + R() * 1.4) : xb - x));
        d += 'M' + r2(x) + ' ' + r2(y) + 'H' + r2(e);
        x = e + (o.seg ? 0.6 + R() * (o.gapw || 2) : 1);
      }
      y += g0 + (g1 - g0) * ((y - y0) / (y1 - y0 || 1));
    }
    return S(d, o.w || 0.3, o.op);
  }
  // curved fall-line strokes from a top edge to a bottom edge (U-trough walls, faces)
  function ribs(R, top, bot, m, o) {
    const A = resample(top, m), F = resample(bot, m);
    let d = '';
    for (let i = 0; i < m; i++) {
      const a = A[i], f = F[i], c = [a[0] + (f[0] - a[0]) * (o.kx == null ? 0.12 : o.kx), a[1] + (f[1] - a[1]) * (o.ky == null ? 0.85 : o.ky)];
      const fr = o.frac ? o.frac[0] + (o.frac[1] - o.frac[0]) * R() : 1, pts = [];
      for (let k = 0; k <= 8; k++) { const t = (k / 8) * fr, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * f[0], u * u * a[1] + 2 * u * t * c[1] + t * t * f[1]]); }
      d += pd(pts);
    }
    return S(d, o.w || 0.3, o.op);
  }
  // conifers as small dark spires
  function firs(R, pts, h, fop) {
    let d = '';
    for (const p of pts) { const hh = (p[2] || h) * (0.75 + R() * 0.5), x = p[0], y = p[1]; d += 'M' + pt([x, y - hh]) + 'L' + pt([x - hh * 0.24, y]) + 'L' + pt([x + hh * 0.24, y]) + 'Z'; }
    return S(d, 0.25, 0.85, ' fill="currentColor" fill-opacity="' + (fop || 0.45) + '"');
  }
  // boulders: domed outlines with shade strokes on the right
  function rocks(R, list, o) {
    o = o || {};
    let d = '', sh = '';
    for (const [x, y, s] of list) {
      const p = [];
      for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * Math.PI, rr = s * (0.78 + R() * 0.3); p.push([x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * 0.8]); }
      d += pd(p, true);
      for (let k = 0; k < 3; k++) { const xx = x + s * (0.2 + k * 0.32); sh += 'M' + pt([xx, y - s * 0.62 * (1 - k * 0.28)]) + 'L' + pt([xx + 0.15, y - 0.1]); }
    }
    return S(d, o.w || 0.45, o.op) + S(sh, 0.3, (o.op || 1) * 0.85);
  }
  // salt-crust polygons in perspective
  function crust(R, y0, y1, hz, op) {
    let d = '';
    for (let y = y0; y < y1;) {
      const cw = 2.2 + 9 * ((y - hz) / 18);
      for (let x = -4 + R() * cw; x < 124; x += cw * (0.85 + R() * 0.4)) {
        if (R() < 0.4) continue;
        const p = [];
        for (let k = 0; k < 5; k++) { const a = (k / 6) * Math.PI * 2 + R() * 0.4; p.push([x + Math.cos(a) * cw * 0.45, y + Math.sin(a) * cw * 0.12]); }
        d += pd(p);
      }
      y += cw * 0.28;
    }
    return S(d, 0.25, op);
  }
  // American bison in profile, facing left (dir 1) or right (-1), hooves at (x, y)
  function bison(x, y, s, dir) {
    const P = [[0, -3.1], [0.3, -2.1], [0.9, -1.4], [1.6, -1.5], [2.1, -1.1], [2.3, 0], [2.8, 0], [2.9, -1.1], [3.3, -1.0], [3.4, 0], [3.9, 0], [4.1, -1.5], [5.5, -1.9], [7.4, -1.9], [8.0, -1.2], [8.0, 0], [8.5, 0], [8.7, -1.1], [9.2, 0], [9.7, 0], [9.6, -1.7], [10.1, -2.5], [10.3, -3.4], [9.9, -3.9], [8.4, -4.3], [6.6, -4.7], [5.0, -5.9], [3.6, -6.4], [2.4, -5.9], [1.7, -5.0], [1.2, -5.6], [1.0, -4.9], [0.5, -4.2]];
    const T = (p) => [x + dir * (p[0] - 5) * s, y + p[1] * s];
    return fillp(P.map(T), 0.78, 0.3) + line([[10.2, -3.2], [10.8, -2.4], [10.7, -1.6]].map(T), 0.3);
  }
  const birds = (list) => S(list.map(([x, y, s]) => 'M' + pt([x - 1.2 * s, y + 0.3 * s]) + 'Q' + pt([x - 0.6 * s, y - 0.5 * s]) + ' ' + pt([x, y + 0.2 * s]) + 'Q' + pt([x + 0.6 * s, y - 0.5 * s]) + ' ' + pt([x + 1.2 * s, y + 0.3 * s])).join(''), 0.35, 0.8);
  const sky = (K, R, y1, o) => K.ruling(1, 119, (o && o.y0) || 2, y1, { gap: (o && o.gap) || 1.5, w: 0.25, op: (o && o.op) || 0.3, rng: R });

  /* ---------------- Lamoille Canyon: the glacial U looking up-canyon ---------------- */
  B['lamoille-canyon'] = (K) => {
    const R = K.rng('lamoille-canyon');
    const head = K.ridge(R, [[30, 28], [37, 23], [43, 24], [48, 17], [52, 19], [57, 12], [61, 15], [65, 13], [70, 19], [75, 17], [81, 23], [90, 28]], 0.8, 0.9);
    const lr = K.ridge(R, [[-2, 9], [4, 5], [9, 7], [13, 6], [15, 11.5], [18.5, 13.5], [22, 11.5], [24, 6.5], [29, 8.5], [34, 13], [40, 20], [46, 26], [52, 31]], 0.6, 0.9);
    const rr = K.ridge(R, [[68, 31], [74, 26], [80, 20], [86, 14], [92, 10], [95, 9], [97, 14], [100.5, 15.5], [104, 14], [106, 8.5], [111, 6], [116, 7.5], [122, 6.5]], 0.6, 0.9);
    const fl = cr([[8, 75], [20, 64], [32, 56.5], [44, 50.5], [53, 47], [58, 46]]);
    const fr = cr([[62, 46], [67, 47], [76, 50.5], [88, 56.5], [100, 64], [112, 75]]);
    const lw = lr.concat([[58, 46]], fl.slice().reverse(), [[-2, 75]]);
    const rw = [[62, 46]].concat(rr, [[122, 75]], fr.slice().reverse());
    const hp = head.concat([[90, 48], [30, 48]]);
    let s = knock(sky(K, R, 32), [lw, rw, hp]);
    // canyon head: cirque peaks with snow chutes
    let h = K.flank(head, { gap: 0.75, len: 15, w: 0.3, op: 0.55, rng: R }) + K.flank(head, { gap: 1.4, len: 9, w: 0.3, op: 0.4, rng: R, shadowOnly: true });
    h += line(cr([[46, 31], [52, 26], [60, 24.5], [68, 26], [74, 31]]), 0.35, 0.55);
    h = knock(h, [cr([[57, 13.5], [56, 18], [57.5, 24], [56, 30]]), cr([[65, 14.5], [66.5, 20], [65, 27]]), cr([[48.5, 18.5], [49, 24], [47.5, 30]])].map((c) => ({ d: pd(c), w: 1.1 })));
    h += K.path(head, { w: 0.6, op: 0.8 });
    h += K.hatch([[44, 36], [76, 36], [70, 46], [50, 46]], { angle: 0, gap: 1.1, w: 0.25, op: 0.3, rng: R });
    s += knock(h, [lw, rw]);
    // left wall: shadowed, curved fall-lines that bend into the floor (the U), cross-hatched above
    const wf1 = cr([[18.5, 13.8], [19.6, 20], [21, 27], [23, 35], [26, 43], [30, 51]]);
    const wf2 = cr([[100.5, 15.8], [99.6, 22], [98, 30], [95.5, 38], [92.5, 46], [89, 54]]);
    const lrR = resample(lr, 40), flR = resample(fl, 40);
    let lwS = ribs(R, lr, fl, 64, { w: 0.3, op: 0.75, kx: 0.1, ky: 0.88, frac: [0.72, 1] });
    lwS += K.hatch(lrR.concat(blend(lrR, flR, 0.5).reverse()), { angle: 58, gap: 1.3, w: 0.25, op: 0.4, rng: R, jitter: 0.3 });
    for (const t of [0.3, 0.46, 0.62]) lwS += line(blend(lrR, flR, t).map((p, i) => [p[0], p[1] + 0.5 * Math.sin(i * 0.8 + t * 9)]), 0.3, 0.3);
    s += knock(lwS, [{ d: pd(wf1), w: 1.3 }]) + line(wf1, 0.3, 0.6, ' stroke-dasharray="1.4 0.9"');
    // right wall: sunlit, sparse ribs, avalanche chutes, gneiss banding
    const rrR = resample(rr, 40), frR = resample(fr, 40);
    let rwS = ribs(R, rr, fr, 30, { w: 0.3, op: 0.45, kx: 0.1, ky: 0.88, frac: [0.45, 0.95] });
    rwS += ribs(R, rr, fr, 9, { w: 0.5, op: 0.6, kx: 0.08, ky: 0.9, frac: [0.3, 0.6] });
    let band = '';
    for (const t of [0.22, 0.36, 0.5, 0.64]) {
      const b = blend(rrR, frR, t).map((p, i) => [p[0], p[1] + 0.6 * Math.sin(i * 0.7 + t * 10)]);
      for (let i = 0; i < b.length - 2; i += 2) if (R() < 0.7) band += pd([b[i], b[i + 1], b[i + 2]]);
    }
    rwS += S(band, 0.3, 0.38);
    s += knock(rwS, [{ d: pd(wf2), w: 1.3 }]) + line(wf2, 0.3, 0.55, ' stroke-dasharray="1.4 0.9"');
    // floor: meadow, Lamoille Creek, the road, conifers and aspen along the wall feet
    const floor = fl.concat(fr);
    s += clip(floor, prule(R, 0, 120, 47, 75, 0.9, 3.4, { w: 0.25, op: 0.3, seg: 6, gapw: 3 }));
    s += K.stipple(floor, { n: 60, r: 0.25, op: 0.45, rng: R });
    s += line(cr([[60, 46.5], [58.5, 49], [61, 52], [56.5, 56], [60, 61], [51, 66], [54.5, 70], [46, 75]]), 0.45, 0.75);
    const road = cr([[63.5, 46.5], [67, 50], [64, 54], [72, 58], [66.5, 63], [80, 68], [77, 75]]);
    s += line(road, 0.35, 0.7) + line(road.map((p) => [p[0] + 0.5 + (p[1] - 46) * 0.04, p[1]]), 0.35, 0.7);
    const tr = [];
    for (let i = 0; i < 26; i++) {
      const side = i % 2, t = 0.15 + R() * 0.82, p = resample(side ? fr : fl, 30)[Math.floor(t * 29)], up = R() * 5;
      tr.push([p[0] + (side ? 1 : -1) * up * 0.8, p[1] - up, 1.1 + (p[1] - 45) * 0.13]);
    }
    s += firs(R, tr, 2);
    s += K.stipple([[30, 60], [40, 54], [46, 56], [36, 63]], { n: 30, r: 0.45, op: 0.5, rng: R }) + K.stipple([[80, 56], [90, 60], [86, 64], [76, 59]], { n: 26, r: 0.45, op: 0.45, rng: R });
    s += line(fl, 0.4, 0.55) + line(fr, 0.4, 0.55);
    s += K.path(lr, { w: 1.0 }) + K.path(rr, { w: 1.0 });
    return plate(K, s);
  };

  /* ---------------- Ruby Dome: broad summit over its cirque and tarn ---------------- */
  B['ruby-dome'] = (K) => {
    const R = K.rng('ruby-dome');
    const far = K.ridge(R, [[-2, 31], [6, 27.5], [12, 29], [18, 25.5], [27, 30]], 0.6, 1.1);
    const far2 = K.ridge(R, [[92, 28], [99, 24], [105, 26.5], [112, 24.5], [122, 28]], 0.6, 1.1);
    const m = K.ridge(R, [[-2, 44], [8, 40], [16, 36], [24, 31], [32, 25], [40, 19], [46, 14], [51, 10.5], [56, 8.6], [61, 8], [65, 8.8], [70, 11.5], [76, 16], [82, 21], [87, 24], [92, 23], [98, 27], [106, 31], [114, 34], [122, 37]], 0.5, 0.9);
    const aL = cr([[50, 11], [45, 19], [40, 27], [35, 35], [29, 43], [22, 50]]);
    const aR = cr([[70, 11.5], [75, 19], [80, 27], [86, 35], [93, 43], [101, 50]]);
    const mp = under(m, 52);
    const hw = aL.slice().reverse().concat(m.filter((p) => p[0] > 50 && p[0] < 70), aR);
    const lo = m.filter((p) => p[0] <= 50).concat(aL, [[-2, 50]]);
    const ro = aR.concat([[122, 50]], m.filter((p) => p[0] >= 70).reverse());
    let s = knock(sky(K, R, 40), [mp, under(far, 52), under(far2, 52)]);
    s += knock(K.flank(far, { gap: 1.6, len: 5, w: 0.3, op: 0.35, rng: R }) + K.path(far, { w: 0.4, op: 0.5 }) + K.flank(far2, { gap: 1.6, len: 5, w: 0.3, op: 0.35, rng: R }) + K.path(far2, { w: 0.4, op: 0.5 }), [mp]);
    // headwall of the cirque: steep, dark, cut by snow couloirs
    const snow = [[54, 12.5], [58, 10.6], [63, 11], [66.5, 13.6], [62, 15.4], [57, 15.8]];
    const cou = [cr([[57, 15], [55, 22], [53, 29], [51.5, 36]]), cr([[63, 14.5], [64.5, 21], [66, 28], [68, 35]]), cr([[46, 22], [44.5, 28], [43, 34]])];
    let h = K.hatch(hw, { angle: 90, gap: 0.85, w: 0.28, op: 0.5, rng: R, jitter: 0.5 });
    h += clip([[60, 0], [122, 0], [122, 60], [60, 60]], K.hatch(hw, { angle: 74, gap: 1.1, w: 0.25, op: 0.4, rng: R }));
    h += K.flank(m.filter((p) => p[0] > 49 && p[0] < 71), { gap: 0.6, len: 26, w: 0.3, op: 0.45, rng: R });
    h = knock(h, [snow].concat(cou.map((c) => ({ d: pd(c), w: 1.3 }))));
    h += line(cr([[30, 42], [45, 46.5], [60, 47.5], [75, 46.5], [92, 42]]), 0.3, 0.45) + line(cr([[36, 38], [50, 41.5], [64, 42.4], [78, 41], [88, 37.5]]), 0.3, 0.35);
    h += K.stipple([[44, 40], [52, 37], [56, 46], [42, 48]], { n: 26, r: 0.3, op: 0.5, rng: R }) + K.stipple([[64, 37], [72, 39], [74, 47], [62, 46]], { n: 26, r: 0.3, op: 0.5, rng: R });
    s += clip(hw, h) + line(snow, 0.3, 0.5);
    // outer faces: lit left, shaded right
    s += clip(lo, K.flank(m, { gap: 1.4, len: 14, w: 0.3, op: 0.45, rng: R }) + K.hatch(lo, { angle: 70, gap: 2.4, w: 0.25, op: 0.3, rng: R }));
    s += clip(ro, K.flank(m, { gap: 0.9, len: 16, w: 0.3, op: 0.55, rng: R }) + K.hatch(ro, { angle: 66, gap: 0.95, w: 0.25, op: 0.45, rng: R }) + K.hatch(ro, { angle: 120, gap: 1.8, w: 0.25, op: 0.3, rng: R }));
    s += line(aL, 0.55, 0.85) + line(aR, 0.55, 0.85);
    // the tarn with the summit's reflection
    const lake = [];
    for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2; lake.push([60 + 47 * Math.cos(a), 55.2 + 4.8 * Math.sin(a) + (R() - 0.5) * 0.5]); }
    const refl = m.filter((p) => p[0] > 26 && p[0] < 96).map((p) => [p[0], 50.6 + (50.6 - p[1]) * -0.3 + 0.5]);
    const reflP = [[26, 50.4]].concat(refl.map((p) => [p[0], 50.4 + (p[1] - 50.4) * 0 + Math.max(0, 52 - yAt(m, p[0])) * 0.22]), [[96, 50.4]]);
    s += clip(lake, prule(R, 10, 110, 50.9, 60, 0.75, 1.3, { w: 0.3, op: 0.45, seg: 9, gapw: 2.5 }) + K.hatch(reflP, { angle: 0, gap: 0.55, w: 0.3, op: 0.45, rng: R }));
    s += line(lake.slice(18), 0.6, 0.85) + line(lake.slice(0, 19), 0.45, 0.6);
    // foreground shore: boulders, sedge, limber pines
    s += K.hatch([[-2, 60], [20, 59], [50, 61], [80, 60.4], [122, 59.6], [122, 75], [-2, 75]], { angle: -12, gap: 1.6, w: 0.25, op: 0.28, rng: R });
    s += rocks(R, [[8, 64, 2.4], [15, 66.5, 1.6], [28, 62.6, 1.3], [40, 68, 2.8], [55, 63.5, 1.1], [70, 66, 1.8], [86, 63, 1.4], [97, 69, 2.6]], { w: 0.5 });
    s += firs(R, [[104, 66, 11], [110, 68, 14], [115.5, 65, 9]], 10, 0.55);
    s += K.path(m, { w: 1.0 });
    return plate(K, s);
  };

  /* ---------------- East Humboldt Range: Angel Lake cirque, Lizzie's Window, above Wells ---------------- */
  B['east-humboldt-range'] = (K) => {
    const R = K.rng('east-humboldt-range');
    const m = K.ridge(R, [[-2, 33], [6, 28], [12, 24], [17, 20], [22, 22], [27, 17], [32, 19], [37, 14.5], [42, 18], [47, 16], [52, 21], [57, 19], [62, 16], [68, 13], [74, 10], [79, 7.5], [83, 8.2], [86.5, 10.3], [91, 10.4], [95, 13.5], [100, 18], [106, 22], [113, 27], [122, 31]], 0.45, 0.8);
    const base = 54, mp = under(m, base);
    const hole = [[87.3, 12.3], [89.1, 11.7], [90.7, 12.7], [90.3, 14.9], [87.7, 15]];
    const cq = [[25, 18.5]].concat(m.filter((p) => p[0] > 25 && p[0] < 50), [[50, 20], [51, 27], [53, 34], [46, 37.4], [38, 38.2], [30, 37.4], [22, 34], [24, 26]]);
    let s = knock(sky(K, R, 40), [mp, { white: hole }]);
    s += clip(hole, K.ruling(86, 92, 11, 16, { gap: 0.9, w: 0.25, op: 0.35, rng: R }));
    // the west face: long fall-lines, snow-streaked gullies
    let f = K.flank(m, { gap: 0.95, len: 40, base: base, w: 0.3, op: 0.42, rng: R }) + K.flank(m, { gap: 0.8, len: 22, w: 0.3, op: 0.45, rng: R, shadowOnly: true });
    f += K.hatch(mp, { angle: 64, gap: 2.2, w: 0.25, op: 0.25, rng: R });
    const gul = [[70, 13.5, 24], [76, 10.5, 22], [81.5, 8.6, 20], [93.5, 13, 22], [40.5, 17, 9], [12, 25, 32], [62, 17, 26], [104, 21, 30]].map(([x, y, y2]) => ({ d: pd(cr([[x, y + 1], [x - 0.6, (y + y2) / 2], [x + 0.4, y2]])), w: 1.0 }));
    f = knock(f, [hole, cq].concat(gul));
    s += f;
    // Angel Lake cirque: dark headwall, tarn, moraine lip, switchback road
    s += clip(cq, K.hatch(cq, { angle: 90, gap: 0.7, w: 0.28, op: 0.55, rng: R, jitter: 0.4 }) + K.flank(m, { gap: 0.6, len: 18, w: 0.3, op: 0.4, rng: R }));
    s += line(cr([[25, 18.5], [24, 26], [22, 34], [19, 42], [15, 48]]), 0.5, 0.8) + line(cr([[50, 20], [51, 27], [53, 34], [56, 42], [60, 48]]), 0.5, 0.8);
    const lk = [];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; lk.push([38 + 7.4 * Math.cos(a), 39.8 + 1.5 * Math.sin(a)]); }
    s += clip(lk, K.ruling(30, 46, 38.6, 41.4, { gap: 0.6, w: 0.25, op: 0.5, rng: R })) + line(lk, 0.45, 0.85);
    s += line(cr([[27, 41], [38, 42.8], [49, 41]]), 0.4, 0.6);
    s += line([[38, 42.9], [45, 45], [33, 47.5], [46, 50.5], [32, 53.5], [42, 56.5], [36, 61]], 0.4, 0.75);
    // the window in the crest south of Hole in the Mountain Peak
    s += S(pd(hole, true), 0.5, 0.9);
    // fans and valley floor at Wells: sage, rail line, the little town
    s += line(cr([[-2, 54], [30, 53.5], [60, 54.4], [90, 53.6], [122, 54.2]]), 0.45, 0.6);
    s += K.stipple([[-2, 55], [122, 55], [122, 75], [-2, 75]], { n: 160, r: 0.3, op: 0.45, rng: R });
    s += prule(R, 0, 120, 56, 75, 1.2, 3.2, { w: 0.25, op: 0.25, seg: 5, gapw: 3 });
    let ties = '';
    for (let x = 0; x < 120; x += 1.6) ties += 'M' + r2(x) + ' 63.4L' + r2(x - 0.3) + ' 64.6';
    s += line([[-2, 63.6], [122, 63.6]], 0.55, 0.85) + line([[-2, 64.4], [122, 64.4]], 0.4, 0.7) + S(ties, 0.25, 0.6);
    let hs = '';
    for (const [x, y, w] of [[78, 61.5, 2.2], [81.6, 61.8, 1.6], [85, 61.3, 2.6], [89, 61.9, 1.8], [92.5, 61.4, 2.2], [96, 61.8, 1.4], [74.5, 62, 1.5]]) hs += pd([[x, y], [x, y - w * 0.6], [x + w / 2, y - w], [x + w, y - w * 0.6], [x + w, y]], true);
    s += S(hs, 0.35, 0.8, ' fill="currentColor" fill-opacity="0.2"');
    s += K.stipple([[70, 61], [100, 61], [100, 62.6], [70, 62.6]], { n: 30, r: 0.55, op: 0.55, rng: R });
    s += K.path(m, { w: 1.0 });
    return plate(K, s);
  };

  /* ---------------- Jarbidge: jagged volcanic crest over a deep rimrock canyon ---------------- */
  B['jarbidge'] = (K) => {
    const R = K.rng('jarbidge');
    const crest = K.ridge(R, [[-2, 21], [4, 15], [8, 18], [13, 11], [17, 16], [21, 12.5], [26, 18], [31, 13], [36, 17], [41, 11.5], [46, 15.5], [51, 12.5], [56, 17], [61, 11], [66, 7], [68.5, 5.6], [70.5, 6.2], [72.6, 13], [77, 12], [82, 17], [88, 14], [94, 18.5], [100, 15], [107, 20], [114, 18], [122, 22]], 0.8, 0.7);
    const wl = K.ridge(R, [[-2, 31], [8, 30], [16, 31.5], [24, 33], [32, 36], [40, 40.5], [47, 45.5], [53, 51], [57.5, 55]], 0.5, 0.8);
    const wr = K.ridge(R, [[62.5, 55], [67, 50], [73, 45], [80, 40.5], [88, 37], [96, 34], [106, 32], [122, 31]], 0.5, 0.8);
    const lp = wl.concat([[56, 58], [50, 65], [43, 75], [-2, 75]]);
    const rp = [[62.5, 55]].concat(wr, [[122, 75], [92, 75], [76, 66], [67, 60]]);
    const spires = [];
    for (const [x, h, w] of [[7, 7, 2.2], [10.5, 9.5, 1.8], [13, 6, 1.6], [19, 8, 2.4], [22.5, 5, 1.6], [28, 6.5, 2]]) {
      const by = yAt(wl, x) + 0.8;
      spires.push([[x - w / 2, by], [x - w * 0.32, by - h * 0.6], [x - w * 0.12, by - h], [x + w * 0.18, by - h * 0.94], [x + w * 0.34, by - h * 0.5], [x + w / 2, by]]);
    }
    const crP = under(crest, 60);
    let s = knock(sky(K, R, 30), [crP, lp, rp].concat(spires));
    let c = K.flank(crest, { gap: 0.8, len: 12, w: 0.3, op: 0.48, rng: R }) + K.flank(crest, { gap: 1.2, len: 7, w: 0.3, op: 0.4, rng: R, shadowOnly: true });
    c += K.hatch([[70.5, 6.2], [72.6, 13], [73, 22], [70, 22]], { angle: 90, gap: 0.5, w: 0.28, op: 0.6, rng: R });
    c += K.hatch(crP, { angle: 0, gap: 1.6, w: 0.22, op: 0.22, rng: R }) + K.path(crest, { w: 0.6, op: 0.8 });
    s += knock(c, [lp, rp].concat(spires));
    // walls: rimrock cliff bands with columnar jointing, talus, conifers
    const wall = (rim, poly, dense) => {
      const b1 = rim.map((p) => [p[0], p[1] + 4.5 + Math.sin(p[0] * 0.7) * 0.5]), b2 = rim.map((p) => [p[0], p[1] + 12]), b3 = rim.map((p) => [p[0], p[1] + 15]);
      let o = clip(poly, K.hatch(rim.concat(b1.slice().reverse()), { angle: 90, gap: dense ? 0.5 : 0.7, w: 0.28, op: 0.62, rng: R, jitter: 0.2 }) + K.hatch(b2.concat(b3.slice().reverse()), { angle: 90, gap: dense ? 0.6 : 0.85, w: 0.25, op: 0.5, rng: R }));
      o += clip(poly, line(b1, 0.35, 0.6) + line(b3, 0.3, 0.45) + K.hatch(poly, { angle: dense ? 28 : 150, gap: dense ? 1.0 : 1.9, w: 0.25, op: dense ? 0.42 : 0.3, rng: R }));
      return o;
    };
    s += wall(wl, lp, true) + wall(wr, rp, false);
    let sp = '';
    for (const p of spires) sp += K.hatch([p[2], p[3], p[4], p[5], [p[2][0], p[5][1]]], { angle: 90, gap: 0.45, w: 0.25, op: 0.65, rng: R }) + line(p, 0.5, 0.9);
    s += sp;
    const tr = [];
    for (let i = 0; i < 30; i++) { const left = i % 2 === 0, x = left ? 4 + R() * 46 : 66 + R() * 50, rim = left ? yAt(wl, x) : yAt(wr, x), y = rim + 17 + R() * 14; if (y < 73) tr.push([x, y, 1.8 + (y - 40) * 0.08]); }
    s += firs(R, tr, 2, 0.5);
    // river, and the cabins of Jarbidge town on the canyon floor
    const bl = cr([[57.5, 55.5], [55.6, 60], [52, 65], [45, 75]]), br = cr([[62.5, 55.5], [61.6, 61], [60.5, 66], [61, 75]]);
    s += clip(bl.concat(br.slice().reverse()), K.ruling(40, 64, 55, 75, { gap: 0.9, w: 0.28, op: 0.5, rng: R })) + line(bl, 0.45, 0.8) + line(br, 0.45, 0.8);
    let cab = '';
    for (const [x, y, k] of [[64.4, 58.4, 0.6], [66.6, 60.6, 0.75], [63.6, 63.8, 0.95], [69, 63.4, 0.9], [66, 68.5, 1.25], [72.5, 68, 1.1]]) {
      const w = 3 * k, h = 1.8 * k;
      cab += S(pd([[x, y], [x, y - h], [x + w * 0.5, y - h - 1.1 * k], [x + w, y - h], [x + w, y]], true), 0.35, 0.85) + fillp([[x + w * 0.5, y - h - 1.1 * k], [x + w, y - h], [x + w, y], [x + w * 0.5, y]], 0.25, 0.2, 0.5);
    }
    s += cab;
    s += K.path(wl, { w: 1.0 }) + K.path(wr, { w: 1.0 });
    return plate(K, s);
  };

  /* ---------------- Pilot Peak: the emigrants' pyramid over the salt desert ---------------- */
  B['pilot-peak'] = (K) => {
    const R = K.rng('pilot-peak');
    const hz = 57.2;
    const m = K.ridge(R, [[-2, 55.5], [8, 54.5], [16, 52.5], [22, 49.5], [28, 44], [33, 37], [38, 29.5], [43, 21.5], [47, 15], [50.5, 11], [53, 9.6], [55.5, 10.8], [58.5, 14.5], [62, 20.5], [66, 27], [70, 32.5], [74.5, 37.5], [79, 40.5], [84, 39.5], [90, 42.5], [96, 41.5], [103, 45], [111, 47.5], [122, 51]], 0.7, 0.8);
    const mp = under(m, 55.6);
    const sp = cr([[53, 9.9], [52.4, 18], [51, 28], [49, 38], [46, 47], [42, 55.6]]);
    const rf = [[53, 9.6]].concat(m.filter((p) => p[0] > 53 && p[0] < 80), [[80, 55.6]], sp.slice().reverse());
    let s = knock(sky(K, R, 55), [mp]);
    let f = K.flank(m, { gap: 1.0, len: 30, base: 55.6, w: 0.3, op: 0.4, rng: R });
    f += clip(rf, K.hatch(rf, { angle: 74, gap: 0.7, w: 0.28, op: 0.55, rng: R, jitter: 0.3 }) + K.hatch(rf, { angle: 118, gap: 1.3, w: 0.25, op: 0.35, rng: R }));
    f += K.hatch([[22, 55.6], [33, 37], [43, 21.5], [53, 9.6]].concat(sp.slice(1)), { angle: 84, gap: 2.2, w: 0.25, op: 0.3, rng: R });
    let gl = '';
    for (const [a, b] of [[[55.5, 12.5], [60, 30]], [[57, 16], [66, 36]], [[54, 14], [56, 34]], [[48, 18], [40, 40]], [[50, 24], [47, 44]]]) gl += pd(cr([a, [(a[0] + b[0]) / 2 + 0.6, (a[1] + b[1]) / 2], b]));
    f += S(gl, 0.4, 0.55);
    f = knock(f, [[[54.2, 11], [56, 12.5], [57.6, 21], [55.8, 19.5]], [[59, 16.5], [60.6, 18], [62.4, 26], [61, 25]], [[52.8, 12], [53.6, 13], [53.6, 22], [52.6, 20]]]);
    s += f + line(sp, 0.5, 0.75);
    // base fans, mirage shimmer, horizon
    for (let k = 0; k < 12; k++) s += line([[46 + k * 1.2, 53.2], [36 + k * 4, 55.7]], 0.25, 0.35);
    s += prule(R, 4, 116, 55.9, 57, 0.45, 0.45, { w: 0.28, op: 0.55, seg: 4, gapw: 1.6 });
    s += line([[-2, hz], [122, hz]], 0.45, 0.7);
    // salt flat: sparse ruling, crust polygons, the wagon road to the springs
    s += prule(R, 0, 120, hz + 1, 75, 0.9, 3.8, { w: 0.25, op: 0.3, seg: 10, gapw: 4 });
    s += crust(R, 63, 75, hz, 0.28);
    const t1 = cr([[122, 68], [100, 65], [82, 62.6], [66, 60.2], [54, 58.2]]);
    s += line(t1, 0.35, 0.55) + line(t1.map((p) => [p[0], p[1] + 0.25 + (p[1] - hz) * 0.12]), 0.35, 0.55);
    const wx = 86, wy = 63.4;
    let wg = S(pd([[wx - 2.4, wy - 2.3]]) + 'Q' + pt([wx - 2.8, wy - 5.6]) + ' ' + pt([wx, wy - 5.3]) + 'Q' + pt([wx + 2.8, wy - 5.6]) + ' ' + pt([wx + 2.4, wy - 2.3]) + 'Z', 0.4, 0.9, ' fill="currentColor" fill-opacity="0.1"');
    wg += line(rect(wx - 2.7, wx + 2.7, wy - 2.4, wy - 1.5).concat([[wx - 2.7, wy - 2.4]]), 0.4, 0.9) + line([[wx - 0.8, wy - 2.3], [wx - 0.9, wy - 5]], 0.25, 0.6) + line([[wx + 0.9, wy - 2.3], [wx + 1, wy - 5]], 0.25, 0.6);
    wg += S('M' + pt([wx - 1.7, wy - 0.95]) + 'm-0.95 0a0.95 0.95 0 1 0 1.9 0a0.95 0.95 0 1 0 -1.9 0M' + pt([wx + 1.6, wy - 1.05]) + 'm-1.05 0a1.05 1.05 0 1 0 2.1 0a1.05 1.05 0 1 0 -2.1 0', 0.35, 0.9);
    wg += line([[wx - 2.7, wy - 1.8], [wx - 4.8, wy - 1.5]], 0.3, 0.8);
    for (const ox of [wx - 6.3, wx - 9.6]) wg += fillp([[ox - 1.5, wy - 1.9], [ox - 0.6, wy - 2.6], [ox + 1.2, wy - 2.5], [ox + 1.5, wy - 1.6], [ox - 1.3, wy - 1.3], [ox - 2.2, wy - 1.7]], 0.7, 0.25) + S('M' + pt([ox - 1, wy - 1.4]) + 'V' + r2(wy - 0.2) + 'M' + pt([ox + 1.1, wy - 1.5]) + 'V' + r2(wy - 0.2), 0.3, 0.9);
    s += wg;
    s += K.path(m, { w: 1.0 });
    return plate(K, s);
  };

  /* ---------------- Silver Island Mountains: dark islands in a white salt sea ---------------- */
  B['silver-island-mountains'] = (K) => {
    const R = K.rng('silver-island-mountains');
    const hz = 46.6;
    const fi = K.ridge(R, [[1, 43], [4, 40.5], [7, 38.5], [10, 40.2], [14, 43]], 0.5, 0.7);
    const m = K.ridge(R, [[19, 45.4], [23, 40], [27, 36.5], [30, 38], [34, 30], [37, 32], [41, 25], [44, 27.5], [48, 20], [51, 23], [55, 18.5], [59, 24], [63, 22], [67, 28], [71, 26.5], [75, 32], [80, 30], [85, 35], [90, 33], [95, 39], [100, 44], [103, 45.4]], 1.1, 0.6);
    const m2 = K.ridge(R, [[104, 45.4], [108, 40], [111, 37.5], [115, 39.5], [119, 43], [122, 44.5]], 0.8, 0.7);
    const P = [under(fi, 43), under(m, 45.4), under(m2, 45.4)];
    let s = knock(sky(K, R, 44), P);
    let dark = '';
    for (const [sk, p] of [[fi, P[0]], [m, P[1]], [m2, P[2]]]) {
      dark += K.hatch(p, { angle: 56, gap: 0.75, w: 0.3, op: 0.62, rng: R, jitter: 0.2 }) + K.hatch(p, { angle: 122, gap: 1.05, w: 0.26, op: 0.45, rng: R });
      dark += clip(p, K.flank(sk, { gap: 0.5, len: 16, w: 0.3, op: 0.6, rng: R, shadowOnly: true }));
    }
    const rings = [rect(-2, 122, 38.3, 39.1), rect(-2, 122, 41.7, 42.4)];
    s += knock(dark, rings);
    for (const p of P) s += clip(p, line([[-2, 39.1], [122, 39.1]], 0.35, 0.75) + line([[-2, 42.4], [122, 42.4]], 0.35, 0.65));
    s += K.path(fi, { w: 0.8 }) + K.path(m, { w: 1.0 }) + K.path(m2, { w: 0.9 });
    // mirage: Floating Island hangs above the horizon on shimmering air
    s += prule(R, 0, 16, 43.4, 46.2, 0.5, 0.5, { w: 0.28, op: 0.5, seg: 2.5, gapw: 1.4 });
    s += prule(R, 17, 120, 45.6, 46.3, 0.35, 0.35, { w: 0.28, op: 0.55, seg: 4, gapw: 1.4 });
    s += K.hatch([[22, 46.6], [100, 46.6], [94, 48.2], [30, 48.2]], { angle: 0, gap: 0.5, w: 0.25, op: 0.3, rng: R });
    s += line([[-2, hz], [122, hz]], 0.4, 0.6);
    // white salt: barely ruled, crust cells, the speedway's black line to the horizon
    s += prule(R, 0, 120, 49, 75, 1.4, 4.6, { w: 0.22, op: 0.22, seg: 12, gapw: 6 });
    s += crust(R, 58, 75, hz, 0.25);
    s += line([[64, hz + 0.2], [50, 75]], 0.7, 0.75) + line([[64.6, hz + 0.2], [56, 75]], 0.3, 0.4);
    return plate(K, s);
  };

  /* ---------------- Promontory Summit: Jupiter and No. 119 pilot to pilot ---------------- */
  function loco(tip, dir, yR, sc, kind) {
    const X = (u) => tip - dir * u * sc, Y = (v) => yR - v * sc;
    const T = (pts) => pts.map(([u, v]) => [X(u), Y(v)]);
    const box = (u0, u1, v0, v1) => T([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
    const circ = (u, v, r, k) => { const o = []; for (let i = 0; i <= k; i++) { const a = (i / k) * Math.PI * 2; o.push([X(u + Math.cos(a) * r), Y(v + Math.sin(a) * r)]); } return o; };
    const cS = 16.5, jup = kind === 'jupiter';
    const stack = jup ? [[-1.4, 19.4], [-1.4, 23], [-2.6, 24.6], [-4.2, 27.6], [-4.4, 30.4], [-3.8, 31.6], [3.8, 31.6], [4.4, 30.4], [4.2, 27.6], [2.6, 24.6], [1.4, 23], [1.4, 19.4]]
      : [[-1.5, 19.4], [-1.7, 27], [-2.3, 29], [-2.5, 30.6], [2.5, 30.6], [2.3, 29], [1.7, 27], [1.5, 19.4]];
    const stk = T(stack.map(([du, v]) => [cS + du, v]));
    const head = T([[6.2, 19.4], [12.2, 19.4], [12.2, 24], [11.2, 25.4], [7.2, 25.4], [6.2, 24]]);
    const dome = (u, w, h) => T(cr([[u - w, 19.2], [u - w * 0.8, 19.2 + h * 0.7], [u, 19.2 + h], [u + w * 0.8, 19.2 + h * 0.7], [u + w, 19.2]], 3));
    const cab = T([[37, 9.6], [37, 27], [36, 27], [36, 28.4], [49.5, 28.4], [49.5, 27], [48.5, 27], [48.5, 9.6]]);
    const tender = box(50.5, 80, 3.4, 14.6);
    const sil = [T([[0, 0], [0, 0.4], [5, 4.6], [6.2, 4.6], [6.2, 9.8], [49.6, 9.8], [49.6, 0]]), box(6.2, 37.2, 9.4, 19.6), head, stk, cab, tender, box(50.5, 80, 14, 20), dome(25, 2.6, 4.2), dome(31.5, 1.8, 3.2)];
    let s = '', d = '';
    // pilot (cowcatcher)
    s += S(pd(T([[0, 0.4], [6.4, 0.4], [6.4, 4.6], [5, 4.6]]), true), 0.5, 0.95);
    for (let u = 0.9; u < 6.4; u += 0.85) d += pd(T([[u, 0.4], [u, u < 5 ? 0.4 + (u / 5) * 4.2 : 4.6]]));
    s += S(d, 0.3, 0.75) + S(pd(box(4.8, 7.2, 4.6, 6.2), true), 0.45, 0.9, ' fill="currentColor" fill-opacity="0.35"');
    // boiler with cylindrical shading, bands, handrail
    s += S(pd(box(7.2, 37, 9.8, 19.4), true), 0.6, 0.95);
    d = '';
    for (const v of [10.3, 10.9, 11.6, 12.4, 13.4, 14.6]) d += pd(T([[7.6, v], [36.6, v]]));
    for (const u of [14.5, 21, 29, 34.5]) d += pd(T([[u, 9.8], [u, 19.4]]));
    s += S(d, 0.28, 0.6) + line(T([[9, 16.8], [36.4, 16.8]]), 0.3, 0.8) + line(T([[6.6, 9.6], [37, 9.6]]), 0.55, 0.9);
    // headlamp, stack, domes, bell
    s += S(pd(head, true), 0.45, 0.95) + K_hatch(head, 0.6) + S(pd(box(8.8, 10, 25.4, 26.6), true), 0.35, 0.9);
    s += S(pd(T([[6.2, 20.6], [6.2, 23.4]])), 0.9, 0.9);
    s += S(pd(stk, true), 0.5, 0.95) + (jup ? K_hatch(T([[cS - 4.2, 27.6], [cS + 4.2, 27.6], [cS + 4.4, 30.4], [cS + 3.8, 31.6], [cS - 3.8, 31.6], [cS - 4.4, 30.4]]), 0.55) + line(T([[cS - 2.6, 24.6], [cS + 2.6, 24.6]]), 0.3, 0.8) : line(T([[cS - 2.3, 29], [cS + 2.3, 29]]), 0.35, 0.9) + K_hatch(T([[cS + 0.4, 19.4], [cS + 1.5, 19.4], [cS + 1.7, 27], [cS + 0.5, 27]]), 0.5));
    s += S(pd(dome(25, 2.6, 4.2)), 0.45, 0.95) + S(pd(dome(31.5, 1.8, 3.2)), 0.45, 0.95);
    s += S(pd(T([[28.2, 19.4], [27.6, 21.2], [28.4, 22.6], [29.2, 21.2], [28.6, 19.4]])), 0.35, 0.85);
    // cylinder, crosshead guide
    s += S(pd(box(8.6, 17, 5.4, 9.6), true), 0.45, 0.9) + line(T([[17, 7.6], [22, 7.6]]), 0.4, 0.85) + K_hatch(box(8.6, 17, 5.4, 7.2), 0.45);
    // cab
    s += S(pd(cab, true), 0.55, 0.95);
    const win = jup ? T([[39, 19], [39, 23.6], [40.6, 25], [44.4, 25], [46, 23.6], [46, 19]]) : box(39, 46, 19, 25);
    s += S(pd(win, true), 0.4, 0.9) + line(T([[42.5, 19], [42.5, jup ? 25 : 25]]), 0.25, 0.7);
    d = '';
    for (const u of [38, 47.5]) d += pd(T([[u, 10.4], [u, 26.4]]));
    s += S(d, 0.25, 0.55) + K_hatch(T([[37, 10], [48.5, 10], [48.5, 18], [37, 18]]), 0.35);
    // wheels: drivers with counterweights, leading truck, rods
    const wheel = (u, v, r, spokes, cw) => {
      let o = S(pd(circ(u, v, r, 28)), 0.55, 0.95) + S(pd(circ(u, v, r - 0.75, 24)), 0.3, 0.8) + S(pd(circ(u, v, 0.8, 10)), 0.35, 0.9);
      let sp = '';
      for (let k = 0; k < spokes; k++) { const a = (k / spokes) * Math.PI * 2 + 0.2; sp += pd([[X(u + Math.cos(a) * 0.8), Y(v + Math.sin(a) * 0.8)], [X(u + Math.cos(a) * (r - 0.75)), Y(v + Math.sin(a) * (r - 0.75))]]); }
      o += S(sp, 0.28, 0.8);
      if (cw) { const a0 = 2.2, p = []; for (let i = 0; i <= 8; i++) { const a = a0 - 0.75 + (1.5 * i) / 8; p.push([X(u + Math.cos(a) * (r - 0.9)), Y(v + Math.sin(a) * (r - 0.9))]); } for (let i = 8; i >= 0; i--) { const a = a0 - 0.55 + (1.1 * i) / 8; p.push([X(u + Math.cos(a) * (r - 2.6)), Y(v + Math.sin(a) * (r - 2.6))]); } o += fillp(p, 0.55, 0.25); }
      return o;
    };
    s += wheel(26.5, 6.2, 6.2, 12, true) + wheel(40.5, 6.2, 6.2, 12, true) + wheel(10, 2.7, 2.7, 8, false) + wheel(16.2, 2.7, 2.7, 8, false);
    const pin = (u) => [u + 3.2 * Math.cos(-0.95), 6.2 + 3.2 * Math.sin(-0.95)];
    s += line(T([pin(26.5), pin(40.5)]), 0.85, 0.95) + line(T([[17.4, 7.6], pin(26.5)]), 0.6, 0.9);
    // tender with its fuel: cordwood for Jupiter, coal for 119
    s += S(pd(tender, true), 0.5, 0.95) + line(T([[50.5, 2.8], [80, 2.8]]), 0.45, 0.85) + K_hatch(box(50.5, 80, 3.4, 9), 0.35);
    s += wheel(55, 2.5, 2.5, 6, false) + wheel(61, 2.5, 2.5, 6, false) + wheel(70, 2.5, 2.5, 6, false);
    if (jup) {
      let lg = '';
      for (let row = 0; row < 3; row++) for (let u = 52 + (row % 2) * 0.9; u < 79; u += 1.8) lg += 'M' + pt([X(u) - 0.8 * sc, Y(15.4 + row * 1.5)]) + 'a' + r2(0.8 * sc) + ' ' + r2(0.75 * sc) + ' 0 1 0 ' + r2(1.6 * sc) + ' 0a' + r2(0.8 * sc) + ' ' + r2(0.75 * sc) + ' 0 1 0 ' + r2(-1.6 * sc) + ' 0';
      s += S(lg, 0.3, 0.85);
    } else {
      s += S(pd(T(cr([[51, 14.6], [56, 17.6], [64, 18.8], [72, 17.8], [80, 15.6]], 4))), 0.45, 0.9) + K_hatch(T(cr([[51, 14.6], [56, 17.6], [64, 18.8], [72, 17.8], [80, 15.6]], 4)), 0.4, 1.0);
    }
    return { s, sil };
  }
  let K_hatch = () => '';
  B['promontory-summit'] = (K) => {
    const R = K.rng('promontory-summit');
    K_hatch = (poly, op, gap) => K.hatch(poly, { angle: 90, gap: gap || 0.6, w: 0.25, op: op, rng: R });
    const yR = 58.4, sc = 0.92;
    const J = loco(59.5, 1, yR, sc, 'jupiter'), U = loco(60.5, -1, yR, sc, 'up119');
    const far = K.ridge(R, [[54, 41], [66, 34], [76, 31], [86, 32.5], [98, 30], [110, 32.5], [122, 35]], 0.6, 1.0);
    const hl = K.ridge(R, [[-2, 44], [14, 40.5], [28, 42], [44, 39], [60, 41.4], [76, 38.4], [92, 40.6], [108, 38.6], [122, 42]], 0.6, 1.0);
    let bg = knock(sky(K, R, 44), [under(hl), under(far)]);
    bg += knock(K.flank(far, { gap: 1.4, len: 6, w: 0.28, op: 0.35, rng: R }) + K.path(far, { w: 0.4, op: 0.5 }), [under(hl)]);
    bg += K.flank(hl, { gap: 1.1, len: 6, w: 0.28, op: 0.45, rng: R }) + K.path(hl, { w: 0.55, op: 0.75 });
    bg += K.stipple([[-2, 44], [122, 44], [122, 57], [-2, 57]], { n: 170, r: 0.3, op: 0.5, rng: R });
    bg += prule(R, 0, 120, 46, 57, 1.4, 2.4, { w: 0.25, op: 0.25, seg: 5, gapw: 3 });
    let s = knock(bg, J.sil.concat(U.sil));
    // the track: two rails, ties, ballast
    let ties = '';
    for (let x = -1; x < 122; x += 1.9) ties += 'M' + r2(x) + ' 57.6L' + r2(x - 0.7) + ' 60';
    s += S(ties, 0.35, 0.7) + line([[-2, 57.5], [122, 57.5]], 0.45, 0.8) + line([[-2, yR + 0.3], [122, yR + 0.3]], 0.75, 0.95);
    s += K.stipple([[-2, 60.3], [122, 60.3], [122, 64], [-2, 64]], { n: 120, r: 0.3, op: 0.5, rng: R });
    s += prule(R, 0, 120, 64.5, 75, 1.6, 3, { w: 0.25, op: 0.28, seg: 6, gapw: 3 });
    s += J.s + U.s;
    // the last spike's gleam
    s += S('M60 59.6V62.2M58.7 60.9H61.3M59.1 60L60.9 61.8M60.9 60L59.1 61.8', 0.3, 0.85);
    return plate(K, s);
  };

  /* ---------------- Wasatch Range: the fault front with triangular facets and canyon mouths ---------------- */
  B['wasatch-range'] = (K) => {
    const R = K.rng('wasatch-range');
    const base = 50;
    const m = K.ridge(R, [[-2, 22], [5, 17], [10, 19], [15, 13], [19, 15], [23, 10], [26, 12], [28.5, 8.5], [31, 11], [35, 15.5], [40, 13.5], [46, 17], [52, 14], [57, 10.5], [61, 12.5], [65, 9], [69, 11.5], [74, 15.5], [80, 13], [86, 17.5], [92, 15], [98, 19], [104, 17], [111, 21], [122, 24]], 0.8, 0.8);
    const mp = under(m, base);
    let s = knock(sky(K, R, 30), [mp]);
    const fac = [], cans = [];
    const xs = [-6, 14, 36, 58, 80, 102, 126];
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i] + (i ? 2.2 : 0), b = xs[i + 1] - 2.2, mid = (a + b) / 2 + (R() - 0.5) * 3, ay = 33 + R() * 4;
      fac.push([[a, base], [mid, ay], [b, base]]);
      if (i) { const cx = xs[i] + (R() - 0.5), top = 21 + R() * 5; cans.push([[xs[i] - 2.2, base], [cx - 0.4, top], [cx + 0.4, top], [xs[i] + 2.2, base]]); }
    }
    let f = K.flank(m, { gap: 0.85, len: 26, base: 44, w: 0.3, op: 0.5, rng: R }) + K.flank(m, { gap: 1.0, len: 16, w: 0.3, op: 0.4, rng: R, shadowOnly: true });
    f += K.hatch(mp, { angle: 62, gap: 2.4, w: 0.22, op: 0.25, rng: R });
    f = knock(f, fac.concat(cans, [[23, 10.6], [27, 9.8], [26.6, 14.6], [24.6, 15.4]], [[28.5, 9.4], [31.4, 11.2], [30.2, 15.8]], [[57, 11.4], [60, 12.8], [58.4, 16]], [[65, 9.8], [68.4, 11.8], [66.6, 16.6], [64.6, 14]], [[15, 13.8], [18, 15.4], [16.4, 19]]));
    s += f;
    for (const t of fac) {
      const [A, M, Bp] = t, half = [M, [(A[0] + Bp[0]) / 2 + 1.2, base], Bp];
      s += K.hatch(t, { angle: 90, gap: 1.7, w: 0.25, op: 0.38, rng: R }) + K.hatch(half, { angle: 70, gap: 0.85, w: 0.25, op: 0.5, rng: R });
      s += line([A, M, Bp], 0.55, 0.85);
    }
    for (const c of cans) s += K.hatch(c, { angle: 90, gap: 0.42, w: 0.28, op: 0.62, rng: R }) + line(c, 0.4, 0.8) + line([[(c[1][0] + c[2][0]) / 2, c[1][1] + 2], [(c[0][0] + c[3][0]) / 2 + 0.3, base]], 0.3, 0.6);
    // Bonneville and Provo benches across the foot
    s += clip(mp, K.hatch(rect(-2, 122, 42.6, 44.2), { angle: 90, gap: 0.5, w: 0.25, op: 0.5, rng: R }) + line([[-2, 44.4], [122, 44.4]], 0.55, 0.9) + line([[-2, 47.3], [122, 47.3]], 0.4, 0.7));
    s += K.path(m, { w: 1.0 }) + line([[-2, base], [122, base]], 0.9, 0.95);
    // the valley floor: the city's survey grid in perspective
    let g = '';
    for (let k = 1; k <= 10; k++) { const y = base + 24 * Math.pow(k / 10, 1.5); g += 'M-2 ' + r2(y) + 'H122'; }
    for (let xb = -90; xb <= 210; xb += 15) { const at = (y) => 60 + (xb - 60) * ((y - 49) / 26); g += 'M' + pt([at(51), 51]) + 'L' + pt([at(75), 75]); }
    s += S(g, 0.25, 0.28);
    s += K.stipple([[-2, 51], [122, 51], [122, 75], [-2, 75]], { n: 140, r: 0.32, op: 0.45, rng: R });
    return plate(K, s);
  };

  /* ---------------- Lake Bonneville shorelines: level benches etched across a range front ---------------- */
  B['lake-bonneville-shorelines'] = (K) => {
    const R = K.rng('lake-bonneville-shorelines');
    const base = 53;
    // skyline drawn with the benches in profile at both ends of the ridge
    const m = K.ridge(R, [[-2, 46], [2, 45.6], [4, 44], [7, 40], [9.5, 38.8], [13, 38.6], [15, 36.5], [18, 32], [20.5, 30.3], [24, 30], [26, 27.5], [32, 21], [40, 16], [47, 13.2], [54, 14.6], [60, 13], [68, 15.6], [76, 18.6], [84, 22], [92, 27.6], [94.5, 30], [98.5, 30.4], [102, 33.8], [107, 38.2], [109, 38.7], [113, 39], [116, 43.5], [119, 45.7], [124, 46]], 0.3, 0.8);
    const mp = under(m, base);
    let s = knock(sky(K, R, 46), [mp]);
    const benches = [[30.3, 0.8], [38.7, 0.7], [45.6, 0.55]];
    // spurs and ravines
    let f = K.flank(m, { gap: 1.1, len: 40, base: base, w: 0.28, op: 0.36, rng: R });
    let sp = '';
    for (const x of [16, 30, 45, 61, 76, 90]) {
      const y0 = yAt(m, x) + 0.8, c = cr([[x, y0], [x + 1.4, y0 + (base - y0) * 0.35], [x + 0.6, y0 + (base - y0) * 0.7], [x + 2.6, base]]);
      sp += line(c, 0.45, 0.6);
      f += clip(c.concat(c.slice().reverse().map((p) => [p[0] + 5.5, p[1]])), K.hatch(c.concat(c.slice().reverse().map((p) => [p[0] + 5.5, p[1]])), { angle: 80, gap: 0.7, w: 0.25, op: 0.45, rng: R }));
    }
    f += sp;
    f = knock(f, benches.map(([y]) => rect(-2, 122, y - 0.25, y + 1.5)));
    s += f;
    for (const [y, w] of benches) {
      s += clip(mp, K.hatch(rect(-2, 122, y - 2.6, y - 0.25), { angle: 90, gap: 0.5, w: 0.25, op: 0.55, rng: R, jitter: 0.2 }) + line([[-2, y - 0.25], [122, y - 0.25]], 0.3, 0.6) + line([[-2, y + 1.5], [122, y + 1.5]], w, 0.95));
    }
    s += K.path(m, { w: 1.0 });
    // valley plain and what is left of the lake
    s += line([[-2, base], [122, base]], 0.5, 0.75);
    s += prule(R, 0, 120, 54.5, 60, 1.2, 1.8, { w: 0.25, op: 0.3, seg: 7, gapw: 3 });
    s += K.stipple([[-2, 53.5], [122, 53.5], [122, 60.2], [-2, 60.2]], { n: 80, r: 0.28, op: 0.4, rng: R });
    s += line(cr([[-2, 61], [30, 60.7], [60, 61.3], [90, 60.8], [122, 61.1]]), 0.5, 0.8);
    s += prule(R, 0, 120, 62, 75, 0.8, 2.2, { w: 0.3, op: 0.45, seg: 9, gapw: 2.5 });
    return plate(K, s);
  };

  /* ---------------- Bingham Canyon: the terraced bowl seen from the rim ---------------- */
  B['bingham-canyon-mine'] = (K) => {
    const R = K.rng('bingham-canyon-mine');
    const sk = K.ridge(R, [[-2, 13], [10, 9], [22, 11], [34, 6.5], [46, 8.5], [58, 5.5], [70, 8], [82, 6.5], [94, 10], [106, 8], [122, 12]], 0.6, 1.0);
    const cx = 60, N = 13, lev = [];
    for (let k = 0; k < N; k++) { const t = k / (N - 1), rx = 64 - 57 * Math.pow(t, 0.85), top = 18 + 40 * Math.pow(t, 1.05), ry = rx * 0.37; lev.push({ rx, ry, cy: top + ry }); }
    const ell = (e, a0, a1, dy, dr, k) => { const o = []; for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; o.push([cx + (e.rx - dr) * Math.cos(a), e.cy + dy - (e.ry - dr * 0.37) * Math.sin(a)]); } return o; };
    const pit = ell(lev[0], 0, Math.PI * 2, 0, 0, 64);
    let s = knock(sky(K, R, 24), [under(sk)]);
    let hill = K.flank(sk, { gap: 1.0, len: 14, w: 0.28, op: 0.45, rng: R }) + K.hatch(under(sk, 44), { angle: 64, gap: 1.6, w: 0.22, op: 0.3, rng: R });
    hill += line([[-2, 23.4], [14, 22.6], [20, 23], [24, 25.6]], 0.45, 0.7) + line([[96, 24.6], [101, 22.2], [112, 21.6], [122, 22]], 0.45, 0.7);
    hill += K.stipple([[-2, 23.6], [14, 22.8], [24, 25.8], [-2, 30]], { n: 40, r: 0.28, op: 0.5, rng: R }) + K.stipple([[96, 24.8], [101, 22.4], [122, 22.2], [122, 30]], { n: 40, r: 0.28, op: 0.5, rng: R });
    s += knock(hill + K.path(sk, { w: 0.7, op: 0.85 }), [pit]);
    // terraces: riser bands (shadowed on the left), crests, toes
    let tr = '';
    for (let k = 1; k < N; k++) {
      const e = lev[k], h = 1.0 + 0.5 * (1 - k / N), C = ell(e, -0.3, Math.PI + 0.3, 0, 0, 40), Tt = ell(e, -0.3, Math.PI + 0.3, h, 0.35, 40);
      const band = C.concat(Tt.slice().reverse());
      tr += clip(rect(-2, cx, 0, 80), K.hatch(band, { angle: 90, gap: 0.5, w: 0.25, op: 0.6, rng: R })) + clip(rect(cx, 122, 0, 80), K.hatch(band, { angle: 90, gap: 0.95, w: 0.25, op: 0.45, rng: R }));
      tr += line(C, 0.42, 0.85) + line(Tt, 0.25, 0.45);
    }
    tr += S(pd(ell(lev[0], 0, Math.PI, 0, 0, 48)), 0.6, 0.9);
    // haul roads switchbacking down the benches
    let rd = '';
    const P = (k, a) => { const e = lev[k]; return [cx + e.rx * Math.cos(a), e.cy - e.ry * Math.sin(a) + 0.4]; };
    for (const [k0, a0, k1, a1] of [[1, 2.55, 4, 2.2], [4, 2.2, 7, 2.6], [7, 2.6, 10, 2.15], [2, 0.55, 5, 0.95], [5, 0.95, 8, 0.6]]) { const a = P(k0, a0), b = P(k1, a1); rd += pd([a, b]) + pd([[a[0] + 0.7, a[1] + 0.2], [b[0] + 0.7, b[1] + 0.2]]); }
    tr += S(rd, 0.3, 0.85);
    const last = lev[N - 1], pond = [];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI * 2; pond.push([cx + 3.6 * Math.cos(a), last.cy + 1.4 + 1.0 * Math.sin(a)]); }
    tr += clip(pond, K.ruling(55, 65, last.cy, last.cy + 3, { gap: 0.55, w: 0.25, op: 0.6, rng: R })) + line(pond, 0.35, 0.8);
    s += clip(pit, tr);
    // near rim and the overlook
    const near = ell(lev[0], Math.PI, Math.PI * 2, 0, 0, 48);
    s += line(near, 1.0) + K.hatch(near.concat([[124, 75], [-4, 75]]), { angle: -8, gap: 1.5, w: 0.25, op: 0.3, rng: R });
    return plate(K, s);
  };

  /* ---------------- Antelope Island: the brown island over the lake, bison on the shore ---------------- */
  B['antelope-island'] = (K) => {
    const R = K.rng('antelope-island');
    const hz = 41.2;
    const far = K.ridge(R, [[-2, 39], [8, 37.2], [18, 38.4], [26, 37.6], [34, 39.2]], 0.4, 1.2);
    const m = K.ridge(R, [[3, 41.2], [8, 38.6], [15, 35.6], [22, 32], [29, 29], [36, 26.4], [43, 23], [50, 20], [55, 18], [59, 16.2], [63, 17], [68, 19.6], [74, 22], [80, 24.6], [86, 27.4], [92, 29.6], [99, 32.6], [106, 35.6], [113, 38.6], [120, 41.2]], 0.8, 0.8);
    const mp = under(m, hz);
    let s = knock(sky(K, R, 40), [mp, under(far, hz)]);
    s += knock(K.path(far, { w: 0.35, op: 0.45 }) + K.flank(far, { gap: 1.8, len: 2, w: 0.25, op: 0.3, rng: R }), [mp]);
    s += birds([[78, 9, 0.8], [82, 7.6, 0.7], [85.6, 9.4, 0.6]]);
    let f = K.flank(m, { gap: 0.9, len: 22, base: hz, w: 0.3, op: 0.5, rng: R }) + K.flank(m, { gap: 0.8, len: 12, w: 0.3, op: 0.4, rng: R, shadowOnly: true });
    f += K.hatch(mp, { angle: 64, gap: 1.9, w: 0.22, op: 0.28, rng: R });
    for (const x of [24, 40, 52, 70, 84, 100]) f += line(cr([[x, yAt(m, x) + 0.6], [x + 1.4, (yAt(m, x) + hz) / 2], [x + 3, hz]]), 0.35, 0.55);
    f = knock(f, [rect(-2, 122, 32.4, 33.4), rect(-2, 122, 36.4, 37.2)]);
    s += f + clip(mp, line([[-2, 33.4], [122, 33.4]], 0.4, 0.7) + line([[-2, 37.2], [122, 37.2]], 0.35, 0.6));
    s += K.path(m, { w: 1.0 }) + line([[-2, hz], [122, hz]], 0.45, 0.7);
    // lake, the island's reflection, the causeway
    const rf = [[3, hz]].concat(m.map((p) => [p[0], hz + (hz - p[1]) * 0.42]), [[120, hz]]);
    s += prule(R, 0, 120, hz + 0.8, 60, 0.7, 2.0, { w: 0.3, op: 0.45, seg: 9, gapw: 2.4 });
    s += K.hatch(rf, { angle: 0, gap: 0.6, w: 0.28, op: 0.4, rng: R });
    s += line([[122, 47.6], [112, 41.6]], 0.45, 0.8) + line([[122, 48.6], [113, 41.8]], 0.35, 0.6);
    // shore with saltgrass, and the bison herd
    const sh = cr([[-2, 59.6], [20, 58.8], [40, 59.8], [62, 59], [84, 60], [104, 59.2], [122, 59.8]]);
    s += line(sh, 0.6, 0.85) + K.stipple(sh.concat([[122, 75], [-2, 75]]), { n: 120, r: 0.3, op: 0.45, rng: R });
    let gr = '';
    for (let i = 0; i < 26; i++) { const x = R() * 120, y = 61 + R() * 13; for (let k = 0; k < 5; k++) gr += 'M' + pt([x + k * 0.35, y]) + 'L' + pt([x + k * 0.35 + (k - 2) * 0.35, y - 1 - R() * 1.2]); }
    s += S(gr, 0.28, 0.6);
    s += bison(30, 68, 1.35, 1) + bison(50, 63, 0.95, -1) + bison(63, 61.6, 0.65, 1) + bison(84, 62.4, 0.8, 1);
    return plate(K, s);
  };

  /* ---------------- Spiral Jetty: the basalt coil off Rozel Point ---------------- */
  B['spiral-jetty'] = (K) => {
    const R = K.rng('spiral-jetty');
    const hz = 17;
    const far = K.ridge(R, [[-2, 17], [8, 15.4], [18, 16.2], [30, 14], [42, 15.6], [52, 16.6], [64, 16.8], [78, 15], [92, 13.4], [104, 15.4], [122, 16.4]], 0.4, 1.0);
    const rp = cr([[-2, 29], [6, 30.4], [13, 33], [19, 36.6], [23, 41], [25, 44.6], [21, 46.4], [12, 46.6], [4, 47.8], [-2, 49]]);
    const shore = cr([[-2, 61.4], [10, 62.6], [22, 62], [36, 64.2], [48, 65.6], [62, 66.4], [76, 65.2], [90, 66.6], [104, 64.6], [122, 63.6]]);
    const fs = shore.concat([[122, 75], [-2, 75]]);
    // the jetty in plan (u east, v north), projected: causeway north from shore, then a counterclockwise coil inward
    const C = [54, 41.6], q = 0.4, r0 = 26, turns = 2.55, bw = 1.9;
    const plan = [];
    for (let v = -58; v < 0; v += 4) plan.push([r0, v]);
    for (let i = 0; i <= 150; i++) { const t = i / 150, a = t * turns * Math.PI * 2, r = r0 * (1 - 0.9 * t); plan.push([r * Math.cos(a), r * Math.sin(a)]); }
    const proj = (p) => [C[0] + p[0], C[1] - q * p[1]];
    const edge = (off) => plan.map((p, i) => { const a = plan[Math.max(0, i - 1)], b = plan[Math.min(plan.length - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; return proj([p[0] - (ty / l) * off, p[1] + (tx / l) * off]); });
    const jet = edge(bw).concat(edge(-bw).reverse()), halo = edge(bw + 1.7).concat(edge(-bw - 1.7).reverse());
    const center = plan.map(proj);
    let s = knock(sky(K, R, hz - 0.5), [under(far, hz + 1)]);
    s += K.path(far, { w: 0.45, op: 0.55 }) + K.flank(far, { gap: 1.6, len: 1.6, w: 0.25, op: 0.35, rng: R });
    // water: ruled, shimmering, knocked out by the white salt rim around the jetty
    let w = prule(R, 0, 120, hz + 0.6, 66, 0.7, 2.3, { w: 0.28, op: 0.5, seg: 8, gapw: 2.4 });
    w = knock(w, [rp.concat([[-2, 49]]), fs, halo, { d: pd(center), w: 4.5 }]);
    s += w;
    // Rozel Point: dark basalt headland, old pilings off its tip
    s += clip(rp, K.hatch(rp, { angle: 60, gap: 0.8, w: 0.28, op: 0.55, rng: R }) + K.hatch(rp, { angle: 130, gap: 1.3, w: 0.25, op: 0.4, rng: R }) + K.stipple(rp, { n: 50, r: 0.4, op: 0.6, rng: R }));
    s += line(rp.slice(0, 7), 0.75, 0.95) + line(rp.slice(6), 0.45, 0.7);
    let pil = '';
    for (let i = 0; i < 7; i++) pil += 'M' + pt([27 + i * 1.6, 45 + i * 0.25]) + 'v-' + r2(1.2 + R() * 0.6);
    s += S(pil, 0.4, 0.8);
    // the coil: dark basalt, salt-white rims
    s += fillp(jet, 0.5, 0.3, 0.9) + K.stipple(jet, { n: 260, r: 0.32, op: 0.75, rng: R });
    s += line(edge(bw), 0.35, 0.9) + line(edge(-bw), 0.35, 0.9);
    // foreground shore: basalt boulders on salt-crusted mud
    s += line(shore, 0.7, 0.9) + clip(fs, K.hatch(fs, { angle: -10, gap: 1.4, w: 0.25, op: 0.3, rng: R }));
    s += rocks(R, [[6, 66, 2.2], [13, 69, 1.6], [24, 66.8, 1.2], [34, 71, 2.6], [44, 68.4, 1.0], [96, 69.4, 1.8], [106, 67, 1.3], [113, 71.4, 2.4]], { w: 0.5 });
    return plate(K, s);
  };
})();
