/* AA2735 Window Atlas: bespoke engraved plates for the Sierra Nevada and western Nevada.
 * Each builder returns SVG body markup for a 120x72 viewBox (stroke = currentColor), after the
 * survey plates of King's 40th Parallel reports: hairline hatching for tone, one firm silhouette,
 * ruled sky and still water, light from the upper left, distance lighter and sparser.
 * Registered on window.BESPOKE (see js/engrave-kit.js); every plate is seeded by its POI id.
 */
(function () {
  'use strict';
  const B = (window.BESPOKE = window.BESPOKE || {});
  const PI = Math.PI;
  let U = 0;
  const uid = (p) => p + (U++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const r2 = (n) => Math.round(n * 100) / 100;
  const M = (x, y) => 'M' + r2(x) + ' ' + r2(y);
  const L = (x, y) => 'L' + r2(x) + ' ' + r2(y);
  const P = (d, w, op, x) => '<path d="' + d + '" stroke-width="' + w + '"' + (op != null ? ' stroke-opacity="' + op + '"' : '') + (x || '') + '/>';
  const F = (d, fop) => '<path d="' + d + '" fill="currentColor" fill-opacity="' + fop + '" stroke="none"/>';
  const poly = (pts) => 'M' + pts.map((p) => r2(p[0]) + ' ' + r2(p[1])).join('L') + 'Z';
  const line = (pts) => 'M' + pts.map((p) => r2(p[0]) + ' ' + r2(p[1])).join('L');
  const under = (s, by) => s.concat([[s[s.length - 1][0], by], [s[0][0], by]]);
  const skyOf = (s) => [[-2, -2], [-2, s[0][1]]].concat(s, [[122, s[s.length - 1][1]], [122, -2]]);
  const yAt = (s, x) => {
    if (x <= s[0][0]) return s[0][1];
    for (let i = 1; i < s.length; i++) if (s[i][0] >= x) { const [x0, y0] = s[i - 1], [x1, y1] = s[i]; return y0 + (y1 - y0) * ((x - x0) / (x1 - x0 || 1)); }
    return s[s.length - 1][1];
  };
  const ell = (cx, cy, rx, ry, a0, a1, n) => { const o = [], A0 = a0 || 0, A1 = a1 == null ? 2 * PI : a1, N = n || 48; for (let i = 0; i <= N; i++) { const a = A0 + ((A1 - A0) * i) / N; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; };
  const inside = (pg, x, y) => { let c = false; for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) { const [xi, yi] = pg[i], [xj, yj] = pg[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  function scatter(R, pg, n, fn) {
    const xs = pg.map((p) => p[0]), ys = pg.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    let s = '', k = 0, t = 0;
    while (k < n && t++ < n * 8) { const x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); if (inside(pg, x, y)) { s += fn(x, y, k); k++; } }
    return s;
  }
  function clip(K, pg, body) { const id = uid('sc'); return '<clipPath id="' + id + '"><path d="' + K.d(pg, true) + '"/></clipPath><g clip-path="url(#' + id + ')">' + body + '</g>'; }
  // nearer shapes `pgs` hide `body` (farther detail stops at the nearer silhouette)
  function behind(K, pgs, body, grow) {
    const id = uid('sm');
    return '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-5" y="-5" width="130" height="82"><rect x="-5" y="-5" width="130" height="82" fill="#fff" stroke="none"/>' +
      pgs.map((p) => '<path d="' + K.d(p, true) + '" fill="#000" stroke="#000" stroke-width="' + (grow == null ? 0.9 : grow) + '"/>').join('') + '</mask><g mask="url(#' + id + ')">' + body + '</g>';
  }
  const hatch = (K, R, pg, angle, gap, op, w) => K.hatch(pg, { angle, gap, op, w: w || 0.3, jitter: 0.25, rng: R });
  const skyRule = (K, R, s, o) => K.hatch(skyOf(s), Object.assign({ angle: 0, gap: 1.6, w: 0.26, op: 0.3, jitter: 0.2, rng: R }, o || {}));
  // cross-hatch the right-descending (shadow) face under each peak of skyline s
  function shade(K, R, s, o) {
    o = o || {};
    const depth = o.depth || 10, by = o.base || 72, tol = o.tol || 0.5;
    let out = '', i = 1;
    while (i < s.length) {
      if (s[i][1] > s[i - 1][1] + 0.05) {
        const st = i - 1;
        while (i < s.length && s[i][1] >= s[i - 1][1] - tol) i++;
        const run = s.slice(st, i), p = run[0], q = run[run.length - 1];
        if (q[0] - p[0] >= (o.min || 2) && q[1] - p[1] > (o.drop || 1.5)) {
          const pg = run.concat([[q[0] + (o.lean || 0), Math.min(by, q[1] + depth * 0.45)], [p[0] + (q[0] - p[0]) * 0.25, Math.min(by, p[1] + depth)]]);
          out += hatch(K, R, pg, o.angle || 64, o.gap || 0.85, o.op || 0.5, o.w);
          if (o.cross) out += hatch(K, R, pg, o.cross, (o.gap || 0.85) * 1.7, (o.op || 0.5) * 0.6, o.w);
        }
      } else i++;
    }
    return out;
  }
  // perspective water ruling between y0 (far) and y1 (near): gaps widen toward the viewer, broken for shimmer
  function water(R, x0, x1, y0, y1, o) {
    o = o || {};
    let d = '', y = y0, g = o.g0 || 0.7;
    while (y <= y1) {
      const xa = x0 + R() * 1.5, xb = x1 - R() * 1.5;
      if (R() < (o.breaks == null ? 0.35 : o.breaks)) { const m = xa + (xb - xa) * R(), h = 0.6 + R() * (o.gapw || 2.2); d += M(xa, y) + 'H' + r2(m - h) + M(m + h, y) + 'H' + r2(xb); } else d += M(xa, y) + 'H' + r2(xb);
      y += g; g *= o.grow || 1.06;
    }
    return P(d, o.w || 0.3, o.op);
  }
  // engraved conifer: trunk and stacked chevron boughs, with a faint tonal core
  function pine(x, y, h, op, w) {
    const t = Math.max(3, Math.round(h / 1.3));
    let d = M(x, y + 0.2) + L(x, y - h);
    for (let i = 1; i <= t; i++) { const yy = y - h + (h * 0.9 * i) / t, ww = 0.2 + (h * 0.3 * i) / t; d += M(x - ww, yy) + L(x, yy - h * 0.18) + L(x + ww * 0.9, yy); }
    return F(poly([[x, y - h], [x + h * 0.28, y - h * 0.1], [x - h * 0.3, y - h * 0.1]]), 0.14 * (op == null ? 1 : op)) + P(d, w || 0.4, op);
  }
  const tuft = (x, y, s) => M(x - 0.55 * s, y - 0.7 * s) + L(x, y) + L(x + 0.55 * s, y - 0.7 * s) + M(x, y) + L(x + 0.05 * s, y - 0.95 * s);
  const boulder = (x, y, r) => M(x - r, y) + 'Q' + r2(x - r * 0.9) + ' ' + r2(y - r * 0.9) + ' ' + r2(x) + ' ' + r2(y - r * 0.8) + 'Q' + r2(x + r * 0.95) + ' ' + r2(y - r * 0.7) + ' ' + r2(x + r) + ' ' + r2(y);

  /* ---------------- Sutter Buttes: a crown of volcanic spires alone on the valley floor ---------------- */
  B['sutter-buttes'] = (K) => {
    const R = K.rng('sutter-buttes'), HZ = 50;
    const core = K.ridge(R, [[22, 47], [27, 40], [30, 33], [33, 35], [36, 27], [39, 30], [42, 21], [45, 24], [47, 19], [50, 25], [53, 22], [56, 27], [58, 18], [61, 13], [63.5, 9.5], [66, 12], [68.5, 17], [71, 15], [74, 21], [77, 18], [80, 25], [83, 23], [87, 30], [91, 34], [95, 39], [100, 47]], 0.7, 0.7);
    const rim = K.ridge(R, [[6, HZ], [12, 46.5], [19, 43.5], [26, 42.8], [33, 44], [40, 41.6], [48, 43.2], [56, 40.8], [64, 42.4], [72, 40.4], [80, 42.6], [88, 41], [96, 43], [104, 42.2], [110, 45.5], [116, HZ]], 0.35, 1);
    const rimPg = under(rim, HZ + 0.5);
    let o = K.vignetteOpen();
    o += skyRule(K, R, [[0, HZ]].concat(core, [[120, HZ]]), { gap: 1.7 });
    o += P(M(0, 48.6) + 'Q8 47.4 17 48.4', 0.4, 0.3) + P(M(104, 48.2) + 'Q112 47 120 47.8', 0.4, 0.3); // far Coast Range / Sierra haze
    // the jagged lava-dome crown, hidden below by the nearer rim
    o += behind(K, [rimPg],
      hatch(K, R, under(core, HZ), 22, 2.1, 0.22) +
      shade(K, R, core, { depth: 16, angle: 66, gap: 0.75, op: 0.6, cross: -30, min: 1.5 }) +
      K.flank(core, { gap: 0.75, len: 11, w: 0.32, op: 0.75, rng: R }) +
      P(core.filter((p, i) => i % 9 === 4).map((p) => M(p[0] + 0.6, p[1] + 3) + L(p[0] + 1.6 + R() * 2, p[1] + 9 + R() * 6)).join(''), 0.3, 0.5) +
      P(K.d(core), 1.05));
    // radio masts on South Butte
    o += P(M(63.2, 9.6) + L(63.2, 4.4) + M(64.7, 10.4) + L(64.7, 6.4) + M(62.3, 5.6) + L(64.1, 5.6) + M(61.9, 7.6) + L(64.5, 7.6) + M(66, 11.6) + L(66, 8.4), 0.3, 0.9);
    // outer moat-and-rim of tilted sediments: low rounded hills with oak dots
    o += hatch(K, R, rimPg, 18, 1.5, 0.3) + K.flank(rim, { gap: 1, len: 3.5, base: HZ, w: 0.3, op: 0.6, rng: R }) + P(K.d(rim), 0.6, 0.9);
    o += K.stipple(under(rim.map(([x, y]) => [x, y + 1.2]), HZ - 0.6), { n: 60, r: 0.42, op: 0.55, rng: R });
    // the flat checkerboard valley: paddies, orchards and fallow in perspective
    const VX = 60, VY = 26, sc = (y) => (y - VY) / (HZ - VY), X = (xh, y) => VX + (xh - VX) * sc(y);
    const cols = [-70]; while (cols[cols.length - 1] < 190) cols.push(cols[cols.length - 1] + 8 + R() * 7);
    const rows = []; for (let k = 0; k <= 6; k++) rows.push(HZ + (72 - HZ) * Math.pow(k / 6, 1.65));
    let paddies = '', dots = '';
    for (let k = 0; k < 6; k++) {
      const y0 = rows[k], y1 = rows[k + 1];
      for (let i = 0; i < cols.length - 1; i++) {
        const a = cols[i], b = cols[i + 1], cell = [[X(a, y0), y0], [X(b, y0), y0], [X(b, y1), y1], [X(a, y1), y1]];
        if (cell[1][0] < -4 || cell[0][0] > 124 || cell[2][0] < -4 || cell[3][0] > 124) continue;
        const kind = (i + k) % 2 ? 0 : R() < 0.55 ? 1 : 2;
        if (kind === 0) paddies += K.hatch(cell, { angle: 0, gap: 0.55 + k * 0.17, w: 0.26, op: 0.5, breaks: 0.35, jitter: 0.1, rng: R });
        else if (kind === 1) { for (let f = 0.2; f < 1; f += 0.3) for (let t = 0.12; t < 1; t += 0.22) { const yy = y0 + (y1 - y0) * t; dots += M(X(a + (b - a) * f, yy), yy) + 'h0.01'; } }
      }
    }
    o += paddies + P(dots, 0.7, 0.55);
    let g = '';
    rows.slice(1).forEach((y) => { g += M(0, y) + L(120, y); });
    cols.forEach((xh) => { const xb = X(xh, 72); if (xb > -30 && xb < 150) g += M(X(xh, HZ), HZ) + L(xb, 72); });
    o += P(g, 0.3, 0.55);
    o += P(M(0, HZ) + L(120, HZ), 0.55, 0.9);
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Sierra Nevada: the long tilted block, gentle west slope, abrupt east scarp ---------------- */
  B['sierra-nevada'] = (K) => {
    const R = K.rng('sierra-nevada');
    const far = K.ridge(R, [[36, 42], [48, 33], [58, 24], [64, 18.5], [66.5, 17], [68, 19], [70, 26], [72, 33]], 0.5, 0.9);
    const main = K.ridge(R, [[0, 59], [8, 56], [18, 52.5], [28, 48], [38, 43], [48, 37.5], [57, 31.5], [65, 26], [72, 21.5], [78, 18], [82, 15.6], [85, 14.6], [87, 15.8], [88.6, 20], [90, 28], [91.6, 37], [93.4, 45], [95.6, 52], [98, 56], [102, 57.6], [120, 57.6]], 0.55, 0.8);
    const mainPg = under(main, 73);
    const east = main.filter((p) => p[0] >= 86 && p[0] <= 100);
    let o = K.vignetteOpen();
    o += skyRule(K, R, main.map(([x, y]) => [x, x > 36 && x < 72 ? Math.min(y, yAt(far, x)) : y]), { gap: 1.7 });
    // a farther stretch of the same block echoes the profile behind
    o += behind(K, [mainPg], K.flank(far, { gap: 1.2, len: 5, w: 0.3, op: 0.45, rng: R }) + shade(K, R, far, { depth: 9, op: 0.3, gap: 1.1 }) + P(K.d(far), 0.5, 0.55));
    // basin ranges far to the east
    const br = K.ridge(R, [[96, 57.6], [102, 53.5], [108, 51.8], [114, 53], [120, 52]], 0.4, 1);
    o += P(K.d(br), 0.4, 0.45) + K.flank(br, { gap: 1.4, len: 2.5, base: 57.6, w: 0.28, op: 0.35, rng: R });
    // west slope: lit, long, finely ruled along the grain of the tilt
    o += clip(K, mainPg, hatch(K, R, [[0, 10], [86, 10], [86, 73], [0, 73]], -24, 2.1, 0.22));
    // three river canyons cut down the tilt, shaded on their south walls
    [[[76, 22], [62, 34], [46, 44], [30, 53], [16, 61]], [[70, 26], [58, 37], [44, 47], [34, 54], [26, 64]], [[83, 18.4], [74, 29], [62, 40], [52, 49], [44, 58], [40, 70]]].forEach((c, j) => {
      const pts = K.ridge(R, c, 0.6, 1.4);
      o += clip(K, mainPg, P(K.d(pts), 0.45, 0.75) + P(pts.filter((p, i) => i % 2 === 0).map(([x, y]) => M(x + 0.2, y + 0.4) + L(x + 1.6, y + 2.4)).join(''), 0.3, 0.6 - j * 0.05));
    });
    // conifer belt as stippled forest, foothill oaks as scattered dots
    const belt = main.filter((p) => p[0] >= 26 && p[0] <= 74).map(([x, y]) => [x, y + 2.5]);
    const beltPg = belt.concat(belt.slice().reverse().map(([x, y]) => [x - 6, y + 11]));
    o += clip(K, mainPg, K.stipple(beltPg, { n: 260, r: 0.36, op: 0.6, rng: R }) + scatter(R, beltPg, 34, (x, y) => pine(x, y, 1.8 + R(), 0.6, 0.3)));
    o += clip(K, mainPg, K.stipple([[0, 60], [30, 50], [36, 60], [20, 73], [0, 73]], { n: 70, r: 0.5, op: 0.45, rng: R }));
    // granite domes and glacial tarns high on the slope
    o += P(M(70, 30) + 'Q73 25.6 76.4 29' + M(63.5, 34.5) + 'Q66 31.4 68.6 34' + M(74.5, 26.3) + 'Q76.6 23.4 79 25.6', 0.4, 0.7);
    o += F(poly(ell(77, 28.6, 1.2, 0.35, 0, 2 * PI, 12)), 0.4) + F(poly(ell(81.5, 23.8, 0.9, 0.3, 0, 2 * PI, 12)), 0.4);
    // snow along the crest: left white, edged with a few fine lines
    o += P(M(77, 19.6) + 'q2 1.2 3.6 0.4t3 0.8' + M(80.5, 17.6) + 'q1.6 0.8 3 0t2.2 0.6', 0.3, 0.6);
    // east escarpment: deep shadow, faceted spurs, alluvial fans at the foot
    const scarp = east.concat([[100, 58], [86, 58]]);
    o += hatch(K, R, scarp, 78, 0.6, 0.7) + hatch(K, R, scarp, -38, 1.3, 0.4);
    o += P(M(88.2, 22) + L(91, 33) + L(89.4, 40) + M(90.4, 30) + L(93.4, 44) + L(91.2, 50) + M(92, 40) + L(95.4, 52), 0.35, 0.8);
    o += F(poly(scarp), 0.08);
    for (let k = 0; k < 4; k++) { const ax = 91 + k * 2.2, ay = 47 + k * 2.5; let d = ''; for (let a = -0.5; a <= 0.5; a += 0.2) d += M(ax, ay) + L(ax + 6 * Math.cos(a), ay + 3.5 + 2 * Math.sin(a)); o += P(d, 0.25, 0.4); }
    // desert floor: sage and a dry lake
    o += water(R, 98, 122, 58, 72, { g0: 1, grow: 1.12, breaks: 0.6, op: 0.25, w: 0.26 }) + F(poly(ell(110, 61, 6, 1.1, 0, 2 * PI, 20)), 0.06) + P(K.d(ell(110, 61, 6, 1.1, 0, 2 * PI, 20)), 0.3, 0.5);
    o += P(K.d(main), 1.05);
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Donner Lake & Pass: the lake below the granite notch, snowsheds on the cliffs ---------------- */
  B['donner-lake-pass'] = (K) => {
    const R = K.rng('donner-lake-pass'), SH = 46;
    const main = K.ridge(R, [[0, 15], [7, 11], [14, 13], [21, 9.5], [27, 12.5], [33, 8], [36, 7.2], [39, 11], [45, 16], [51, 20.5], [56, 24.5], [59, 25.2], [62, 22.5], [68, 18], [75, 20], [83, 15.5], [92, 18.5], [101, 22], [110, 20.5], [120, 24]], 0.55, 0.7);
    const nl = K.ridge(R, [[-1, 37], [9, 39], [19, 42], [28, 45.5], [36, 49], [43, 53], [47, 56]], 0.5, 1);
    const nr = K.ridge(R, [[79, 55], [86, 50.5], [95, 47], [105, 44.5], [114, 42.5], [121, 41]], 0.5, 1);
    const nlPg = nl.concat([[47, 73], [-1, 73]]), nrPg = nr.concat([[121, 73], [79, 73]]);
    const mtn = under(main, SH);
    let o = K.vignetteOpen();
    o += skyRule(K, R, main);
    // granite faces of the crest: hatched shadows, glacier-polished slabs left pale
    o += behind(K, [nlPg, nrPg],
      shade(K, R, main, { depth: 22, angle: 66, gap: 0.8, op: 0.55, cross: -28 }) +
      K.flank(main, { gap: 0.8, len: 12, base: SH, w: 0.3, op: 0.7, rng: R }) +
      clip(K, mtn, hatch(K, R, [[0, 30], [120, 30], [120, SH], [0, SH]], 12, 1.4, 0.3)) +
      P(M(18, 24) + 'q4 -2 8 1' + M(70, 30) + 'q4 -2.4 9 0.6' + M(84, 26) + 'q3 -1.6 7 0.4' + M(28, 30) + 'q3 -1.4 6 0.6' + M(92, 33) + 'q3 -1.2 6 0.4', 0.3, 0.55) +
      // I-80 climbing the north wall
      P(M(121, 37.6) + L(96, 33) + L(78, 29.6) + L(64, 26.4) + M(121, 38.6) + L(96, 34) + L(78, 30.6) + L(64, 27.4), 0.3, 0.55) +
      // Central Pacific grade: snowshed galleries traversing the south wall, tunnels, China Wall, Summit Tunnel
      [[0, 33.4, 17, 31.6], [20, 31.3, 37, 29.6], [40.5, 29.3, 55, 28]].map(([x0, y0, x1, y1]) => {
        let d = M(x0, y0) + L(x1, y1) + M(x0, y0 + 1.4) + L(x1, y1 + 1.4);
        for (let x = x0 + 0.5; x < x1; x += 1) { const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); d += M(x, y + 0.15) + L(x, y + 1.4); }
        return F(poly([[x0, y0], [x1, y1], [x1, y1 + 1.4], [x0, y0 + 1.4]]), 0.3) + P(d, 0.32, 0.9) + P(M(x0 - 0.2, y0 + 0.1) + L(x1 + 0.2, y1 - 0.1), 0.6);
      }).join('') +
      P(M(17.6, 33) + 'a1 1 0 0 1 2 -0.2' + M(37.6, 31.2) + 'a1 1 0 0 1 2 -0.2' + M(55.4, 29.6) + 'a1.1 1.1 0 0 1 2.2 -0.1', 0.45, 0.9) +
      hatch(K, R, [[46, 29.6], [53, 28.7], [53.8, 33.6], [45.4, 34.6]], 0, 0.55, 0.6) + P(M(46, 31.2) + L(53.4, 30.4) + M(45.8, 33) + L(53.6, 32) + M(49, 29.2) + L(49.2, 34.2), 0.25, 0.6) +
      P(K.d(main), 1.05));
    // the lake: ruled still water with the crest reflected beneath the far shore
    const lake = [[-2, SH], [122, SH], [122, 66], [-2, 66]];
    o += behind(K, [nlPg, nrPg],
      water(R, 0, 120, SH + 0.7, 66, { g0: 0.62, grow: 1.075, breaks: 0.45 }) +
      clip(K, lake, P(main.filter((p, i) => i % 2 === 0).map(([x, y]) => M(x, SH + 0.5) + L(x + (R() - 0.5) * 0.6, SH + 0.5 + (SH - y) * 0.32)).join(''), 0.28, 0.4)) +
      P(M(-2, SH) + L(122, SH), 0.5, 0.85));
    // near shores: forested ridges framing the lake
    o += hatch(K, R, nlPg, 42, 0.9, 0.5) + hatch(K, R, nrPg, -42, 1.0, 0.45);
    o += K.flank(nl, { gap: 0.7, len: 6, w: 0.3, op: 0.7, rng: R }) + K.flank(nr, { gap: 0.9, len: 5, w: 0.3, op: 0.6, rng: R });
    [[3, 38.6, 7], [7.5, 39.6, 6], [12, 41, 6.4], [16.5, 41.6, 5], [24, 44.3, 4.5], [31, 47.4, 4], [91, 48.6, 5], [98, 46.3, 6], [104, 45.2, 5.5], [111, 43.4, 7], [116, 42.4, 6]].forEach(([x, y, h]) => { o += pine(x, y, h, 0.95, 0.42); });
    o += P(K.d(nl), 0.8) + P(K.d(nr), 0.8);
    // foreground: granite boulders at the water's edge
    o += P(boulder(30, 69, 3.4) + boulder(36, 70.4, 2) + boulder(84, 68.6, 2.8) + boulder(90, 70, 1.8), 0.5, 0.85);
    o += hatch(K, R, [[31, 66], [33.4, 69], [27, 69]], 64, 0.7, 0.5) + hatch(K, R, [[85.5, 66], [86.8, 68.6], [82, 68.6]], 64, 0.7, 0.5);
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Lake Tahoe: Emerald Bay and Fannette Island, the great lake and the Carson Range beyond ---------------- */
  B['lake-tahoe'] = (K) => {
    const R = K.rng('lake-tahoe'), FS = 22;
    const carson = K.ridge(R, [[0, 19.5], [9, 17.8], [18, 18.8], [28, 16.2], [38, 17.2], [50, 14.4], [60, 15.6], [70, 13], [80, 15.2], [92, 13.8], [104, 16.4], [113, 15], [120, 17.4]], 0.45, 1.1);
    const left = K.ridge(R, [[-1, 11], [6, 9.5], [12, 12], [18, 15], [25, 21], [33, 28], [41, 34], [49, 38.6], [56, 41.2], [61.5, 42.6]], 0.6, 0.8);
    const lShore = K.ridge(R, [[61.5, 42.6], [58, 45], [53, 48.4], [47, 53], [42, 59], [38, 66], [36, 73]], 0.4, 1);
    const right = K.ridge(R, [[66.5, 42.8], [71, 41.4], [78, 39.6], [87, 36.6], [97, 33.4], [108, 30.4], [121, 28]], 0.4, 1);
    const rShore = K.ridge(R, [[66.5, 42.8], [69, 45.6], [73, 49.6], [79, 54.6], [86, 61], [92, 67], [96, 73]], 0.4, 1);
    const lPg = left.concat(lShore.slice(1), [[-1, 73]]), rPg = right.concat([[121, 73]], rShore.slice().reverse());
    const bay = lShore.concat(rShore.slice().reverse());
    let o = K.vignetteOpen();
    o += skyRule(K, R, carson);
    // Carson Range across the lake: pale, snow on the crest
    o += behind(K, [lPg, rPg], K.flank(carson, { gap: 1.1, len: 3.2, base: FS, w: 0.26, op: 0.45, rng: R }) + shade(K, R, carson, { depth: 4, base: FS, op: 0.3, gap: 1, drop: 1 }) + P(K.d(carson), 0.45, 0.6) +
      // the open lake: fine ruling widening toward the viewer, the far shore a single crisp line
      water(R, 0, 120, FS + 0.6, 45, { g0: 0.5, grow: 1.065, breaks: 0.4 }) + P(M(0, FS) + L(120, FS), 0.5, 0.8));
    // the bay: still water, shallows stippled along the shore
    o += clip(K, bay, water(R, 30, 100, 43, 73, { g0: 0.55, grow: 1.05, breaks: 0.5 }) + K.stipple(lShore.concat(lShore.slice().reverse().map(([x, y]) => [x + 2.8, y])), { n: 50, r: 0.3, op: 0.45, rng: R }) + K.stipple(rShore.concat(rShore.slice().reverse().map(([x, y]) => [x - 2.4, y])), { n: 40, r: 0.3, op: 0.45, rng: R }));
    // Fannette Island with its stone tea house, reflected below
    const isl = K.ridge(R, [[54.4, 56.6], [56.6, 54.2], [58.6, 52.6], [60.4, 52.4], [62.4, 54], [65, 56.6]], 0.2, 0.6);
    o += P(isl.map(([x, y]) => M(x, 56.9) + L(x, 56.9 + (56.6 - y) * 0.6)).join(''), 0.25, 0.4);
    o += hatch(K, R, under(isl, 56.6), 60, 0.75, 0.55) + pine(57.4, 53.9, 2.6, 0.9, 0.3) + pine(62.8, 54.6, 2.2, 0.9, 0.3) + P(K.d(isl) + M(54, 56.7) + L(65.6, 56.7), 0.6);
    o += P(M(58.9, 52.5) + L(58.9, 51.1) + L(60.2, 51.1) + L(60.2, 52.4) + M(58.6, 51.2) + L(59.55, 50.2) + L(60.5, 51.2), 0.35);
    // left wall: granite crags of Maggies Peaks falling to Emerald Point
    o += K.flank(left, { gap: 0.7, len: 14, w: 0.3, op: 0.7, rng: R }) + shade(K, R, left, { depth: 20, gap: 0.8, op: 0.5, cross: -30, drop: 0.8 });
    o += hatch(K, R, lPg, 40, 1.15, 0.38);
    o += clip(K, lPg, scatter(R, [[0, 26], [30, 30], [56, 44], [44, 58], [34, 73], [0, 73]], 26, (x, y) => pine(x, y, 2.6 + R() * 1.8, 0.85, 0.32)));
    o += P(K.d(left), 1.05) + P(K.d(lShore), 0.6, 0.9);
    // right wall: the forested slope below the overlook
    o += hatch(K, R, rPg, -40, 1.0, 0.42) + K.flank(right, { gap: 0.9, len: 4, w: 0.3, op: 0.6, rng: R });
    o += clip(K, rPg, scatter(R, [[70, 44], [120, 29], [121, 73], [92, 73]], 24, (x, y) => pine(x, y, 2.6 + R() * 2, 0.85, 0.32)));
    o += P(K.d(right), 0.8) + P(K.d(rShore), 0.6, 0.9);
    // framing pines on the overlook
    [[108, 72, 30], [114, 73, 36], [6, 73, 26]].forEach(([x, y, h]) => { o += pine(x, y, h, 1, 0.5); });
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Sierra Buttes: saw-tooth crest and lookout above Lower Sardine Lake ---------------- */
  B['sierra-buttes'] = (K) => {
    const R = K.rng('sierra-buttes'), SH = 50;
    const crest = K.ridge(R, [[-1, 44], [6, 38], [12, 33], [17, 27], [20, 23], [22.5, 26], [25.5, 19], [28, 22], [31, 15.5], [33.5, 19], [36.5, 13], [39, 16.5], [42, 11], [44.5, 14.5], [47, 10.5], [50, 13], [53, 8], [54.6, 7], [58.6, 6.8], [60.2, 9.6], [62.4, 8.6], [64.6, 13], [67.4, 10.6], [70, 15.6], [73, 13.8], [76.4, 20], [80, 18.4], [84, 25], [90, 30], [98, 35], [108, 40.5], [121, 45]], 0.55, 0.55);
    const shore = K.ridge(R, [[-1, SH], [20, SH - 0.6], [50, SH - 0.2], [80, SH - 0.8], [121, SH]], 0.3, 2);
    const mtn = under(crest, SH);
    let o = K.vignetteOpen();
    o += skyRule(K, R, crest);
    // rock: deep couloirs and buttresses, shadowed on the right of every spire
    o += shade(K, R, crest, { depth: 28, angle: 74, gap: 0.68, op: 0.62, cross: -24, min: 1.4, drop: 1.2 });
    o += K.flank(crest, { gap: 0.6, len: 16, base: SH, w: 0.3, op: 0.75, rng: R });
    o += clip(K, mtn, hatch(K, R, [[0, 10], [120, 10], [120, SH], [0, SH]], 84, 1.6, 0.3) +
      // gullies: dark clefts falling from each notch, with snow left white beside them
      P(crest.filter((p, i, a) => i > 0 && i < a.length - 1 && p[1] > a[i - 1][1] && p[1] > a[i + 1][1] && p[1] < 30).map(([x, y]) => M(x, y + 0.6) + 'q' + r2(0.8 + R()) + ' 8 ' + r2(-0.4 + R()) + ' ' + r2(18 + R() * 8)).join(''), 0.55, 0.8));
    // talus cones at the foot of the cliffs
    const talus = [[4, SH], [14, 40], [24, 38.6], [34, 40], [48, 37.4], [62, 39], [76, 38], [90, 40.6], [104, 42.6], [116, SH]];
    o += K.stipple(talus, { n: 240, r: 0.3, op: 0.6, rng: R }) + P(M(14, 40) + 'q4 -1.8 10 -1.4' + M(48, 37.4) + 'q6 0.6 14 1.6' + M(76, 38) + 'q6 1 14 2.6', 0.3, 0.6);
    // the fire lookout perched on the summit block, its steel stairs hung on the cliff
    o += F(poly([[55.3, 6.9], [55.3, 3.9], [58.9, 3.9], [58.9, 6.8]]), 0.12);
    o += P(M(55.3, 6.9) + L(55.3, 3.9) + L(58.9, 3.9) + L(58.9, 6.8) + M(54.5, 4) + L(56, 2.9) + L(58.2, 2.9) + L(59.7, 4) + M(54.6, 5.6) + L(59.6, 5.6) + M(56.5, 4.6) + L(57.7, 4.6), 0.4);
    o += P(M(54.6, 5.6) + L(54.6, 6.7) + M(59.6, 5.6) + L(59.6, 6.7) + M(54.4, 7.2) + L(53.4, 8.4) + L(54.4, 9.4) + L(53, 10.8) + L(54, 11.8) + L(52.8, 13.2), 0.3, 0.9);
    // shore forest
    for (let x = -1; x < 122; x += 2.2 + R() * 2) { const y = yAt(shore, x) + 0.2; o += pine(x, y, 3 + R() * 3.2, 0.9, 0.34); }
    o += P(K.d(crest), 1.05);
    // Lower Sardine Lake: still water mirroring the spires
    const lake = [[-2, SH], [122, SH], [122, 66], [-2, 66]];
    o += water(R, 0, 120, SH + 0.7, 65, { g0: 0.62, grow: 1.08, breaks: 0.45 });
    o += clip(K, lake, P(crest.filter((p, i) => i % 2 === 0 && p[1] < 32).map(([x, y]) => M(x, SH + 1) + L(x + (R() - 0.5), SH + 1 + (SH - y) * 0.36)).join(''), 0.3, 0.38));
    o += P(K.d(shore), 0.5, 0.9);
    // foreground shore: boulders and a framing fir
    o += P(boulder(16, 70, 3.6) + boulder(23, 71, 2.2) + boulder(98, 69.4, 3) + M(-2, 66.6) + 'Q20 65.4 44 67.2' + M(80, 67) + 'Q100 65.8 122 66.4', 0.5, 0.85);
    o += hatch(K, R, [[17.6, 66.8], [19.6, 70], [13, 70]], 64, 0.7, 0.5);
    o += pine(112, 73, 26, 1, 0.48) + pine(6, 73, 18, 1, 0.45);
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Castle Peak: three volcanic turrets above Donner Summit ---------------- */
  B['castle-peak'] = (K) => {
    const R = K.rng('castle-peak'), j = () => (R() - 0.5) * 0.25;
    const back = K.ridge(R, [[56, 30], [68, 26], [80, 23.5], [92, 24.5], [104, 27.5], [121, 31]], 0.5, 1.1);
    const slopeL = K.ridge(R, [[-1, 50], [9, 45], [18, 39.5], [26, 33.8], [32, 29.6], [35, 27.6]], 0.6, 1);
    const crown = [[35.5, 26.6], [36.2, 21], [37.2, 20.6], [37.5, 17], [38.6, 16.8], [38.8, 18], [39.8, 18], [40, 15.6], [41.4, 15.4], [41.8, 17.4], [42.6, 20], [43.4, 22.6], [44.4, 22.4], [44.8, 17], [45.4, 14.2], [46.4, 14], [46.6, 15.6], [47.4, 15.6], [47.6, 13], [48.8, 12.8], [49.2, 14.6], [49.8, 17.4], [50.8, 20.6], [51.8, 20.8], [52.4, 15.6], [53.2, 12.2], [53.6, 10.4], [54.8, 10.2], [55, 11.8], [55.8, 11.8], [56, 9.8], [57.4, 9.6], [57.8, 12], [58.8, 15.2], [60.2, 19], [61.6, 22.4], [63.4, 23.8]].map(([x, y]) => [x + j(), y + j()]);
    const slopeR = K.ridge(R, [[63.4, 23.8], [69, 25.2], [76, 27.4], [84, 30], [93, 33.6], [103, 37.4], [112, 40], [121, 42]], 0.55, 1);
    const sky = slopeL.concat(crown, slopeR), mtn = under(sky, 73);
    let o = K.vignetteOpen();
    o += skyRule(K, R, sky.map(([x, y]) => [x, Math.min(y, x > 56 ? yAt(back, x) : y)]));
    o += behind(K, [mtn], K.flank(back, { gap: 1.1, len: 5, w: 0.28, op: 0.4, rng: R }) + P(K.d(back), 0.45, 0.5));
    // turrets: columnar dark rock, vertical hatching, shadowed on their east faces
    const turrets = [[35.5, 26.6, 43.4, 22.6], [43.4, 22.4, 51.8, 20.8], [51.8, 20.8, 63.4, 23.8]];
    turrets.forEach(([xa, ya, xb, yb]) => {
      const top = crown.filter((p) => p[0] >= xa - 0.01 && p[0] <= xb + 0.01), pg = top.concat([[xb, 29], [xa, 29]]);
      const mid = top.reduce((a, p) => (p[1] < a[1] ? p : a))[0];
      o += clip(K, pg, hatch(K, R, [[xa, 5], [mid + 0.4, 5], [mid + 0.4, 30], [xa, 30]], 90, 1.15, 0.45) + hatch(K, R, [[mid + 0.4, 5], [xb, 5], [xb, 30], [mid + 0.4, 30]], 86, 0.5, 0.75) + hatch(K, R, [[mid + 0.4, 5], [xb, 5], [xb, 30], [mid + 0.4, 30]], -35, 1.2, 0.4) +
        P(M(xa, 19.5) + L(xb, 19.8) + M(xa, 23) + L(xb, 23.3) + M(xa, 16.4) + L(xb, 16.2), 0.3, 0.6));
    });
    o += F(poly(crown.concat([[63.4, 27], [35.5, 28]])), 0.1);
    // shoulders: talus and long snowfields, the right side in shade
    const snow = [[[40, 29.6], [46, 28.4], [50, 31.6], [47, 37.4], [43.2, 42], [41.6, 37]], [[56, 27.4], [62, 26.4], [66, 30.6], [61.6, 34.4], [58.6, 39.6], [57.6, 33]], [[72, 31], [79, 30.2], [80.4, 33.4], [76, 35], [73.6, 38.2]]];
    o += behind(K, snow,
      hatch(K, R, mtn, 30, 1.5, 0.3) + clip(K, under(sky.filter((p) => p[0] >= 58), 73), hatch(K, R, mtn, 68, 0.9, 0.5)) +
      K.flank(sky, { gap: 0.7, len: 9, w: 0.3, op: 0.65, rng: R }) +
      K.stipple([[34, 28], [64, 24.6], [70, 34], [58, 38], [44, 42], [32, 36]], { n: 150, r: 0.28, op: 0.6, rng: R }), 0.4);
    o += snow.map((s) => P(K.d(s, true), 0.3, 0.55)).join('');
    o += P(K.d(sky), 1.05);
    // forest belt and Castle Valley meadow
    for (let k = 0; k < 34; k++) { const x = -2 + R() * 124, y = 50 + R() * 10 + Math.abs(x - 50) * 0.04; o += pine(x, y, 3 + R() * 3.5, 0.85, 0.32); }
    o += hatch(K, R, [[-2, 52], [122, 50], [122, 60], [-2, 61]], 30, 1.3, 0.3);
    o += P(M(-2, 66) + 'C20 62 36 69 56 64.6S90 63 122 65.4', 0.45, 0.6) + P(M(30, 70.6) + 'Q50 65.6 64 67.6T94 66.6', 0.3, 0.6);
    o += scatter(R, [[-2, 62], [122, 61], [122, 73], [-2, 73]], 70, (x, y) => P(tuft(x, y, 0.8 + (y - 60) * 0.06), 0.28, 0.6));
    o += pine(8, 73, 20, 1, 0.45) + pine(113, 73, 24, 1, 0.48);
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Virginia City: the Comstock town hung on the flank of Mount Davidson ---------------- */
  B['virginia-city'] = (K) => {
    const R = K.rng('virginia-city');
    const dav = K.ridge(R, [[-1, 27], [7, 20.5], [15, 15.4], [22, 11.6], [28, 9], [32.6, 7.4], [36, 7.6], [40, 9.6], [47, 13.4], [55, 18], [63, 22.6], [71, 27.4], [80, 32.2], [89, 36.6], [98, 40.6], [108, 44], [121, 47]], 0.6, 0.8);
    const east = K.ridge(R, [[66, 38], [74, 35.5], [84, 36.6], [94, 33.4], [104, 34.6], [112, 32.6], [121, 34]], 0.4, 1.1);
    const mtn = under(dav, 73);
    const rowY = (x, k) => 31 + k * 4.6 + (x - 30) * 0.27;
    const town = [[27, 29], [60, 37.6], [94, 47.4], [96, 55], [86, 56.8], [27, 44]];
    const dumps = [[16, 30.6, 9, 7.5], [64, 30.4, 10, 6], [96, 50.4, 12, 8]];
    const dumpPg = dumps.map(([x, y, w, h]) => [[x, y], [x + w, y + 0.4], [x + w + h * 0.9, y + h], [x - h * 0.25, y + h]]);
    let o = K.vignetteOpen();
    o += skyRule(K, R, dav.map(([x, y]) => [x, Math.min(y, x > 66 ? yAt(east, x) : y)]));
    o += behind(K, [mtn], P(K.d(east), 0.45, 0.5) + K.flank(east, { gap: 1.2, len: 3, w: 0.26, op: 0.4, rng: R }));
    // the bare sage slope, hatched; the town and the pale dumps stand out of it
    o += behind(K, [town].concat(dumpPg),
      hatch(K, R, mtn, 34, 1.15, 0.36) + shade(K, R, dav, { depth: 14, gap: 0.8, op: 0.5, cross: -30 }) +
      K.flank(dav, { gap: 0.8, len: 8, w: 0.3, op: 0.7, rng: R }) +
      P(M(30, 12) + 'l1.6 2.4l-0.6 1.6' + M(38, 11.6) + 'l1.2 3' + M(24, 15.4) + 'l1.4 2.2' + M(44, 14.6) + 'l1 2.6', 0.4, 0.8), 0.6);
    // mine dumps: flat-topped tailings fans spilling down the slope
    dumpPg.forEach((pg, i) => { o += K.stipple(pg, { n: 70, r: 0.28, op: 0.6, rng: R }) + P(K.d(pg.slice(0, 3)), 0.45, 0.9) + hatch(K, R, [pg[1], pg[2], [pg[2][0] - 2, pg[2][1]]], 70, 0.7, 0.55); });
    // headframes with sheave wheels and hoist houses above the dumps
    dumps.forEach(([x, y], i) => {
      const hx = x + 2.4, h = i === 1 ? 6 : 7.5;
      o += P(M(hx - 1.3, y) + L(hx, y - h) + L(hx + 1.3, y) + M(hx - 0.9, y - h * 0.35) + L(hx + 0.9, y - h * 0.35) + M(hx - 0.5, y - h * 0.68) + L(hx + 0.5, y - h * 0.68) + M(hx + 0.3, y - h + 0.3) + L(hx + 2.6, y - 0.2), 0.4);
      o += P(K.d(ell(hx, y - h, 0.7, 0.7, 0, 2 * PI, 10)), 0.35) + P(M(hx + 3, y) + L(hx + 3, y - 2.6) + L(hx + 6.2, y - 2.6) + L(hx + 6.2, y + 0.2) + M(hx + 4.8, y - 2.6) + L(hx + 4.8, y - 4.4), 0.4);
      o += F(poly([[hx + 3, y], [hx + 3, y - 2.6], [hx + 6.2, y - 2.6], [hx + 6.2, y + 0.2]]), 0.18);
    });
    // the town: rows of false fronts and gables stepping down the slope along the streets
    let d = '', f = '';
    for (let k = 0; k < 4; k++) {
      let x = 30 + k * 1.7 + R() * 2;
      while (x < 90 - k * 1.5) {
        const w = 1.6 + R() * 1.8, h = 1.4 + R() * 1.6, g = rowY(x, k), g2 = rowY(x + w, k);
        if (!(x > 74 && x < 82 && k === 3) && !(x > 44 && x < 51 && k === 1)) {
          d += M(x, g) + L(x, g - h) + (R() < 0.45 ? L(x + w / 2, g - h - w * 0.32) + L(x + w, g2 - h) : L(x + w, g - h)) + L(x + w, g2);
          if (R() < 0.6) d += M(x + w * 0.35, g - h * 0.55) + 'v0.5' + M(x + w * 0.7, g - h * 0.55) + 'v0.5';
          f += poly([[x + w * 0.6, g - h], [x + w, g2 - h], [x + w, g2], [x + w * 0.6, g]]);
        }
        x += w + 0.2 + (R() < 0.18 ? 1.6 : 0);
      }
      d += M(28 + k * 1.7, rowY(28, k) + 0.3) + L(92 - k * 1.5, rowY(92 - k * 1.5, k) + 0.3);
    }
    o += F(f, 0.3) + P(d, 0.34, 0.9);
    // Fourth Ward School: four storeys, mansard roof and cupola
    const sx = 45, sg = rowY(45, 1);
    o += P(M(sx, sg) + L(sx, sg - 5) + L(sx + 1, sg - 6.6) + L(sx + 5, sg - 6.6) + L(sx + 6, sg - 5) + L(sx + 6, sg + 1.4) + M(sx, sg - 5) + L(sx + 6, sg - 5) + M(sx + 2.6, sg - 6.6) + L(sx + 2.6, sg - 7.8) + L(sx + 3.4, sg - 7.8) + L(sx + 3.4, sg - 6.6), 0.45) +
      P(M(sx + 0.8, sg - 3.6) + 'h4.4' + M(sx + 0.8, sg - 2.2) + 'h4.4' + M(sx + 0.8, sg - 0.8) + 'h4.4', 0.3, 0.6, ' stroke-dasharray="0.5 0.6"');
    // St. Mary's in the Mountains: gabled nave and tall spire at the foot of town
    const cx = 75.6, cg = rowY(75.6, 3);
    o += F(poly([[cx + 3.6, cg - 3.6], [cx + 6.6, cg - 3.4], [cx + 6.6, cg + 0.6], [cx + 3.6, cg + 0.4]]), 0.25);
    o += P(M(cx, cg) + L(cx, cg - 5.4) + L(cx + 0.9, cg - 6.8) + L(cx + 1.8, cg - 5.4) + L(cx + 1.8, cg + 0.2) + M(cx + 0.9, cg - 6.8) + L(cx + 0.9, cg - 11) + M(cx + 0.5, cg - 10) + L(cx + 1.3, cg - 10) + M(cx + 1.8, cg - 3.6) + L(cx + 3.6, cg - 5.2) + L(cx + 6.6, cg - 3.4) + L(cx + 6.6, cg + 0.6) + M(cx + 1.8, cg - 3.6) + L(cx + 6.6, cg - 3.4) + M(cx + 0.9, cg - 4) + 'v1', 0.45);
    // flag on Mount Davidson
    o += P(M(33.6, 7.5) + L(33.6, 3) + M(33.6, 3.1) + L(35.6, 3.6) + L(33.6, 4.2), 0.35);
    o += P(K.d(dav), 1.05);
    // foreground: sage flat and the old road
    o += P(M(-2, 63) + 'C26 58 60 64 122 59', 0.4, 0.6) + P(M(-2, 65) + 'C30 60.4 62 66 122 61', 0.3, 0.45);
    o += scatter(R, [[-2, 56], [40, 52], [70, 60], [122, 62], [122, 73], [-2, 73]], 90, (x, y) => P(tuft(x, y, 0.7 + (y - 55) * 0.07), 0.3, 0.65));
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Humboldt River: the green meander ribbon across the sagebrush basin ---------------- */
  B['humboldt-river'] = (K) => {
    const R = K.rng('humboldt-river'), HZ = 21, VX = 60;
    const fl = K.ridge(R, [[-1, 19.4], [8, 14], [16, 11.6], [26, 13.8], [36, 17.6], [44, HZ]], 0.5, 1);
    const fr = K.ridge(R, [[70, HZ], [80, 16.6], [90, 13.4], [99, 11.4], [108, 13.8], [121, 15.6]], 0.5, 1);
    const fm = K.ridge(R, [[30, HZ], [44, 18.6], [56, 19.2], [70, 18.2], [84, HZ]], 0.3, 1.2);
    let o = K.vignetteOpen();
    o += skyRule(K, R, [[-2, fl[0][1]]].concat(fl.slice(0, -1), fm.filter((p) => p[0] > 44 && p[0] < 70), fr.slice(1)), { gap: 1.8 });
    o += P(K.d(fm), 0.35, 0.45) + K.flank(fm, { gap: 1.6, len: 1.6, base: HZ, w: 0.25, op: 0.35, rng: R });
    [fl, fr].forEach((s) => { o += K.flank(s, { gap: 0.9, len: 6, base: HZ, w: 0.28, op: 0.55, rng: R }) + shade(K, R, s, { depth: 8, base: HZ, op: 0.4, gap: 1 }) + P(K.d(s), 0.6, 0.75); });
    o += P(M(-2, HZ) + L(122, HZ), 0.45, 0.6);
    // world-to-plate perspective: lateral X (world) at depth z
    const scr = (X, z) => [VX + (X * 2) / z, HZ + 51 / z];
    const N = 170, Z = (t) => 1 + 13 * Math.pow(t, 1.25);
    const mX = (t) => 13 * Math.sin(2 * PI * 3.1 * t + 0.4) + 5 * Math.sin(2 * PI * 7.3 * t + 1.1) - 4 + 6 * t;
    const bandW = (t) => 9 + 3 * Math.sin(2 * PI * 2.1 * t);
    const lb = [], rb = [], ml = [], mr = [], cl = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, z = Z(t), X = mX(t);
      lb.push(scr(X - 0.9, z)); rb.push(scr(X + 0.9, z)); cl.push(scr(X, z));
      ml.push(scr(-4 + 6 * t - bandW(t) - 6, z)); mr.push(scr(-4 + 6 * t + bandW(t) + 6, z));
    }
    // meadow ribbon: hay meadows and willow bottoms, ruled and stippled darker than the sage
    const meadow = ml.concat(mr.slice().reverse()), mLite = meadow.filter((p, i) => i % 3 === 0);
    o += K.hatch(meadow, { angle: 0, gap: 0.62, w: 0.26, op: 0.42, jitter: 0.15, rng: R }) + P(K.d(ml) + K.d(mr), 0.35, 0.55);
    o += K.stipple(mLite, { n: 140, r: 0.3, op: 0.5, rng: R });
    // field fences in the near meadow
    let fen = '';
    for (let i = 3; i < 46; i += 6) fen += M(ml[i][0], ml[i][1]) + L(mr[i][0], mr[i][1]);
    o += P(fen, 0.25, 0.4, ' stroke-dasharray="0.6 0.6"');
    // the river: two banks, open water between, willow clumps along the bends
    const riv = lb.concat(rb.slice().reverse());
    o += F(poly(riv), 0.06) + P(K.d(lb) + K.d(rb), 0.5, 0.95) + clip(K, riv, K.hatch(riv, { angle: 0, gap: 0.5, w: 0.25, op: 0.35, breaks: 0.6, rng: R }));
    let wil = '';
    for (let i = 2; i < N; i += 5 + Math.floor(R() * 5)) {
      const t = i / N, z = Z(t), side = R() < 0.5 ? -1 : 1, [x, y] = scr(mX(t) + side * (1.8 + R()), z), r = 0.25 + 1.3 / z;
      wil += 'M' + r2(x - r) + ' ' + r2(y) + 'a' + r2(r) + ' ' + r2(r * 0.8) + ' 0 1 1 ' + r2(2 * r) + ' 0';
    }
    o += P(wil, 0.35, 0.85) + '<path d="' + wil + 'Z" fill="currentColor" fill-opacity="0.18" stroke="none"/>';
    // an oxbow left behind by the river
    const ox = []; for (let a = 0; a <= 2 * PI; a += 0.2) ox.push(scr(14 + 4 * Math.cos(a), 1.3 + 0.18 * Math.sin(a)));
    const oxi = []; for (let a = 0; a <= 2 * PI; a += 0.2) oxi.push(scr(14 + 2.4 * Math.cos(a), 1.3 + 0.1 * Math.sin(a)));
    o += P(K.d(ox, true) + K.d(oxi, true), 0.4, 0.8);
    // railroad: rails and ties running straight to the horizon; I-80 on the far side
    const rl = [scr(30, 1), scr(30, 30)], rr = [scr(32, 1), scr(32, 30)];
    let ties = ''; for (let z = 1; z < 14; z *= 1.09) { const a = scr(29.4, z), b = scr(32.6, z); ties += M(a[0], a[1]) + L(b[0], b[1]); }
    o += P(line(rl) + line(rr), 0.45, 0.9) + P(ties, 0.3, 0.7);
    o += P(line([scr(-36, 1), scr(-36, 30)]) + line([scr(-40, 1), scr(-40, 30)]), 0.4, 0.75) + P(line([scr(-38, 1), scr(-38, 30)]), 0.25, 0.6, ' stroke-dasharray="1 1.4"');
    // sagebrush basin: tufts thinning with distance
    o += scatter(R, [[-2, 24], [122, 24], [122, 73], [-2, 73]], 300, (x, y) => (inside(mLite, x, y) ? '' : P(tuft(x, y, Math.max(0.3, (y - HZ) * 0.03)), 0.25, 0.55)));
    o += K.vignetteClose();
    return o;
  };

  /* ---------------- Carlin Trend: terraced open pit, flat-topped waste dumps, leach pads in sage hills ---------------- */
  B['carlin-trend'] = (K) => {
    const R = K.rng('carlin-trend');
    const far = K.ridge(R, [[-1, 22], [12, 18.6], [26, 20.4], [40, 17], [56, 19.6], [72, 16.4], [88, 19.4], [104, 17.2], [121, 19.6]], 0.5, 1.1);
    const hills = K.ridge(R, [[-1, 31], [14, 27.4], [30, 29.6], [46, 26.4], [62, 28.6], [78, 25.8], [94, 28.2], [108, 26.4], [121, 28.6]], 0.4, 1.1);
    const hPg = under(hills, 73);
    let o = K.vignetteOpen();
    o += skyRule(K, R, far);
    o += behind(K, [hPg], K.flank(far, { gap: 1.2, len: 3, w: 0.26, op: 0.4, rng: R }) + P(K.d(far), 0.45, 0.5));
    o += hatch(K, R, hPg, 18, 2, 0.22) + K.flank(hills, { gap: 1.1, len: 3, w: 0.28, op: 0.5, rng: R }) + P(K.d(hills), 0.55, 0.75);
    // waste dumps: flat tops, terraced lifts at the angle of repose
    const dump = (x0, x1, top, base, lifts, s) => {
      let out = '', pts = [[x0 - (base - top) * s, base], [x0, top], [x1, top], [x1 + (base - top) * s, base]];
      const pg = pts.concat([]);
      out += hatch(K, R, [pts[0], pts[1], [x0 + 3, top], [x0 + 3, base]], 60, 1.4, 0.3);
      out += hatch(K, R, [[x1 - 1, top], pts[2], pts[3], [x1 - 1, base]], 66, 0.6, 0.7);
      out += hatch(K, R, pg, 0, 2.4, 0.18);
      for (let k = 1; k <= lifts; k++) { const y = top + ((base - top) * k) / (lifts + 1), dx = (y - top) * s; out += P(M(x0 - dx, y) + L(x1 + dx, y), 0.35, 0.75); }
      return out + P(K.d(pts), 0.75);
    };
    o += dump(10, 34, 26, 37, 2, 0.95) + dump(84, 110, 27, 38.5, 2, 0.9);
    // leach pad: graded cells in perspective with a solution pond
    const lp = [[76, 41], [118, 40], [122, 47], [72, 48.4]];
    let g = ''; for (let k = 1; k < 6; k++) { const t = k / 6; g += M(lp[0][0] + (lp[1][0] - lp[0][0]) * t, 41 - t) + L(lp[3][0] + (lp[2][0] - lp[3][0]) * t, 48.4 - 1.4 * t); }
    o += hatch(K, R, lp, 0, 0.9, 0.3) + P(g, 0.3, 0.6) + P(K.d(lp, true), 0.5, 0.85);
    o += hatch(K, R, [[96, 49.6], [106, 49.4], [107.2, 51.4], [95.2, 51.6]], 0, 0.45, 0.6) + P(K.d([[96, 49.6], [106, 49.4], [107.2, 51.4], [95.2, 51.6]], true), 0.4);
    // the pit: concentric benches stepping down the far wall, the near rim hiding the rest
    const cx = 50, cy = 47, RX = 36, RY = 11.5, rim = ell(cx, cy, RX, RY, 0, 2 * PI, 72);
    let benches = '';
    for (let k = 1; k <= 8; k++) { const f = 1 - k * 0.1; benches += K.d(ell(cx + k * 0.6, cy + k * 2.15, RX * f, RY * f, 0, 2 * PI, 64), true); }
    const leftHalf = ell(cx, cy, RX, RY, PI * 0.5, PI * 1.5, 36).concat([[cx - 2, cy - RY], [cx + 2, cy + RY]]);
    o += clip(K, rim, P(benches, 0.4, 0.85) + hatch(K, R, leftHalf, 80, 0.62, 0.55) + hatch(K, R, rim, 80, 1.5, 0.3) +
      // haul ramp spiralling down the right wall, a truck on it
      P(Array.from({ length: 9 }, (_, k) => { const f = 1 - k * 0.1, a = -0.25 - k * 0.2, x = cx + k * 0.6 + RX * f * Math.cos(a), y = cy + k * 2.15 + RY * f * Math.sin(a); return (k ? 'L' : 'M') + r2(x) + ' ' + r2(y); }).join(''), 0.9, 0.8) +
      F(poly([[77, 47.2], [79.2, 47], [79.2, 45.8], [77, 46]]), 0.6) +
      // sump at the bottom
      K.hatch(ell(cx + 5, cy + 18, 9, 2.2, 0, 2 * PI, 30), { angle: 0, gap: 0.5, w: 0.26, op: 0.6, breaks: 0.4, rng: R }));
    o += P(K.d(ell(cx, cy, RX, RY, PI, 2 * PI, 48)), 0.6, 0.9) + P(K.d(ell(cx, cy, RX, RY, 0, PI, 48)), 1.05);
    // near apron and haul roads out to the dumps
    o += P(M(cx + RX - 1, cy - 2) + 'Q' + (cx + RX + 8) + ' ' + (cy - 4) + ' 84 ' + (38.5 - 0.6) + M(cx - RX + 4, cy - 4) + 'Q16 ' + (cy - 6) + ' 18 37', 0.5, 0.75) + P(M(cx + RX - 1, cy - 1) + 'Q' + (cx + RX + 8.6) + ' ' + (cy - 3) + ' 85 ' + 38.6, 0.3, 0.55);
    o += scatter(R, [[-2, 56], [122, 52], [122, 73], [-2, 73]], 120, (x, y) => (inside(rim, x, y) ? '' : P(tuft(x, y, 0.6 + (y - 50) * 0.06), 0.28, 0.65)));
    o += scatter(R, [[-2, 37], [122, 38], [122, 56], [-2, 58]], 60, (x, y) => (inside(rim, x, y) || inside(lp, x, y) ? '' : P(tuft(x, y, 0.5), 0.25, 0.5)));
    o += K.vignetteClose();
    return o;
  };
})();
