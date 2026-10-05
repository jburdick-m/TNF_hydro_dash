/* AA2735 Window Atlas: illustrations.js
 * Procedural survey-plate vignettes after the lithographs and steel engravings in
 * Clarence King's "Geological Exploration of the Fortieth Parallel" (1867-72) and
 * O'Sullivan's field views, set like an aeronautical sectional. Monochrome SVG:
 * every stroke is currentColor, tone is currentColor at low fill-opacity, so the
 * plates follow light and dark themes. All geometry comes from a seeded RNG, so
 * output is identical on every load; strings are built once and cached.
 *
 *   window.ILLUSTRATIONS = { kinds: {range: '<svg…>', …}, plane: '<svg…>', compass: '<svg…>' }
 *   window.illo(kind, { className }) -> '<svg …>' (unknown kinds fall back to 'geology')
 */
(function (root) {
  'use strict';
  var M = Math, PI = M.PI, TAU = 2 * PI;

  /* ---------------- seeded randomness and noise ---------------- */
  function mul(a) {
    return function () {
      a = a + 0x6D2B79F5 | 0;
      var t = M.imul(a ^ a >>> 15, 1 | a);
      t = t + M.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rnd = mul(1);
  function rr(a, b) { return a + (b - a) * rnd(); }
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(a, b, v) { var t = cl((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function noise() {
    var a = []; for (var i = 0; i < 64; i++) a.push(rnd() * 2 - 1);
    return function (x) { var i = M.floor(x), f = x - i, u = f * f * (3 - 2 * f); return a[i & 63] * (1 - u) + a[(i + 1) & 63] * u; };
  }
  function fbm(nz, x) { return nz(x) * .6 + nz(x * 2.13 + 17.1) * .28 + nz(x * 4.37 + 41.3) * .12; }
  function hh(i, j) { var h = M.imul(i, 374761393) + M.imul(j, 668265263) | 0; h = M.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
  function vn(x, y) {
    var i = M.floor(x), j = M.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    var a = hh(i, j), b = hh(i + 1, j), c = hh(i, j + 1), d = hh(i + 1, j + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  /* ---------------- scene state: layers, occluders, vignette ---------------- */
  var LAY, ORD, VIG, MASK, MW, MH, RH, MS = 4, VL = null;
  // Burin weights. Tone comes from line density, not weight: hairlines for hatching (f, h),
  // a firmer line for secondary outlines (m) and the one crisp silhouette per plate (b).
  // Each weight is a CSS var so small renderings (billboards, strip map) can thicken them.
  var SW = { f: '.26', h: '.36', m: '.5', b: '.78', x: '1.1', w: '1.3' };
  var HD = .74; // global hatch density (spacing multiplier)
  function begin(seed, w, h, vig) {
    rnd = mul((seed * 2654435761) >>> 0);
    LAY = {}; ORD = []; VIG = vig !== false; MASK = null;
    MW = (w || 120) * MS; MH = (h || 72) * MS; RH = new Float32Array(MW + 2).fill(Infinity);
  }
  function put(k, d) { if (!LAY[k]) { LAY[k] = []; ORD.push(k); } LAY[k].push(d); }
  function end(extra) {
    var s = '', ks = ORD.filter(function (k) { return k[0] === 't'; }).concat(ORD.filter(function (k) { return k[0] !== 't'; }));
    ks.forEach(function (k) {
      var a = k[0] === 't' ? 'fill="currentColor" fill-opacity="' + k.slice(1) + '" stroke="none"'
        : 'style="stroke-width:var(--iw-' + k[0] + ',' + SW[k[0]] + ')"' + (k.length > 1 ? ' stroke="var(--magenta, #A8336B)"' : '');
      s += '<path ' + a + ' d="' + LAY[k].join('') + '"/>';
    });
    return s + (extra || '');
  }
  function n1(v) { var r = M.round(v * 10) / 10; return (r === 0 ? 0 : r) + ''; }
  function rdp(p, e) {
    if (p.length < 3) return p;
    var a = p[0], b = p[p.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], d = M.sqrt(dx * dx + dy * dy), mi = 0, md = -1;
    for (var i = 1; i < p.length - 1; i++) {
      var q = d < 1e-6 ? M.hypot(p[i][0] - a[0], p[i][1] - a[1]) : M.abs((p[i][0] - a[0]) * dy - (p[i][1] - a[1]) * dx) / d;
      if (q > md) { md = q; mi = i; }
    }
    if (md < e) return [a, b];
    return rdp(p.slice(0, mi + 1), e).slice(0, -1).concat(rdp(p.slice(mi), e));
  }
  function pd(p, z) {
    p = rdp(p, .1);
    var s = 'M' + n1(p[0][0]) + ' ' + n1(p[0][1]);
    for (var i = 1; i < p.length; i++) s += (i === 1 ? 'L' : ' ') + n1(p[i][0]) + ' ' + n1(p[i][1]);
    return s + (z ? 'Z' : '');
  }
  function rs(p, st) {
    var o = [p[0]];
    for (var i = 1; i < p.length; i++) {
      var a = p[i - 1], b = p[i], n = M.ceil(M.hypot(b[0] - a[0], b[1] - a[1]) / st) || 1;
      for (var k = 1; k <= n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return o;
  }
  // ragged oval vignette: 1 inside, fading to 0 at a wavy elliptical edge
  function vgc(x, y) {
    var dx = (x - 60) / 56.5, dy = (y - 36) / 34, r = M.sqrt(dx * dx + dy * dy), t = M.atan2(dy, dx);
    r /= 1 + .04 * M.sin(5 * t + 1.3) + .03 * M.sin(9 * t + .4) + .025 * M.sin(17 * t + 2.1);
    return r >= 1 ? 0 : r < .52 ? 1 : 1 - sm(.52, 1, r);
  }
  function vg(x, y) {
    if (!VIG) return 1;
    if (!VL) { VL = new Float32Array(241 * 145); for (var j = 0; j <= 144; j++) for (var i = 0; i <= 240; i++) VL[j * 241 + i] = vgc(i / 2, j / 2); }
    var a = (x * 2 + .5) | 0, b = (y * 2 + .5) | 0;
    return a < 0 || b < 0 || a > 240 || b > 144 ? 0 : VL[b * 241 + a];
  }
  // visibility: vignette x not hidden by a ridge profile or a masked polygon drawn earlier
  function vis(x, y) {
    var v = vg(x, y); if (v <= 0) return 0;
    if (x < 0 || y < 0) return v;
    var fx = x * MS, i = fx | 0, j = (y * MS) | 0;
    if (i >= MW || j >= MH) return v;
    if (y > RH[i] + (RH[i + 1] - RH[i]) * (fx - i)) return 0;
    if (MASK && MASK[j * MW + i]) return 0;
    return v;
  }
  function rdpF(r, a, b, keep) {
    if (b - a < 2) return;
    var ax = r[2 * a], ay = r[2 * a + 1], dx = r[2 * b] - ax, dy = r[2 * b + 1] - ay, d = M.sqrt(dx * dx + dy * dy), mi = -1, md = .1;
    for (var i = a + 1; i < b; i++) { var px = r[2 * i] - ax, py = r[2 * i + 1] - ay, q = d < 1e-6 ? M.sqrt(px * px + py * py) : M.abs(px * dy - py * dx) / d; if (q > md) { md = q; mi = i; } }
    if (mi < 0) return;
    keep[mi] = 1; rdpF(r, a, mi, keep); rdpF(r, mi, b, keep);
  }
  var RB = new Float64Array(1 << 15), KB = new Uint8Array(1 << 14), RN = 0;
  function emit(st) {
    var n = RN, m = n >> 1, r = RB; RN = 0;
    if (n < 4 || (n === 4 && M.abs(r[0] - r[2]) + M.abs(r[1] - r[3]) < .3)) return;
    KB.fill(0, 0, m); KB[0] = KB[m - 1] = 1; rdpF(r, 0, m - 1, KB);
    var s = '', c = 0;
    for (var i = 0; i < m; i++) if (KB[i]) { s += (c === 0 ? 'M' : c === 1 ? 'L' : ' ') + n1(r[2 * i]) + ' ' + n1(r[2 * i + 1]); c++; }
    put(st, s);
  }
  // toned line: sampled along its length, kept where tone x visibility exceeds the threshold
  function tl(p, st, tone, th, step) {
    if (p.length === 2) return seg(p[0][0], p[0][1], p[1][0], p[1][1], st, tone, th, step);
    step = step || .85;
    var fn = typeof tone === 'function', tc = tone == null ? 1 : tone; RN = 0;
    if (!fn && tc <= th) return;
    for (var s = 1; s < p.length; s++) {
      var ax = p[s - 1][0], ay = p[s - 1][1], bx = p[s][0], by = p[s][1], n = M.ceil(M.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)) / step) || 1;
      for (var k = s === 1 ? 0 : 1; k <= n; k++) {
        var x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n, t = fn ? tone(x, y) : tc;
        if (t > th && t * vis(x, y) > th) { if (RN < 32760) { RB[RN++] = x; RB[RN++] = y; } }
        else if (RN) emit(st);
      }
    }
    if (RN) emit(st);
  }
  // straight toned segment: only the run end points are needed
  function seg(ax, ay, bx, by, st, tone, th, step) {
    var fn = typeof tone === 'function', tc = tone == null ? 1 : tone;
    if (!fn && tc <= th) return;
    var n = M.ceil(M.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay)) / (step || .75)) || 1, on = false, sx = 0, sy = 0, lx = 0, ly = 0;
    for (var k = 0; k <= n; k++) {
      var x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n, t = fn ? tone(x, y) : tc;
      if (t > th && t * vis(x, y) > th) { if (!on) { on = true; sx = x; sy = y; } lx = x; ly = y; }
      else if (on) { on = false; segOut(st, sx, sy, lx, ly); }
    }
    if (on) segOut(st, sx, sy, lx, ly);
  }
  function segOut(st, sx, sy, lx, ly) { if (M.abs(sx - lx) + M.abs(sy - ly) >= .3) put(st, 'M' + n1(sx) + ' ' + n1(sy) + 'L' + n1(lx) + ' ' + n1(ly)); }
  function ln(p, st, th) { tl(p, st, 1, th == null ? rr(.1, .35) : th); }
  function lnc(p, st, th) { ln(p.concat([p[0]]), st, th); }
  // parallel hatching clipped to polygon P; line k drawn where tone > golden-sequence threshold
  function hatch(P, ang, sp, st, tone, ph) {
    var a = ang * PI / 180, c = M.cos(a), s = M.sin(a), Q = [], v0 = 1e9, v1 = -1e9, i, j;
    for (i = 0; i < P.length; i++) {
      var u = P[i][0] * c + P[i][1] * s, w = -P[i][0] * s + P[i][1] * c;
      Q.push([u, w]); if (w < v0) v0 = w; if (w > v1) v1 = w;
    }
    var g = ph == null ? rnd() : ph, k = 0;
    sp *= HD;
    for (var v = v0 + sp * rr(.2, .8); v < v1; v += sp, k++) {
      var xs = [];
      for (i = 0, j = Q.length - 1; i < Q.length; j = i++) {
        var A = Q[j], B = Q[i];
        if ((A[1] <= v) !== (B[1] <= v)) xs.push(A[0] + (v - A[1]) / (B[1] - A[1]) * (B[0] - A[0]));
      }
      xs.sort(function (p, q) { return p - q; });
      var th = (g + k * .618034) % 1 * .96 + .02;
      for (var m = 0; m + 1 < xs.length; m += 2)
        seg(xs[m] * c - v * s, xs[m] * s + v * c, xs[m + 1] * c - v * s, xs[m + 1] * s + v * c, st, tone, th, 1);
    }
  }
  // flat tone fill, clipped to the smooth oval (Sutherland-Hodgman)
  var EC = null;
  function tone(P, op) {
    if (VIG) {
      if (!EC) { EC = []; for (var i = 0; i < 48; i++) { var a = i / 48 * TAU; EC.push([60 + 55 * M.cos(a), 36 + 32.5 * M.sin(a)]); } }
      P = shc(P, EC); if (P.length < 3) return;
    }
    put('t' + op, pd(P, 1));
  }
  function shc(sub, clip) {
    var out = sub;
    for (var i = 0; i < clip.length && out.length; i++) {
      var A = clip[i], B = clip[(i + 1) % clip.length], inp = out, S = inp[inp.length - 1]; out = [];
      for (var j = 0; j < inp.length; j++) {
        var P = inp[j], pi = side(A, B, P), si = side(A, B, S);
        if (pi) { if (!si) out.push(isx(S, P, A, B)); out.push(P); } else if (si) out.push(isx(S, P, A, B));
        S = P;
      }
    }
    return out;
  }
  function side(A, B, P) { return (B[0] - A[0]) * (P[1] - A[1]) - (B[1] - A[1]) * (P[0] - A[0]) >= 0; }
  function isx(S, P, A, B) {
    var d = (S[0] - P[0]) * (A[1] - B[1]) - (S[1] - P[1]) * (A[0] - B[0]);
    var t = ((S[0] - A[0]) * (A[1] - B[1]) - (S[1] - A[1]) * (A[0] - B[0])) / d;
    return [S[0] + t * (P[0] - S[0]), S[1] + t * (P[1] - S[1])];
  }
  // occlusion: things drawn later are hidden behind masked polygons and ridge profiles
  function mask(P) {
    if (!MASK) MASK = new Uint8Array(MW * MH);
    var y0 = 1e9, y1 = -1e9, i, k;
    for (i = 0; i < P.length; i++) { if (P[i][1] < y0) y0 = P[i][1]; if (P[i][1] > y1) y1 = P[i][1]; }
    for (var j = M.max(0, M.floor(y0 * MS)); j < M.min(MH, M.ceil(y1 * MS)); j++) {
      var y = (j + .5) / MS, xs = [];
      for (i = 0, k = P.length - 1; i < P.length; k = i++) {
        var A = P[k], B = P[i];
        if ((A[1] <= y) !== (B[1] <= y)) xs.push(A[0] + (y - A[1]) / (B[1] - A[1]) * (B[0] - A[0]));
      }
      xs.sort(function (a, b) { return a - b; });
      for (var m = 0; m + 1 < xs.length; m += 2) {
        var i0 = M.max(0, M.round(xs[m] * MS)), i1 = M.min(MW, M.round(xs[m + 1] * MS));
        if (i1 > i0) MASK.fill(1, j * MW + i0, j * MW + i1);
      }
    }
  }
  function prof(p) {
    return function (x) {
      if (x < p[0][0] || x > p[p.length - 1][0]) return null;
      var lo = 0, hi = p.length - 1;
      while (hi - lo > 1) { var md = (lo + hi) >> 1; if (p[md][0] <= x) lo = md; else hi = md; }
      var a = p[lo], b = p[hi]; return a[1] + (b[1] - a[1]) * ((x - a[0]) / ((b[0] - a[0]) || 1));
    };
  }
  function occR(p) { var f = prof(p); for (var i = 0; i <= MW; i++) { var h = f(i / MS); if (h !== null && h + .3 < RH[i]) RH[i] = h + .3; } }

  /* ---------------- shape helpers ---------------- */
  function ell(cx, cy, rx, ry, a0, a1, n) {
    var o = []; n = n || 40;
    for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; o.push([cx + rx * M.cos(a), cy + ry * M.sin(a)]); }
    return o;
  }
  function crs(p, n) { // Catmull-Rom through points
    n = n || 6; var o = [];
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], d = p[i + 2] || c;
      for (var k = 0; k < n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t, q = [];
        for (var e = 0; e < 2; e++) q.push(.5 * (2 * b[e] + (c[e] - a[e]) * t + (2 * a[e] - 5 * b[e] + 4 * c[e] - d[e]) * t2 + (3 * b[e] - a[e] - 3 * c[e] + d[e]) * t3));
        o.push(q);
      }
    }
    o.push(p[p.length - 1]); return o;
  }
  function xAt(P, y) {
    for (var i = 1; i < P.length; i++) { var a = P[i - 1], b = P[i]; if ((a[1] <= y) !== (b[1] <= y)) return a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]); }
    return P[0][0];
  }
  // ridge profile from [x, height, half-width, exponent] peaks plus fractal roughness
  function ridge(x0, x1, base, pk, rough, st) {
    var nz = noise(), p = [];
    for (var x = x0; x <= x1 + 1e-6; x += st || .8) {
      var h = 0;
      for (var i = 0; i < pk.length; i++) {
        var q = pk[i], t = M.abs(x - q[0]) / q[2];
        if (t < 1) { var e = q[3] == null ? 1.3 : q[3], v = q[1] * (e ? M.pow(1 - t, e) : .5 + .5 * M.cos(PI * t)); if (v > h) h = v; }
      }
      h += (rough || 0) * fbm(nz, x * .28) * (.35 + h / 22);
      p.push([x, base - M.max(0, h)]);
    }
    return p;
  }
  // mountain: outline, fall-line hatching (dense on the shadowed east faces), occluder
  function mtn(p, base, o) {
    o = o || {};
    var dn = o.d == null ? 1 : o.d, lit = o.lit == null ? .22 : o.lit, sw = o.sw || 'h', len = o.len || 1, snow = o.snow;
    if (snow) lit = M.max(lit, .45);
    ln(p, o.ol || 'm', .03);
    var P = rs(p, o.fs || .5), f = prof(p);
    for (var i = 1; i < P.length - 1; i++) {
      var q = P[i], sl = (P[i + 1][1] - P[i - 1][1]) / (P[i + 1][0] - P[i - 1][0]), dep = base - q[1];
      if (dep < .8) continue;
      var sh = sl > .06, pr = (sh ? cl(.5 + sl * .8, 0, 1) : lit * .8) * dn;
      if (rnd() > pr) continue;
      var L = dep * (sh ? rr(.45, 1) : snow ? rr(.35, .9) : rr(.06, .34)) * len, le = cl(sl, -1.6, 1.6) * .38 + rr(-.08, .08), pts = [];
      for (var k = 0; k <= 5; k++) { var t = k / 5; pts.push([q[0] + le * L * t * (1 - .3 * t), q[1] + .45 + L * t]); }
      tl(pts, sw, snow ? snowTone(snow, sh) : 1, rr(0, .35));
    }
    // cross-hatching: contour-following strokes laid over the deepest shadowed faces
    if (o.xh !== false && dn >= .75) {
      var ext = [[p[0][0], base], [p[p.length - 1][0], base]], poly = p.concat(ext.reverse());
      hatch(poly, o.xa == null ? 24 : o.xa, .95, o.xs || 'f', function (x, y) {
        var a = f(x - .9), b = f(x + .9), c = f(x); if (a === null || b === null) return 0;
        var s = (b - a) / 1.8, d = y - c, H = base - c;
        if (d < .6 || d > H * .85 * len) return 0;
        if (snow && snow(x, y)) return 0;
        return cl((s - .28) * 1.1, 0, .9) * (.55 + .45 * vn(x * .35, y * .35)) * (dn > 1 ? 1 : .8);
      });
    }
    if (o.occ !== false) occR(p);
  }
  function snowTone(snow, sh) { return function (x, y) { return snow(x, y) ? (sh ? .45 : 0) : 1; }; }
  // engraved sky: evenly ruled horizontals, densest at the zenith, clearing toward the horizon,
  // broken into soft banks by low-frequency noise
  function sky(y0, y1, t) {
    hatch([[-2, y0], [122, y0], [122, y1], [-2, y1]], 0, 1.05, 'f', function (x, y) {
      return t * .85 * (.15 + .85 * M.pow(cl((y1 - y) / (y1 - y0), 0, 1), .8)) * (.25 + .75 * vn(x * .07 + 3, y * .32));
    }, .5);
  }
  // still water: close horizontal ruling, finer and tighter with distance, broken by glints
  function water(y0, y1, t, tf) {
    for (var y = y0 + .35, g = .38, k = 0; y < y1; y += g, g = M.min(1.25, g * 1.045), k++) {
      (function (y, k) {
        var z = noise(), base = t * (.55 + .45 * sm(y0, y1, y));
        tl([[-2, y], [122, y]], y - y0 < 4 ? 'f' : 'h', function (x) {
          var v = base * (.7 + .5 * z(x * .09 + k)) * (tf ? tf(x, y) : 1);
          return v * (vn(x * .5, y * 3) > .18 ? 1 : 0);
        }, (k * .618 + .1) % 1 * .85 + .05, .6);
      })(y, k);
    }
  }
  // stipple: dots placed where tone(x,y) beats a random threshold
  function stip(x0, y0, x1, y1, sp, tn, st) {
    for (var y = y0, r = 0; y < y1; y += sp * .86, r++) for (var x = x0 + (r & 1) * sp * .5; x < x1; x += sp) {
      var px = x + rr(-.4, .4) * sp, py = y + rr(-.4, .4) * sp, t = tn(px, py);
      if (t > rnd() && vis(px, py) > rnd() * .6) put(st || 'h', 'M' + n1(px) + ' ' + n1(py) + 'h.05');
    }
  }
  function cloud(cx, cy, w, h) {
    var n = M.max(3, M.round(w / 4.5)), bs = [], i;
    for (i = 0; i < n; i++) { var t = i / (n - 1), r = h * (.4 + .6 * M.sin(PI * (.12 + .76 * t))) * rr(.8, 1.1); bs.push([cx - w / 2 + w * t, cy - r * .35, r]); }
    var top = function (x) { var m = cy; for (var i = 0; i < n; i++) { var d = x - bs[i][0]; if (M.abs(d) < bs[i][2]) m = M.min(m, bs[i][1] - M.sqrt(bs[i][2] * bs[i][2] - d * d)); } return m; };
    var x0 = bs[0][0] - bs[0][2] * .85, x1 = bs[n - 1][0] + bs[n - 1][2] * .85, p = [];
    for (var x = x0; x <= x1; x += .5) p.push([x, top(x)]);
    ln(p, 'h', .05);
    hatch([[x0, cy - h * .5], [x1, cy - h * .5], [x1, cy], [x0, cy]], 0, .8, 'f', function (x, y) { return y > top(x) + .7 ? sm(cy - h * .5, cy, y) * .8 : 0; });
    ln([[x0 + h * .4, cy], [x1 - h * .4, cy]], 'f', .25);
    mask(p.concat([[x1, cy + .5], [x0, cy + .5]]));
  }
  function ground(y0, t, st) {
    var g = .7, k = 0;
    for (var y = y0 + .6; y < 76; y += g, g *= 1.14, k++) {
      var nz = noise();
      tl([[-1, y], [121, y]], st || 'f', function (x) { return t * (.45 + .55 * (.5 + .5 * fbm(nz, x * .07))); }, ((k * .618 + .2) % 1) * .7 + .1);
    }
  }
  function tufts(y0, y1, n, s) {
    for (var i = 0; i < n; i++) {
      var y = rr(y0, y1), x = rr(6, 114), z = (s || 1) * (.6 + (y - y0) / (y1 - y0 + .01) * 1.1);
      for (var j = -2; j <= 2; j++) ln([[x + j * .3 * z, y], [x + j * .85 * z + rr(-.2, .2), y - z * rr(1, 1.7) * (1 - M.abs(j) * .18)]], 'h', .05);
    }
  }
  function lines(y0, y1, t, g0, gr, st) {
    for (var y = y0 + (g0 || .6), g = g0 || .6, k = 0; y < y1; y += g, g *= (gr || 1.1), k++)
      tl([[-2, y], [122, y]], st || 'f', t, ((k * .618 + .2) % 1) * .8 + .1);
  }
  function conifer(x, y, h, sh) {
    var w = h * rr(.19, .25), top = [x + rr(-.15, .15), y - h], bot = y - h * .08, Lp = [top], Rp = [top];
    if (h < 5) { Lp.push([x - w, bot]); Rp.push([x + w, bot]); }
    else {
      var n = M.max(3, M.round(h / 1.4));
      for (var i = 1; i <= n; i++) {
        var t = i / n, yy = y - h + h * .92 * t, ww = w * (.18 + .82 * t) * rr(.82, 1.12);
        Lp.push([x - ww, yy + rr(0, .5)]); Rp.push([x + ww, yy + rr(0, .5)]);
        if (i < n) { Lp.push([x - ww * .42, yy + .2]); Rp.push([x + ww * .42, yy + .2]); }
      }
    }
    var st = h > 10 ? 'm' : h > 5 ? 'h' : 'f';
    ln(Lp, st, .03); ln(Rp, st, .03);
    hatch(Rp.concat([[x, bot]]), 80, h > 10 ? .55 : .5, h > 10 ? 'h' : 'f', sh);
    if (h > 5) hatch(Lp.concat([[x, bot]]), 80, .7, 'f', sh * .22);
    if (h > 3.5) ln([[x, bot], [x, y]], st, .03);
    return Lp.concat([[x - w * .2, y], [x + w * .2, y]], Rp.slice().reverse());
  }
  function trees(hill, x0, x1, gap, h0, h1, sh, jy) {
    var f = prof(hill), L = [];
    for (var x = x0; x < x1; x += gap * rr(.6, 1.35)) { var y = f(x); if (y !== null) L.push([x, y + rr(0, jy == null ? gap * .4 : jy), rr(h0, h1)]); }
    L.sort(function (a, b) { return b[1] - a[1]; });
    for (var i = 0; i < L.length; i++) { var t = L[i]; if (vg(t[0], t[1] - t[2] * .5) > .08) mask(conifer(t[0], t[1], t[2], sh)); }
  }
  function under(p, yb) { return p.concat([[p[p.length - 1][0], yb], [p[0][0], yb]]); }

  /* ---------------- the plates ---------------- */
  var G = {};

  G.range = function () {
    begin(11);
    ground(60, .5); tufts(62, 71, 12);
    var a = ridge(-2, 122, 61, [[12, 15, 24, 1.1], [40, 7, 16, 1], [80, 5, 14], [106, 13, 22, 1.2]], 2.8);
    mtn(a, 66, { ol: 'b', d: 1.15 });
    var b = ridge(-2, 122, 53, [[26, 21, 26, 1.4], [57, 31, 24, 1.6], [69, 25, 14, 1.3], [97, 22, 24, 1.4]], 3.6);
    mtn(b, 58);
    var c = ridge(-2, 122, 45, [[8, 15, 18], [40, 21, 20, 1.5], [85, 27, 26, 1.6], [116, 15, 18]], 1.5);
    mtn(c, 48, { d: .5, sw: 'f', ol: 'h', len: .7 });
    cloud(28, 13, 18, 5);
    sky(2, 34, .5);
    return end();
  };

  G.peak = function () {
    begin(23);
    var f = ridge(-2, 58, 66, [[2, 20, 34, 1.1], [34, 8, 18, 1]], 2);
    mtn(f, 74, { ol: 'b', d: 1.2 });
    var snow = function (x, y) { return y < 30 + 3 * M.sin(x * .9) + 2 * M.sin(x * 2.3); };
    var p = ridge(-2, 122, 58, [[58, 50, 38, 1.45], [93, 27, 22, 1.3], [22, 19, 22, 1.2], [118, 16, 14]], 3.2);
    mtn(p, 63, { snow: snow, d: 1.15, ol: 'b' });
    var b = ridge(-2, 122, 45, [[10, 19, 20, 1.3], [108, 23, 22, 1.4], [76, 13, 14]], 1.2);
    mtn(b, 48, { d: .4, sw: 'f', ol: 'h', len: .6 });
    sky(2, 36, .55);
    return end();
  };

  function lens(cx, cy, w) {
    for (var k = 0; k < 3; k++) {
      var ww = w * (1 - k * .24), yy = cy - k * 1.7, up = [], dn = [];
      for (var i = 0; i <= 30; i++) { var t = i / 15 - 1, x = cx + k * 1.2 + ww * t; up.push([x, yy - 1.7 * (1 - t * t)]); dn.push([x, yy + .45 * (1 - t * t)]); }
      ln(up, 'h', .05); ln(dn, 'f', .05);
      hatch(up.concat(dn.slice().reverse()), 0, .6, 'f', function (x, y) { return sm(yy - 1, yy + .4, y) * .7; });
      mask(up.concat(dn.reverse()));
    }
  }
  G.volcano = function () {
    begin(37);
    var f = ridge(-2, 122, 64, [[16, 7, 26, 0], [62, 5, 22, 0], [104, 8, 22, 0]], 1.5);
    trees(f, 0, 120, 2.4, 3, 5.5, .85, 1.4);
    mtn(f, 74, { d: .8, ol: 'h' });
    var snow = function (x, y) { return y < 27 + 3.5 * M.sin(x * 1.05) + 2.5 * M.sin(x * 2.7 + 1) - (x > 72 ? 3 : 0); };
    var v = ridge(-4, 124, 58, [[54, 50, 62, 1.85], [80, 31, 20, 1.5]], 1.1, .7);
    v.forEach(function (q) { if (q[1] < 11) q[1] = 11 + .5 * M.sin(q[0] * 2.3); });
    mtn(v, 62, { snow: snow, d: 1.15, ol: 'b' });
    lens(58, 7.5, 18);
    sky(1, 32, .5);
    return end();
  };

  G.lake = function () {
    begin(41);
    var sh = 45, i, k, y, g;
    var bank = [[-4, 57], [8, 56.5], [20, 58.5], [31, 62], [40, 67], [47, 74], [-4, 76]];
    for (i = 0; i < 22; i++) {
      var t = rr(.04, .97) * 5, j = M.floor(t), u = t - j, A = bank[j], B = bank[j + 1], x = A[0] + (B[0] - A[0]) * u, yy = A[1] + (B[1] - A[1]) * u;
      ln([[x, yy], [x + rr(-.7, .7), yy - rr(2, 6)]], 'h', .05);
    }
    ln(bank.slice(0, 6), 'b', .03);
    hatch(bank, 62, .85, 'h', function (x, y) { return .35 + .55 * sm(56, 70, y); });
    mask(bank);
    var m = ridge(-2, 122, sh, [[20, 24, 26, 1.4], [50, 15, 18, 1.2], [86, 29, 28, 1.5], [114, 14, 14]], 2), mf = prof(m);
    for (y = sh + .55, g = .55, k = 0; y < 76; y += g, g *= 1.07, k++) {
      (function (y, d) {
        tl([[-2, y], [122, y]], 'f', function (x) {
          var tp = mf(x), hg = tp === null ? 0 : sh - tp, rf = d < hg * .92 ? .95 - .45 * d / (hg + 4) : .2;
          return rf * (.55 + .55 * vn(x * .22, y * 1.4));
        }, (k * .618 + .1) % 1 * .9 + .05);
      })(y, y - sh);
    }
    ln([[-2, sh], [122, sh]], 'h', .1);
    mtn(m, sh, { d: 1 });
    var b = ridge(-2, 122, sh - 6, [[36, 12, 20], [70, 20, 24, 1.5], [100, 10, 14]], 1);
    mtn(b, sh - 4, { d: .4, sw: 'f', ol: 'f', len: .5 });
    cloud(92, 10, 16, 4);
    sky(2, 30, .5);
    return end();
  };

  G.saltflat = function () {
    begin(53);
    var hz = 41, K = 34, pj = function (X, D) { return [60 + X * K / D, hz + K / D]; };
    var dx = .19, dd = .27, V = [], i, j;
    for (j = 0; j < 11; j++) {
      var D = .92 + j * dd, row = [], n = M.ceil((1.9 * D + .3) / dx);
      for (i = -n; i <= n; i++) row.push(pj(i * dx + rr(-.06, .06), D + rr(-.07, .07)));
      V.push({ n: n, r: row, D: D });
    }
    for (j = 0; j < V.length; j++) {
      var R = V[j], st = R.D < 1.9 ? 'h' : 'f', tn = 1.1 - R.D * .16;
      tl(R.r, st, tn, rr(0, .3), .5);
      if (j + 1 < V.length) for (i = -R.n; i <= R.n; i++) if (((i + j) & 1) === 0) tl([R.r[i + R.n], V[j + 1].r[i + V[j + 1].n]], st, tn, rr(0, .3));
    }
    lines(hz, hz + K / V[V.length - 1].D, .3, .5, 1.2);
    var is = ridge(66, 114, hz - 1.6, [[79, 6, 11, 1.2], [93, 8.5, 12, 1.3], [105, 5, 8, 1.1]], .5, .5), isf = prof(is);
    for (var y = hz - 1.2; y < hz; y += .45) tl([[66, y], [114, y]], 'f', function (x) { var t = isf(x); return t !== null && hz - 1.6 - t > 1.2 ? .55 : 0; }, rr(.1, .4));
    mtn(is, hz - 1.6, { d: .8, sw: 'f', ol: 'h', len: .8 });
    var fi = ridge(10, 34, hz - 1.1, [[22, 3.2, 10, 0]], .3, .5);
    mtn(fi, hz - 1.1, { d: .6, sw: 'f', ol: 'h' });
    ln([[-2, hz], [122, hz]], 'h', .1);
    sky(2, hz - 7, .4);
    return end();
  };

  G.canyon = function () {
    begin(67);
    var nz = noise(), i, k, x;
    var NR = [[-4, 42], [6, 43.5], [14, 48], [20, 54.5], [25, 61.5], [29, 68.5], [32, 76], [-4, 76]];
    hatch(NR, 74, .75, 'h', function (x, y) { return .45 + .45 * sm(43, 72, y); });
    for (i = 0; i < 5; i++) { var yy = 46 + i * 5.5; ln([[-4, yy + rr(-.5, .5)], [xAt(NR, yy) - .5, yy]], 'm', .1); }
    ln(NR.slice(0, 7), 'b', .03);
    mask(NR);
    var bt = [[59, 57], [63, 48.5], [66.5, 47.5], [68.5, 41], [71.5, 40.4], [73.5, 34.2], [76.5, 33.4], [78, 27.8], [79.5, 26.8], [84.5, 26.8], [85.8, 27.8], [86.6, 33.2], [89.6, 33.8], [91.6, 40.5], [94.6, 41.2], [97.2, 47.6], [100.6, 48.4], [106, 57]];
    hatch(bt, 90, .65, 'h', function (x, y) { return .18 + .72 * sm(80, 93, x) + (y > 41.5 ? .12 : 0); });
    ln(bt, 'm', .02);
    [[27.4, 79, 85], [33.6, 74, 90], [40.8, 69, 94.8], [48, 64, 101]].forEach(function (L) { ln([[L[1], L[0]], [L[2], L[0]]], 'h', .05); });
    mask(bt.concat([[106, 62], [59, 62]]));
    var rv = function (x) { return 61.5 + 1.8 * M.sin(x * .085 + 1.2); }, R1 = [], R2 = [], TO = [];
    for (x = 18; x <= 124; x += 1) { R1.push([x, rv(x) - .8]); R2.push([x, rv(x) + .8]); TO.push([x, 51.5 + 1.2 * fbm(nz, x * .15)]); }
    ln(R1, 'h', .05); ln(R2, 'h', .05);
    var RP = R1.concat(R2.slice().reverse());
    hatch(RP, 0, .85, 'f', .3);
    var NS = R2.concat([[124, 78], [18, 78]]);
    hatch(NS, 84, .6, 'h', .8); mask(NS); mask(RP);
    ln(TO, 'm', .05);
    hatch(TO.concat(R1.slice().reverse()), 95, .6, 'h', function (x) { return .55 + .4 * vn(x * .3, 1); });
    mask(TO.concat([[124, 78], [18, 78]]));
    var B = [14, 18.5, 23.5, 29, 33.5, 37.5, 44, 51.5], ty = 'cscsccs';
    var LN = B.map(function (b) { var z = noise(), p = []; for (var x = -2; x <= 122; x += 1) p.push([x, b + 1.1 * fbm(z, x * .12)]); return p; });
    for (k = 0; k < 7; k++) {
      var poly = LN[k].concat(LN[k + 1].slice().reverse());
      if (ty[k] === 'c') hatch(poly, 90, .7, 'h', (function (k) { var z = noise(); return function (x) { return (k === 5 ? .45 : .22) + .55 * sm(-.25, .45, fbm(z, x * .14)); }; })(k));
      else hatch(poly, 64, 1.15, 'f', .4);
      ln(LN[k], k === 0 ? 'm' : 'h', .05);
    }
    occR(LN[0]);
    sky(2, 15, .5);
    return end();
  };

  G.river = function () {
    begin(71);
    var hz = 15, K = 58, pj = function (X, D) { return [60 + X * K / D, hz + K / D]; };
    var C = [], X = -3.8, D = 3.3, ax = M.atan2(.95 - 3.3, .55 + 3.8), ds = .01, ph = .9, i, k, t, c;
    while (D > .8 && C.length < 5000) {
      var lam = 1.25 + .5 * D, om = 1.72, th = ax + om * M.sin(ph);
      C.push([X, D, th, om * M.cos(ph) * TAU / lam]);
      X += M.cos(th) * ds; D += M.sin(th) * ds; ph += TAU * ds / lam;
    }
    var w = .075, L1 = [], L2 = [];
    for (i = 0; i < C.length; i += 2) { c = C[i]; var nx = -M.sin(c[2]), nd = M.cos(c[2]); L1.push(pj(c[0] + nx * w, c[1] + nd * w)); L2.push(pj(c[0] - nx * w, c[1] - nd * w)); }
    var RP = L1.concat(L2.slice().reverse());
    hatch(RP, 0, .7, 'f', .6);
    ln(L1, 'm', .04); ln(L2, 'm', .04);
    mask(RP);
    // oxbow lakes cut off from old bends
    var OX = [], tries = 0;
    while (OX.length < 3 && tries++ < 300) {
      var oD = rr(1.1, 2.8), oX = rr(-1.05, 1.05) * oD, r = rr(.17, .27) * (.6 + oD * .2), sp = pj(oX, oD), ok = vg(sp[0], sp[1]) > .5;
      for (i = 0; ok && i < C.length; i += 4) if (M.hypot(C[i][0] - oX, C[i][1] - oD) < r + w + .12) ok = false;
      for (k = 0; ok && k < OX.length; k++) if (M.hypot(OX[k][0] - oX, OX[k][1] - oD) < r + OX[k][2] + .1) ok = false;
      if (!ok) continue;
      OX.push([oX, oD, r]);
      var a0 = rr(0, TAU), O1 = [], O2 = [];
      for (t = 0; t <= 1.0001; t += .02) {
        var a = a0 + t * 4.5, ww = w * .8 * M.min(1, t * 5, (1 - t) * 5);
        O1.push(pj(oX + (r + ww) * M.cos(a), oD + (r + ww) * M.sin(a))); O2.push(pj(oX + (r - ww) * M.cos(a), oD + (r - ww) * M.sin(a)));
      }
      var OP = O1.concat(O2.slice().reverse());
      hatch(OP, 0, .75, 'f', .5); ln(O1, 'h', .04); ln(O2, 'h', .04); mask(OP);
      for (k = 1; k <= 3; k++) {
        var sc = []; for (t = .1; t <= .9; t += .04) { var a2 = a0 + t * 4.5; sc.push(pj(oX + (r - w - k * .045) * M.cos(a2), oD + (r - w - k * .045) * M.sin(a2))); }
        tl(sc, 'f', .7, rr(0, .3));
      }
    }
    // scroll bars (point-bar ridges) inside each bend
    for (k = 1; k <= 5; k++) {
      var off = w + k * .045, run = [], sg = 0;
      for (i = 0; i < C.length; i += 2) {
        c = C[i]; var ka = c[3], sgn = ka > 0 ? 1 : -1, good = M.abs(ka) > 1.1 && M.abs(ka) * off < .75;
        if (good && (sg === 0 || sgn === sg)) { sg = sgn; run.push(pj(c[0] - M.sin(c[2]) * sgn * off, c[1] + M.cos(c[2]) * sgn * off)); }
        else { if (run.length > 3) tl(run, 'f', 1, rr(.05, .3)); run = []; sg = 0; }
      }
      if (run.length > 3) tl(run, 'f', 1, rr(.05, .3));
    }
    // cottonwoods on the cut banks
    for (i = 0; i < C.length; i += 9) {
      c = C[i]; if (rnd() > .55) continue;
      var s2 = c[3] > 0 ? -1 : 1, o2 = w + .05, q = pj(c[0] - M.sin(c[2]) * s2 * o2, c[1] + M.cos(c[2]) * s2 * o2), rc = 1.5 / c[1];
      ln(ell(q[0], q[1], rc, rc * .8, PI, TAU, 7), 'h', .1);
    }
    var bl = ridge(-2, 122, hz + 1.5, [[12, 3.5, 14, 0], [36, 4.8, 16, 0], [64, 3, 12, 0], [90, 5.2, 18, 0], [113, 3.6, 12, 0]], 1, .8);
    lines(hz + 1.5, 30, .3, .45, 1.12);
    mtn(bl, hz + 2.6, { d: .9, sw: 'f', ol: 'h' });
    cloud(84, 9.5, 18, 4);
    sky(1, hz, .4);
    return end();
  };

  function box(pj, K, x0, x1, d0, d1, hg) {
    var a = pj(x0, d0), b = pj(x1, d0), c = pj(x1, d1), d = pj(x0, d1), u = function (p, D) { return [p[0], p[1] - hg * K / D]; };
    var a2 = u(a, d0), b2 = u(b, d0), c2 = u(c, d1), d2 = u(d, d1);
    var F = [a, b, b2, a2], T = [a2, b2, c2, d2], S = x1 < 0 ? [b, c, c2, b2] : x0 > 0 ? [a, d, d2, a2] : null;
    hatch(F, 90, .6, 'f', .45);
    if (S) hatch(S, 90, .5, 'f', x1 < 0 ? .95 : .2);
    ln([a, b, b2, a2, a], 'h', .02); lnc(T, 'f', .02); if (S) ln(S, 'h', .02);
    mask(F); mask(T); if (S) mask(S);
  }
  function tower(x, y, w, h) {
    var dx = w * .42, dy = dx * .3, F = [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], S = [[x + w, y], [x + w + dx, y - dy], [x + w + dx, y - h - dy], [x + w, y - h]], T = [[x, y - h], [x + w, y - h], [x + w + dx, y - h - dy], [x + dx, y - h - dy]];
    hatch(S, 90, .45, 'f', .95);
    hatch(F, 0, 1.25, 'f', .7); hatch(F, 90, 1.5, 'f', .3);
    ln([F[0], F[3], T[3], T[2], S[1], S[0], F[0]], 'h', 0); ln([F[3], F[2], F[1]], 'h', 0); ln([F[2], T[2]], 'f', 0);
    if (h > 30) ln([[x + w * .55, y - h - dy * .5], [x + w * .55, y - h - 6]], 'h', 0);
    mask(F); mask(S); mask(T);
  }
  function roofRow(yb, x0, x1, hm, t) {
    var p = [], x = x0;
    while (x < x1) { var w = rr(1.2, 3.4), hg = rr(.4, hm); p.push([x, yb - hg], [x + w, yb - hg]); x += w; }
    ln(p, 'f', .05);
    var P = p.concat([[x, yb + .3], [x0, yb + .3]]);
    hatch(P, 90, .55, 'f', t); mask(P);
  }
  G.city = function () {
    begin(83);
    var hz = 46, K = 27, pj = function (X, D) { return [60 + X * K / D, hz + K / D]; }, st = .5, bw = .38;
    for (var D = 1.0; D < 3.4; D += st) for (var X = -6.25; X < 6; X += st) {
      var m = pj(X + bw / 2, D + bw / 2); if (vg(m[0], m[1]) < .15) continue;
      box(pj, K, X, X + bw, D, D + bw * .8, rr(.03, .12) * (rnd() < .15 ? 2.2 : 1));
    }
    roofRow(54, 2, 118, 1.6, .5); roofRow(52.6, 4, 116, 1.8, .45);
    var TW = [[34, 3.6, 9], [40, 4.4, 14], [46.5, 4, 20], [52, 5.5, 27], [59, 4.6, 34], [65.5, 5.2, 24], [72, 3.8, 18], [77.5, 5.4, 12], [84.5, 4, 8]];
    TW.sort(function (a, b) { return a[2] - b[2]; }).forEach(function (t) { tower(t[0], 51 + rr(-.5, .5), t[1], t[2]); });
    roofRow(50.2, 6, 114, 1.8, .4); roofRow(48.6, 8, 112, 1.5, .3);
    var mt = ridge(-2, 122, hz + 1, [[16, 14, 22, 1.3], [44, 10, 18], [92, 16, 26, 1.4], [116, 10, 14]], 1.2);
    mtn(mt, hz + 2, { d: .45, sw: 'f', ol: 'h', len: .6 });
    sky(2, 34, .45);
    return end();
  };

  function playa(cx, cy, rx, ry) {
    var e = ell(cx, cy, rx, ry, 0, TAU, 60);
    e.forEach(function (q) { q[1] += .25 * M.sin(q[0] * .9); });
    ln(e, 'h', .05);
    tl(ell(cx + rx * .05, cy + ry * .1, rx * .78, ry * .6, PI * 1.1, PI * 1.9, 20), 'f', .8, .1);
    mask(e);
  }
  G.basin = function () {
    begin(97);
    ground(64, .5); tufts(65, 72, 10);
    var r1 = ridge(-4, 84, 64, [[14, 14, 30, 1.2], [46, 10, 22, 1.1], [68, 6, 16]], 2);
    mtn(r1, 68, { ol: 'b', d: 1.1 });
    playa(94, 58.5, 22, 2.4);
    lines(53, 64, .35, .6, 1.1);
    var r2 = ridge(22, 124, 54, [[62, 16, 26, 1.3], [92, 20, 30, 1.4], [118, 10, 16]], 1.6);
    mtn(r2, 57, { d: .85 });
    playa(30, 49.5, 22, 1.6);
    lines(45, 54, .3, .5, 1.1);
    var r3 = ridge(-4, 92, 46, [[12, 12, 20, 1.3], [40, 15, 24, 1.4], [72, 9, 20]], 1.2);
    mtn(r3, 48, { d: .55, sw: 'f', ol: 'h', len: .7 });
    playa(100, 43.8, 16, 1);
    lines(41, 46, .25, .5, 1.1);
    var r4 = ridge(-4, 124, 41, [[28, 7, 18], [64, 10, 22, 1.3], [102, 8, 22]], .8);
    mtn(r4, 42, { d: .35, sw: 'f', ol: 'f', len: .5 });
    sky(2, 33, .5);
    return end();
  };

  function dprof(x0, x1, base, pk) {
    var p = [];
    for (var x = x0; x <= x1; x += .6) {
      var h = 0;
      for (var i = 0; i < pk.length; i++) {
        var q = pk[i], wind = x < q[0], t = wind ? (q[0] - x) / q[2] : (x - q[0]) / q[3];
        if (t < 1) { var v = wind ? q[1] * (1 - M.pow(t, 1.4)) : q[1] * (1 - t); if (v > h) h = v; }
      }
      p.push([x, base - h]);
    }
    return p;
  }
  function dune(p, base, far) {
    var f = prof(p), i, k;
    ln(p, far ? 'h' : 'b', .03);
    for (i = 1; i < p.length - 1; i++) {
      var q = p[i], sl = (p[i + 1][1] - p[i - 1][1]) / (p[i + 1][0] - p[i - 1][0]), dep = base - q[1];
      if (sl > .25 && dep > 1 && rnd() < .92) { var L = dep * rr(.7, 1); tl([[q[0], q[1] + .4], [q[0] + .1 * L, q[1] + L]], far ? 'f' : 'h', 1, rr(0, .3)); }
    }
    for (var d = 1.1, k = 0; d < 30; d += 1.1 + d * .09, k++) {
      var pts = [];
      for (var x = -2; x <= 122; x += .6) { var y0 = f(x); if (y0 !== null) pts.push([x, y0 + d + .35 * M.sin(x * 1.3 + k * 2)]); }
      (function (d) {
        tl(pts, 'f', function (x, y) { var a = f(x - .6), b = f(x + .6); return a !== null && b !== null && y < base && b - a < -.03 ? .8 * (1 - d / 32) : 0; }, rr(0, .3));
      })(d);
    }
    occR(p);
  }
  G.dunes = function () {
    begin(101);
    dune(dprof(-4, 124, 76, [[64, 36, 62, 22], [6, 22, 22, 14]]), 78);
    dune(dprof(-4, 124, 57, [[30, 12, 26, 9], [96, 15, 30, 10], [124, 8, 14, 6]]), 60);
    dune(dprof(-4, 124, 47, [[16, 6, 18, 6], [52, 8, 22, 7], [80, 6, 16, 5], [110, 7, 18, 6]]), 49, true);
    var mt = ridge(-2, 122, 41, [[20, 16, 24, 1.4], [52, 22, 26, 1.5], [90, 18, 26, 1.4], [118, 12, 14]], 1.3);
    mtn(mt, 43, { d: .5, sw: 'f', ol: 'h', len: .7 });
    sky(2, 30, .5);
    return end();
  };

  G.plains = function () {
    begin(113);
    var hz = 21, K = 48, pj = function (X, D) { return [60 + X * K / D, hz + K / D]; }, c = .62, i, j, X, D;
    for (X = -14 * c; X <= 14 * c + .01; X += c) tl([pj(X, .9), pj(X, 9)], 'f', .7, .05, .5);
    for (D = 1; D < 9; D += c) tl([pj(-30, D), pj(30, D)], 'f', .75, .05);
    for (j = 0; j < 8; j++) {
      var D0 = 1 + j * c;
      for (i = -14; i < 14; i++) {
        var cx = i * c + c / 2, cd = D0 + c / 2, s = pj(cx, cd); if (vg(s[0], s[1]) < .08) continue;
        var r = c * .46, circ = [];
        for (var a = 0; a < TAU - 1e-6; a += TAU / 36) circ.push(pj(cx + r * M.cos(a), cd + r * M.sin(a)));
        var typ = rnd(), near = D0 < 3;
        lnc(circ, near ? 'h' : 'f', .05);
        if (typ < .4) hatch(circ, 0, .6, 'f', .85);
        else if (typ < .7) {
          for (var k = 1; k <= (near ? 3 : 1); k++) {
            var rk = r * k / (near ? 4 : 2), rg = [];
            for (a = 0; a <= TAU + 1e-6; a += TAU / 30) rg.push(pj(cx + rk * M.cos(a), cd + rk * M.sin(a)));
            ln(rg, 'f', .05);
          }
        } else if (typ < .88) {
          var a0 = rr(0, TAU), sec = [pj(cx, cd)];
          for (a = 0; a <= PI + 1e-6; a += PI / 18) sec.push(pj(cx + r * M.cos(a0 + a), cd + r * M.sin(a0 + a)));
          hatch(sec, 0, .6, 'f', .8); ln([sec[1], sec[0], sec[sec.length - 1]], 'f', .05);
        }
      }
    }
    lines(hz, hz + K / (1 + 8 * c), .35, .4, 1.15);
    ln([[-2, hz], [122, hz]], 'h', .1);
    cloud(78, 8, 30, 7); cloud(26, 13, 14, 3.5);
    sky(1, hz, .45);
    return end();
  };

  G.reservoir = function () {
    begin(127);
    var cr = function (x) { var u = (x - 60) / 30; return 41 - 3.6 * (1 - u * u); }, bs = function (x) { var u = (x - 60) / 15; return 61 - 1.3 * (1 - u * u); };
    var LW = [[-4, 17], [8, 18.5], [17, 23], [24, 30], [30, 41], [44, 61], [45, 67], [38, 76], [-4, 76]];
    var RW = [[124, 15], [110, 17.5], [101, 22.5], [95, 29], [90, 41], [76, 61], [75, 67], [82, 76], [124, 76]];
    [[LW, -1, .4], [RW, 1, .85]].forEach(function (W) {
      var P = W[0], sd = W[1], edge = P.slice(1, 5);
      hatch(P, sd < 0 ? 72 : 102, .75, 'h', function (x, y) { var ex = xAt(edge, y); return y < 41 && y > 18 && (x - ex) * sd < 2.6 && (x - ex) * sd > -.5 ? 0 : W[2] * (.7 + .3 * vn(x * .2, y * .1)); });
      for (var y = 22; y < 74; y += rr(3, 5)) { var xe = y < 41 ? xAt(edge, y) - 2.6 * sd : xAt(P.slice(4, 7), y); ln([[xe, y], [xe - sd * rr(6, 14), y + rr(-.6, .6)]], 'h', .1); }
      ln(edge.map(function (q) { return [q[0] - 2.6 * sd, q[1]]; }), 'h', .05);
      ln(P.slice(1, 8), 'm', .02);
      mask(P);
    });
    var C1 = [], C2 = [], BB = [], u, x;
    for (x = 30; x <= 90; x += 1) { C1.push([x, cr(x)]); C2.push([x, cr(x) + .9]); }
    for (x = 45; x <= 75; x += 1) BB.push([x, bs(x)]);
    for (u = 0; u <= 1.0001; u += 1 / 40) {
      var xc = 30 + 60 * u, xb = 45 + 30 * u, A = [xc, cr(xc) + .9], Bp = [xb, bs(xb)], mid = [(A[0] + Bp[0]) / 2 + (u - .5) * 2.5, (A[1] + Bp[1]) / 2];
      tl(crs([A, mid, Bp], 5), 'f', .3 + .65 * sm(.45, 1, u) + .25 * sm(.2, 0, u), rr(0, .25));
    }
    for (var v = .14; v < 1; v += .14) {
      var arc = []; for (u = 0; u <= 1.0001; u += .05) { var xc2 = 30 + 60 * u, xb2 = 45 + 30 * u; arc.push([xc2 + (xb2 - xc2) * v, cr(xc2) + .9 + (bs(xb2) - cr(xc2) - .9) * v]); }
      ln(arc, 'f', .1);
    }
    ln(C1, 'm', 0); ln(C2, 'h', 0);
    var face = C1.concat(BB.slice().reverse());
    mask(face);
    var PH = [[47, 60.5], [73, 60.5], [73, 66], [47, 66]];
    hatch(PH, 90, 1.1, 'f', .5); lnc(PH, 'h', 0); ln([[47, 62.3], [73, 62.3]], 'f', 0);
    mask(PH);
    var RB1 = [[50, 66], [44, 70], [36, 76]], RB2 = [[70, 66], [77, 70], [86, 76]];
    ln(RB1, 'h', .05); ln(RB2, 'h', .05);
    hatch(RB1.concat(RB2.slice().reverse()), 0, .9, 'f', .55);
    lines(23, 41, .75, .5, 1.05);
    var ms = ridge(-2, 122, 23, [[30, 5, 10, .4], [62, 4, 8, .3], [88, 6, 12, .4]], .6);
    mtn(ms, 23.5, { d: .7, sw: 'f', ol: 'h' });
    sky(1, 22, .45);
    return end();
  };

  G.mine = function () {
    begin(131);
    var N = 9, R = [], k, t;
    for (k = 0; k <= N; k++) { var f = 1 - k / 10.4; R.push([60 + k * .4, 31 + k * 2.3, 53 * f, 15 * f]); }
    var e = function (k, a0, a1, n) { var r = R[k]; return ell(r[0], r[1], r[2], r[3], a0, a1, n || 60); };
    var low0 = e(0, 0, PI), FG = low0.concat([[-4, R[0][1]], [-4, 78], [124, 78], [124, R[0][1]]]);
    hatch(FG, 0, 1.1, 'f', function (x, y) { return .35 + .35 * sm(46, 70, y); });
    ln(low0, 'b', .02);
    mask(FG);
    var road = [], runs = [];
    for (t = 0; t <= 1.0001; t += .004) {
      var kk = t * (N - .01), k0 = M.floor(kk), fr = kk - k0, A = R[k0], B = R[k0 + 1], a = PI * .95 + t * TAU * 1.6;
      var p = [A[0] + (B[0] - A[0]) * fr + (A[2] + (B[2] - A[2]) * fr) * M.cos(a), A[1] + (B[1] - A[1]) * fr + (A[3] + (B[3] - A[3]) * fr) * M.sin(a)];
      if (M.sin(a) < 0) road.push(p); else if (road.length) { runs.push(road); road = []; }
    }
    if (road.length) runs.push(road);
    runs.forEach(function (r) { ln(r, 'm', .02); ln(r.map(function (q) { return [q[0], q[1] + .9]; }), 'f', .05); });
    for (k = 0; k < N; k++) {
      var up = e(k, PI, TAU), up2 = e(k + 1, PI, TAU);
      hatch(up.concat(up2.slice().reverse()), 90, .6, 'h', function (x) { return .3 + .55 * sm(20, 100, x); });
      ln(up, k === 0 ? 'm' : 'h', .02);
      ln(e(k + 1, 0, PI), 'f', .05);
    }
    var bot = e(N, 0, TAU, 40); tone(bot, .14); lines(R[N][1] - 1, R[N][1] + 1, .5, .5, 1);
    mask(e(0, 0, TAU, 80));
    var WD = [[88, 24], [92, 19.5], [112, 19], [116, 21.5], [124, 22], [124, 26]];
    hatch(WD, 80, .6, 'h', .5); ln(WD.slice(0, 5), 'h', .03); ln([[93, 21], [111, 20.6]], 'f', .1); mask(WD);
    var m = ridge(-2, 122, 24, [[22, 12, 26, 1.3], [54, 16, 28, 1.4], [92, 11, 24, 1.2]], 1.4);
    mtn(m, 26, { d: .7 });
    sky(1, 20, .5);
    return end();
  };

  function fish(x0, cy, L) {
    var h = function (t) { return L * (.022 + .118 * M.pow(M.sin(PI * M.pow(M.min(1, t / .84), .7)), .85)); };
    var UP = [], DN = [], i, t, x;
    for (i = 0; i <= 42; i++) { t = i / 50; UP.push([x0 + t * L, cy - h(t) * .85]); DN.push([x0 + t * L, cy + h(t)]); }
    var TAIL = [[x0 + .86 * L, cy - .03 * L], [x0 + .95 * L, cy - .1 * L], [x0 + L, cy - .145 * L], [x0 + .94 * L, cy + .005 * L], [x0 + .995 * L, cy + .15 * L], [x0 + .95 * L, cy + .1 * L], [x0 + .86 * L, cy + .03 * L]];
    var OUT = UP.concat(TAIL, DN.slice().reverse());
    tone(OUT, .1);
    lnc(OUT, 'm', 0);
    lnc(ell(x0 + .075 * L, cy - .025 * L, .022 * L, .022 * L, 0, TAU, 12), 'h', 0);
    put('h', 'M' + n1(x0 + .075 * L) + ' ' + n1(cy - .025 * L) + 'h.2');
    ln(crs([[x0 + .17 * L, cy - .085 * L], [x0 + .205 * L, cy - .01 * L], [x0 + .18 * L, cy + .1 * L]], 5), 'h', 0);
    ln([[x0, cy + .01 * L], [x0 + .045 * L, cy + .02 * L]], 'h', 0);
    ln([[x0 + .21 * L, cy - .005 * L], [x0 + .86 * L, cy + .002 * L]], 'm', 0);
    for (t = .24; t < .83; t += .026) {
      x = x0 + t * L; var hg = h(t);
      ln([[x, cy - .006 * L], [x + .25 * hg, cy - hg * .75]], 'f', 0);
      if (t < .62) ln(crs([[x, cy + .006 * L], [x + .12 * hg, cy + hg * .55], [x + .32 * hg, cy + hg * .9]], 3), 'f', 0);
      else ln([[x, cy + .006 * L], [x + .3 * hg, cy + hg * .8]], 'f', 0);
      ln([[x - .006 * L, cy - .012 * L], [x - .006 * L, cy + .012 * L]], 'h', 0);
    }
    var fin = function (t0, t1, sgn, len, n) {
      for (var j = 0; j <= n; j++) {
        var tt = t0 + (t1 - t0) * j / n, bx = x0 + tt * L, by = sgn < 0 ? cy - h(tt) * .85 : cy + h(tt);
        ln([[bx, by], [bx + len * .5, by + sgn * len * (1 - .5 * j / n)]], 'f', 0);
      }
    };
    fin(.42, .55, -1, .085 * L, 7); fin(.66, .77, 1, .075 * L, 6); fin(.45, .5, 1, .06 * L, 3);
    for (i = 0; i < 5; i++) ln([[x0 + .21 * L, cy + .05 * L], [x0 + .29 * L, cy + (.06 + i * .015) * L]], 'f', 0);
    for (i = 0; i <= 10; i++) { var q = i < 5 ? i / 4 : (i - 5) / 5, P = i < 5 ? [x0 + (.86 + .14 * q) * L, cy - (.03 + .115 * q) * L] : [x0 + (.86 + .135 * q) * L, cy + (.03 + .12 * q) * L]; ln([[x0 + .845 * L, cy], P], 'f', 0); }
    mask(OUT);
  }
  function dots(inF, sp) {
    for (var y = 0, r = 0; y < 76; y += sp * .8, r++) for (var x = (r % 2) * sp * .5; x < 122; x += sp) {
      var px = x + rr(-.35, .35) * sp, py = y + rr(-.3, .3) * sp;
      if (inF(px, py) && vis(px, py) > rnd() * .7) put('h', 'M' + n1(px) + ' ' + n1(py) + 'h.2');
    }
  }
  function strata(tb, inF, sp, st, t, md) {
    for (var d = sp * .5, k = 0; d < (md || 30); d += sp, k++) {
      var p = []; for (var x = -2; x <= 122; x += 4) p.push([x, tb(x) + d]);
      tl(p, st, function (x, y) { return inF(x, y) ? t : 0; }, ((k * .618) % 1) * .5 + .02);
    }
  }
  G.geology = function () {
    begin(149);
    var nz = noise(), i, j;
    var SP = rs([[-4, 23.5], [10, 23], [21, 22], [24.5, 13.2], [27.5, 11.4], [44, 11], [47, 13.4], [49, 17.5], [53, 22.4], [76, 23.2], [92, 21.4], [104, 22.8], [124, 22.4]], 1);
    SP.forEach(function (q) { q[1] += .4 * fbm(nz, q[0] * .6); });
    var sf = prof(SP);
    var bd = [17, 26, 31.5, 35.5, 37.2, 59, 99].map(function (b, j) { return function (x) { return b + .045 * (x - 60) + 1.2 * M.sin(x * .045 + 1) + (j > 4 ? .8 * M.sin(x * .1) : 0); }; });
    var inL = function (j) { return function (x, y) { var s = sf(x); return s !== null && y > s && (j === 0 || y > bd[j - 1](x)) && y < bd[j](x); }; };
    fish(42, 48.5, 36);
    dots(inL(0), 1.9); for (i = 0; i < 6; i++) { var jx = rr(27, 45); ln([[jx, 10], [jx + rr(-.5, .5), 18]], 'f', .05); }
    strata(bd[0], inL(1), .9, 'f', .6, 12);
    dots(inL(2), 1.6);
    strata(bd[2], inL(3), 1.33, 'f', .95, 6);
    for (j = 0; j < 3; j++) for (var x = (j % 2) * 1.7; x < 122; x += 3.4) { var y0 = bd[2](x) + j * 1.33; tl([[x, y0], [x, y0 + 1.33]], 'f', function (x, y) { return inL(3)(x, y) ? 1 : 0; }, .05); }
    strata(bd[3], inL(4), .3, 'h', 1, 3);
    strata(bd[4], inL(5), .72, 'f', .7, 24);
    var in6 = inL(6);
    for (var y = 58, r = 0; y < 76; y += 3.1, r++) for (x = (r % 2) * 2.4; x < 122; x += 4.8) {
      var px = x + rr(-1, 1), py = y + rr(-.8, .8), a = rr(.7, 1.4), b = a * rr(.55, .8);
      if (in6(px, py) && in6(px + a, py) && in6(px - a, py) && in6(px, py - b)) { var pe = ell(px, py, a, b, 0, TAU, 10); ln(pe, 'h', .1); hatch(pe, 40, .5, 'f', .5); }
    }
    for (j = 0; j < 6; j++) (function (j) { var p = []; for (var x = -2; x <= 122; x += 2) p.push([x, bd[j](x)]); tl(p, 'h', function (x, y) { var s = sf(x); return s !== null && y > s ? 1 : 0; }, .05); })(j);
    ln(SP, 'b', .02);
    for (x = 6; x < 116; x += rr(3, 7)) { var sy = sf(x); for (var g = -1; g <= 1; g++) ln([[x + g * .3, sy], [x + g * .8, sy - rr(.8, 1.6)]], 'h', .05); }
    occR(SP);
    sky(1, 24, .5);
    return end();
  };

  function wheel(cx, cy, rx, ry) {
    var O = ell(cx, cy, rx, ry, 0, TAU, 64), I = ell(cx, cy, rx - 1.6, ry - 1.7, 0, TAU, 64), I2 = ell(cx, cy, rx - 2.4, ry - 2.6, 0, TAU, 64), H = ell(cx, cy, 2.6, 2.9, 0, TAU, 24);
    hatch(O.concat(I.slice().reverse()), 40, .5, 'f', function (x, y) { return sm(-.3, .8, ((x - cx) / rx + (y - cy) / ry) * .7) + .1; });
    ln(O, 'b', 0); ln(I, 'm', 0); ln(I2, 'h', 0);
    hatch(H, 45, .5, 'f', .6); ln(H, 'm', 0); ln(ell(cx, cy, 1.1, 1.2, 0, TAU, 12), 'h', 0);
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * TAU + .13, c = M.cos(a), s = M.sin(a), r0 = 2.7, r1 = 1 - (i === 7 ? .5 : 0);
      for (var e = -1; e <= 1; e += 2) ln([[cx + c * 2.7 - s * .35 * e, cy + s * 2.9 + c * .35 * e], [cx + c * ((rx - 2.4) * r1) - s * .45 * e, cy + s * ((ry - 2.6) * r1) + c * .45 * e]], 'h', 0);
      if (i === 7) ln([[cx + c * (rx - 2.4), cy + s * (ry - 2.6)], [cx + c * (rx - 2.4) * .78, cy + s * (ry - 2.6) * .78]], 'h', 0);
      void r0;
    }
    mask(O.concat(I.slice().reverse())); mask(H);
  }
  // railroad spike lying in the grass: square shank, chisel point, head hooked to one side
  function spike(x, y, L, ang) {
    var c = M.cos(ang), sn = M.sin(ang), F = function (u, v) { return [x + u * c - v * sn, y + u * sn + v * c]; }, w = 1.5;
    var SH = [F(0, -w), F(L * .82, -w), F(L, -.25), F(L, .25), F(L * .82, w), F(0, w)];
    var HD = [F(-2.2, -w - 3.2), F(0, -w - 3.2), F(.4, -w - 2.2), F(.4, w + .9), F(-2.2, w + .9)];
    var SD = [F(0, w), F(L * .82, w), F(L, .25), F(L, 1.2), F(L * .82, w + 1.3), F(.2, w + 1.4)];
    hatch(SD, ang * 180 / PI, .45, 'h', .95); hatch(SH, ang * 180 / PI + 90, 1, 'f', .3); hatch(HD, ang * 180 / PI + 90, .5, 'h', .8);
    lnc(SH, 'm', 0); lnc(HD, 'm', 0); ln(SD.slice(2), 'm', 0); ln([F(-2.2, w + .9), F(-2, w + 2), F(.2, w + 2.1), F(.4, w + .9)], 'h', 0);
    mask(SH); mask(HD); mask(SD); mask([F(-2.2, w + .9), F(-2, w + 2), F(.2, w + 2.1), F(.4, w + .9)]);
  }
  G.history = function () {
    begin(151);
    var hz = 41, K = 34, pj = function (X, D) { return [60 + X * K / D, hz + K / D]; };
    spike(80, 61, 26, -.32);
    wheel(30, 53, 12.2, 13.8);
    for (var s = -1; s <= 1; s += 2) {
      var E = [[], []];
      for (var D = .85; D < 18; D *= 1.035) for (var e = 0; e < 2; e++) E[e].push(pj(-.12 + .32 * M.sin(D * .5 + .3) + s * .075 + (e - .5) * .04, D));
      var fade = function (x, y) { return .35 + .65 * sm(hz, hz + 18, y); };
      tl(E[0], 'h', fade, .03); tl(E[1], 'f', fade, .03);
      hatch(E[0].concat(E[1].slice().reverse()), 0, .55, 'f', function (x, y) { return .8 * fade(x, y); });
    }
    ground(hz + .4, .45); tufts(hz + 8, 72, 16);
    var SB = [[68, 41.2], [71, 37], [74, 34.5], [78, 33.8], [80, 30.6], [84.5, 29.8], [87, 31.2], [89.5, 31], [91.5, 33.6], [94, 34], [95.5, 37], [98.5, 37.4], [100.5, 35.6], [104, 35.2], [106.5, 38], [112, 41.2]];
    hatch(SB, 90, .6, 'h', function (x) { return .25 + .6 * vn(x * .4, 3); });
    [33.8, 37].forEach(function (y) { ln([[xAt(SB, y) + .5, y], [xAt(SB.slice().reverse(), y) - .5, y]], 'f', .1); });
    ln(SB, 'm', .02); mask(SB);
    var fr = ridge(-2, 122, hz, [[20, 3, 18, 0], [50, 2, 12, 0]], .5, 1);
    mtn(fr, hz + .5, { d: .5, sw: 'f', ol: 'h' });
    cloud(36, 14, 20, 5);
    sky(1, 34, .45);
    return end();
  };

  G.crossing = function () {
    begin(157);
    var bx = 54, by = 60, i;
    var F = [[bx - 4.2, by], [bx + 2, by], [bx + 1.5, by - 25], [bx - 3.6, by - 25]], S = [[bx + 2, by], [bx + 5.2, by - 1.3], [bx + 4.5, by - 26.1], [bx + 1.5, by - 25]], ap = [bx - .4, by - 30.5], CF = [F[3], F[2], ap], CS = [F[2], S[2], ap];
    hatch(F, 90, .95, 'f', .2); hatch(S, 90, .48, 'h', .95); hatch(CS, 70, .5, 'f', .95); hatch(CF, 20, .9, 'f', .25);
    [21, 19.4, 17.8, 15.2].forEach(function (d) { ln([[bx - 2.8 + rr(0, .4), by - d], [bx + .6 - rr(0, .6), by - d]], 'h', 0); });
    lnc(ell(bx - 1, by - 10.5, 1.3, 1.3, 0, TAU, 14), 'h', 0);
    ln([F[0], F[3], ap, S[2], S[1], S[0], F[0]], 'm', 0); ln([F[3], F[2], F[1]], 'h', 0); ln([F[2], ap], 'h', 0);
    mask(F); mask(S); mask(CF); mask(CS);
    for (i = 0; i < 7; i++) {
      var sx = bx - 7 + i * 2.2 + rr(-.5, .5), sy = by + rr(.4, 1.6), st = ell(sx, sy, rr(1.2, 1.8), rr(.8, 1.2), PI, TAU, 10);
      ln(st, 'h', 0); hatch(st.concat([[sx + 1.6, sy + .6], [sx - 1.6, sy + .6]]), 60, .5, 'f', .6); mask(st.concat([[sx + 1.6, sy + .8], [sx - 1.6, sy + .8]]));
    }
    var VP = [10, 41.2], dx = bx - .6 - VP[0], dy = by + 1.2 - VP[1], len = M.hypot(dx, dy), nx = dy / len, ny = -dx / len;
    ln([VP, [VP[0] + dx * 2.2, VP[1] + dy * 2.2]], 'x', .02);
    ln([VP, [VP[0] + dx * 2.2 + nx * 3.4 * 2.2, VP[1] + dy * 2.2 + ny * 3.4 * 2.2]], 'f', .05);
    for (var k = 0; k < 60; k++) {
      var t = 1 / (.42 + k * .16); if (t < .05) break;
      var P = [VP[0] + dx * t, VP[1] + dy * t]; ln([P, [P[0] + nx * 3.4 * t, P[1] + ny * 3.4 * t]], t > .5 ? 'm' : 'h', .02);
    }
    ground(41.6, .45); tufts(46, 72, 12);
    var r = ridge(-2, 122, 41.2, [[22, 9, 20, 1.3], [48, 6, 14], [84, 12, 24, 1.4], [112, 8, 16]], 1.2);
    mtn(r, 42, { d: .6, sw: 'f', ol: 'h', len: .8 });
    sky(1, 32, .5);
    return end();
  };

  G.landmark = function () {
    begin(163);
    var nz = noise(), cx = 60.3, x, y;
    var SPR = [[56.6, 36], [57, 30], [56.4, 26], [57.3, 20], [57, 15], [57.8, 11.5], [58.6, 10.2], [60.6, 9.6], [61.8, 10.6], [62.3, 14], [62, 18], [63, 23], [62.6, 28], [63.6, 32], [64, 36]];
    hatch(SPR, 90, .5, 'h', function (x) { return .15 + .8 * sm(59.5, 62.8, x); });
    [14, 19.5, 25, 31].forEach(function (y) { ln([[xAt(SPR, y) + .2, y], [xAt(SPR.slice().reverse(), y) - .2, y]], 'f', 0); });
    ln(SPR, 'm', 0);
    mask(SPR.concat([[64, 37], [56.6, 37]]));
    var cone = [];
    for (x = 20; x <= 100; x += .8) { var d = M.abs(x - cx), hg = d < 4.5 ? 22 : 22 * M.pow(cl(1 - (d - 4.5) / 34, 0, 1), 1.7); cone.push([x, 58 - hg + .5 * fbm(nz, x * .4)]); }
    var cf = prof(cone);
    for (y = 37.5; y < 57.5; y += 1.3) {
      var wl = cx - xAt(cone, y), wr = xAt(cone.slice().reverse(), y) - cx, arc = [];
      for (var u = -1; u <= 1.0001; u += .05) { var xx = cx + (u < 0 ? wl : wr) * u; arc.push([xx, y + (u < 0 ? wl : wr) * .12 * M.sqrt(M.max(0, 1 - u * u))]); }
      tl(arc, 'f', function (x, y) { var t = cf(x); return t !== null && y > t + .2 ? (x > cx ? .9 : .4) : 0; }, rr(0, .3));
    }
    mtn(cone, 58, { d: .9, lit: .12, ol: 'm' });
    var bl = ridge(-2, 122, 52, [[8, 6, 14, .5], [100, 8, 18, .5], [118, 5, 10, .5]], .8);
    ground(58.5, .45); tufts(60, 72, 12);
    mtn(bl, 54, { d: .6, sw: 'f', ol: 'h' });
    lines(48, 58, .3, .5, 1.1);
    cloud(92, 16, 18, 4.5);
    sky(1, 40, .45);
    return end();
  };

  G.forest = function () {
    begin(173);
    var h0 = ridge(-4, 124, 74, [[30, 4, 40, 0], [96, 3, 30, 0]], .5);
    trees(h0, 10, 112, 13, 19, 26, .75, 1);
    lines(70, 76, .4, .7, 1.1); occR(h0);
    var h1 = ridge(-4, 124, 64, [[20, 5, 30, 0], [70, 6, 34, 0], [110, 4, 20, 0]], .6);
    trees(h1, -2, 122, 5.5, 10, 14, .7);
    hatch(under(h1, 76), 70, 1, 'f', .4); occR(h1);
    var h2 = ridge(-4, 124, 55, [[40, 7, 36, 0], [92, 5, 26, 0]], .5);
    trees(h2, -2, 122, 3.4, 5.5, 7.5, .55);
    hatch(under(h2, 66), 70, 1, 'f', .3); occR(h2);
    var h3 = ridge(-4, 124, 49, [[14, 6, 26, 0], [64, 9, 30, 0], [110, 5, 20, 0]], .5);
    trees(h3, -2, 122, 2.4, 3, 4, .45);
    occR(h3);
    var mt = ridge(-2, 122, 44, [[30, 26, 30, 1.4], [72, 32, 30, 1.5], [104, 20, 22, 1.3]], 1.5);
    mtn(mt, 46, { d: .55, sw: 'f', ol: 'h', snow: function (x, y) { return y < 22 + 2 * M.sin(x * 1.3); } });
    sky(1, 30, .5);
    return end();
  };

  function flame(x, y, h) {
    var w = h * rr(.22, .3), le = h * rr(.1, .35), L = [], R = [];
    for (var i = 0; i <= 10; i++) {
      var t = i / 10, c = x + le * t * t + .5 * M.sin(t * 6 + x) * t * h * .08, hw = w * M.pow(1 - t, .7) * (1 + .25 * M.sin(t * 9 + x));
      L.push([c - hw, y - h * t + .5]); R.push([c + hw, y - h * t + .5]);
    }
    var P = L.concat(R.reverse());
    tone(P, .2); ln(P, 'h', 0); mask(P);
  }
  function billow(cx, cy, r, t) {
    var c = ell(cx, cy, r, r * .88, 0, TAU, M.max(16, M.round(r * 4)));
    ln(c, t < .3 ? 'm' : 'h', .05);
    hatch(c, -25, .6, 'f', function (x, y) { var u = ((x - cx) * .45 + (y - cy) * .9) / r; return cl(.05 + .75 * u + (1 - t) * .45, 0, 1); });
    mask(c);
  }
  G.fire = function () {
    begin(181);
    var rg = ridge(-4, 124, 57, [[104, 17, 74, 0], [26, 6, 30, 0]], 1.2, .8), rf = prof(rg), x, i;
    for (x = 50; x < 98; x += rr(2.4, 4.2)) flame(x, rf(x), rr(4, 9) * (1 - M.abs(x - 74) / 50));
    for (x = 44; x < 104; x += rr(4, 8)) { var y = rf(x), sh = rr(4, 9); ln([[x, y], [x + rr(-.4, .4), y - sh]], 'm', 0); ln([[x, y - sh * .6], [x - 1.2, y - sh * .5]], 'h', 0); }
    for (i = 0; i < 26; i++) {
      var t = i / 25, r = 2.6 + 8 * t, cx = 72 + 32 * M.pow(t, 1.5), cy = 40 - 30 * M.pow(t, .85), j = (i % 3 - 1) * r * 1.05 + rr(-1.5, 1.5);
      billow(cx + j * .55, cy + j * .8, r * rr(.75, 1.1), t);
    }
    trees(rg, 0, 42, 3, 4, 6.5, .8, 1);
    mtn(rg, 78, { d: 1.2, ol: 'm', lit: .35 });
    ground(64, .4);
    sky(1, 40, .45);
    return end();
  };

  G.airport = function () {
    begin(191);
    var hz = 37, K = 35, pj = function (X, D) { return [60 + X * K / D, hz + K / D]; }, hw = .5, i, D;
    var q = function (x0, x1, d0, d1) { return [pj(x0, d0), pj(x1, d0), pj(x1, d1), pj(x0, d1)]; }, MK = [];
    for (i = 0; i < 4; i++) { var xa = .07 + i * .1; MK.push(q(xa, xa + .065, 1.06, 1.45), q(-xa - .065, -xa, 1.06, 1.45)); }
    for (D = 1.75; D < 16; D += .75) MK.push(q(-.018, .018, D, D + .42));
    [2.5, 2.95].forEach(function (d) { for (var j = 0; j < 3; j++) { var xa = .2 + j * .06; MK.push(q(xa, xa + .035, d, d + .2), q(-xa - .035, -xa, d, d + .2)); } });
    MK.push(q(.16, .28, 3.5, 4.2), q(-.28, -.16, 3.5, 4.2));
    MK.forEach(function (P) { lnc(P, 'f', .02); mask(P); });
    var RW = q(-hw, hw, .92, 18);
    hatch(RW, 0, .62, 'f', .7);
    ln([pj(-hw, .92), pj(-hw, 18)], 'm', .02); ln([pj(hw, .92), pj(hw, 18)], 'm', .02);
    mask(RW);
    var TX = q(1.25, 1.42, 1.3, 18);
    [[1.6, 1.9], [4, 4.4], [8, 8.8]].forEach(function (d) { var C = [pj(hw, d[0]), pj(1.25, d[0] + .4), pj(1.25, d[1] + .4), pj(hw, d[1])]; ln([C[0], C[1]], 'h', .02); ln([C[3], C[2]], 'h', .02); hatch(C, 0, .7, 'f', .3); mask(C); });
    ln([TX[0], TX[3]], 'h', .02); ln([TX[1], TX[2]], 'h', .02); hatch(TX, 0, .7, 'f', .3); mask(TX);
    var tb = pj(3.4, 5.2), T = [[tb[0] - .8, tb[1]], [tb[0] + .8, tb[1]], [tb[0] + .7, tb[1] - 9], [tb[0] - .7, tb[1] - 9]], CB = [[tb[0] - 2, tb[1] - 9], [tb[0] + 2, tb[1] - 9], [tb[0] + 2.4, tb[1] - 11.6], [tb[0] - 2.4, tb[1] - 11.6]];
    hatch(T, 90, .45, 'f', function (x) { return x > tb[0] ? .95 : .2; }); lnc(T, 'h', 0);
    hatch(CB, 0, .35, 'h', .9); lnc(CB, 'h', 0); ln([[tb[0] - 2.4, tb[1] - 11.8], [tb[0], tb[1] - 12.8], [tb[0] + 2.4, tb[1] - 11.8]], 'h', 0); ln([[tb[0], tb[1] - 12.8], [tb[0], tb[1] - 15]], 'f', 0);
    mask(T); mask(CB); mask([[tb[0] - 2.4, tb[1] - 11.6], [tb[0], tb[1] - 12.8], [tb[0] + 2.4, tb[1] - 11.6]]);
    var hb = pj(-3.2, 4.4), HG = ell(hb[0], hb[1] - 2.2, 6.5, 3.4, PI, TAU, 20), HF = HG.concat([[hb[0] + 6.5, hb[1]], [hb[0] - 6.5, hb[1]]]);
    hatch(HG.concat([[hb[0] + 6.5, hb[1] - 2.2]]), 70, .6, 'f', function (x) { return x > hb[0] ? .9 : .3; });
    for (i = -2; i <= 2; i++) ln([[hb[0] + i * 2.2, hb[1] - 2.2], [hb[0] + i * 2.2, hb[1]]], 'f', 0);
    lnc(HF, 'h', 0); ln([[hb[0] - 6.5, hb[1] - 2.2], [hb[0] + 6.5, hb[1] - 2.2]], 'h', 0); mask(HF);
    var wp = pj(-.95, 1.7); ln([wp, [wp[0], wp[1] - 7]], 'h', 0);
    var SK = [[wp[0], wp[1] - 7], [wp[0] + 5, wp[1] - 6.2], [wp[0] + 5, wp[1] - 5.4], [wp[0], wp[1] - 5.2]];
    lnc(SK, 'h', 0); hatch([[wp[0] + 1.7, wp[1] - 6.8], [wp[0] + 3.3, wp[1] - 6.5], [wp[0] + 3.3, wp[1] - 5.35], [wp[0] + 1.7, wp[1] - 5.25]], 90, .4, 'h', 1); mask(SK);
    ground(hz + .4, .42);
    var mt = ridge(-2, 122, hz, [[18, 10, 20, 1.3], [46, 6, 14], [86, 13, 24, 1.4], [114, 7, 14]], 1);
    mtn(mt, hz + 1, { d: .5, sw: 'f', ol: 'h', len: .8 });
    sky(1, 30, .45);
    return end();
  };

  /* ---------------- Boeing 737-800, right side, nose right ---------------- */
  function plane() {
    begin(3, 320, 90, false);
    var s = 6.55, X0 = 290, Y0 = 77, i;
    var P = function (x, z) { return [X0 - x * s, Y0 - z * s]; }, Q = function (a) { return a.map(function (q) { return P(q[0], q[1]); }); };
    // engine nacelle (CFM56-7B, flat-bottomed inlet) and pylon
    var nTop = crs(Q([[10.55, 1.22], [11.2, 1.42], [12.8, 1.5], [14.2, 1.36], [15.1, 1.06]]), 5), nBot = crs(Q([[10.55, -.48], [11.3, -.7], [13.4, -.8], [14.6, -.64], [15.1, -.42]]), 5);
    var inlet = crs(Q([[10.55, 1.22], [10.4, .9], [10.33, .37], [10.4, -.15], [10.55, -.48]]), 4), NAC = inlet.concat(nBot.slice(1), nTop.slice().reverse());
    var CORE = crs(Q([[15.05, .95], [15.75, .76], [16.45, .48], [16.95, .3], [16.45, .1], [15.8, -.12], [15.05, -.3]]), 4);
    hatch(NAC, 0, .7, 'f', function (x, y) { return sm(Y0 - 1.3 * s, Y0 + .8 * s, y) * .9; });
    lnc(NAC, 'm', 0);
    ln(crs(Q([[10.85, 1.32], [10.72, .4], [10.85, -.6]]), 4), 'h', 0);
    ln(crs(Q([[13.35, 1.47], [13.28, .4], [13.35, -.78]]), 4), 'f', 0);
    mask(NAC);
    hatch(CORE, 0, .5, 'f', .8); ln(CORE, 'h', 0); mask(CORE);
    var PY = crs(Q([[12.4, 1.48], [13.5, 1.95], [16.3, 1.92], [17.7, 1.45], [15.4, 1.12]]), 3);
    hatch(PY, 0, .8, 'f', .3); ln(PY, 'h', 0); mask(PY);
    // split-scimitar winglet on the near wingtip
    var WL = crs(Q([[21.85, 2.3], [22.7, 3.25], [23.55, 4.45], [24.05, 5.0], [24.5, 5.08], [24.3, 4.3], [23.75, 2.75], [23.35, 2.22]]), 4);
    hatch(WL, 75, .55, 'f', .55); lnc(WL, 'h', 0); mask(WL);
    var VS = crs(Q([[22.35, 2.2], [23.0, 1.6], [23.55, 1.22], [23.8, 1.28], [23.45, 1.9], [23.2, 2.2]]), 3);
    lnc(VS, 'h', 0); mask(VS);
    // near wing seen edge-on: swept, with dihedral
    var WG = crs(Q([[13.2, .5], [15.5, .98], [18.5, 1.62], [21.8, 2.28], [22.6, 2.4], [23.35, 2.24], [21.9, 1.3], [20.6, .38], [17, .12], [13.2, .5]]), 4);
    hatch(WG, 0, .75, 'f', .3); ln(WG, 'h', 0);
    ln(Q([[20.1, .55], [22.85, 2.1]]), 'f', 0);
    [.3, .55, .8].forEach(function (t) { var b = [20.6 + (23.3 - 20.6) * t, .38 + (2.22 - .38) * t]; lnc(Q([[b[0] - .5, b[1] - .02], [b[0] + .9, b[1] - .32], [b[0] + 1.25, b[1] - .18], [b[0] + .6, b[1] + .04]]), 'f', 0); });
    mask(WG);
    // horizontal stabiliser
    var HS = crs(Q([[33.3, 2.62], [35.6, 3.0], [37.35, 3.38], [37.95, 3.46], [38.8, 3.3], [38.2, 2.95], [37.6, 2.5]]), 3);
    hatch(HS, 0, .7, 'f', .3); lnc(HS, 'h', 0); ln(Q([[37.4, 2.6], [38.35, 3.28]]), 'f', 0); mask(HS);
    // fuselage
    var top = crs(Q([[0, 1.45], [.22, 1.95], [.7, 2.48], [1.35, 2.88], [1.8, 3.08], [2.7, 3.58], [3.7, 3.88], [5.2, 4.0], [27.5, 4.0], [30.5, 3.9], [33.5, 3.66], [36.5, 3.3], [38.6, 2.98], [39.3, 2.75]]), 4);
    var bot = crs(Q([[0, 1.45], [.25, .98], [.8, .55], [1.8, .2], [3.2, .03], [5, 0], [12.4, 0], [13.6, -.24], [17, -.38], [21, -.3], [23, -.02], [25, .25], [28, .72], [31, 1.26], [34, 1.8], [37, 2.28], [39.3, 2.55]]), 4);
    var FUS = top.concat(Q([[39.55, 2.68]]), bot.slice().reverse());
    hatch(FUS, 0, .8, 'f', function (x, y) { return sm(Y0 - 1.9 * s, Y0 + .1 * s, y) * .85; });
    ln(top, 'm', 0); ln(bot, 'm', 0); ln(Q([[39.3, 2.75], [39.55, 2.68], [39.3, 2.55]]), 'h', 0);
    [[[1.85, 3.0], [2.35, 3.33], [2.42, 2.96]], [[2.58, 3.43], [3.15, 3.7], [3.2, 3.03], [2.62, 2.99]], [[3.38, 3.76], [3.95, 3.86], [3.95, 3.1], [3.42, 3.06]]].forEach(function (w) { var p = Q(w); tone(p, .85); lnc(p, 'f', 0); });
    var door = function (x0, x1, z0, z1, st) { var r = .18; lnc(Q([[x0 + r, z0], [x1 - r, z0], [x1, z0 + r], [x1, z1 - r], [x1 - r, z1], [x0 + r, z1], [x0, z1 - r], [x0, z0 + r]]), st, 0); };
    door(3.95, 4.8, .55, 2.95, 'h'); door(31.0, 31.75, .95, 3.12, 'h'); door(15.15, 15.65, 1.95, 3.1, 'f'); door(16.05, 16.55, 1.95, 3.1, 'f');
    door(7.6, 8.9, .12, 1.32, 'f'); door(24.4, 25.6, .5, 1.55, 'f');
    var wz = 2.62, you = 28.2;
    for (var x = 6.35; x < 30.4; x += .508) tl([P(x, wz + .17), P(x, wz - .17)], 'w', 1, .01);
    ln(Q([[9, -.02], [9.6, -.28]]), 'h', 0); ln(Q([[20, 4.0], [20.4, 4.2]]), 'h', 0);
    mask(FUS);
    // fin, dorsal fillet and rudder
    var FIN = crs(Q([[26.6, 4.0], [28.8, 4.22], [30.6, 4.75], [36.1, 11.15], [36.6, 11.3], [38.3, 11.25], [38.5, 11.05], [37.9, 3.4]]), 4);
    hatch(FIN.concat(Q([[27, 3.9]])), 0, .8, 'f', function (x, y) { return .15 + .5 * sm(Y0 - 4.6 * s, Y0 - 11 * s, y); });
    ln(FIN, 'm', 0); ln(Q([[36.0, 3.75], [37.3, 11.1]]), 'f', 0);
    // the passenger's window
    var yc = P(you, wz), lab = '<text x="' + n1(yc[0]) + '" y="' + n1(yc[1] - 18.5) + '" fill="var(--magenta, #A8336B)" stroke="none" font-size="9" font-weight="600" letter-spacing=".6" text-anchor="middle" style="font-variant:small-caps;font-variant-caps:all-small-caps">you</text>';
    put('bM', pd(ell(yc[0], yc[1], 3.3, 3.3, 0, TAU, 28), 1));
    put('hM', pd([[yc[0], yc[1] - 3.4], [yc[0], yc[1] - 15.5]]));
    void i;
    return end(lab);
  }

  /* ---------------- sectional-style compass rose ---------------- */
  function compass() {
    begin(5, 200, 200, false);
    var c = 100, i, txt = '', VAR = 11;
    var pt = function (r, deg) { var a = deg * PI / 180; return [c + r * M.sin(a), c - r * M.cos(a)]; };
    for (i = 0; i < 8; i++) {
      var d = i * 45, Lr = i % 2 ? 30 : i === 0 ? 58 : 48, wv = i % 2 ? 4.5 : 7.5, tip = pt(Lr, d), l = pt(wv, d - 45), r = pt(wv, d + 45);
      tone([[c, c], tip, r], .85); if (i === 0) tone([[c, c], tip, l], .3);
      ln([l, tip, r], i % 2 ? 'h' : 'm', 0); ln([[c, c], tip], 'f', 0);
      mask([[c, c], l, tip, r]);
    }
    ln(ell(c, c, 3.2, 3.2, 0, TAU, 16), 'h', 0);
    var mn = pt(70, VAR), mh = [pt(70, VAR), pt(62, VAR - 3.2), pt(63, VAR)];
    tone(mh, .9); ln([pt(8, VAR), mn], 'h', 0); ln(mh.concat([mh[0]]), 'h', 0);
    ln(ell(c, c, 64, 64, 0, TAU, 140), 'h', 0);
    for (i = 0; i < 72; i++) { var dd = VAR + i * 5, L = i % 18 === 0 ? 7 : i % 2 === 0 ? 4.2 : 2.4; ln([pt(64, dd), pt(64 - L, dd)], i % 2 ? 'f' : 'h', 0); }
    ln(ell(c, c, 95, 95, 0, TAU, 180), 'm', 0); ln(ell(c, c, 89, 89, 0, TAU, 180), 'h', 0);
    for (i = 0; i < 36; i++) { var big = i % 3 === 0; ln([pt(89, i * 10), pt(big ? 80.5 : 84.5, i * 10)], big ? 'm' : 'h', 0); }
    for (i = 0; i < 72; i++) ln([pt(95, i * 5 + 2.5), pt(92, i * 5 + 2.5)], 'f', 0);
    var lab = ['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'];
    for (i = 0; i < 12; i++) { var p = pt(73, i * 30); txt += '<text x="' + n1(p[0]) + '" y="' + n1(p[1]) + '" transform="rotate(' + i * 30 + ' ' + n1(p[0]) + ' ' + n1(p[1]) + ')"' + (i % 3 ? '' : ' font-size="12.5"') + '>' + lab[i] + '</text>'; }
    var vp = pt(52, VAR + 9);
    txt += '<text x="' + n1(vp[0]) + '" y="' + n1(vp[1]) + '" transform="rotate(' + (VAR + 9) + ' ' + n1(vp[0]) + ' ' + n1(vp[1]) + ')" font-size="6.5" font-weight="500" letter-spacing=".4">' + VAR + '°E</text>';
    return end('<g fill="currentColor" stroke="none" font-size="10.5" font-weight="600" text-anchor="middle" dominant-baseline="central" letter-spacing=".3">' + txt + '</g>');
  }

  /* ---------------- public API ---------------- */
  var ALIAS = { mountain: 'range', mountains: 'range', summit: 'peak', mesa: 'landmark', butte: 'landmark', rock: 'landmark', water: 'lake', playa: 'saltflat', salt: 'saltflat', gorge: 'canyon', town: 'city', desert: 'dunes', farm: 'plains', farmland: 'plains', dam: 'reservoir', fossil: 'geology', trail: 'history', border: 'crossing', trees: 'forest', wildfire: 'fire', smoke: 'fire', runway: 'airport' };
  var BODY = {}, VB = { plane: '0 0 320 90', compass: '0 0 200 200' };
  G.plane = plane; G.compass = compass;
  function body(k) { if (!(k in BODY)) BODY[k] = G[k](); return BODY[k]; }
  function attr(s) { return String(s).replace(/[&"<>]/g, function (c) { return { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function illo(kind, opts) {
    opts = opts || {};
    var k = String(kind == null ? '' : kind).toLowerCase(); k = ALIAS[k] || k;
    if (!Object.prototype.hasOwnProperty.call(G, k)) k = 'geology';
    var cls = opts.className == null ? 'illo illo-' + k : opts.className;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (VB[k] || '0 0 120 72') + '" class="' + attr(cls) + '" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' + body(k) + '</svg>';
  }
  // Plates are drawn on first use and cached; any left over are drawn during idle time.
  var API = { kinds: {} }, names = Object.keys(G);
  names.forEach(function (k) {
    Object.defineProperty(k === 'plane' || k === 'compass' ? API : API.kinds, k, { enumerable: true, get: function () { return illo(k); } });
  });
  API.build = function () { var t = Date.now(); names.forEach(body); return Date.now() - t; };
  root.ILLUSTRATIONS = API;
  root.illo = illo;
  var ric = root.requestIdleCallback, queue = names.slice();
  if (ric) (function idle(dl) { while (queue.length && (!dl || dl.timeRemaining() > 6)) body(queue.shift()); if (queue.length) ric(idle, { timeout: 4000 }); })();
})(typeof window !== 'undefined' ? window : this);
