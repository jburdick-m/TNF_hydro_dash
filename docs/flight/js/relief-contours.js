// Window Atlas relief style "Survey contours": crisp vector contour lines generated on the fly from the
// terrarium DEM (maplibre-contour, vendored, lazy-loaded), drawn like an engraved survey plate: hairline
// minor contours, heavier index contours with small italic elevations in feet, and a pale, flat hillshade
// underneath so the lines carry the form. Plugs into WA.reliefStyles (see map.js applyRelief).
(function () {
  const WA = (window.WA = window.WA || {});
  WA.reliefStyles = WA.reliefStyles || {};

  const SRC = 'wa-contours';
  const L_MINOR = 'contour-minor', L_INDEX = 'contour-index', L_LABEL = 'contour-label';
  const LIB = (function () {
    try { if (document.currentScript && document.currentScript.src) return new URL('../vendor/maplibre-contour/maplibre-contour.min.js', document.currentScript.src).href; } catch (e) { /* */ }
    return 'vendor/maplibre-contour/maplibre-contour.min.js';
  })();
  // Contour intervals in feet, keyed by TILE zoom. The source uses 256-px tiles, so tile zoom = map zoom + 1.
  // Index intervals nest (4000 > 2000 > 1000 > 500 > 200) so lines never jump between tile zooms in the pitched view.
  const THRESHOLDS = { 1: [2000, 4000], 7: [500, 2000], 9: [200, 1000], 12: [100, 500], 14: [40, 200] };

  let loading = null, dem = null, demUrl = null, want = false, gen = 0;

  function loadLib() {
    if (window.mlcontour) return Promise.resolve(window.mlcontour);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB; s.async = true;
      s.onload = () => (window.mlcontour ? resolve(window.mlcontour) : reject(new Error('mlcontour global missing')));
      s.onerror = () => { loading = null; s.remove(); reject(new Error('maplibre-contour failed to load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  function rgb(c) {
    c = String(c || '').trim();
    let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (m) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); }
    m = /^rgba?\(([^)]+)\)/i.exec(c);
    if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number);
    return null;
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    if (!A || !B) return a || b;
    return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, '0')).join('');
  }

  // Paint for everything we own, plus the restyled base hillshade (pale, low exaggeration: tone, not modelling).
  function paints(p) {
    const n = !!p.night;
    const line = p.relief || (n ? '#B9A57C' : '#8A7A5C');
    const paper = p.paper || (n ? '#0E1519' : '#E8EBE4');
    return {
      hillshade: n
        ? { 'hillshade-exaggeration': 0.3, 'hillshade-shadow-color': mix(paper, '#000000', 0.55), 'hillshade-highlight-color': mix(paper, line, 0.16), 'hillshade-accent-color': mix(paper, '#000000', 0.3), 'hillshade-illumination-direction': 315 }
        : { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': mix(paper, line, 0.55), 'hillshade-highlight-color': mix(paper, '#FFFFFF', 0.45), 'hillshade-accent-color': mix(paper, line, 0.3), 'hillshade-illumination-direction': 315 },
      [L_MINOR]: {
        'line-color': line,
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 13, 0.5],
        // minor hairlines only once zoomed in; the pitched window view (z~7.8) shows index lines alone
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 7.9, 0, 8.8, n ? 0.4 : 0.45],
      },
      [L_INDEX]: {
        'line-color': line,
        'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 8, 0.95, 12, 1.1],
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.55, 7, n ? 0.75 : 0.8],
      },
      [L_LABEL]: {
        'text-color': n ? mix(line, '#FFFFFF', 0.1) : mix(line, p.ink || '#1C2629', 0.3),
        'text-halo-color': paper, 'text-halo-width': 1.4, 'text-halo-blur': 0.3,
      },
    };
  }

  // Insert labels just below the first existing symbol layer, so they don't split the terrain drape stack.
  function labelBefore(map, fallback) {
    try { const ls = map.getStyle().layers; let past = false; for (const l of ls) { if (l.id === fallback) past = true; if (past && l.type === 'symbol' && !l.id.startsWith('contour-')) return l.id; } } catch (e) { /* */ }
    return fallback;
  }

  function build(map, ctx) {
    const lib = window.mlcontour;
    if (!dem || demUrl !== ctx.DEM) {
      dem = new lib.DemSource({ url: ctx.DEM, encoding: 'terrarium', maxzoom: 12, worker: true, cacheSize: 120, timeoutMs: 15000, id: 'wa-dem' });
      dem.setupMaplibre(window.maplibregl);
      demUrl = ctx.DEM;
    }
    if (!map.getSource(SRC)) {
      map.addSource(SRC, {
        type: 'vector', tileSize: 256, maxzoom: 14,
        tiles: [dem.contourProtocolUrl({ multiplier: 3.28084, thresholds: THRESHOLDS, elevationKey: 'ele', levelKey: 'level', contourLayer: 'contours', extent: 4096, buffer: 1 })],
        attribution: 'Contours: maplibre-contour',
      });
    }
    const P = paints(WA.map && WA.map.pal ? WA.map.pal() : ctx.pal || {});
    const before = map.getLayer(ctx.beforeId) ? ctx.beforeId : undefined;
    const lineLayout = { 'line-join': 'round', 'line-cap': 'round' };
    if (!map.getLayer(L_MINOR)) map.addLayer({ id: L_MINOR, type: 'line', source: SRC, 'source-layer': 'contours', minzoom: 7.5, filter: ['==', ['get', 'level'], 0], layout: lineLayout, paint: P[L_MINOR] }, before);
    if (!map.getLayer(L_INDEX)) map.addLayer({ id: L_INDEX, type: 'line', source: SRC, 'source-layer': 'contours', filter: ['>=', ['get', 'level'], 1], layout: lineLayout, paint: P[L_INDEX] }, before);
    if (!map.getLayer(L_LABEL)) {
      map.addLayer({
        id: L_LABEL, type: 'symbol', source: SRC, 'source-layer': 'contours', minzoom: 8, filter: ['>=', ['get', 'level'], 1],
        layout: {
          'symbol-placement': 'line', 'symbol-spacing': 320, 'text-max-angle': 28, 'text-padding': 3,
          'text-field': ['number-format', ['get', 'ele'], { locale: 'en-US', 'max-fraction-digits': 0 }],
          'text-font': ['Noto Sans Italic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 8, 9, 13, 10.5], 'text-letter-spacing': 0.04,
          'text-pitch-alignment': 'viewport', 'text-rotation-alignment': 'map', 'text-keep-upright': true,
        },
        paint: P[L_LABEL],
      }, labelBefore(map, before));
    }
  }

  WA.reliefStyles.contours = {
    label: 'Survey contours',
    add(map, pal, ctx) {
      want = true;
      const my = ++gen;
      ctx = Object.assign({ beforeId: 'water' }, ctx || {}, { pal });
      // restyle the base hillshade right away so the switch feels immediate
      const hs = paints(pal || {}).hillshade;
      if (map.getLayer('hillshade')) for (const k in hs) try { map.setPaintProperty('hillshade', k, hs[k]); } catch (e) { /* */ }
      loadLib().then(() => {
        if (!want || my !== gen) return;
        try { build(map, ctx); } catch (e) { console.warn('contours add', e); }
      }).catch((e) => console.warn('contours', e));
    },
    remove(map) {
      want = false; gen++;
      for (const id of [L_LABEL, L_INDEX, L_MINOR]) if (map.getLayer(id)) try { map.removeLayer(id); } catch (e) { /* */ }
      if (map.getSource(SRC)) try { map.removeSource(SRC); } catch (e) { /* */ }
    },
    recolor(map, pal) {
      const P = paints(pal || {});
      for (const id in P) {
        if (!map.getLayer(id)) continue;
        for (const k in P[id]) try { map.setPaintProperty(id, k, P[id][k]); } catch (e) { /* */ }
      }
    },
  };
})();
