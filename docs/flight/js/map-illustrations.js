// Window Atlas: engraved pictorial elements drawn directly on the chart, after the 1867-72 Fortieth Parallel
// survey plates: little hatched "molehill" mountains along the ranges, ruled water, small vignettes at a few
// landmarks, and a compass-rose cartouche. All sprites are drawn on canvas and redrawn on theme change.
(function () {
  // Pictorial sprites (molehills, vignettes) are off: the user prefers no illustrations drawn on the map.
  // Engraved water lining and the compass rose stay.
  const DRAW_SPRITES = false;
  if (!window.WA) return;
  const R2D = 180 / Math.PI, D2R = Math.PI / 180, PR = 2;
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const I = (WA.illus = { on: true });

  // ---------------------------------------------------------------- small helpers
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hav(a, b) { const dLa = (b[1] - a[1]) * D2R, dLo = (b[0] - a[0]) * D2R, x = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLo / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); }
  function brg(a, b) { const y = Math.sin((b[0] - a[0]) * D2R) * Math.cos(b[1] * D2R), x = Math.cos(a[1] * D2R) * Math.sin(b[1] * D2R) - Math.sin(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.cos((b[0] - a[0]) * D2R); return (Math.atan2(y, x) * R2D + 360) % 360; }
  function dest(a, b, km) { const d = km / 6371, br = b * D2R, la = a[1] * D2R, lo = a[0] * D2R; const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(br)); const lo2 = lo + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2)); return [lo2 * R2D, la2 * R2D]; }
  function alpha(hex, a) {
    hex = String(hex || '#000').trim();
    if (/^rgb/.test(hex)) return hex.replace(/rgba?\(([^)]+)\)/, (m, s) => 'rgba(' + s.split(',').slice(0, 3).join(',') + ',' + a + ')');
    let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w * PR); c.height = Math.ceil(h * PR); const x = c.getContext('2d'); x.scale(PR, PR); x.lineCap = 'round'; x.lineJoin = 'round'; return [c, x]; }
  function img(c) { return c.getContext('2d').getImageData(0, 0, c.width, c.height); }
  function poly(x, pts, close) { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); if (close) x.closePath(); }
  function fadeEdges(c, x, w, h, inner) { // soft vignette so flat patches melt into the paper
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in';
    const g = x.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * inner / 2, c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.scale(c.width / Math.min(c.width, c.height), c.height / Math.min(c.width, c.height));
    x.fillRect(0, 0, c.width, c.height); x.restore();
  }

  // ---------------------------------------------------------------- molehill mountains
  // Profiles in a unit box (x 0..1 left→right, y 0 = top, 1 = base). Light from the upper left: facets that fall
  // away to the right are in shadow and get close vertical hachures; lit facets get only short strokes off the crest.
  const PROFILES = {
    a: [[0, 1], [0.12, 0.78], [0.22, 0.6], [0.3, 0.52], [0.47, 0.06], [0.56, 0.3], [0.64, 0.24], [0.78, 0.6], [0.9, 0.82], [1, 1]],
    b: [[0, 1], [0.14, 0.62], [0.27, 0.2], [0.37, 0.38], [0.5, 0.1], [0.62, 0.42], [0.72, 0.36], [0.86, 0.74], [1, 1]],
    c: [[0, 1], [0.1, 0.78], [0.24, 0.46], [0.36, 0.3], [0.48, 0.24], [0.58, 0.28], [0.7, 0.44], [0.86, 0.72], [1, 1]],
    d: [[0, 1], [0.16, 0.76], [0.3, 0.46], [0.45, 0], [0.54, 0.26], [0.6, 0.22], [0.76, 0.62], [1, 1]],
    e: [[0, 1], [0.18, 0.74], [0.36, 0.5], [0.5, 0.44], [0.64, 0.52], [0.82, 0.76], [1, 1]],
  };
  const MW = 46, MH = 30; // css px

  function ridgeFrom(prof, w, h, top, seed) {
    const r = rng(seed), out = [];
    for (let i = 0; i < prof.length; i++) {
      const p = [1 + prof[i][0] * (w - 2), top + prof[i][1] * (h - 1 - top)];
      if (i) { // subdivide with a little crenellation so crests read as rock, not ruler lines
        const q = out[out.length - 1], n = Math.max(1, Math.round(Math.hypot(p[0] - q[0], p[1] - q[1]) / 3));
        for (let k = 1; k < n; k++) { const t = k / n; out.push([q[0] + (p[0] - q[0]) * t + (r() - 0.5) * 0.5, q[1] + (p[1] - q[1]) * t + (r() - 0.5) * 0.9]); }
      }
      out.push(p);
    }
    return out;
  }
  function yAt(ridge, xx) {
    for (let i = 1; i < ridge.length; i++) { const a = ridge[i - 1], b = ridge[i]; if (xx <= b[0]) { const t = (xx - a[0]) / Math.max(1e-6, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0])]; } }
    return [ridge[ridge.length - 1][1], 0];
  }

  function engraveMount(x, ridge, w, h, p, o) {
    const base = h - 1.2, topY = Math.min.apply(null, ridge.map((q) => q[1]));
    const r = rng(o.seed || 7);
    // body: paper fill so nearer molehills occlude the ones behind
    poly(x, ridge.concat([[ridge[ridge.length - 1][0], base], [ridge[0][0], base]]), true);
    x.fillStyle = alpha(p.paper, p.night ? 0.82 : 0.9); x.fill();
    x.save(); x.clip();
    const clean = o.clean || ridge;
    // shadow wash under the hachures on facets that fall away to the right
    x.fillStyle = alpha(p.relief, p.night ? 0.2 : 0.26);
    for (let i = 1; i < clean.length; i++) { const a = clean[i - 1], b = clean[i]; if ((b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]) <= 0.18) continue; poly(x, [a, b, [b[0], base], [a[0], base]], true); x.fill(); }
    const snowAt = (xx) => topY + (base - topY) * (o.snow || 0) + Math.sin(xx * 1.7 + (o.seed || 0)) * 1.1 + Math.sin(xx * 0.53) * 1.4;
    // shaded flanks: close hachures; the steeper the facet the denser and darker
    const hatch = alpha(p.ink2, p.night ? 0.8 : 0.72), soft = alpha(p.relief, p.night ? 0.9 : 0.85);
    for (let xx = ridge[0][0] + 0.6; xx < ridge[ridge.length - 1][0]; xx += 0.95) {
      const y0 = yAt(ridge, xx)[0], s = yAt(clean, xx)[1];
      x.strokeStyle = s > 0.18 ? hatch : soft;
      let ys = y0 + 0.5; if (o.snow) ys = Math.max(ys, snowAt(xx));
      if (s > 0.18) { // facing right: shadow
        x.lineWidth = s > 1.1 ? 0.55 : 0.42;
        x.beginPath(); x.moveTo(xx, ys); x.lineTo(xx + (base - ys) * 0.08, base); x.stroke();
      } else if (s > -0.25) { // flat crest: mid-tone, broken strokes
        if (((xx * 10) | 0) % 2) continue;
        x.lineWidth = 0.38; x.beginPath(); x.moveTo(xx, ys + 0.6); x.lineTo(xx, ys + (base - ys) * 0.55); x.stroke();
      } else if (r() < 0.42) { // lit: a few short strokes hanging from the crest
        x.lineWidth = 0.32; x.beginPath(); x.moveTo(xx, ys + 0.4); x.lineTo(xx + 0.2, ys + 0.6 + (base - ys) * (0.08 + r() * 0.16)); x.stroke();
      }
    }
    // cross-hatch the deepest shadow: lower part of the steep shadowed faces only
    x.lineWidth = 0.3; x.strokeStyle = alpha(p.ink2, 0.45);
    for (let i = 1; i < clean.length; i++) {
      const a = clean[i - 1], b = clean[i]; if ((b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]) < 0.75) continue;
      x.save(); poly(x, [[a[0], a[1] + (base - a[1]) * 0.35], [b[0], b[1] + (base - b[1]) * 0.2], [b[0], base], [a[0], base]], true); x.clip();
      for (let k = a[0] - h; k < b[0] + 1; k += 1.6) { x.beginPath(); x.moveTo(k, base); x.lineTo(k + h, base - h); x.stroke(); }
      x.restore();
    }
    x.restore();
    // crest line, a touch heavier on the shadow side
    x.strokeStyle = p.ink2;
    for (let i = 1; i < ridge.length; i++) { const a = ridge[i - 1], b = ridge[i]; x.lineWidth = b[1] > a[1] ? 0.95 : 0.7; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
    // ground: a few broken strokes to seat it on the plain
    x.strokeStyle = alpha(p.ink2, 0.55); x.lineWidth = 0.4;
    const L = ridge[0][0], Rr = ridge[ridge.length - 1][0];
    x.beginPath(); x.moveTo(L - 1, base + 0.4); x.lineTo(L + (Rr - L) * 0.42, base + 0.4); x.moveTo(L + (Rr - L) * 0.5, base + 0.4); x.lineTo(Rr + 2, base + 0.4); x.stroke();
    x.strokeStyle = alpha(p.relief, 0.6);
    x.beginPath(); x.moveTo(Rr - (Rr - L) * 0.25, base + 0.1); x.lineTo(Rr + 4, base + 0.1); x.stroke();
  }

  function drawMount(k, snow, p) {
    const [c, x] = canvas(MW + 4, MH);
    const ridge = ridgeFrom(PROFILES[k], MW, MH, 1, hash(k)), clean = PROFILES[k].map((q) => [1 + q[0] * (MW - 2), 1 + q[1] * (MH - 2)]);
    engraveMount(x, ridge, MW, MH, p, { snow: snow ? 0.34 : 0, seed: hash(k) % 97, clean });
    return img(c);
  }
  function drawVolcano(snow, p) {
    const w = 46, h = 32, cx = w / 2, rim = 4.2, top = 2.5, base = h - 1.2, ridge = [];
    for (let i = 0; i <= 26; i++) { const t = i / 26; ridge.push([cx - rim - t * (cx - rim - 1), base - (1 - t) ** 2.1 * (base - top)]); }
    ridge.reverse();
    ridge.push([cx - rim + 1.6, top + 1.4], [cx, top + 0.9], [cx + rim - 1.6, top + 1.2]);
    for (let i = 0; i <= 26; i++) { const t = i / 26; ridge.push([cx + rim + t * (cx - rim - 1), base - (1 - t) ** 2.1 * (base - top)]); }
    const [c, x] = canvas(w + 4, h);
    engraveMount(x, ridge, w, h, p, { snow: snow ? 0.4 : 0, seed: 11 });
    // a thread of steam off the crater
    x.strokeStyle = alpha(p.ink2, 0.45); x.lineWidth = 0.45;
    x.beginPath(); x.moveTo(cx + 0.5, top - 0.2); x.bezierCurveTo(cx + 3, top - 2, cx - 1, top - 3, cx + 4, top - 4.5); x.stroke();
    return img(c);
  }

  // ---------------------------------------------------------------- engraved water ruling
  function drawRule(p) {
    const w = 8, h = 5, [c, x] = canvas(w, h);
    x.fillStyle = alpha(p.water, p.night ? 0.1 : 0.07); x.fillRect(0, 0, w, h);
    x.fillStyle = alpha(p.water, p.night ? 0.7 : 0.62); x.fillRect(0, 2, w, 0.5);
    return img(c);
  }

  // ---------------------------------------------------------------- vignettes
  function wagon(p) {
    const w = 40, h = 22, [c, x] = canvas(w, h), ink = p.ink2;
    x.strokeStyle = ink; x.fillStyle = alpha(p.paper, 0.92);
    // oxen (simple yoke pair, hatched)
    const ox = (ox0, oy) => {
      poly(x, [[ox0, oy], [ox0 + 7.5, oy - 0.4], [ox0 + 9.2, oy - 1.6], [ox0 + 10.4, oy - 0.6], [ox0 + 9.6, oy + 1.4], [ox0 + 8, oy + 2.4], [ox0 + 7.6, oy + 6], [ox0 + 6.7, oy + 6], [ox0 + 6.4, oy + 3.4], [ox0 + 1.6, oy + 3.4], [ox0 + 1.3, oy + 6], [ox0 + 0.4, oy + 6], [ox0, oy + 3]], true);
      x.fill(); x.lineWidth = 0.6; x.stroke();
      x.save(); x.clip(); x.lineWidth = 0.35; x.strokeStyle = alpha(p.relief, 0.9); for (let k = 0; k < 12; k += 1) { x.beginPath(); x.moveTo(ox0 + k, oy + 1.6); x.lineTo(ox0 + k, oy + 3.6); x.stroke(); } x.restore();
      x.lineWidth = 0.5; x.beginPath(); x.moveTo(ox0 + 9.1, oy - 1.4); x.lineTo(ox0 + 8.6, oy - 3); x.stroke();
    };
    ox(27, 11);
    x.strokeStyle = ink; x.lineWidth = 0.55; x.beginPath(); x.moveTo(20, 15.4); x.lineTo(28.5, 13.2); x.stroke();
    // box
    poly(x, [[3, 12.4], [21, 12.4], [20.2, 16], [3.6, 16]], true); x.fill(); x.lineWidth = 0.7; x.stroke();
    x.save(); x.clip(); x.lineWidth = 0.35; x.strokeStyle = alpha(p.relief, 0.85); for (let k = 3; k < 22; k += 1.1) { x.beginPath(); x.moveTo(k, 14.2); x.lineTo(k - 0.3, 16); x.stroke(); } x.restore();
    // bonnet: canvas over bows, light from upper left, shadow on the right
    x.strokeStyle = ink;
    x.beginPath(); x.moveTo(3.4, 12.4); x.bezierCurveTo(1, 7, 3, 2.6, 6, 2.8); x.bezierCurveTo(10, 3.4, 14, 3.2, 18, 2.8); x.bezierCurveTo(21.4, 2.6, 22.6, 7.4, 20.6, 12.4); x.closePath();
    x.fill(); x.lineWidth = 0.75; x.stroke();
    x.save(); x.clip(); x.lineWidth = 0.32; x.strokeStyle = alpha(p.relief, 0.8);
    for (let k = 14; k < 23; k += 0.9) { x.beginPath(); x.moveTo(k, 3); x.lineTo(k + 0.6, 12.4); x.stroke(); }
    x.strokeStyle = alpha(ink, 0.7); x.lineWidth = 0.4; for (const k of [7, 11, 15]) { x.beginPath(); x.moveTo(k, 3); x.quadraticCurveTo(k - 0.8, 8, k, 12.4); x.stroke(); }
    x.restore();
    // wheels
    const wheel = (cx, cy, r) => {
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = alpha(p.paper, 0.85); x.fill(); x.lineWidth = 0.7; x.strokeStyle = ink; x.stroke();
      x.lineWidth = 0.35; for (let a = 0; a < 6; a++) { const t = a * Math.PI / 6; x.beginPath(); x.moveTo(cx - Math.cos(t) * r, cy - Math.sin(t) * r); x.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); x.stroke(); }
    };
    wheel(6.4, 17, 3.9); wheel(17.6, 17.6, 3.2);
    x.strokeStyle = alpha(ink, 0.5); x.lineWidth = 0.4; x.beginPath(); x.moveTo(0, 21.3); x.lineTo(38, 21.3); x.stroke();
    return img(c);
  }
  function locomotive(p) {
    const w = 52, h = 30, [c, x] = canvas(w, h), ink = p.ink2;
    x.strokeStyle = ink; x.fillStyle = alpha(p.paper, 0.92);
    // smoke from the balloon stack, drifting back
    x.lineWidth = 0.4; x.strokeStyle = alpha(ink, 0.55);
    for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(36 - i * 5.6, 4.6 - i * 0.5 + (i % 2), 2.2 + i * 0.55, Math.PI * 0.9, Math.PI * 2.3); x.stroke(); }
    x.strokeStyle = ink;
    // tender
    poly(x, [[1, 13], [11, 13], [11, 23], [1, 23]], true); x.fill(); x.lineWidth = 0.7; x.stroke();
    // cab
    poly(x, [[12, 23], [12, 10.5], [11, 10.5], [11, 9.2], [21, 9.2], [21, 10.5], [20, 10.5], [20, 23]], true); x.fill(); x.stroke();
    x.lineWidth = 0.5; x.strokeRect(14, 12, 4, 4);
    // boiler
    poly(x, [[20, 14], [40, 14], [40, 21], [20, 21]], true); x.fill(); x.lineWidth = 0.75; x.stroke();
    x.save(); poly(x, [[20, 14], [40, 14], [40, 21], [20, 21]], true); x.clip(); x.lineWidth = 0.32; x.strokeStyle = alpha(p.relief, 0.9);
    for (let y = 18; y < 21.2; y += 0.75) { x.beginPath(); x.moveTo(20, y); x.lineTo(40, y); x.stroke(); } x.restore();
    x.lineWidth = 0.4; for (const b of [25, 31, 36]) { x.beginPath(); x.moveTo(b, 14); x.lineTo(b, 21); x.stroke(); }
    // dome, sand box, balloon stack, headlamp
    x.lineWidth = 0.6; x.beginPath(); x.moveTo(27, 14); x.quadraticCurveTo(28.5, 10.6, 30, 14); x.fill(); x.stroke();
    poly(x, [[36, 14], [35.4, 9.5], [33.6, 7.4], [40.4, 7.4], [38.6, 9.5], [38, 14]], true); x.fill(); x.stroke();
    x.save(); x.clip(); x.lineWidth = 0.3; x.strokeStyle = alpha(p.relief, 0.85); for (let k = 37.2; k < 41; k += 0.8) { x.beginPath(); x.moveTo(k, 7.4); x.lineTo(k - 0.5, 14); x.stroke(); } x.restore();
    poly(x, [[40, 11.4], [43, 11.4], [43, 14], [40, 14]], true); x.fill(); x.stroke();
    // pilot (cowcatcher)
    poly(x, [[40, 21], [46.5, 25.5], [40, 25.5]], true); x.fill(); x.stroke();
    x.lineWidth = 0.35; for (let k = 41; k < 46; k += 1.2) { x.beginPath(); x.moveTo(k, 21.5 + (k - 40) * 0.69); x.lineTo(k, 25.5); x.stroke(); }
    // wheels: two drivers + leading truck + tender
    const wheel = (cx, cy, r, spokes) => {
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fillStyle = alpha(p.paper, 0.9); x.fill(); x.lineWidth = 0.65; x.strokeStyle = ink; x.stroke();
      x.lineWidth = 0.3; for (let a = 0; a < spokes; a++) { const t = a * Math.PI / spokes; x.beginPath(); x.moveTo(cx - Math.cos(t) * r, cy - Math.sin(t) * r); x.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); x.stroke(); }
    };
    wheel(18, 23.2, 3.6, 6); wheel(26, 23.2, 3.6, 6); wheel(35, 24.6, 2.2, 4); wheel(39.6, 24.6, 2.2, 4); wheel(4, 24.8, 2, 4); wheel(8.6, 24.8, 2, 4);
    x.lineWidth = 0.7; x.beginPath(); x.moveTo(18, 23.2); x.lineTo(26, 23.2); x.stroke();
    // rails & ties
    x.strokeStyle = alpha(ink, 0.6); x.lineWidth = 0.45; x.beginPath(); x.moveTo(0, 27.2); x.lineTo(w, 27.2); x.stroke();
    x.lineWidth = 0.35; for (let k = 1; k < w; k += 2.4) { x.beginPath(); x.moveTo(k, 27.2); x.lineTo(k - 0.8, 28.6); x.stroke(); }
    return img(c);
  }
  function fishFossil(p) {
    const w = 38, h = 22, [c, x] = canvas(w, h), ink = p.ink2;
    // the slab, tilted, with a hatched broken edge
    poly(x, [[2, 6], [33, 2.5], [36.5, 15], [5.5, 20]], true); x.fillStyle = alpha(p.paper, 0.9); x.fill(); x.strokeStyle = ink; x.lineWidth = 0.6; x.stroke();
    x.save(); x.clip(); x.lineWidth = 0.3; x.strokeStyle = alpha(p.relief, 0.65); for (let k = 0; k < 44; k += 1.4) { x.beginPath(); x.moveTo(k, 22); x.lineTo(k + 5, 15); x.stroke(); } x.restore();
    x.save(); x.translate(19, 11.4); x.rotate(-0.12);
    x.fillStyle = alpha(p.paper, 0.95); x.beginPath(); x.ellipse(-1, 0, 10.4, 4.2, 0, 0, 7); x.fill();
    x.strokeStyle = ink; x.lineWidth = 0.6; x.beginPath(); x.moveTo(-11.5, 0); x.bezierCurveTo(-6, -5.4, 4, -5, 9.4, 0); x.bezierCurveTo(4, 4.4, -6, 4.8, -11.5, 0); x.stroke();
    x.beginPath(); x.moveTo(9, 0); x.lineTo(13.4, -3.4); x.lineTo(12.2, 0); x.lineTo(13.4, 3.4); x.closePath(); x.stroke();
    x.lineWidth = 0.45; x.beginPath(); x.moveTo(-8, 0); x.lineTo(10, 0); x.stroke();
    x.lineWidth = 0.3; for (let k = -6; k < 8.6; k += 1.15) { const hh = 3.8 * Math.sqrt(Math.max(0, 1 - ((k + 1) / 10.5) ** 2)); x.beginPath(); x.moveTo(k, -hh); x.quadraticCurveTo(k + 0.9, 0, k, hh); x.stroke(); }
    x.lineWidth = 0.5; x.beginPath(); x.arc(-8.6, -0.6, 0.8, 0, 7); x.stroke();
    x.beginPath(); x.moveTo(-6.4, -3.4); x.quadraticCurveTo(-6.9, 0, -6.4, 3.4); x.stroke();
    x.restore();
    return img(c);
  }
  // flat patches (laid on the ground, map-aligned)
  function dunes(p) {
    const w = 120, h = 80, [c, x] = canvas(w, h), r = rng(31);
    for (let i = 0; i < 22; i++) {
      const cx = 10 + r() * (w - 20), cy = 8 + r() * (h - 16), s = 5 + r() * 6;
      // barchan crest: crescent horns pointing downwind (east)
      x.strokeStyle = alpha(p.ink2, 0.8); x.lineWidth = 0.6;
      x.beginPath(); x.moveTo(cx + s * 0.9, cy - s * 0.85); x.quadraticCurveTo(cx - s * 0.5, cy, cx + s * 0.9, cy + s * 0.85); x.stroke();
      // stipple on the slip face
      x.fillStyle = alpha(p.relief, 0.9);
      for (let k = 0; k < 18 + s * 2; k++) { const a = (r() - 0.5) * 2.6, rr = s * (0.3 + r() * 0.5); const px = cx + Math.cos(a) * rr * 0.9 + s * 0.2, py = cy + Math.sin(a) * rr; x.beginPath(); x.arc(px, py, 0.32 + r() * 0.2, 0, 7); x.fill(); }
    }
    x.fillStyle = alpha(p.relief, 0.55); for (let k = 0; k < 420; k++) { x.beginPath(); x.arc(r() * w, r() * h, 0.25, 0, 7); x.fill(); }
    fadeEdges(c, x, w, h, 0.45); return img(c);
  }
  function saltCracks(p) {
    const w = 120, h = 84, [c, x] = canvas(w, h), r = rng(77), N = 9, M = 7, pts = [];
    for (let j = 0; j <= M; j++) { const row = []; for (let i = 0; i <= N; i++) row.push([i * w / N + (r() - 0.5) * 9 + (j % 2) * 6, j * h / M + (r() - 0.5) * 8]); pts.push(row); }
    x.strokeStyle = alpha(p.ink2, 0.72); x.lineWidth = 0.45;
    for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
      const a = pts[j][i];
      if (i < N) { const b = pts[j][i + 1]; x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo((a[0] + b[0]) / 2 + (r() - 0.5) * 3, (a[1] + b[1]) / 2 + (r() - 0.5) * 3, b[0], b[1]); x.stroke(); }
      if (j < M) { const b = pts[j + 1][i + (j % 2 && i < N ? 1 : 0)]; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
    }
    // faint secondary cracks and crust stipple
    x.lineWidth = 0.3; x.strokeStyle = alpha(p.ink2, 0.4);
    for (let k = 0; k < 70; k++) { const sx = r() * w, sy = r() * h, a = r() * 6.3, l = 2 + r() * 4; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke(); }
    x.fillStyle = alpha(p.relief, 0.4); for (let k = 0; k < 260; k++) { x.beginPath(); x.arc(r() * w, r() * h, 0.22, 0, 7); x.fill(); }
    fadeEdges(c, x, w, h, 0.5); return img(c);
  }
  function pivots(p) {
    const w = 120, h = 84, [c, x] = canvas(w, h), r = rng(5), cell = 28;
    x.strokeStyle = alpha(p.ink2, 0.45); x.lineWidth = 0.4;
    for (let gx = 2; gx < w; gx += cell) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, h); x.stroke(); }
    for (let gy = 0; gy < h; gy += cell) { x.beginPath(); x.moveTo(0, gy); x.lineTo(w, gy); x.stroke(); }
    for (let gx = 2; gx + cell <= w + 2; gx += cell) for (let gy = 0; gy + cell <= h + 1; gy += cell) {
      if (r() < 0.18) continue;
      const cx = gx + cell / 2, cy = gy + cell / 2, R = cell / 2 - 1.2;
      x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fillStyle = alpha(p.paper, 0.6); x.fill(); x.strokeStyle = alpha(p.ink2, 0.85); x.lineWidth = 0.6; x.stroke();
      x.save(); x.beginPath(); x.arc(cx, cy, R, 0, 7); x.clip();
      // irrigated sector shaded, dry sector left open
      const a0 = r() * 6.3, a1 = a0 + 1.2 + r() * 3.2;
      x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a1); x.closePath(); x.clip();
      x.strokeStyle = alpha(p.relief, 0.75); x.lineWidth = 0.32; for (let k = -cell; k < cell; k += 1.3) { x.beginPath(); x.moveTo(cx + k, cy - R); x.lineTo(cx + k + R, cy + R); x.stroke(); }
      x.restore();
      x.strokeStyle = alpha(p.ink2, 0.4); x.lineWidth = 0.3; for (const rr of [R * 0.33, R * 0.66]) { x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke(); }
      x.strokeStyle = alpha(p.ink2, 0.9); x.lineWidth = 0.55; const t = a0 + r() * 0.6; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(t) * R, cy + Math.sin(t) * R); x.stroke();
    }
    fadeEdges(c, x, w, h, 0.5); return img(c);
  }

  // ---------------------------------------------------------------- sprite registry
  const SPRITES = {};
  ['a', 'b', 'c', 'd', 'e'].forEach((k) => { SPRITES['mh-' + k] = (p) => drawMount(k, false, p); SPRITES['mh-' + k + '-s'] = (p) => drawMount(k, true, p); });
  SPRITES['mh-v'] = (p) => drawVolcano(false, p);
  SPRITES['mh-v-s'] = (p) => drawVolcano(true, p);
  SPRITES['vg-wagon'] = wagon; SPRITES['vg-loco'] = locomotive; SPRITES['vg-fish'] = fishFossil;
  SPRITES['vg-dunes'] = dunes; SPRITES['vg-salt'] = saltCracks; SPRITES['vg-pivots'] = pivots;
  SPRITES['wa-rule'] = drawRule;

  function addImages(map, p) {
    for (const id in SPRITES) {
      let im; try { im = SPRITES[id](p); } catch (e) { console.warn('illus sprite', id, e); continue; }
      try { if (map.hasImage(id)) map.updateImage(id, im); else map.addImage(id, im, { pixelRatio: PR }); } catch (e) { console.warn('illus image', id, e); }
    }
  }

  // ---------------------------------------------------------------- geometry from POIs
  function poiList() {
    let list = [];
    try { if (WA.ui && WA.ui.pois) list = WA.ui.pois(); } catch (e) { list = []; }
    if (!list || !list.length) {
      const seen = {}; const leg = WA.leg && WA.leg.id;
      for (const src of [window.POIS, window.POIS_EXTRA]) for (const p of Array.isArray(src) ? src : []) if (p && p.id && !seen[p.id] && p.lat != null && (!leg || !p.legs || p.legs.indexOf(leg) >= 0)) { seen[p.id] = 1; list.push(p); }
    }
    return list.filter((p) => p && p.kind !== 'fire' && isFinite(p.lat) && isFinite(p.lon));
  }
  const pt = (c, props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: props });
  const SNOWY = /sierra-nevada|ruby-mountains|wind-river|uinta|wasatch|medicine-bow|east-humboldt|jarbidge/;

  function buildMounts(list) {
    const feats = [], peaks = list.filter((p) => p.kind === 'peak' || p.kind === 'volcano');
    const nearPeak = (c) => peaks.some((q) => hav(c, [q.lon, q.lat]) < 6);
    for (const p of list) {
      const pr = p.priority || 3, r = rng(hash(p.id)), sz = pr === 1 ? 1 : pr === 2 ? 0.86 : 0.74;
      if (p.kind === 'range') {
        const snowy = SNOWY.test(p.id), vars = ['a', 'b', 'c', 'd', 'e'];
        const pick = (big) => { const k = big ? ['a', 'b', 'd', 'c'][(r() * 4) | 0] : vars[(r() * vars.length) | 0]; return 'mh-' + k + (snowy && big && k !== 'e' ? '-s' : ''); };
        const line = Array.isArray(p.line) && p.line.length > 1 ? p.line : null;
        if (line) {
          const step = pr === 1 ? 9.5 : pr === 2 ? 11.5 : 14;
          let carry = step * 0.4, n = 0;
          for (let i = 1; i < line.length; i++) {
            const a = line[i - 1], b = line[i], d = hav(a, b), br = brg(a, b);
            for (let s = carry; s < d; s += step) {
              let c = dest(a, br, s);
              const side = n % 2 ? 1 : -1; c = dest(c, br + 90 * side, 1.5 + r() * 3);
              n++;
              if (nearPeak(c)) continue;
              const big = r() < 0.65;
              feats.push(pt(c, { img: pick(big), s: +(sz * (big ? 0.92 + r() * 0.2 : 0.7 + r() * 0.12)).toFixed(2) }));
              if (pr <= 2 && r() < (pr === 1 ? 0.55 : 0.3)) { // foothills on the flanks
                const f = dest(c, br + 90 * -side, 5 + r() * 4);
                if (!nearPeak(f)) feats.push(pt(f, { img: 'mh-' + (r() < 0.6 ? 'e' : 'c'), s: +(sz * (0.55 + r() * 0.12)).toFixed(2) }));
              }
            }
            carry = ((carry - d) % step + step) % step;
          }
        } else { // no crest line: a small clump around the centre
          const ext = Math.max(8, Math.min(30, (p.extentKm || 20) / 2)), k = pr === 1 ? 6 : pr === 2 ? 4 : 3;
          for (let i = 0; i < k; i++) {
            const c = i ? dest([p.lon, p.lat], r() * 360, ext * (0.4 + r() * 0.6)) : [p.lon, p.lat];
            if (i && nearPeak(c)) continue;
            feats.push(pt(c, { img: pick(i === 0 || r() < 0.5), s: +(sz * (i ? 0.72 + r() * 0.2 : 1)).toFixed(2) }));
          }
        }
      } else if (p.kind === 'peak') {
        const el = p.elevFt || 0, snow = el >= 10500;
        feats.push(pt([p.lon, p.lat], { img: 'mh-d' + (snow ? '-s' : ''), s: +(sz * (el > 12500 ? 1.15 : el > 9000 ? 1.02 : 0.88)).toFixed(2) }));
      } else if (p.kind === 'volcano') {
        const el = p.elevFt || 0;
        if (el && el < 4000) { // low buttes / necks: a little cluster of rounded hills
          feats.push(pt([p.lon, p.lat], { img: 'mh-v', s: +(sz * 0.62).toFixed(2) }));
          for (let i = 0; i < 2; i++) feats.push(pt(dest([p.lon, p.lat], 60 + i * 200 + r() * 40, 3 + r() * 3), { img: 'mh-e', s: +(sz * 0.55).toFixed(2) }));
        } else feats.push(pt([p.lon, p.lat], { img: el >= 8000 || !el ? 'mh-v-s' : 'mh-v', s: +(sz * (el > 12000 ? 1.3 : 1.12)).toFixed(2) }));
      }
    }
    return { type: 'FeatureCollection', features: feats.slice(0, 600) };
  }

  // Vignettes: id or kind → sprite, placed beside the POI so the chart dot and label stay readable.
  function buildVignettes(list) {
    const up = [], flat = [], used = {};
    const add = (arr, c, im, s, ox, oy) => arr.push(pt(c, { img: im, s: s || 1, ox: ox || 0, oy: oy || 0 }));
    const has = (id) => list.find((p) => p.id === id);
    for (const p of list) {
      const c = [p.lon, p.lat], id = p.id;
      if (id === 'promontory-summit') { add(up, dest(c, 200, 9), 'vg-loco', 1); used.loco = 1; }
      else if (id === 'bailey-yard') add(up, dest(c, 160, 6), 'vg-loco', 0.8);
      else if (id === 'fossil-butte') add(up, dest(c, 120, 6), 'vg-fish', 0.95);
      else if (p.kind === 'saltflat') add(flat, c, 'vg-salt', p.priority === 1 ? 1.15 : 0.95);
      else if (p.kind === 'dunes') add(flat, c, 'vg-dunes', id === 'nebraska-sandhills' ? 1.5 : 0.9);
      else if (id === 'center-pivots') add(flat, c, 'vg-pivots', 1.2);
      else if (p.kind === 'history' && Array.isArray(p.line) && p.line.length > 1) {
        // a wagon roughly a third and two-thirds of the way along each emigrant trail
        const L = p.line; let tot = 0; const seg = []; for (let i = 1; i < L.length; i++) { const d = hav(L[i - 1], L[i]); seg.push(d); tot += d; }
        for (const f of [0.3, 0.72]) { let s = tot * f; for (let i = 0; i < seg.length; i++) { if (s <= seg[i]) { add(up, dest(L[i], brg(L[i], L[i + 1]), s), 'vg-wagon', 0.9); break; } s -= seg[i]; } }
      } else if (id === 'south-pass' || id === 'independence-rock') add(up, dest(c, 230, 7), 'vg-wagon', 0.85);
    }
    // the Golden Spike engine needs its POI; if the data was pruned, fall back to the Union Pacific at Promontory
    if (!used.loco && !has('promontory-summit') && has('great-salt-lake')) add(up, [-112.62, 41.55], 'vg-loco', 0.9);
    return { up: { type: 'FeatureCollection', features: up }, flat: { type: 'FeatureCollection', features: flat } };
  }

  // ---------------------------------------------------------------- layers
  function anchorLayer(map) { for (const id of ['route-ahead', 'poi-ring', 'places']) if (map.getLayer(id)) return id; return undefined; }
  const SIZE_UP = (k) => ['interpolate', ['linear'], ['zoom'], 3, ['*', 0.4 * k, ['get', 's']], 5, ['*', 0.6 * k, ['get', 's']], 7, ['*', 0.98 * k, ['get', 's']], 8, ['*', 1.18 * k, ['get', 's']], 9, ['*', 1.28 * k, ['get', 's']], 11, ['*', 1.6 * k, ['get', 's']]];

  function waterPaint(p) {
    return {
      rule: { 'fill-pattern': 'wa-rule', 'fill-opacity': p.night ? 0.85 : 0.9 },
      wl1: { 'line-color': p.water, 'line-opacity': p.night ? 0.5 : 0.45, 'line-width': 0.5, 'line-offset': ['interpolate', ['linear'], ['zoom'], 7, -2.2, 10, -3] },
      wl2: { 'line-color': p.water, 'line-opacity': p.night ? 0.28 : 0.24, 'line-width': 0.45, 'line-offset': ['interpolate', ['linear'], ['zoom'], 7, -4.6, 10, -6.4] },
    };
  }

  function install() {
    const map = WA.map && WA.map.map; if (!map || !WA.map.ready || I.installed) return;
    I.installed = true;
    const p = WA.map.pal();
    addImages(map, p);
    const wp = waterPaint(p);
    const has = (id) => !!map.getLayer(id);
    try {
      if (has('water')) {
        const after = has('water-edge') ? 'water-edge' : undefined;
        map.addLayer({ id: 'illus-water-rule', type: 'fill', source: 'omt', 'source-layer': 'water', minzoom: 4.5, paint: wp.rule }, after);
        const lineBefore = has('streams') ? 'streams' : after;
        ['wl1', 'wl2'].forEach((k, i) => map.addLayer({ id: 'illus-water-' + k, type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 7 + i * 0.5,
          filter: ['!=', ['get', 'class'], 'river'], layout: { 'line-join': 'round' }, paint: wp[k] }, lineBefore));
      }
    } catch (e) { console.warn('illus water', e); }
    if (DRAW_SPRITES) try {
      map.addSource('illus-mounts', { type: 'geojson', data: EMPTY });
      map.addSource('illus-vg', { type: 'geojson', data: EMPTY });
      map.addSource('illus-flat', { type: 'geojson', data: EMPTY });
      const before = anchorLayer(map);
      map.addLayer({ id: 'illus-flat', type: 'symbol', source: 'illus-flat', minzoom: 5,
        layout: { 'icon-image': ['get', 'img'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 5, ['*', 0.5, ['get', 's']], 7, ['*', 1, ['get', 's']], 9, ['*', 1.8, ['get', 's']], 11, ['*', 2.6, ['get', 's']]],
          'icon-pitch-alignment': 'map', 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
        paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0, 5.8, 0.9] } }, before);
      map.addLayer({ id: 'illus-mounts', type: 'symbol', source: 'illus-mounts', minzoom: 3.5,
        layout: { 'icon-image': ['get', 'img'], 'icon-size': SIZE_UP(1), 'icon-anchor': 'bottom', 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport',
          'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-z-order': 'viewport-y' },
        paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 3.5, 0, 4.2, 0.95] } }, before);
      map.addLayer({ id: 'illus-vg', type: 'symbol', source: 'illus-vg', minzoom: 5.5,
        layout: { 'icon-image': ['get', 'img'], 'icon-size': SIZE_UP(1), 'icon-anchor': 'bottom', 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport',
          'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-z-order': 'viewport-y' },
        paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0, 6.2, 1] } }, before);
    } catch (e) { console.warn('illus layers', e); }
    rebuild(true);
    compass(map);
  }

  let sig = '';
  function rebuild(force) {
    if (!DRAW_SPRITES) return;
    const map = WA.map && WA.map.map; if (!map || !I.installed) return;
    let list; try { list = poiList(); } catch (e) { list = []; }
    const s = (WA.leg && WA.leg.id) + '|' + list.length + '|' + list.map((q) => q.id).join(',').length;
    if (!force && s === sig) return; sig = s;
    try {
      const m = buildMounts(list), v = buildVignettes(list);
      I.counts = { mounts: m.features.length, vg: v.up.features.length, flat: v.flat.features.length };
      const set = (id, d) => { const src = map.getSource(id); if (src) src.setData(d); };
      set('illus-mounts', m); set('illus-vg', v.up); set('illus-flat', v.flat);
    } catch (e) { console.warn('illus build', e); }
  }

  function recolor() {
    const map = WA.map && WA.map.map; if (!map || !I.installed) return;
    const p = WA.map.pal();
    addImages(map, p);
    const wp = waterPaint(p);
    const set = (id, paint) => { if (map.getLayer(id)) for (const k in paint) try { map.setPaintProperty(id, k, paint[k]); } catch (e) { /* */ } };
    set('illus-water-rule', wp.rule); set('illus-water-wl1', wp.wl1); set('illus-water-wl2', wp.wl2);
    map.triggerRepaint();
  }

  // ---------------------------------------------------------------- compass-rose cartouche
  function roseSVG() {
    try { if (window.ILLUSTRATIONS && ILLUSTRATIONS.compass) return ILLUSTRATIONS.compass; } catch (e) { /* */ }
    let s = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width=".8"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="40" stroke-width=".4"/>';
    for (let i = 0; i < 8; i++) { const a = i * 45 * D2R, L = i % 2 ? 22 : 38, w = i % 2 ? 4 : 7; const t = [50 + Math.sin(a) * L, 50 - Math.cos(a) * L], l = [50 + Math.sin(a - Math.PI / 4) * w, 50 - Math.cos(a - Math.PI / 4) * w], r = [50 + Math.sin(a + Math.PI / 4) * w, 50 - Math.cos(a + Math.PI / 4) * w]; s += '<path d="M50 50 L' + l.join(' ') + ' L' + t.join(' ') + ' L' + r.join(' ') + 'Z"' + (i % 2 ? '' : ' fill="currentColor" fill-opacity=".25"') + '/>'; }
    return s + '<text x="50" y="9" font-size="9" text-anchor="middle" fill="currentColor" stroke="none">N</text></svg>';
  }
  function compass(map) {
    const host = map.getContainer(); if (!host || host.querySelector('.wa-rose')) return;
    if (!document.getElementById('wa-illus-css')) {
      const st = document.createElement('style'); st.id = 'wa-illus-css';
      st.textContent = '.wa-rose{position:absolute;left:calc(14px + var(--sl,0px));top:calc(282px + var(--st,0px));width:62px;height:62px;z-index:1;pointer-events:none;color:var(--ink-2);opacity:.72;transition:opacity .3s}' +
        '.wa-rose>div{width:100%;height:100%;transform-origin:50% 50%}.wa-rose svg{width:100%;height:100%;display:block;overflow:visible}' +
        'body.sheet-open .wa-rose{opacity:0}';
      document.head.appendChild(st);
    }
    const el = document.createElement('div'); el.className = 'wa-rose'; el.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div'); inner.innerHTML = roseSVG(); el.appendChild(inner); host.appendChild(el);
    const spin = () => { const b = map.getBearing(), pit = map.getPitch(); inner.style.transform = 'perspective(260px) rotateX(' + Math.min(55, pit * 0.6).toFixed(1) + 'deg) rotate(' + (-b).toFixed(1) + 'deg)'; };
    map.on('rotate', spin); map.on('pitch', spin); map.on('moveend', spin); spin();
    I.rose = el;
  }

  // ---------------------------------------------------------------- hooks
  const later = (f) => setTimeout(f, 0);
  WA.on('mapready', () => { try { install(); } catch (e) { console.warn('illus install', e); } });
  WA.on('theme', () => { try { recolor(); } catch (e) { console.warn('illus recolor', e); } });
  WA.on('pois', () => later(() => rebuild(false)));
  WA.on('data', () => later(() => rebuild(false)));
  WA.on('leg', () => later(() => rebuild(true)));
  if (WA.map && WA.map.ready) later(install);
  I.rebuild = rebuild; I.recolor = recolor; I.sprites = SPRITES;
})();
