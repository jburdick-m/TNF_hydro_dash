/* AA2735 Window Atlas: bespoke engraved plates for the Rockies (Utah, Wyoming) and the Great Plains (Nebraska, Iowa).
 * Each builder returns SVG body markup for a 120x72 viewBox, drawn in currentColor with the shared kit (js/engrave-kit.js).
 * Every plate is composed as the classic view of the real place, after the 40th Parallel survey plates:
 * hairline tone from line density, one crisp silhouette, ruled skies and still water, light from the upper left.
 * Geometry is seeded by the POI id, so plates are identical on every load. */
(function () {
  'use strict';
  const B = (window.BESPOKE = window.BESPOKE || {});
  const A = (window.BESPOKE_ALIAS = window.BESPOKE_ALIAS || {});
  A['cross-continental-divide-eb'] = 'cross-continental-divide-wb';
  A['x-cross-missouri-e'] = 'x-cross-missouri-w';

  const M = Math, PI = M.PI, r2 = (n) => M.round(n * 100) / 100;
  const P = (pts) => pts.map((p) => r2(p[0]) + ' ' + r2(p[1])).join('L');
  const off = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy]);
  // Catmull-Rom through points -> cubic path data
  const cr = (p) => {
    let d = 'M' + r2(p[0][0]) + ' ' + r2(p[0][1]);
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      d += 'C' + r2(b[0] + (c[0] - a[0]) / 6) + ' ' + r2(b[1] + (c[1] - a[1]) / 6) + ' ' + r2(c[0] - (e[0] - b[0]) / 6) + ' ' + r2(c[1] - (e[1] - b[1]) / 6) + ' ' + r2(c[0]) + ' ' + r2(c[1]);
    }
    return d;
  };
  // sampled Catmull-Rom points (for polygons that need a smooth edge)
  const crPts = (p, n) => {
    const out = [];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i - 1] || p[i], b = p[i], c = p[i + 1], e = p[i + 2] || c;
      for (let k = 0; k < n; k++) {
        const s = k / n, s2 = s * s, s3 = s2 * s;
        const f = (j) => 0.5 * (2 * b[j] + (-a[j] + c[j]) * s + (2 * a[j] - 5 * b[j] + 4 * c[j] - e[j]) * s2 + (-a[j] + 3 * b[j] - 3 * c[j] + e[j]) * s3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(p[p.length - 1].slice());
    return out;
  };
  const yAt = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * ((x - x0) / ((x1 - x0) || 1)); }
    return pts[pts.length - 1][1];
  };
  const pip = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const ell = (cx, cy, rx, ry, n, rng, wob) => { const o = []; for (let k = 0; k < n; k++) { const a = (k / n) * 2 * PI, f = 1 + (wob && rng ? (rng() - 0.5) * wob : 0); o.push([cx + rx * f * M.cos(a), cy + ry * f * M.sin(a)]); } return o; };
  // superellipse: e=2 ellipse, larger = squarer (granite blocks), smaller = pointed lens (sandbars)
  const sup = (cx, cy, rx, ry, e, n) => { const o = [], q = 2 / e; for (let k = 0; k < n; k++) { const a = (k / n) * 2 * PI, c = M.cos(a), s = M.sin(a); o.push([cx + rx * M.sign(c) * M.pow(M.abs(c), q), cy + ry * M.sign(s) * M.pow(M.abs(s), q)]); } return o; };

  // per-plate toolkit (seeded by the plate id; ids for clip paths and masks are deterministic)
  function T(K, id) {
    const rng = K.rng(id);
    let n = 0;
    const R = (a, b) => a + (b - a) * rng();
    const t = {
      rng, R,
      s: (d, w, op, extra) => (d ? '<path d="' + d + '" stroke-width="' + w + '"' + (op != null && op < 1 ? ' stroke-opacity="' + op + '"' : '') + (extra || '') + '/>' : ''),
      line: (pts, w, op, close) => t.s('M' + P(pts) + (close ? 'Z' : ''), w, op),
      curve: (pts, w, op) => t.s(cr(pts), w, op),
      tone: (pts, fop) => '<path d="M' + P(pts) + 'Z" fill="currentColor" fill-opacity="' + fop + '" stroke="none"/>',
      fillPath: (d, fop, w, op) => '<path d="' + d + '" fill="currentColor" fill-opacity="' + fop + '" stroke-width="' + (w || 0.3) + '"' + (op != null ? ' stroke-opacity="' + op + '"' : '') + '/>',
      clip(pts, inner) { const c = 'rk-' + id + '-' + n++; return '<clipPath id="' + c + '"><path d="M' + P(pts) + 'Z"/></clipPath><g clip-path="url(#' + c + ')">' + inner + '</g>'; },
      // knock out (occlude) everything in `polys` from `inner`; overlapping holes are fine
      hide(polys, inner) {
        const c = 'rk-' + id + '-' + n++;
        return '<mask id="' + c + '" maskUnits="userSpaceOnUse" x="-5" y="-5" width="130" height="82"><rect x="-5" y="-5" width="130" height="82" fill="#fff" stroke="none"/><path d="' +
          polys.map((p) => 'M' + P(p) + 'Z').join('') + '" fill="#000" stroke="none"/></mask><g mask="url(#' + c + ')">' + inner + '</g>';
      },
      above: (sk) => [[sk[0][0], -3]].concat(sk, [[sk[sk.length - 1][0], -3]]),
      below: (sk, yb) => sk.concat([[sk[sk.length - 1][0], yb], [sk[0][0], yb]]),
      band: (top, bot) => top.concat(bot.slice().reverse()),
      sky(sk, o = {}) {
        const yb = M.max.apply(null, sk.map((p) => p[1])) + 0.6;
        return t.clip(t.above(sk), K.ruling(-1, 121, o.y0 || 2.2, yb, { gap: o.gap || 1.25, w: o.w || 0.3, op: o.op != null ? o.op : 0.4, rng, breaks: o.breaks != null ? o.breaks : 0.12 }));
      },
      hatch: (poly, o) => K.hatch(poly, Object.assign({ rng }, o)),
      rule: (x0, x1, y0, y1, o) => K.ruling(x0, x1, y0, y1, Object.assign({ rng }, o)),
      flank: (sk, o) => K.flank(sk, Object.assign({ rng }, o)),
      stip: (poly, o) => K.stipple(poly, Object.assign({ rng }, o)),
      inside(poly, nn) {
        const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
        const x0 = M.min.apply(null, xs), x1 = M.max.apply(null, xs), y0 = M.min.apply(null, ys), y1 = M.max.apply(null, ys);
        const out = []; let tries = 0;
        while (out.length < nn && tries++ < nn * 8) { const x = R(x0, x1), y = R(y0, y1); if (pip(poly, x, y)) out.push([x, y]); }
        return out;
      },
      // spruce / pine glyph: spire with drooping tiers, shadow (right) side a little fuller
      pine(x, yb, h, wd) {
        wd = wd || h * 0.2;
        let d = 'M' + r2(x) + ' ' + r2(yb - h) + 'L' + r2(x) + ' ' + r2(yb);
        const k = M.max(3, M.round(h / 0.95));
        for (let i = 1; i <= k; i++) {
          const f = i / k, y = yb - h + h * 0.9 * f, hw = wd * (0.2 + 0.8 * f) * (0.75 + rng() * 0.45);
          d += 'M' + r2(x) + ' ' + r2(y - 0.55) + 'L' + r2(x - hw) + ' ' + r2(y + 0.25) + 'M' + r2(x) + ' ' + r2(y - 0.6) + 'L' + r2(x + hw) + ' ' + r2(y + 0.35);
          if (h > 5 && i % 2) d += 'M' + r2(x + 0.2) + ' ' + r2(y - 0.1) + 'L' + r2(x + hw * 0.8) + ' ' + r2(y + 0.55);
        }
        return d;
      },
      trees(poly, nn, h0, h1, wf, w, op) {
        let d = '';
        t.inside(poly, nn).sort((a, b) => a[1] - b[1]).forEach(([x, y]) => { const h = R(h0, h1); d += t.pine(x, y, h, h * (wf || 0.22)); });
        return t.s(d, w || 0.33, op);
      },
      tufts(poly, nn, sz, w, op) {
        let d = '';
        t.inside(poly, nn).forEach(([x, y]) => { const s = sz * (0.6 + rng() * 0.6); d += 'M' + r2(x - 0.5 * s) + ' ' + r2(y - 1.1 * s) + 'L' + r2(x) + ' ' + r2(y) + 'L' + r2(x + 0.12 * s) + ' ' + r2(y - 1.4 * s) + 'M' + r2(x) + ' ' + r2(y) + 'L' + r2(x + 0.65 * s) + ' ' + r2(y - s); });
        return t.s(d, w || 0.3, op);
      },
      // sagebrush: low rounded bumps with a shadow tick
      sage(poly, nn, sz, w, op) {
        let d = '';
        t.inside(poly, nn).forEach(([x, y]) => { const s = sz * (0.6 + rng() * 0.6); d += 'M' + r2(x - s) + ' ' + r2(y) + 'a' + r2(s) + ' ' + r2(s * 0.7) + ' 0 0 1 ' + r2(2 * s) + ' 0M' + r2(x + s * 0.3) + ' ' + r2(y - s * 0.1) + 'l' + r2(s * 0.5) + ' 0'; });
        return t.s(d, w || 0.3, op);
      },
      // lower-right crescent shading on a rounded form (light from the upper left), clipped to `poly`
      shade(poly, cx, cy, rx, ry, o) {
        const outer = [], inner = [];
        for (let a = -55; a <= 165; a += 10) { const r = (a * PI) / 180; outer.push([cx + rx * 1.05 * M.cos(r), cy + ry * 1.05 * M.sin(r)]); }
        for (let a = 165; a >= -55; a -= 10) { const r = (a * PI) / 180; inner.push([cx - rx * 0.26 + rx * 0.9 * M.cos(r), cy - ry * 0.3 + ry * 0.9 * M.sin(r)]); }
        return t.clip(poly, t.hatch(outer.concat(inner), Object.assign({ angle: 62, gap: 0.62, w: 0.3, op: 0.7 }, o)));
      },
      // horizontal ground ruling, spaced wider toward the viewer
      plain(y0, y1, k, op, w) {
        let d = '';
        for (let i = 1; i <= k; i++) {
          const y = y0 + (y1 - y0) * M.pow(i / k, 1.7);
          for (let x = -1 + R(0, 5); x < 121;) { const L = R(5, 24); d += 'M' + r2(x) + ' ' + r2(y) + 'H' + r2(x + L); x += L + R(1, 4); }
        }
        return t.s(d, w || 0.28, op);
      },
    };
    return t;
  }
  const plate = (K, body) => K.vignetteOpen() + body + K.vignetteClose();

  /* ---------- Uinta Mountains: Kings Peak above the Henrys Fork glacial basin ----------
   * Broad, flat-backed quartzite summits in an east-west wall, ledgy horizontal strata in cirque headwalls,
   * Kings Peak the one pointed summit (right of center), a tarn in the U-shaped basin, spruce framing. */
  B['uinta-mountains'] = (K) => {
    const t = T(K, 'uinta-mountains'), R = t.R;
    const far = K.ridge(t.rng, [[0, 27], [10, 24.5], [22, 25], [36, 22.4], [48, 23.6], [60, 21.8], [72, 23], [90, 20.6], [104, 22.4], [120, 21.6]], 0.3, 1.2);
    const main = K.ridge(t.rng, [[0, 33], [6, 29], [11, 24.6], [15, 22.2], [27, 21.8], [31, 23.6], [35, 27], [39, 24.8], [43, 20.2], [47, 18.6], [60, 18.2], [64, 19.8], [68, 23.4], [72, 21], [76.5, 15.4], [79.6, 12], [82.6, 14.6], [87, 18], [95, 18.4], [102, 19.2], [106, 22.6], [112, 26.6], [120, 28.4]], 0.32, 1);
    const sk = far.map((p) => [p[0], M.min(p[1], yAt(main, p[0]))]);
    const body = t.below(main, 47.5);
    let o = t.sky(sk, { gap: 1.2, op: 0.42 });
    // distant crest (atmospheric: light, sparse)
    o += t.hide([body], t.line(far, 0.4, 0.45) + t.clip(t.below(far, 34), t.flank(far, { gap: 1.4, len: 4, w: 0.26, op: 0.35 })));
    // ledgy horizontal quartzite strata, gently dipping
    let led = '';
    for (let y = 16.5; y < 46; y += 2.05) {
      for (let x = -2 + R(0, 5); x < 120;) {
        const L = R(3, 12), y0 = y + x * 0.03 + R(-0.3, 0.3);
        led += 'M' + r2(x) + ' ' + r2(y0) + 'L' + r2(x + L) + ' ' + r2(y0 + L * 0.03 + R(-0.35, 0.35));
        x += L + R(1.5, 6);
      }
    }
    o += t.clip(body, t.s(led, 0.3, 0.55) + t.flank(main, { gap: 0.7, len: 13, w: 0.32, op: 0.75, base: 46 }) + t.flank(main, { gap: 1.4, len: 24, w: 0.26, op: 0.3, shadowOnly: true, base: 46 }));
    // cirque headwalls under the flat summits
    [[41, 67, 37.5], [70, 94, 35.5], [10, 34, 39]].forEach(([a, b, yb]) => {
      const top = main.filter((p) => p[0] >= a && p[0] <= b).map((p) => [p[0], p[1] + 1.6]);
      const yt = (top[0][1] + top[top.length - 1][1]) / 2, c = (a + b) / 2, bowl = [];
      for (let k = 0; k <= 14; k++) { const th = (k / 14) * PI; bowl.push([c + ((b - a) / 2) * M.cos(th), yt + (yb - yt) * M.pow(M.sin(th), 0.7)]); }
      const poly = top.concat(bowl);
      const left = poly.filter((p) => p[0] <= c + 2).concat([[c + 2, yb + 1]]);
      o += t.hatch(poly, { angle: 90, gap: 1.05, w: 0.28, op: 0.45, jitter: 0.4 }) + t.clip(poly, t.hatch(left, { angle: 68, gap: 0.8, w: 0.28, op: 0.5 }));
      o += t.curve(bowl.slice(2, 13), 0.4, 0.7);
    });
    // talus and moraine aprons
    o += t.clip(body, t.stip([[0, 40], [120, 37.5], [120, 48], [0, 48]], { n: 170, r: 0.22, op: 0.55 }));
    // basin floor: tarn, stream, krummholz
    const lake = ell(60, 51.2, 14, 2.3, 44, t.rng, 0.12);
    o += t.clip(lake, t.rule(44, 76, 49, 54, { gap: 0.62, op: 0.65, breaks: 0.45 })) + t.line(lake, 0.5, 0.85, true);
    o += t.curve([[74, 51.4], [79, 49.6], [84, 49], [89, 46.8], [93, 45.6]], 0.35, 0.6) + t.curve([[46.2, 51.4], [41, 53.4], [37, 56.6]], 0.35, 0.6);
    o += t.trees([[0, 44], [26, 45.5], [40, 49], [43, 53], [0, 56]], 30, 2.2, 4.6);
    o += t.trees([[80, 50], [96, 45.4], [120, 43.4], [120, 54], [86, 55]], 30, 2.2, 4.6);
    // foreground slopes framing the basin
    const fl = [[0, 52], [10, 53], [22, 57], [32, 63], [40, 72.5], [0, 72.5]], fr = [[120, 51], [108, 53], [96, 57], [86, 63], [80, 72.5], [120, 72.5]];
    o += t.hatch(fl, { angle: 32, gap: 0.8, w: 0.32, op: 0.6, jitter: 0.3 }) + t.hatch(fr, { angle: 145, gap: 0.7, w: 0.32, op: 0.65, jitter: 0.3 });
    o += t.line(fl.slice(0, 5), 0.7) + t.line(fr.slice(0, 5), 0.7);
    o += t.s([[4, 53.6, 14], [11.5, 55, 10], [19, 57.6, 8], [27, 61.4, 6.5], [116.5, 52.4, 15], [107, 54.6, 10.5], [98.5, 58, 8]].map(([x, y, h]) => t.pine(x, y, h, h * 0.17)).join(''), 0.42);
    o += t.tufts([[36, 58], [86, 58], [82, 72], [40, 72]], 24, 1.6, 0.3, 0.7);
    o += t.line(main, 1);
    return plate(K, o);
  };

  /* ---------- Flaming Gorge: Red Canyon's tilted red walls plunging into the long reservoir ---------- */
  B['flaming-gorge'] = (K) => {
    const t = T(K, 'flaming-gorge'), R = t.R;
    const rimL = K.ridge(t.rng, [[0, 11], [14, 13.5], [28, 17.5], [42, 21.5], [54, 25.5], [61, 28]], 0.5, 1);
    const rimR = K.ridge(t.rng, [[69, 27.6], [78, 24.5], [90, 20], [104, 15], [120, 10]], 0.5, 1);
    const far = K.ridge(t.rng, [[56, 27.6], [60, 25.8], [63, 24.6], [67, 24.4], [70, 25.6], [74, 27]], 0.25, 0.7);
    const wlL = [[0, 53], [12, 47], [26, 41], [40, 36], [52, 32.4], [61.5, 30.2]], wlR = [[69.5, 30.2], [80, 32.5], [92, 37.5], [106, 45], [120, 54]];
    const wallL = rimL.concat(wlL.slice().reverse()), wallR = rimR.concat(wlR.slice().reverse());
    const sk = rimL.concat(far.filter((p) => p[0] > 61.2 && p[0] < 68.8), rimR);
    let o = t.sky(sk, { gap: 1.2, op: 0.4 });
    // the far bend: pale mesa beyond the gorge
    const farP = far.filter((p) => p[0] > 60 && p[0] < 70);
    o += t.clip([[61, 0], [69, 0], [69.5, 30.4], [61.5, 30.4]], t.line(far, 0.45, 0.6) + t.hatch(t.below(farP, 30.4), { angle: 90, gap: 1.1, op: 0.35 }));
    // left wall faces east, away from the light: dense fluting crossed by the steeply tilted red beds
    o += t.hatch(wallL, { angle: 84, gap: 0.78, w: 0.3, op: 0.55, jitter: 0.3 }) + t.hatch(wallL, { angle: 150, gap: 1.8, w: 0.42, op: 0.62, jitter: 0.7 }) + t.hatch(wallL, { angle: 18, gap: 2.6, w: 0.24, op: 0.3 });
    o += t.clip(wallL, t.line(off(rimL, 0, 2.6), 0.45, 0.6) + t.line(off(rimL, 0, 3.5), 0.3, 0.45));
    // right wall catches the light: the bright tilted strata read as bands
    o += t.hatch(wallR, { angle: 30, gap: 1.6, w: 0.4, op: 0.55, jitter: 0.6 }) + t.hatch(wallR, { angle: 96, gap: 2.8, w: 0.26, op: 0.35, jitter: 0.5 });
    o += t.clip(wallR, t.line(off(rimR, 0, 2.4), 0.45, 0.55) + t.stip(t.band(off(wlR, 0, -3.6), wlR), { n: 90, r: 0.22, op: 0.5 }));
    // water: long reservoir winding away, ruling tighter with distance
    const water = wlL.concat(wlR, [[120, 72.5], [38, 72.5], [32, 68.5], [22, 64.5], [10, 61], [0, 60]]);
    o += t.clip(water, t.rule(-1, 121, 30.6, 38, { gap: 0.68, op: 0.5, breaks: 0.3 }) + t.rule(-1, 121, 38.6, 52, { gap: 1.0, op: 0.5, breaks: 0.3 }) + t.rule(-1, 121, 53, 72, { gap: 1.42, op: 0.5, breaks: 0.35 }) +
      t.hatch(t.band(wlL, off(wlL, 0, 5)), { angle: 90, gap: 1, op: 0.3 }) + t.hatch(t.band(wlR, off(wlR, 0, 4)), { angle: 90, gap: 2, op: 0.22 }));
    // a boat and its wake for scale
    o += t.fillPath('M76.4 49.6L80 49.6L79.3 50.5L77 50.5Z', 0.6, 0.4) + t.s('M77 50.7L72.6 56M72 57L68.6 62M79.4 50.7L83.6 55.7M84.2 56.7L88 61.4', 0.3, 0.55);
    // overlook ledge in the foreground
    const fg = [[0, 60], [10, 61], [22, 64.5], [32, 68.5], [38, 72.5], [0, 72.5]];
    o += t.hatch(fg, { angle: 28, gap: 0.72, op: 0.62 }) + t.hatch(fg, { angle: 120, gap: 1.6, op: 0.35 }) + t.line(fg.slice(0, 5), 0.9);
    // ponderosa on the rims, shrinking with distance
    let pd = t.pine(5, 61, 12, 2.4) + t.pine(14, 62.6, 7.5, 1.6) + t.pine(26, 67, 5, 1.1);
    for (let x = 1; x < 58; x += R(2.5, 5.5)) { const h = 1 + ((61 - x) / 61) * 3.6; pd += t.pine(x, yAt(rimL, x) + 0.4, h, h * 0.24); }
    for (let x = 72; x < 119; x += R(2.5, 5.5)) { const h = 1 + ((x - 69) / 51) * 3.6; pd += t.pine(x, yAt(rimR, x) + 0.4, h, h * 0.24); }
    o += t.s(pd, 0.36, 0.85);
    o += t.line(rimL, 1) + t.line(rimR, 1) + t.line(wlL, 0.55) + t.line(wlR, 0.55);
    return plate(K, o);
  };

  /* ---------- Medicine Bow Peak: the white quartzite wall above Lake Marie ----------
   * Dark ruled sky and dark spruce make the cliff read white; couloirs score the face. */
  B['medicine-bow-snowy-range'] = (K) => {
    const t = T(K, 'medicine-bow-snowy-range'), R = t.R;
    const main = K.ridge(t.rng, [[0, 34], [8, 29], [16, 25], [24, 22.5], [31, 20], [38, 19.5], [44, 17], [50, 16.5], [56, 15], [61, 12.5], [66, 11], [71, 12], [75, 14.5], [80, 14], [86, 17.5], [93, 21], [101, 22.5], [109, 27], [120, 31]], 0.5, 0.9);
    const base = K.ridge(t.rng, [[0, 41], [14, 38], [30, 35.5], [46, 34.5], [62, 33.5], [78, 34.5], [94, 35.8], [110, 37.5], [120, 39.5]], 0.6, 1.5);
    const face = t.band(main, base);
    let o = t.sky(main, { gap: 0.95, op: 0.55, breaks: 0.06 });
    o += t.hatch(face, { angle: 92, gap: 2.3, w: 0.22, op: 0.3, jitter: 1 });
    o += t.clip(face, t.flank(main, { gap: 0.9, len: 5, w: 0.3, op: 0.6, shadowOnly: true }));
    // couloirs: gully lines with their shadowed (east-facing) walls on the left
    let g = '', gs = '';
    [7, 15, 24, 33, 41, 50, 58, 66, 74, 83, 91, 100, 109].forEach((x0) => {
      let x = x0 + R(-1, 1);
      const y0 = yAt(main, x) + 0.6, y1 = yAt(base, x) + 0.5, pts = [];
      for (let y = y0; y <= y1; y += 1.5) { pts.push([x, y]); x += R(-0.45, 0.45) + 0.1; }
      if (pts.length < 2) return;
      g += 'M' + P(pts);
      pts.forEach(([px, py]) => { if (t.rng() < 0.85) gs += 'M' + r2(px - 0.25) + ' ' + r2(py) + 'l' + r2(-R(0.6, 1.8)) + ' 0.45'; });
    });
    o += t.s(g, 0.42, 0.75) + t.s(gs, 0.28, 0.55);
    // talus cones and snowfields at the cliff foot
    const treeTop = K.ridge(t.rng, [[0, 45], [20, 43.6], [40, 45], [60, 43.8], [80, 44.6], [100, 43.4], [120, 44.6]], 1, 1.4);
    const tal = t.band(base, treeTop);
    o += t.stip(tal, { n: 280, r: 0.22, op: 0.6 }) + t.hatch(tal, { angle: 76, gap: 2.4, op: 0.3 }) + t.line(base, 0.4, 0.6);
    // spruce-fir at the shore
    const forest = t.band(treeTop, [[0, 50.2], [120, 49.8]]);
    o += t.hatch(forest, { angle: 88, gap: 0.58, op: 0.45 }) + t.trees(forest, 120, 2, 4.4, 0.2);
    // Lake Marie: ruled water with the dark reflected forest at its head
    const lake = [[0, 50.2], [120, 49.8], [120, 62], [96, 62.8], [70, 61.6], [44, 63], [20, 62], [0, 63]];
    o += t.clip(lake, t.rule(-1, 121, 50.6, 63, { gap: 0.82, op: 0.5, breaks: 0.35 }) + t.hatch([[0, 50], [120, 49.6], [120, 53.4], [0, 53.8]], { angle: 90, gap: 0.75, op: 0.45, jitter: 0.4 }));
    // shore boulders, krummholz, framing spruce
    const fg = [[0, 63], [20, 62], [44, 63], [70, 61.6], [96, 62.8], [120, 62], [120, 72.5], [0, 72.5]];
    o += t.line(fg.slice(0, 6), 0.6);
    [[31, 66, 4, 2.2], [38.5, 67.6, 2.6, 1.6], [79, 66.4, 5, 2.6], [88.5, 68, 2.8, 1.6], [60, 69.2, 3.2, 1.8]].forEach(([x, y, rx, ry]) => {
      const b = sup(x, y, rx, ry, 2.6, 30);
      o += t.line(b, 0.5, 0.85, true) + t.shade(b, x, y, rx, ry, { gap: 0.55 });
    });
    o += t.tufts(fg, 26, 1.5, 0.3, 0.7);
    o += t.s(t.pine(5, 72.5, 36, 5.6) + t.pine(13.5, 72.5, 22, 3.8) + t.pine(114, 72.5, 28, 4.6), 0.45);
    o += t.line(main, 1);
    return plate(K, o);
  };

  /* ---------- Elk Mountain: the lone dark dome over the Overland Trail plains ---------- */
  B['elk-mountain'] = (K) => {
    const t = T(K, 'elk-mountain'), R = t.R;
    const hz = 50;
    const mt = K.ridge(t.rng, [[10, 50], [18, 45.5], [26, 38], [33, 30], [40, 23], [46, 18.2], [52, 15.4], [58, 13.8], [63, 14.2], [67, 15.8], [71, 15.2], [75, 17.4], [80, 21.5], [86, 28], [93, 35.5], [100, 42], [107, 47], [114, 50]], 0.55, 1);
    const hl = K.ridge(t.rng, [[0, 48.6], [5, 47.6], [10, 50]], 0.3, 1), hr = K.ridge(t.rng, [[114, 50], [117, 48.4], [120, 48.8]], 0.3, 1);
    const sk = hl.concat(mt.slice(1), hr.slice(1));
    let o = t.sky(sk, { gap: 1.5, op: 0.32, breaks: 0.2 });
    const body = t.below(mt, hz);
    const tl = K.ridge(t.rng, [[16, 47], [24, 39], [31, 32], [38, 27.6], [46, 25], [54, 23], [62, 22.4], [70, 23.4], [78, 25.8], [86, 30.4], [95, 39], [108, 48.5]], 1.5, 1.1);
    const forest = t.below(tl, 50.5);
    o += t.clip(body,
      t.hatch(forest, { angle: 72, gap: 0.72, op: 0.5, jitter: 0.3 }) + t.trees(forest, 170, 1.3, 2.5, 0.24, 0.3, 0.75) +
      t.hatch([[63, -2], [122, -2], [122, 51], [63, 51]], { angle: 112, gap: 0.85, op: 0.42 }) +
      t.flank(mt, { gap: 1.1, len: 6, w: 0.3, op: 0.6 }) + t.line(tl, 0.35, 0.5));
    // drainages scoring the flanks
    o += t.clip(body, [[[45, 21.5], [41, 31], [37, 41], [34, 49.6]], [[56, 17.6], [54.5, 29], [53, 40], [52, 49.8]], [[70, 19.6], [73, 30], [77, 41], [80, 49.8]], [[84, 27], [88, 37], [92, 46], [94, 50]]].map((p) => t.curve(p, 0.45, 0.6) + t.curve(off(p, -0.7, 0), 0.25, 0.4)).join(''));
    o += t.line(hl, 0.5, 0.7) + t.line(hr, 0.5, 0.7) + t.line([[-1, hz], [121, hz]], 0.6, 0.8);
    // sage plain, a fence, and the old trail's twin ruts
    const pl = [[-1, hz], [121, hz], [121, 73], [-1, 73]];
    o += t.plain(hz, 72, 16, 0.32) + t.stip(pl, { n: 220, r: 0.24, op: 0.5 }) + t.sage([[-1, 57], [121, 57], [121, 73], [-1, 73]], 34, 1.1, 0.33, 0.75);
    let fence = '';
    for (let x = 2; x < 120; x += 6.2) { const y = 63.2 - x * 0.04; fence += 'M' + r2(x) + ' ' + r2(y) + 'v-2.3'; }
    o += t.s(fence, 0.4, 0.8) + t.s('M0 61.4L120 56.6M0 62.4L120 57.6', 0.25, 0.6);
    o += t.curve([[-1, 70.6], [30, 65.2], [64, 60.4], [96, 56.4], [121, 54.6]], 0.35, 0.5) + t.curve([[-1, 72], [30, 66.5], [64, 61.5], [96, 57.3], [121, 55.4]], 0.35, 0.5);
    o += t.line(mt, 1.05);
    return plate(K, o);
  };

  /* ---------- Vedauwoo: stacked, rounded towers of pink Sherman Granite ---------- */
  B['laramie-range-vedauwoo'] = (K) => {
    const t = T(K, 'laramie-range-vedauwoo'), R = t.R;
    const back = K.ridge(t.rng, [[0, 45], [14, 41.6], [28, 43], [44, 40.8], [60, 42.6], [76, 40.4], [96, 42], [110, 40], [120, 41.2]], 0.5, 1.2);
    // blocks [cx, cy, rx, ry]; lower blocks sit in front of the ones they carry
    const piles = [
      { z: 1, w: 0.38, op: 0.55, b: [[8.5, 50.4, 9, 4.6], [5, 44.6, 5, 3.2], [11.6, 42.2, 3.4, 2.4]] },
      { z: 1, w: 0.38, op: 0.55, b: [[106, 49, 7, 3.4], [114, 46.8, 5, 3], [109.4, 43.4, 3.6, 2.4], [112, 40.2, 2.2, 1.6]] },
      { z: 2, w: 0.6, op: 1, b: [[33, 51.6, 9.5, 5], [47.6, 50.6, 6.5, 6], [38.6, 42.6, 7, 4.2], [47.2, 41.8, 4.2, 3.8], [40.6, 35, 6, 3.6], [42.6, 28.7, 5, 3.2], [40.6, 23.1, 3.8, 2.6], [42.2, 18.9, 2.4, 1.9]] },
      { z: 2, w: 0.6, op: 1, b: [[72, 52.6, 9, 4.5], [86, 51.6, 7.5, 5.4], [78.6, 44.7, 7, 3.9], [88.4, 44.6, 3.8, 3.2], [80.6, 38.5, 5.4, 3.3], [77.6, 32.8, 3.8, 2.6], [81.2, 28.8, 2.8, 2.1]] },
    ];
    const all = [];
    piles.forEach((p) => p.b.forEach(([cx, cy, rx, ry]) => all.push({ cx, cy, rx, ry, z: p.z * 100 + cy, w: p.w, op: p.op, poly: sup(cx, cy, rx, ry, 2.5, 36) })));
    const polys = all.map((b) => b.poly);
    let o = t.hide(polys, t.sky(back, { gap: 1.2, op: 0.42 }) +
      t.line(back, 0.45, 0.55) + t.clip(t.below(back, 57), t.hatch(t.below(back, 57), { angle: 78, gap: 1.1, op: 0.35 }) + t.trees(t.below(back, 50), 60, 1.2, 2.4, 0.24, 0.3, 0.55)));
    all.forEach((b) => {
      const front = all.filter((c) => c.z > b.z && M.abs(c.cx - b.cx) < c.rx + b.rx && M.abs(c.cy - b.cy) < c.ry + b.ry).map((c) => c.poly);
      let s = t.line(b.poly, b.w, b.op, true) + t.shade(b.poly, b.cx, b.cy, b.rx, b.ry, { op: 0.7 * b.op, gap: b.z > 200 ? 0.6 : 0.8 });
      // sheeting joints and a vertical crack on the bigger blocks
      if (b.rx > 4.5) s += t.clip(b.poly, t.curve([[b.cx - b.rx, b.cy + b.ry * 0.25], [b.cx, b.cy + b.ry * 0.38], [b.cx + b.rx, b.cy + b.ry * 0.2]], 0.28, 0.5 * b.op) + t.s('M' + r2(b.cx + R(-b.rx, b.rx) * 0.4) + ' ' + r2(b.cy - b.ry) + 'l' + r2(R(-0.6, 0.6)) + ' ' + r2(b.ry * 1.4), 0.28, 0.5 * b.op));
      o += front.length ? t.hide(front, s) : s;
    });
    // pine and the meadow at the foot of the towers, a beaver pond
    o += t.s([[58.5, 58, 13], [62.5, 57.6, 8.5], [24, 60, 9.5], [95, 59, 11], [100, 58.4, 7.5], [18.5, 58.6, 6], [66, 57.2, 5.5]].map(([x, y, h]) => t.pine(x, y, h, h * 0.2)).join(''), 0.42);
    const pond = crPts([[30, 62.2], [60, 61.4], [90, 61.8], [94, 64], [86, 66.6], [60, 67.2], [38, 66.8], [28, 64.4], [30, 62.2]], 4);
    o += t.clip(pond, t.rule(-1, 121, 62, 67.4, { gap: 0.7, op: 0.55, breaks: 0.4 }) + t.hatch([[30, 61], [92, 61], [92, 63.6], [30, 63.6]], { angle: 90, gap: 1.3, op: 0.3 })) + t.line(pond, 0.45, 0.8);
    o += t.tufts([[-1, 57], [121, 57], [121, 61], [-1, 61]], 30, 1.1, 0.3, 0.6) + t.tufts([[-1, 68], [121, 67], [121, 73], [-1, 73]], 30, 1.6, 0.3, 0.7);
    o += t.stip([[-1, 56], [121, 56], [121, 61], [-1, 61]], { n: 90, r: 0.22, op: 0.45 });
    return plate(K, o);
  };

  /* ---------- Fossil Butte: buff Green River cliffs over banded red Wasatch slopes, with a Knightia ---------- */
  B['fossil-butte'] = (K) => {
    const t = T(K, 'fossil-butte'), R = t.R;
    const sil = K.ridge(t.rng, [[0, 55], [5, 53.2], [10, 47], [14, 40], [18, 32.5], [21, 26.5], [23, 21.5], [25.5, 19], [33, 18.4], [48, 18.8], [62, 18.2], [78, 18.6], [93, 18.2], [96, 20], [98.5, 24], [100.5, 29], [104, 36], [108.5, 43.5], [113.5, 50.2], [118, 54], [120, 55]], 0.35, 0.9);
    const cut = K.ridge(t.rng, [[0, 28.2], [30, 28.8], [60, 28.4], [90, 28.9], [120, 28.5]], 0.5, 2);
    const butte = t.below(sil, 55.6);
    const cart = ell(103, 61.4, 14.5, 9, 56);
    let land = t.sky(sil, { gap: 1.2, op: 0.4 });
    // upper cliff: laminated lake limestone, pale
    const up = [[-1, -2], [121, -2]].concat(cut.slice().reverse());
    land += t.clip(butte, t.clip(up,
      t.rule(-1, 121, 19, 29, { gap: 0.72, w: 0.24, op: 0.35, breaks: 0.45 }) + t.hatch([[0, 0], [120, 0], [120, 30], [0, 30]], { angle: 90, gap: 2.1, w: 0.26, op: 0.4, jitter: 0.8 }) +
      t.hatch([[91, 0], [121, 0], [121, 31], [91, 31]], { angle: 100, gap: 0.65, op: 0.5 }) + t.hatch([[-1, 0], [24, 0], [24, 31], [-1, 31]], { angle: 80, gap: 1.2, op: 0.35 })));
    // lower slopes: alternating red-purple (dense) and gray (open) Wasatch bands, scored by rills
    const ys = [28.6, 30.6, 32.8, 35.8, 37.6, 41, 42.8, 46.2, 48.2, 51.6, 55.6];
    let lo = '', bd = '';
    for (let i = 0; i < ys.length - 1; i += 2) lo += t.hatch([[-1, ys[i]], [121, ys[i]], [121, ys[i + 1]], [-1, ys[i + 1]]], { angle: 82, gap: 0.72, op: 0.55, jitter: 0.25 });
    ys.slice(1, -1).forEach((y) => { const pts = []; for (let x = -1; x <= 121; x += 3) pts.push([x, y + R(-0.35, 0.35)]); bd += 'M' + P(pts); });
    let rill = '';
    for (let x = 4; x < 118; x += R(2.4, 4.2)) { const dir = (x - 60) * 0.05; let px = x, d = 'M' + r2(px) + ' ' + r2(yAt(sil, x) > 28.6 ? yAt(sil, x) + 0.5 : 29); for (let y = 31; y < 55; y += 2) { px += dir + R(-0.5, 0.5); d += 'L' + r2(px) + ' ' + r2(y); } rill += d; }
    land += t.clip(butte, t.clip(t.band([[-1, 28]].concat(cut, [[121, 28]]), [[-1, 56], [121, 56]]), lo + t.s(bd, 0.35, 0.65) + t.s(rill, 0.28, 0.45) + t.stip([[0, 29], [120, 29], [120, 55], [0, 55]], { n: 160, r: 0.2, op: 0.4 })));
    // limber pine on the summit flat
    let cap = '';
    for (let x = 27; x < 92; x += R(2, 6)) cap += t.pine(x, yAt(sil, x) + 0.3, R(1.2, 2.3), 0.5);
    land += t.s(cap, 0.32, 0.8);
    // sage flat in front
    land += t.plain(55.6, 72.5, 12, 0.3) + t.sage([[-1, 58], [121, 58], [121, 73], [-1, 73]], 36, 1.1, 0.32, 0.7) + t.line(sil, 1);
    let o = t.hide([cart], land);
    // cartouche: Knightia eocaena in the laminated limestone
    const inner = ell(103, 61.4, 13.4, 8, 56);
    o += t.line(cart, 0.7, 1, true) + t.line(inner, 0.35, 0.8, true);
    o += t.clip(inner, t.rule(88, 118, 52, 71, { gap: 1.5, w: 0.22, op: 0.22, breaks: 0.5 }) + t.stip(inner, { n: 60, r: 0.18, op: 0.35 }));
    const top = [[93.6, 61.6], [95, 60], [97.5, 58.8], [101, 58.1], [104.5, 58.7], [107.5, 60], [109.6, 60.8]];
    const bot = [[93.6, 61.6], [95.2, 63], [98, 64.1], [101.5, 64.5], [105, 63.8], [107.8, 62.6], [109.6, 62]];
    let f = cr(top) + cr(bot).replace('M', 'M') + 'M109.6 60.8L112.6 57.6L111.7 61.4L112.8 65.2L109.6 62';
    let ribs = '', fins = '';
    for (let x = 97.8; x < 105.4; x += 0.72) { const ys0 = 61.2 + (x - 97) * 0.02; ribs += 'M' + r2(x) + ' ' + r2(ys0) + 'Q' + r2(x + 0.25) + ' ' + r2(ys0 + 1.4) + ' ' + r2(x + 0.85) + ' ' + r2(yAt(bot, x + 0.85) - 0.35) + 'M' + r2(x) + ' ' + r2(ys0) + 'L' + r2(x + 0.6) + ' ' + r2(yAt(top, x + 0.6) + 0.35); }
    for (let x = 105.6; x < 109.4; x += 0.55) ribs += 'M' + r2(x) + ' ' + r2(61.15) + 'L' + r2(x + 0.5) + ' ' + r2(yAt(top, x + 0.5) + 0.3) + 'M' + r2(x) + ' ' + r2(61.45) + 'L' + r2(x + 0.5) + ' ' + r2(yAt(bot, x + 0.5) - 0.3);
    for (let k = 0; k < 5; k++) fins += 'M' + r2(101.4 + k * 0.5) + ' ' + r2(58.25) + 'l' + r2(0.9) + ' ' + r2(-1.5 + k * 0.18);
    for (let k = 0; k < 4; k++) fins += 'M' + r2(105.8 + k * 0.5) + ' ' + r2(63.7 - k * 0.25) + 'l' + r2(0.9) + ' ' + r2(1.2);
    for (let k = 0; k < 4; k++) fins += 'M' + r2(101 + k * 0.4) + ' ' + r2(64.4) + 'l' + r2(0.8) + ' ' + r2(1.1);
    for (let k = 0; k < 5; k++) fins += 'M110.4 61.2L' + r2(112.4) + ' ' + r2(58.4 + k * 1.4);
    o += t.s(f, 0.5, 0.95) + t.s('M97.2 61.1C100 60.9 104 61.1 109.6 61.4', 0.45, 0.9) + t.s(ribs, 0.22, 0.85) + t.s(fins, 0.22, 0.75);
    o += t.s('M97.6 59.2Q98.6 61.4 97.5 63.7M96.6 59.6Q97.2 61.4 96.6 63.2', 0.3, 0.85) + '<circle cx="95.4" cy="60.8" r=".62" stroke-width=".3"/>' + t.s('M93.6 61.6l1 .2', 0.3);
    return plate(K, o);
  };

  /* ---------- Killpecker Dunes: crescent barchans marching east, Boar's Tusk beyond ---------- */
  B['killpecker-dunes'] = (K) => {
    const t = T(K, 'killpecker-dunes'), R = t.R;
    const steam = K.ridge(t.rng, [[0, 31.4], [4, 29.4], [28, 28.8], [36, 31.4], [44, 35.4], [54, 36.6]], 0.3, 1); // Steamboat Mountain, flat-topped
    const tusk = [[72, 36.6], [79, 35.4], [83.8, 33.2], [85.8, 30], [86.6, 25], [87.3, 19.6], [88, 15.4], [88.8, 12.8], [89.6, 12.2], [90.1, 13.4], [90.6, 12], [91.4, 11.6], [92, 13.2], [92.5, 17.4], [93.1, 22.6], [93.9, 27.8], [95.1, 31.6], [98.6, 34], [104, 35.7], [110, 36.6]];
    const flat1 = K.ridge(t.rng, [[54, 36.6], [63, 36.4], [72, 36.6]], 0.15, 1.5), flat2 = K.ridge(t.rng, [[110, 36.6], [121, 36.4]], 0.15, 1.5);
    const sk = steam.concat(flat1.slice(1), tusk.slice(1), flat2.slice(1));
    let o = t.sky(sk, { gap: 1.2, op: 0.4 });
    const steamP = t.below(steam, 37);
    o += t.hatch(steamP, { angle: 82, gap: 1.2, op: 0.35 }) + t.clip(steamP, t.line(off(steam, 0, 1.6), 0.3, 0.5)) + t.line(steam, 0.6, 0.7);
    // Boar's Tusk: volcanic neck, columnar on the lit face, deep shadow on the right, talus apron
    const tp = tusk.concat([[72, 37]]);
    const shadow = [[90.4, 12], [91.4, 11.6], [92, 13.2], [92.5, 17.4], [93.1, 22.6], [93.9, 27.8], [95.1, 31.6], [98.6, 34], [104, 35.7], [110, 36.6], [90, 36.8], [90.4, 24]];
    o += t.clip(tp, t.hatch(shadow, { angle: 92, gap: 0.5, op: 0.7 }) + t.hatch([[84, 10], [91, 10], [90.6, 34], [84, 34]], { angle: 88, gap: 1.15, op: 0.45, jitter: 0.3 }) + t.stip([[74, 36.8], [84, 33.4], [86, 31], [96, 31], [100, 34], [110, 36.8]], { n: 80, r: 0.22, op: 0.55 }));
    o += t.line(tusk, 1);
    // barchans: gentle windward backs (west), steep shadowed slip faces with horns pointing downwind
    // [cx, cy, size, ground squash, crest weight]; each dune has real height: the crest is lifted off its footprint
    const dunes = [[66, 39.6, 4.5, 0.3, 0.45], [15, 40.6, 5, 0.3, 0.5], [112, 41, 4, 0.3, 0.45], [44, 43.4, 8, 0.3, 0.6], [101, 47, 9, 0.3, 0.65], [71, 50, 13.5, 0.3, 0.8], [96, 60.4, 8, 0.3, 0.7], [29, 63.4, 23, 0.28, 1.05]];
    const shapes = dunes.map(([cx, cy, s, k, lw]) => {
      const S = (u, v, z) => [cx + u * s, cy + v * s * k - (z || 0) * s * 0.42];
      const outer = [S(1.15, -0.78)], crest = [S(1.15, -0.78)], toe = [S(1.15, -0.78)];
      for (let a = -110; a <= 110; a += 10) { const r = (a * PI) / 180; outer.push(S(0.32 - 0.92 * M.cos(r), 0.92 * M.sin(r))); }
      for (let a = -100; a <= 100; a += 10) { const r = (a * PI) / 180; crest.push(S(0.4 - 0.5 * M.cos(r), 0.66 * M.sin(r), M.pow(M.cos(r * 0.9), 1.6))); }
      for (let a = -90; a <= 90; a += 10) { const r = (a * PI) / 180; toe.push(S(0.64 - 0.4 * M.cos(r), 0.5 * M.sin(r))); }
      outer.push(S(1.15, 0.78)); crest.push(S(1.15, 0.78)); toe.push(S(1.15, 0.78));
      return { cx, cy, s, k, lw, S, outer, crest, toe, back: outer.concat(crest.slice().reverse()), slip: crest.concat(toe.slice().reverse()) };
    });
    // sand sheet, sage and far dune crests between the dunes
    let far = '';
    for (let i = 0; i < 26; i++) { const x = R(2, 118), y = R(37.2, 40.5), w = R(1.2, 3); far += 'M' + r2(x) + ' ' + r2(y) + 'q' + r2(w * 0.6) + ' ' + r2(-w * 0.35) + ' ' + r2(w) + ' ' + r2(w * 0.1); }
    const ground = [[-1, 36.6], [121, 36.6], [121, 73], [-1, 73]];
    o += t.hide([].concat.apply([], shapes.map((d) => [d.back, d.slip])), t.s(far, 0.35, 0.55) + t.plain(36.8, 72.5, 18, 0.26) + t.stip(ground, { n: 220, r: 0.22, op: 0.5 }) + t.sage([[-1, 52], [121, 52], [121, 73], [-1, 73]], 30, 1, 0.3, 0.7));
    shapes.forEach((d) => {
      const slip = d.slip, back = d.back, nearer = shapes.filter((e) => e.cy > d.cy && M.abs(e.cx - d.cx) < (e.s + d.s) * 1.2);
      let rip = '';
      [0.22, 0.42, 0.62, 0.8].forEach((f) => {
        const pts = [];
        for (let a = -96; a <= 96; a += 8) { const r = (a * PI) / 180; const cu = 0.4 - 0.5 * M.cos(r), cv = 0.66 * M.sin(r), ou = 0.32 - 0.92 * M.cos(r), ov = 0.92 * M.sin(r); pts.push(d.S(cu + (ou - cu) * f, cv + (ov - cv) * f, M.pow(M.cos(r * 0.9), 1.6) * (1 - f) * (1 - f * 0.3))); }
        for (let i = 0; i < pts.length - 1; i++) if (t.rng() < 0.7) rip += 'M' + P([pts[i], pts[i + 1]]);
      });
      let s = t.clip(back, t.s(rip, 0.25, 0.5) + t.hatch(back, { angle: 20, gap: 2.2, op: 0.18 })) + t.hatch(slip, { angle: 96, gap: d.s > 10 ? 0.45 : 0.55, op: 0.75 }) + t.clip(slip, t.hatch(slip, { angle: 150, gap: 1.3, op: 0.35 }));
      s += t.line(d.outer, 0.3, 0.4) + t.line(d.toe, 0.32, 0.75) + t.line(d.crest, d.lw);
      o += nearer.length ? t.hide([].concat.apply([], nearer.map((e) => [e.back, e.slip])), s) : s;
    });
    return plate(K, o);
  };

  /* ---------- Nebraska Sandhills: grass-stabilized dunes to the horizon, a blue lake in the swale, a windmill ---------- */
  B['nebraska-sandhills'] = (K) => {
    const t = T(K, 'nebraska-sandhills'), R = t.R;
    const far = K.ridge(t.rng, [[0, 34], [12, 32.6], [24, 33.6], [38, 31.8], [52, 33], [66, 32], [80, 33.4], [96, 31.6], [110, 33], [120, 32.4]], 0.2, 1);
    const mid = K.ridge(t.rng, [[0, 40], [10, 37], [22, 39.6], [34, 36], [46, 38.6], [58, 40.2], [70, 36.6], [84, 38.2], [98, 35.6], [110, 38.2], [120, 37]], 0.25, 1);
    const nl = K.ridge(t.rng, [[0, 49], [8, 44], [18, 41.6], [30, 44.2], [40, 49.6], [48, 53]], 0.2, 1);
    const nr = K.ridge(t.rng, [[65, 53], [76, 47], [90, 42.6], [104, 43.2], [114, 46.4], [120, 47.2]], 0.2, 1);
    const fg = K.ridge(t.rng, [[0, 64], [20, 61.4], [40, 63.2], [60, 61], [80, 62.4], [100, 60.6], [120, 61.8]], 0.2, 1.5);
    const NL = nl.concat([[48, 62], [0, 62]]), NR = nr.concat([[120, 62], [65, 62]]), FG = t.below(fg, 73);
    const wx = 100, wb = yAt(nr, 100) + 0.3, wt = 28.6, hub = [wx, wt - 1.7];
    const wheel = ell(hub[0], hub[1], 3.4, 3.4, 24);
    let o = t.hide([wheel], t.sky(far, { gap: 1.45, op: 0.32, breaks: 0.22 }));
    // far and middle swells: lighter and sparser with distance
    o += t.line(far, 0.4, 0.5) + t.hide([t.below(mid, 73)], t.clip(t.below(far, 50), t.flank(far, { gap: 1.2, len: 2.6, w: 0.26, op: 0.35 })));
    o += t.hide([NL, NR, FG], t.line(mid, 0.55, 0.75) + t.clip(t.below(mid, 60), t.flank(mid, { gap: 0.9, len: 4.5, w: 0.28, op: 0.5 }) + t.tufts(t.below(mid, 47), 30, 0.7, 0.25, 0.45)));
    // near dunes: smooth grass-covered backs, shadowed lee slopes, a blowout scar
    [[nl, NL], [nr, NR]].forEach(([sk, poly]) => {
      o += t.hide([FG], t.clip(poly, t.flank(sk, { gap: 0.7, len: 7, w: 0.3, op: 0.6 }) + t.tufts(poly, 46, 1, 0.26, 0.6)) + t.line(sk, 0.75));
    });
    o += t.hide([FG], t.s('M93 46.6Q97 44.2 101.6 46.4', 0.4, 0.8) + t.stip([[93.4, 46.8], [97, 45.2], [101.4, 46.6], [99, 49], [95, 49]], { n: 30, r: 0.2, op: 0.6 }));
    // lake in the swale, fringed with reeds
    const lake = crPts([[43, 55.4], [50, 53.8], [60, 53.6], [70, 54.2], [73, 55.8], [66, 57.6], [54, 58], [45, 57.2], [43, 55.4]], 4);
    o += t.clip(lake, t.rule(40, 76, 53.6, 58.4, { gap: 0.6, op: 0.62, breaks: 0.45 })) + t.line(lake, 0.45, 0.85);
    let reed = '';
    for (let i = 0; i < 26; i++) { const left = i < 13, x = left ? R(41, 47) : R(68, 75), y = left ? yAt([[41, 56.6], [47, 57.8]], x) : yAt([[68, 57.4], [75, 56]], x); reed += 'M' + r2(x) + ' ' + r2(y) + 'l' + r2(R(-0.3, 0.3)) + ' ' + r2(-R(1, 2.2)); }
    o += t.s(reed, 0.3, 0.8);
    // cattle grazing the near dune
    o += t.s('M13 46.6h1.2M16.4 45.9h1.1M21 46.3h1.2', 0.9, 0.8);
    // windmill and stock tank: the Sandhills ranch landmark
    let wm = 'M' + r2(wx - 2.3) + ' ' + r2(wb) + 'L' + r2(wx - 0.55) + ' ' + r2(wt) + 'M' + r2(wx + 2.3) + ' ' + r2(wb) + 'L' + r2(wx + 0.55) + ' ' + r2(wt);
    for (let k = 0; k < 4; k++) {
      const f0 = k / 4, f1 = (k + 1) / 4, ya = wb + (wt - wb) * f0, yb = wb + (wt - wb) * f1, ha = 2.3 - 1.75 * f0, hb = 2.3 - 1.75 * f1;
      wm += 'M' + r2(wx - ha) + ' ' + r2(ya) + 'L' + r2(wx + hb) + ' ' + r2(yb) + 'M' + r2(wx + ha) + ' ' + r2(ya) + 'L' + r2(wx - hb) + ' ' + r2(yb) + 'M' + r2(wx - hb) + ' ' + r2(yb) + 'H' + r2(wx + hb);
    }
    let blades = '';
    for (let k = 0; k < 18; k++) { const a = (k / 18) * 2 * PI; blades += 'M' + r2(hub[0] + 0.9 * M.cos(a)) + ' ' + r2(hub[1] + 0.9 * M.sin(a)) + 'L' + r2(hub[0] + 3.3 * M.cos(a + 0.08)) + ' ' + r2(hub[1] + 3.3 * M.sin(a + 0.08)); }
    o += t.s(wm, 0.42) + t.s(blades, 0.4) + t.line(ell(hub[0], hub[1], 3.3, 3.3, 28), 0.3, 0.8, true) + t.line(ell(hub[0], hub[1], 2.1, 2.1, 20), 0.25, 0.7, true);
    o += t.s('M' + r2(wx + 0.8) + ' ' + r2(hub[1]) + 'L' + r2(wx + 5.4) + ' ' + r2(hub[1] - 0.2), 0.4) + t.fillPath('M' + r2(wx + 4.4) + ' ' + r2(hub[1] - 1.3) + 'L' + r2(wx + 7.4) + ' ' + r2(hub[1] - 1.8) + 'L' + r2(wx + 7.4) + ' ' + r2(hub[1] + 0.9) + 'L' + r2(wx + 4.4) + ' ' + r2(hub[1] + 0.5) + 'Z', 0.25, 0.35);
    o += t.line(ell(wx + 4.6, wb + 0.2, 2, 0.6, 20), 0.4, 0.9, true) + t.s('M' + r2(wx + 2.6) + ' ' + r2(wb + 0.2) + 'v.8M' + r2(wx + 6.6) + ' ' + r2(wb + 0.2) + 'v.8', 0.35);
    // foreground rise: bunchgrass
    o += t.line(fg, 0.75) + t.clip(FG, t.flank(fg, { gap: 0.8, len: 5, w: 0.3, op: 0.5 })) + t.tufts(FG, 40, 2, 0.32, 0.8);
    return plate(K, o);
  };

  /* ---------- Platte River: braided channels and sandbars at the Big Bend, sandhill cranes ---------- */
  B['platte-river'] = (K) => {
    const t = T(K, 'platte-river'), R = t.R;
    const trees = K.ridge(t.rng, [[0, 30], [6, 27.8], [12, 29.4], [20, 27], [30, 28.8], [38, 26.4], [48, 28.4], [56, 30.2], [64, 28.8], [74, 27.4], [84, 29.4], [94, 27.8], [104, 29.4], [112, 27.6], [120, 28.8]], 1.3, 0.8);
    const bank = [[-1, 33.4], [121, 33]];
    // cranes in flight: long necks forward, legs trailing, wings beating
    const fly = (x, y, s, up) => {
      const wy = up ? -1 : 1;
      return 'M' + r2(x) + ' ' + r2(y) + 'L' + r2(x - 2.8 * s) + ' ' + r2(y - 0.3 * s) + 'L' + r2(x - 3.4 * s) + ' ' + r2(y - 0.18 * s) +
        'M' + r2(x) + ' ' + r2(y) + 'L' + r2(x + 2.4 * s) + ' ' + r2(y + 0.15 * s) + 'L' + r2(x + 5 * s) + ' ' + r2(y + 0.5 * s) +
        'M' + r2(x + 0.6 * s) + ' ' + r2(y) + 'Q' + r2(x + 0.3 * s) + ' ' + r2(y + 2.4 * s * wy) + ' ' + r2(x - 0.9 * s) + ' ' + r2(y + 3.6 * s * wy) +
        'M' + r2(x + 1.5 * s) + ' ' + r2(y + 0.05 * s) + 'Q' + r2(x + 1.7 * s) + ' ' + r2(y + 2.2 * s * wy) + ' ' + r2(x + 0.7 * s) + ' ' + r2(y + 3.3 * s * wy);
    };
    const skein = [[16, 10.5, 1, 1], [25, 12.8, 0.92, 0], [33, 15.4, 0.86, 1], [41.5, 13.6, 0.8, 0], [49, 17.4, 0.74, 1], [56.5, 16, 0.7, 0], [63, 19.6, 0.64, 1], [92, 9.6, 0.6, 0], [99, 11.4, 0.56, 1]];
    let cf = '', cb = '';
    skein.forEach(([x, y, s, u]) => { cf += fly(x, y, s, u); cb += 'M' + r2(x - 0.2 * s) + ' ' + r2(y + 0.02) + 'L' + r2(x + 2.2 * s) + ' ' + r2(y + 0.15 * s); });
    const birdBox = skein.map(([x, y, s]) => [[x - 4 * s, y - 4.2 * s], [x + 5.5 * s, y - 4.2 * s], [x + 5.5 * s, y + 4.2 * s], [x - 4 * s, y + 4.2 * s]]);
    let o = t.hide(birdBox, t.sky(trees, { gap: 1.3, op: 0.36 })) + t.s(cf, 0.4, 0.9) + t.s(cb, 0.9, 0.9);
    // cottonwood gallery on the far bank
    const tb = t.band(trees, bank);
    o += t.hatch(tb, { angle: 84, gap: 0.62, op: 0.55, jitter: 0.3 }) + t.clip(tb, t.flank(trees, { gap: 0.6, len: 4, op: 0.7 })) + t.line(trees, 0.8);
    // braided channels around sandbars
    const bars = [[16, 35.3, 13, 0.7], [50, 36, 9, 0.6], [92, 35.1, 17, 0.8], [30, 40.2, 17, 1.2], [78, 41, 13, 1.1], [111, 39.6, 8, 0.9], [10, 47.4, 13, 1.7], [56, 47.3, 19, 2.1], [101, 48, 15, 1.9], [40, 57.3, 27, 3.3]].map(([x, y, rx, ry]) => ({ x, y, rx, ry, p: sup(x, y, rx, ry, 1.5, 44) }));
    const river = [[-1, 33.4], [121, 33], [121, 63], [-1, 63.6]];
    o += t.hide(bars.map((b) => b.p), t.clip(river, t.rule(-1, 121, 33.8, 42, { gap: 0.62, op: 0.55, breaks: 0.3 }) + t.rule(-1, 121, 42.6, 53, { gap: 0.95, op: 0.55, breaks: 0.35 }) + t.rule(-1, 121, 53.6, 63.6, { gap: 1.35, op: 0.55, breaks: 0.35 })));
    bars.forEach((b) => { o += t.line(b.p, b.ry > 1.5 ? 0.45 : 0.35, 0.8, true) + t.stip(b.p, { n: M.round(b.rx * b.ry * 2.2), r: 0.2, op: 0.55 }); });
    o += t.s(t.pine(98, 47.4, 3, 1.2) + t.pine(101, 47.8, 2.4, 1) + t.pine(30, 39.8, 1.8, 0.8), 0.3, 0.7);
    // standing cranes on the near bar (tall, gray, bustled), smaller ones on the middle bar
    const stand = (x, y, s, f) => {
      const X = (u) => r2(x + u * s * f), Y = (v) => r2(y - v * s);
      return {
        body: 'M' + X(-1.5) + ' ' + Y(4.1) + 'Q' + X(0) + ' ' + Y(5.3) + ' ' + X(1.9) + ' ' + Y(4.3) + 'Q' + X(2.5) + ' ' + Y(3.3) + ' ' + X(1.3) + ' ' + Y(3.2) + 'Q' + X(0) + ' ' + Y(3.1) + ' ' + X(-1.5) + ' ' + Y(4.1) + 'Z',
        line: 'M' + X(-0.2) + ' ' + Y(0) + 'L' + X(-0.1) + ' ' + Y(3.3) + 'M' + X(0.3) + ' ' + Y(0) + 'L' + X(0.25) + ' ' + Y(3.3) + 'M' + X(-1.3) + ' ' + Y(4.3) + 'Q' + X(-1.9) + ' ' + Y(6.2) + ' ' + X(-1.7) + ' ' + Y(7.6) + 'L' + X(-2.7) + ' ' + Y(7.3),
      };
    };
    let cbody = '', cl = '';
    [[21, 59, 1, 1], [26.5, 58.3, 0.95, -1], [31, 59.6, 1.05, 1], [36, 57.7, 0.9, 1], [44, 58.8, 1, 1], [49.5, 57.9, 0.92, -1], [55, 59.1, 0.98, 1], [60, 57.5, 0.85, 1], [50, 47.8, 0.5, 1], [55, 47.2, 0.46, 1], [60, 48, 0.5, -1], [66, 47.4, 0.45, 1]].forEach(([x, y, s, f]) => { const c = stand(x, y, s, f); cbody += c.body; cl += c.line; });
    o += t.fillPath(cbody, 0.5, 0.35) + t.s(cl, 0.42);
    // near bank
    const nb = [[-1, 63.6], [121, 63], [121, 73], [-1, 73]];
    o += t.line([[-1, 63.6], [121, 63]], 0.65) + t.tufts(nb, 46, 2, 0.32, 0.8);
    return plate(K, o);
  };

  /* ---------- Missouri River at Omaha: the meandering Big Muddy, downtown on the bluff, the S-curved pedestrian bridge ---------- */
  B['x-cross-missouri-w'] = (K) => {
    const t = T(K, 'x-cross-missouri-w'), R = t.R;
    const hillsR = K.ridge(t.rng, [[56, 29.4], [62, 27.2], [67, 27.6], [72, 24.8], [77, 26.4], [82, 23.4], [87, 25.2], [93, 22.4], [99, 24.4], [105, 21.8], [111, 23.6], [120, 22]], 0.5, 0.8);
    const bluffL = K.ridge(t.rng, [[0, 29.6], [10, 28.8], [24, 29.6], [36, 30.4], [48, 30.9], [56, 31]], 0.3, 1);
    // Omaha skyline [center x, half width, top y]; First National Bank tower tallest, Woodmen Tower beside it
    const bldg = [[6, 1.6, 25.6], [9.6, 1.4, 24.2], [13.6, 1.3, 26.4], [17, 3, 22.2], [21, 1, 24.6], [24.4, 2, 12.6], [29.6, 2.1, 17.4], [33.2, 1.1, 23.2], [36.2, 1.6, 24.6], [40, 1.2, 26.4], [43.6, 1.8, 27.4], [47.2, 1.2, 28.6]];
    const rects = bldg.map(([x, hw, top]) => { const yb = yAt(bluffL, x) + 0.4; return [[x - hw, yb], [x - hw, top], [x + hw, top], [x + hw, yb]]; });
    const sk = bluffL.concat(hillsR.slice(1));
    let o = t.hide(rects, t.sky(sk, { gap: 1.2, op: 0.4 }));
    // Iowa side: the Loess Hills, pale and wrinkled
    const hp = t.below(hillsR, 32);
    o += t.line(hillsR, 0.55, 0.65) + t.clip(hp, t.flank(hillsR, { gap: 0.7, len: 4, w: 0.28, op: 0.5 }) + t.hatch(hp, { angle: 75, gap: 1.6, op: 0.25 }));
    // downtown towers
    rects.forEach((r, i) => {
      const [x, hw, top] = bldg[i], yb = r[0][1];
      let s = '';
      if (i === 5) { // First National: stepped, chamfered crown
        const crown = [[x - hw, yb], [x - hw, top + 2.2], [x - hw * 0.55, top + 0.6], [x - 0.3, top], [x + 0.3, top], [x + hw * 0.55, top + 0.6], [x + hw, top + 2.2], [x + hw, yb]];
        s += t.line(crown, 0.6) + t.clip(crown, t.hatch([[x + 0.2, top - 1], [x + hw + 1, top - 1], [x + hw + 1, yb], [x + 0.2, yb]], { angle: 90, gap: 0.42, op: 0.75 }) + t.rule(x - hw, x, top + 1, yb, { gap: 0.8, w: 0.22, op: 0.4 }));
      } else {
        s += t.line(r, 0.5) + t.clip(r, t.hatch([[x + hw * 0.2, top], [x + hw + 1, top], [x + hw + 1, yb], [x + hw * 0.2, yb]], { angle: 90, gap: 0.45, op: 0.7 }) + (hw > 1.5 ? t.rule(x - hw, x, top + 0.8, yb, { gap: 0.9, w: 0.22, op: 0.35 }) : ''));
      }
      o += s;
    });
    // the river: one broad S-bend widening toward the viewer
    const C = crPts([[56, 31.4], [51.4, 33.4], [49.6, 35.8], [52.4, 38.6], [60, 41.4], [69, 44.6], [75, 48.8], [75, 54.2], [68, 59.8], [58, 64.8], [52, 73]], 5);
    const L = [], Rr = [];
    C.forEach((p, i) => {
      const a = C[M.max(0, i - 1)], b = C[M.min(C.length - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], ln = M.hypot(tx, ty) || 1;
      const w = 1.3 + 11 * M.pow(i / (C.length - 1), 1.6);
      L.push([p[0] - (ty / ln) * w, p[1] + (tx / ln) * w]); Rr.push([p[0] + (ty / ln) * w, p[1] - (tx / ln) * w]);
    });
    const river = L.concat(Rr.slice().reverse());
    const bar1 = sup(58.6, 39.4, 4, 0.7, 1.5, 24), bar2 = sup(71.6, 50.6, 1.6, 4, 1.5, 24);
    // Carter Lake: the cut-off oxbow on the Nebraska floodplain
    const ox = [];
    for (let a = 70; a <= 290; a += 10) { const r = (a * PI) / 180; ox.push([24 + 11 * M.cos(r), 46 + 3.6 * M.sin(r)]); }
    for (let a = 290; a >= 70; a -= 10) { const r = (a * PI) / 180; ox.push([25.4 + 8.4 * M.cos(r), 46 + 2.1 * M.sin(r)]); }
    // floodplain: fields, riparian trees
    const fp = [[-1, 30.4], [121, 31.6], [121, 73], [-1, 73]];
    let crowns = '';
    t.inside(fp, 400).forEach(([x, y]) => {
      const dist = M.min.apply(null, L.concat(Rr).map((q) => M.hypot(q[0] - x, (q[1] - y) * 1.6)));
      if (dist < 4.5 && !pip(river, x, y)) { const r = 0.35 + (y - 30) * 0.025; crowns += 'M' + r2(x - r) + ' ' + r2(y) + 'a' + r2(r) + ' ' + r2(r * 0.8) + ' 0 1 1 ' + r2(2 * r) + ' 0'; }
    });
    o += t.hide([river, ox], t.plain(31.6, 72.5, 16, 0.3) + t.clip(fp, t.hatch([[-1, 52], [121, 52], [121, 73], [-1, 73]], { angle: 18, gap: 2.4, op: 0.2 })) + t.s(crowns, 0.3, 0.7));
    o += t.clip(ox, t.rule(10, 40, 41, 51, { gap: 0.62, op: 0.6, breaks: 0.4 })) + t.line(ox, 0.42, 0.85, true);
    o += t.hide([bar1, bar2], t.clip(river, t.rule(-1, 121, 31, 44, { gap: 0.55, op: 0.62, breaks: 0.25 }) + t.rule(-1, 121, 44.5, 73, { gap: 0.8, op: 0.62, breaks: 0.3 }) + t.hatch(river, { angle: 8, gap: 2.8, op: 0.2 })));
    o += t.line(bar1, 0.3, 0.7, true) + t.line(bar2, 0.3, 0.7, true) + t.stip(bar1, { n: 12, r: 0.18 }) + t.stip(bar2, { n: 12, r: 0.18 });
    o += t.line(L, 0.6) + t.line(Rr, 0.6);
    // I-480 girder bridge upstream
    o += t.s('M43 34.2L60.4 33.4M43 34.8L60.4 34', 0.35, 0.8) + t.s('M47 34.6v1.3M50.4 34.4v1.4M53.8 34.3v1.4M57.2 34.1v1.3', 0.3, 0.7);
    // Bob Kerrey pedestrian bridge: S-curved deck, two pylons, cable fans
    const deck = crPts([[34, 42.6], [46, 42.2], [54, 41.2], [62, 40.6], [72, 40.2], [86, 39.6]], 5);
    let cab = '', pyl = '';
    [[50.5, 30.2], [66.5, 29.6]].forEach(([px, ptop]) => {
      const db = yAt(deck, px);
      pyl += 'M' + r2(px) + ' ' + r2(db + 1.2) + 'L' + r2(px) + ' ' + r2(ptop);
      for (let k = 1; k <= 5; k++) for (const sgn of [-1, 1]) { const dx = px + sgn * k * 1.7; cab += 'M' + r2(px) + ' ' + r2(ptop + 0.6 + k * 0.5) + 'L' + r2(dx) + ' ' + r2(yAt(deck, dx) - 0.1); }
    });
    o += t.line(deck, 0.75) + t.line(off(deck, 0, 0.6), 0.32, 0.8) + t.s(cab, 0.25, 0.85) + t.s(pyl, 0.65);
    o += t.line(bluffL, 0.6);
    return plate(K, o);
  };

  /* ---------- Continental Divide: a survey monument on a high sage dome, waters parting both ways ---------- */
  B['cross-continental-divide-wb'] = (K) => {
    const t = T(K, 'cross-continental-divide-wb'), R = t.R;
    const sm = K.ridge(t.rng, [[0, 29], [8, 24.5], [16, 21.6], [24, 22.8], [32, 20.4], [40, 23.6], [48, 26.8], [56, 29.6], [64, 31.4]], 0.7, 1); // Sierra Madre, forested
    const flat = K.ridge(t.rng, [[64, 31.4], [80, 31.8], [90, 30.6], [94, 29.4], [98, 29.3], [101, 30.8], [121, 31.4]], 0.25, 1.2);
    const main = K.ridge(t.rng, [[-1, 52], [14, 46.4], [28, 41], [42, 37], [52, 35.2], [60, 34.6], [68, 35], [80, 37.4], [94, 41.4], [108, 46.6], [121, 50]], 0.35, 1);
    const mx = 60, mb = yAt(main, 60) + 0.3;
    const mon = [[mx - 2.7, mb], [mx - 2.7, mb - 1.2], [mx - 1.9, mb - 1.2], [mx - 1.9, mb - 2.2], [mx - 1.25, mb - 2.2], [mx - 0.85, mb - 11], [mx, mb - 13.2], [mx + 0.85, mb - 11], [mx + 1.25, mb - 2.2], [mx + 1.9, mb - 2.2], [mx + 1.9, mb - 1.2], [mx + 2.7, mb - 1.2], [mx + 2.7, mb]];
    const body = t.below(main, 73);
    let o = t.hide([mon, body], t.sky(sm.concat(flat.slice(1)), { gap: 1.2, op: 0.4 }));
    // the forested Sierra Madre to the south, and the open basin to the west
    const smP = t.below(sm, 45);
    o += t.hide([body], t.line(sm, 0.55, 0.7) + t.clip(smP, t.hatch(smP, { angle: 72, gap: 0.8, op: 0.42 }) + t.trees(smP, 90, 1.2, 2.2, 0.24, 0.28, 0.6) + t.flank(sm, { gap: 0.8, len: 6, op: 0.55 })) +
      t.line(flat, 0.4, 0.55) + t.clip(t.below(flat, 45), t.plain(31.5, 44, 7, 0.25)));
    // the divide spur running toward the viewer; east side (right) in shadow
    const spur = [[60, mb], [60.6, 44], [61.6, 54], [62.4, 64], [63, 73]];
    const east = [[60, mb]].concat(main.filter((p) => p[0] > 60), [[121, 73]], spur.slice().reverse());
    o += t.clip(body, t.hatch(east, { angle: 108, gap: 0.95, op: 0.42, jitter: 0.3 }) + t.flank(main, { gap: 0.9, len: 5, op: 0.5 }) + t.stip(body, { n: 260, r: 0.24, op: 0.5 }) + t.sage([[-1, 50], [121, 50], [121, 73], [-1, 73]], 40, 1.1, 0.32, 0.75));
    o += t.s(cr(spur), 0.6, 0.85, ' stroke-dasharray=".4 1.6"');
    // streams leaving each side: Pacific (west, left) and Atlantic (east, right), with flow arrows
    const stream = (pts, dir) => {
      const C = crPts(pts, 6), a = [], b = [];
      C.forEach((p, i) => {
        const q = C[M.min(C.length - 1, i + 1)], pp = C[M.max(0, i - 1)], tx = q[0] - pp[0], ty = q[1] - pp[1], ln = M.hypot(tx, ty) || 1, w = 0.15 + (i / C.length) * 0.9;
        a.push([p[0] - (ty / ln) * w, p[1] + (tx / ln) * w]); b.push([p[0] + (ty / ln) * w, p[1] - (tx / ln) * w]);
      });
      let ar = '';
      [0.35, 0.7].forEach((f) => {
        const i = M.round(f * (C.length - 1)), p = C[i], q = C[i + 1], ux = q[0] - p[0], uy = q[1] - p[1], ln = M.hypot(ux, uy) || 1, nx = ux / ln, ny = uy / ln;
        const tip = [p[0] + nx * 1.4 - ny * 2.6 * dir, p[1] + ny * 1.4 + nx * 2.6 * dir];
        ar += 'M' + r2(tip[0] - nx * 1.5 + ny * 0.8) + ' ' + r2(tip[1] - ny * 1.5 - nx * 0.8) + 'L' + r2(tip[0]) + ' ' + r2(tip[1]) + 'L' + r2(tip[0] - nx * 1.5 - ny * 0.8) + ' ' + r2(tip[1] - ny * 1.5 + nx * 0.8);
      });
      return t.line(a, 0.45, 0.9) + t.line(b, 0.45, 0.9) + t.s(ar, 0.4, 0.8);
    };
    o += stream([[55, 39], [48, 43.4], [40, 48], [30, 52.6], [19, 57], [8, 61], [-1, 63.4]], 1) + stream([[65.5, 39], [72, 43.4], [80, 48], [90, 52.6], [101, 57], [112, 61], [121, 63.4]], -1);
    o += t.s('M57.6 37.4Q55.6 39.4 52.8 40.6M58.8 46Q54 47.6 46.6 46.2M60.4 54Q50 56 38 51.2M62.4 37.4Q64.6 39.4 67.4 40.6M61.6 46Q66.4 47.6 74 46.2M62.6 55Q72 57 83 51.2', 0.28, 0.55);
    // the monument: stepped base, tapering shaft, pyramid cap; shadow side to the right
    const shaftR = [[mx + 0.05, mb - 13], [mx + 0.85, mb - 11], [mx + 1.25, mb - 2.2], [mx + 1.9, mb - 2.2], [mx + 1.9, mb - 1.2], [mx + 2.7, mb - 1.2], [mx + 2.7, mb], [mx + 0.05, mb]];
    o += t.clip(mon, t.hatch(shaftR, { angle: 90, gap: 0.36, op: 0.85 })) + t.line(mon, 0.65, 1, true) + t.s('M' + r2(mx - 0.85) + ' ' + r2(mb - 11) + 'H' + r2(mx + 0.85), 0.4);
    o += t.hatch([[mx + 2.7, mb - 0.2], [mx + 7.6, mb + 0.6], [mx + 6.6, mb + 1.4], [mx + 2.4, mb + 0.6]], { angle: 0, gap: 0.4, op: 0.6 });
    o += t.line(main, 1);
    return plate(K, o);
  };
})();
