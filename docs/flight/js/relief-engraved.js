// Window Atlas: engraved relief styles, generated client-side from the terrarium DEM.
//   'hachures' : 19th-c. survey hachuring (King Survey / Dufour): fall-line strokes, weight by slope, rows broken at contours.
//   'tints'    : sectional-chart stepped elevation tints with hairline band edges over a crisp baked hillshade.
// Tiles are drawn at 512 px for 256-CSS-px tiles (retina-sharp) in a worker; served through the 'wa-relief://' protocol.
(function () {
  const WA = (window.WA = window.WA || {});
  WA.reliefStyles = WA.reliefStyles || {};
  const PROTO = 'wa-relief';
  const S = { dem: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png', pool: null, seq: 0, jobs: new Map(), local: null, bufs: new Map() };

  // ---------------------------------------------------------------------------------------------------------------
  // Tile engine. Self-contained (stringified into a worker); also runs on the main thread as a fallback.
  function makeEngine() {
    const N = 512;
    const dec = new Map();
    const lru = (m, k, v, cap) => { if (v === undefined) { const o = m.get(k); if (o) { m.delete(k); m.set(k, o); } return o; } m.set(k, v); while (m.size > cap) m.delete(m.keys().next().value); return v; };
    const mkCanvas = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    async function decode(url, buf) {
      const hit = lru(dec, url); if (hit) return hit;
      const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' }), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const w = bmp.width, c = mkCanvas(w, w), g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(bmp, 0, 0); if (bmp.close) bmp.close();
      const px = g.getImageData(0, 0, w, w).data, d = new Float32Array(w * w);
      for (let i = 0, j = 0; i < d.length; i++, j += 4) d[i] = px[j] * 256 + px[j + 1] + px[j + 2] / 256 - 32768;
      return lru(dec, url, { w, d }, 24);
    }
    // assemble a 512x512 elevation grid (m) from the parts: 4 quadrants at z+1, or one tile (or sub-rect) upsampled
    async function grid(job) {
      const E = new Float32Array(N * N);
      const parts = await Promise.all(job.parts.map((p) => decode(p.url, p.buf)));
      if (job.parts.length === 4) {
        job.parts.forEach((p, k) => { const t = parts[k], w = t.w, h = N / 2, s = w / h;
          for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) E[(p.oy * h + y) * N + p.ox * h + x] = t.d[Math.min(w - 1, (y * s) | 0) * w + Math.min(w - 1, (x * s) | 0)]; });
      } else {
        const t = parts[0], w = t.w, f = job.f, span = w / f, x0 = job.ix * span, y0 = job.iy * span, k = span / N;
        for (let y = 0; y < N; y++) {
          let sy = y0 + (y + 0.5) * k - 0.5; sy = Math.max(0, Math.min(w - 1, sy)); const iy = Math.min(w - 2, sy | 0), fy = sy - iy;
          for (let x = 0; x < N; x++) {
            let sx = x0 + (x + 0.5) * k - 0.5; sx = Math.max(0, Math.min(w - 1, sx)); const ix = Math.min(w - 2, sx | 0), fx = sx - ix, o = iy * w + ix;
            const a = t.d[o] + (t.d[o + 1] - t.d[o]) * fx, b = t.d[o + w] + (t.d[o + w + 1] - t.d[o + w]) * fx;
            E[y * N + x] = a + (b - a) * fy;
          }
        }
      }
      return E;
    }
    function blur3(A, passes) { // separable 3-tap box blur, clamped edges
      let a = A, b = new Float32Array(N * N);
      for (let p = 0; p < passes; p++) {
        for (let y = 0; y < N; y++) { const r = y * N; for (let x = 0; x < N; x++) b[r + x] = (a[r + Math.max(0, x - 1)] + a[r + x] + a[r + Math.min(N - 1, x + 1)]) / 3; }
        for (let y = 0; y < N; y++) { const u = Math.max(0, y - 1) * N, r = y * N, d = Math.min(N - 1, y + 1) * N; for (let x = 0; x < N; x++) a[r + x] = (b[u + x] + b[r + x] + b[d + x]) / 3; }
      }
      return a;
    }
    function grads(E, mpp) { // dz/dEast, dz/dSouth in m/m
      const gx = new Float32Array(N * N), gy = new Float32Array(N * N);
      for (let y = 0; y < N; y++) {
        const u = Math.max(0, y - 1), d = Math.min(N - 1, y + 1), r = y * N;
        for (let x = 0; x < N; x++) {
          const l = Math.max(0, x - 1), rr = Math.min(N - 1, x + 1);
          gx[r + x] = (E[r + rr] - E[r + l]) / ((rr - l) * mpp);
          gy[r + x] = (E[d * N + x] - E[u * N + x]) / ((d - u) * mpp);
        }
      }
      return [gx, gy];
    }
    const hex = (h, def) => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)) : def; };
    const hash = (i, j, z) => { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(z + 11, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
    const tileLat = (z, y) => { const n = Math.PI - (2 * Math.PI * (y + 0.5)) / Math.pow(2, z); return Math.atan(Math.sinh(n)); };
    const gainFor = (z) => Math.max(1, Math.min(2.2, 1 + 0.2 * (11 - z))); // lift apparent slope at small scales

    // ---- sectional-chart stepped tints ----
    const EDGES = [1000, 2000, 3000, 5000, 7000, 9000, 11000];
    const DAY = ['#D3DFCB', '#DAE2C6', '#E2E3C2', '#E5DCB8', '#DFCFA9', '#D5C09A', '#C8AE88', '#B99C78'].map((c) => hex(c));
    const NIGHT = ['#122019', '#16241C', '#1B2820', '#222A21', '#2A2B22', '#322E24', '#3A3226', '#43382A'].map((c) => hex(c));
    function tints(job, E, mpp, g) {
      const night = job.n, P = night ? NIGHT : DAY, gain = gainFor(job.z) * 1.15;
      const line = night ? hex(job.r, [185, 165, 124]) : hex(job.i, [76, 90, 94]), la = night ? 0.5 : 0.62;
      const [gx, gy] = grads(E, mpp), img = g.createImageData(N, N), D = img.data, ftpx = 3.28084 * mpp;
      const cA = Math.SQRT1_2, Lx = -0.5, Ly = -0.5, Lz = cA; // light from NW (315 deg), 45 deg altitude; x east, y south
      for (let i = 0, o = 0; i < N * N; i++, o += 4) {
        const ft = E[i] * 3.28084;
        let b = 0, near = 1e9; for (let k = 0; k < EDGES.length; k++) { if (ft >= EDGES[k]) b = k + 1; const dd = Math.abs(ft - EDGES[k]); if (dd < near) near = dd; }
        const c = P[b], ex = gx[i] * gain, ey = gy[i] * gain, nl = Math.sqrt(ex * ex + ey * ey + 1);
        const v = (-ex * Lx - ey * Ly + Lz) / nl - cA; // 0 on flats, <0 in shadow
        let r = c[0], gg = c[1], bb = c[2];
        if (night) { const add = v * (v < 0 ? 46 : 70); r += add; gg += add; bb += add * 0.9; }
        else { const f = 1 + v * (v < 0 ? 0.5 : 0.28); r *= f; gg *= f; bb *= f; }
        // anti-aliased hairline at each band edge: distance (px) to the nearest edge level
        const gm = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]) * ftpx, dpx = gm > 1e-6 ? near / gm : 1e9;
        const a = Math.max(0, Math.min(1, 1.35 - dpx)) * la;
        if (a > 0) { r += (line[0] - r) * a; gg += (line[1] - gg) * a; bb += (line[2] - bb) * a; }
        D[o] = r; D[o + 1] = gg; D[o + 2] = bb; D[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }

    // ---- hachures ----
    function hachures(job, E, mpp, g) {
      const z = job.z, gain = gainFor(z), night = job.n;
      const [gx, gy] = grads(E, mpp);
      const ink = hex(job.r, night ? [185, 165, 124] : [138, 122, 92]);
      const SP = 7.5; // stroke spacing in device px (constant on screen across zooms)
      const M = SP * 1.6; // margin so strokes from neighbouring tiles' seeds are drawn up to the seam
      const mppRef = (40075016.7 * Math.cos(40 * Math.PI / 180)) / (N * Math.pow(2, z));
      const DH = 1.15 * SP * (0.42 / gain) * mppRef; // contour interval (m) that breaks strokes into terrain-following rows
      const T0 = 0.05, T1 = 0.8; // apparent slope (tan) where hachures begin / reach full weight
      const ox = job.x * N, oy = job.y * N;
      const cl = (v) => (v < 0 ? 0 : v > N - 1 ? N - 1 : v);
      function elev(fx, fy) { // bilinear; linear extrapolation outside the tile from the edge gradient
        const cx = cl(fx), cy = cl(fy), ix = Math.min(N - 2, cx | 0), iy = Math.min(N - 2, cy | 0), tx = cx - ix, ty = cy - iy, o = iy * N + ix;
        const a = E[o] + (E[o + 1] - E[o]) * tx, b = E[o + N] + (E[o + N + 1] - E[o + N]) * tx;
        let e = a + (b - a) * ty;
        if (cx !== fx || cy !== fy) { const q = (cy | 0) * N + (cx | 0); e += (gx[q] * (fx - cx) + gy[q] * (fy - cy)) * mpp; }
        return e;
      }
      const buckets = new Map();
      const j0 = Math.floor((oy - M) / SP), j1 = Math.ceil((oy + N + M) / SP);
      for (let j = j0; j <= j1; j++) {
        const shift = (j & 1) * SP * 0.5, i0 = Math.floor((ox - M - shift) / SP), i1 = Math.ceil((ox + N + M - shift) / SP);
        for (let i = i0; i <= i1; i++) {
          const h1 = hash(i, j, z), h2 = hash(i + 7919, j - 104729, z), h3 = hash(j + 31337, i, z);
          const sx = i * SP + shift + (h1 - 0.5) * 0.7 * SP - ox, sy = j * SP + (h2 - 0.5) * 0.7 * SP - oy;
          const q = (cl(sy) | 0) * N + (cl(sx) | 0);
          let dx = gx[q], dy = gy[q]; const t0 = Math.sqrt(dx * dx + dy * dy), t = t0 * gain;
          if (t < T0) continue;
          const k = Math.min(1, (t - T0) / (T1 - T0));
          if (h3 > 0.25 + k * 2.5) continue; // gentle slopes thin out gradually rather than at a hard edge
          dx /= t0; dy /= t0; // unit uphill direction
          const e0 = elev(sx, sy), band = Math.floor(e0 / DH), half = SP * (0.32 + 0.48 * Math.sqrt(k));
          let a = 0, b = 0; // march uphill (a) and downhill (b) until the row's contour or the stroke half-length
          for (let s = 0.75; s <= half; s += 0.75) { if (Math.floor(elev(sx + dx * s, sy + dy * s) / DH) !== band) break; a = s; }
          for (let s = 0.75; s <= half; s += 0.75) { if (Math.floor(elev(sx - dx * s, sy - dy * s) / DH) !== band) break; b = s; }
          if (a + b < 1.4) continue;
          // light from the NW: slopes facing SE (downhill dir toward +x,+y) are in shadow
          const shade = Math.max(0, Math.min(1, (1 + (-dx - dy) * Math.SQRT1_2) / 2));
          const tone = night ? 1 - shade * 0.75 : 0.25 + shade * 0.75;
          let w = (0.45 + 1.55 * Math.pow(k, 0.85)) * (0.55 + 0.75 * tone);
          let al = 0.38 + 0.32 * k + 0.3 * tone;
          w = Math.max(0.5, Math.min(2.8, Math.round(w * 4) / 4)); al = Math.max(0.2, Math.min(1, Math.round(al * 6) / 6));
          const key = w * 10 + al;
          let arr = buckets.get(key); if (!arr) { arr = { w, al, p: [] }; buckets.set(key, arr); }
          arr.p.push(sx + dx * a, sy + dy * a, sx - dx * b, sy - dy * b);
        }
      }
      g.lineCap = 'butt';
      const col = 'rgb(' + ink.join(',') + ')';
      g.strokeStyle = col;
      for (const B of buckets.values()) {
        g.lineWidth = B.w; g.globalAlpha = B.al; g.beginPath();
        const p = B.p; for (let m = 0; m < p.length; m += 4) { g.moveTo(p[m], p[m + 1]); g.lineTo(p[m + 2], p[m + 3]); }
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    async function render(job) {
      const E0 = await grid(job), E = blur3(E0, job.style === 'hachures' ? 2 : 1);
      const mpp = (40075016.7 * Math.cos(tileLat(job.z, job.y))) / (N * Math.pow(2, job.z));
      const c = mkCanvas(N, N), g = c.getContext('2d');
      if (job.style === 'tints') tints(job, E, mpp, g); else hachures(job, E, mpp, g);
      if (c.transferToImageBitmap) return c.transferToImageBitmap();
      return createImageBitmap(c);
    }
    return { render };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // main-thread side: DEM fetch cache, worker pool, protocol handler
  function demBuf(url) {
    let p = S.bufs.get(url);
    if (p) { S.bufs.delete(url); S.bufs.set(url, p); return p; }
    p = fetch(url).then((r) => { if (!r.ok) throw new Error('DEM ' + r.status); return r.arrayBuffer(); });
    p.catch(() => S.bufs.delete(url));
    S.bufs.set(url, p);
    while (S.bufs.size > 48) S.bufs.delete(S.bufs.keys().next().value);
    return p;
  }
  function pool() {
    if (S.pool !== null) return S.pool;
    S.pool = false;
    try {
      if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return S.pool;
      const src = 'const E=(' + makeEngine.toString() + ')();const X=new Set();' +
        'self.onmessage=async(ev)=>{const m=ev.data;if(m.cancel){X.add(m.cancel);return;}' +
        'if(X.has(m.id)){X.delete(m.id);self.postMessage({id:m.id,err:"aborted"});return;}' +
        'try{const b=await E.render(m.job);self.postMessage({id:m.id,bmp:b},[b]);}catch(e){self.postMessage({id:m.id,err:String(e&&e.message||e)});}};';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const n = Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1));
      const ws = [];
      for (let k = 0; k < n; k++) {
        const w = new Worker(url);
        w.onmessage = (ev) => { const m = ev.data, j = S.jobs.get(m.id); if (!j) { if (m.bmp && m.bmp.close) m.bmp.close(); return; } S.jobs.delete(m.id); if (m.bmp) j.res(m.bmp); else j.rej(new Error(m.err)); };
        w.onerror = (e) => { // broken worker: fail pending tiles, fall back to the main thread from now on
          console.warn('relief worker', e.message || e); S.pool = false;
          S.jobs.forEach((j) => j.rej(new Error('relief worker failed'))); S.jobs.clear();
        };
        ws.push(w);
      }
      S.pool = { ws, i: 0 };
    } catch (e) { console.warn('relief worker unavailable', e); S.pool = false; }
    return S.pool;
  }
  async function makeJob(style, z, x, y, q) {
    const tpl = S.dem, u = (Z, X, Y) => tpl.replace('{z}', Z).replace('{x}', X).replace('{y}', Y);
    const job = { style, z, x, y, n: q.get('n') === '1', r: q.get('r'), i: q.get('i') };
    let parts;
    if (z >= 10 && z < 15) { // top-down detail: the four z+1 tiles give a true 512-px elevation grid
      parts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([dx, dy]) => ({ url: u(z + 1, 2 * x + dx, 2 * y + dy), ox: dx, oy: dy }));
    } else { // small scales (the pitched window view): one tile at z (shared with the base hillshade), lines drawn at 512
      const dz = Math.min(z, 15), f = Math.pow(2, z - dz);
      parts = [{ url: u(dz, Math.floor(x / f), Math.floor(y / f)) }];
      job.f = f; job.ix = x % f; job.iy = y % f;
    }
    const bufs = await Promise.all(parts.map((p) => demBuf(p.url)));
    parts.forEach((p, k) => { p.buf = bufs[k].slice(0); });
    job.parts = parts;
    return job;
  }
  async function tile(params, ac) {
    const m = /^[\w-]+:\/\/(\w+)\/(\d+)\/(\d+)\/(\d+)\??(.*)$/.exec(params.url);
    if (!m) throw new Error('bad relief url ' + params.url);
    const job = await makeJob(m[1], +m[2], +m[3], +m[4], new URLSearchParams(m[5]));
    if (ac && ac.signal && ac.signal.aborted) throw new DOMException('aborted', 'AbortError');
    const P = pool();
    let bmp;
    if (P) {
      const id = ++S.seq, w = P.ws[P.i++ % P.ws.length];
      bmp = await new Promise((res, rej) => {
        S.jobs.set(id, { res, rej });
        if (ac && ac.signal) ac.signal.addEventListener('abort', () => { w.postMessage({ cancel: id }); }, { once: true });
        w.postMessage({ id, job }, job.parts.map((p) => p.buf));
      });
    } else {
      if (!S.local) S.local = makeEngine();
      bmp = await S.local.render(job);
    }
    return { data: bmp };
  }
  function ensureProto() {
    const ml = window.maplibregl; if (!ml) return;
    const reg = ml.config && ml.config.REGISTERED_PROTOCOLS;
    const cur = reg ? reg[PROTO] : null;
    if (cur && cur._waEngraved) return;
    const prev = cur || null;
    const h = (params, ac) => {
      const host = (/^[\w-]+:\/\/(\w+)\//.exec(params.url) || [])[1];
      if (host === 'hachures' || host === 'tints') return tile(params, ac);
      if (prev) return prev(params, ac);
      return Promise.reject(new Error('no relief handler for ' + host));
    };
    h._waEngraved = true;
    ml.addProtocol(PROTO, h);
  }

  // ---------------------------------------------------------------------------------------------------------------
  // style plugins
  const strip = (c) => String(c || '').trim().replace('#', '');
  function mk(key, label, hill) {
    const SRC = 'wa-relief-' + key + '-src', LYR = 'wa-relief-' + key;
    let before = 'water', url = null;
    const urlFor = (p) => PROTO + '://' + key + '/{z}/{x}/{y}?n=' + (p.night ? 1 : 0) + '&r=' + strip(p.relief) + '&i=' + strip(p.ink2);
    function addLayers(map, p) {
      url = urlFor(p);
      if (!map.getSource(SRC)) map.addSource(SRC, { type: 'raster', tiles: [url], tileSize: 256, minzoom: 2, maxzoom: 15 });
      if (!map.getLayer(LYR)) map.addLayer({ id: LYR, type: 'raster', source: SRC, minzoom: 2,
        paint: { 'raster-fade-duration': 0, 'raster-resampling': 'linear', 'raster-opacity': key === 'hachures' ? (p.night ? 0.92 : 1) : 1 } },
      map.getLayer(before) ? before : undefined);
    }
    function dropLayers(map) {
      if (map.getLayer(LYR)) map.removeLayer(LYR);
      if (map.getSource(SRC)) map.removeSource(SRC);
    }
    return {
      label,
      add(map, pal, ctx) {
        if (ctx && ctx.DEM) S.dem = ctx.DEM;
        if (ctx && ctx.beforeId) before = ctx.beforeId;
        ensureProto();
        hill(map, pal);
        addLayers(map, pal);
      },
      remove(map) {
        dropLayers(map);
        try { if (map.getLayer('hillshade')) map.setLayoutProperty('hillshade', 'visibility', 'visible'); } catch (e) { /* */ }
      },
      recolor(map, pal) {
        hill(map, pal);
        if (urlFor(pal) !== url || !map.getSource(SRC)) { ensureProto(); dropLayers(map); addLayers(map, pal); }
      },
    };
  }
  const setHS = (map, paint, vis) => {
    if (!map.getLayer('hillshade')) return;
    for (const k in paint) try { map.setPaintProperty('hillshade', k, paint[k]); } catch (e) { /* */ }
    try { map.setLayoutProperty('hillshade', 'visibility', vis); } catch (e) { /* */ }
  };
  WA.reliefEngraved = { makeEngine, makeJob }; // exposed for profiling
  // hachures carry the relief: the soft base hillshade is reduced to a faint tone
  WA.reliefStyles.hachures = mk('hachures', 'Hachures', (map, p) => setHS(map, { 'hillshade-exaggeration': p.night ? 0.12 : 0.16, 'hillshade-shadow-color': p.relief, 'hillshade-highlight-color': p.paper, 'hillshade-accent-color': p.relief }, 'visible'));
  // tints bake their own crisp 512-px hillshade, so the soft base layer is hidden
  WA.reliefStyles.tints = mk('tints', 'Chart tints', (map) => setHS(map, {}, 'none'));
})();
