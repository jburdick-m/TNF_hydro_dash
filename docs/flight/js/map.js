// Window Atlas: MapLibre chart style, layers, camera modes, markers.
(function () {
  const G = WA.geo;
  const OFM = 'https://tiles.openfreemap.org/planet';
  const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const BIG_RIVERS = ['Mississippi', 'Missouri', 'Platte', 'North Platte', 'South Platte', 'Loup', 'Elkhorn', 'Des Moines', 'Iowa', 'Cedar', 'Rock', 'Fox', 'Laramie', 'Green', 'Bear', 'Weber', 'Jordan', 'Humboldt', 'Truckee', 'Yuba', 'Feather', 'American', 'Sacramento'];
  const BIG_RIVER_NAMES = BIG_RIVERS.map((n) => n + ' River');
  const M = (WA.map = { mode: WA.store.get('cam', 'window'), follow: true, sat: WA.store.get('sat', false), relief3: WA.store.get('relief3', false), ready: false });
  if (['window', 'chase', 'map'].indexOf(M.mode) < 0) M.mode = 'window';

  function pal() {
    const cs = getComputedStyle(document.documentElement);
    const g = (k) => cs.getPropertyValue('--' + k).trim();
    return { paper: g('paper'), paper2: g('paper-2'), ink: g('ink'), ink2: g('ink-2'), rule: g('rule'), magenta: g('magenta'), water: g('water'), relief: g('relief'), fire: g('fire'), ok: g('ok'), night: document.documentElement.dataset.theme === 'night' };
  }
  M.pal = pal;
  const nameExpr = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']];

  const BIG = ['in', nameExpr, ['literal', BIG_RIVER_NAMES]];
  function layers(p) {
    const halo = p.paper;
    return [
      { id: 'bg', type: 'background', paint: { 'background-color': p.paper } },
      { id: 'sat', type: 'raster', source: 'sat', layout: { visibility: M.sat ? 'visible' : 'none' }, paint: { 'raster-opacity': p.night ? 0.75 : 0.9, 'raster-saturation': -0.35, 'raster-contrast': 0.05 } },
      { id: 'hillshade', type: 'hillshade', source: 'hs', paint: { 'hillshade-exaggeration': p.night ? 0.45 : 0.6, 'hillshade-shadow-color': p.relief, 'hillshade-highlight-color': p.night ? p.paper2 : '#F4F5EF', 'hillshade-accent-color': p.ink2, 'hillshade-illumination-direction': 315 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': p.water, 'fill-opacity': M.sat ? 0.15 : p.night ? 0.32 : 0.22 } },
      { id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 5, paint: { 'line-color': p.water, 'line-width': 0.6, 'line-opacity': 0.7 } },
      { id: 'streams', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 8, filter: ['!=', ['get', 'class'], 'river'], paint: { 'line-color': p.water, 'line-width': 0.4, 'line-opacity': 0.45 } },
      { id: 'rivers', type: 'line', source: 'omt', 'source-layer': 'waterway', filter: ['==', ['get', 'class'], 'river'], layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': p.water, 'line-opacity': 0.85,
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.45, 9, 0.8],
          'line-gap-width': ['interpolate', ['linear'], ['zoom'], 3, ['case', BIG, 0.8, 0], 7, ['case', BIG, 2.2, 0.9], 10, ['case', BIG, 3.5, 1.6]] } },
      { id: 'big-rivers', type: 'line', source: 'rivers', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': p.water, 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.6, 9, 1],
          'line-gap-width': ['interpolate', ['linear'], ['zoom'], 3, 1, 6, 2, 9, 3.6] } },
      { id: 'states', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': p.ink2, 'line-width': 0.8, 'line-opacity': 0.55, 'line-dasharray': [6, 2, 1, 2] } },
      { id: 'country', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]], paint: { 'line-color': p.ink2, 'line-width': 1.2, 'line-opacity': 0.6 } },
      { id: 'interstates', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 5, filter: ['==', ['get', 'class'], 'motorway'], paint: { 'line-color': p.ink2, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 10, 1.1], 'line-opacity': 0.32 } },
      { id: 'wx', type: 'line', source: 'wx', layout: { 'line-cap': 'butt' }, paint: { 'line-color': ['case', ['==', ['get', 'cls'], 'clear'], p.ok, p.ink2], 'line-width': 9, 'line-opacity': ['case', ['==', ['get', 'cls'], 'clear'], 0.16, 0.22], 'line-blur': 3 } },
      { id: 'cone', type: 'fill', source: 'cone', paint: { 'fill-color': p.magenta, 'fill-opacity': 0.07 } },
      { id: 'cone-edge', type: 'line', source: 'cone', paint: { 'line-color': p.magenta, 'line-width': 0.8, 'line-opacity': 0.5, 'line-dasharray': [2, 3] } },
      { id: 'perims', type: 'fill', source: 'perims', paint: { 'fill-color': p.fire, 'fill-opacity': 0.22 } },
      { id: 'perims-edge', type: 'line', source: 'perims', paint: { 'line-color': p.fire, 'line-width': 1, 'line-opacity': 0.8 } },
      { id: 'poi-ranges', type: 'line', source: 'poilines', filter: ['==', ['get', 'kind'], 'range'], layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': p.relief, 'line-width': 6, 'line-opacity': ['case', ['get', 'mine'], 0.75, 0.45], 'line-dasharray': [0.18, 0.4] } },
      { id: 'poi-lines', type: 'line', source: 'poilines', filter: ['!=', ['get', 'kind'], 'range'], layout: { 'line-cap': 'butt', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'kind'], ['river', 'crossing', 'lake', 'reservoir'], p.water, 'history', p.ink2, p.relief], 'line-width': 1.8, 'line-opacity': ['case', ['get', 'mine'], 0.85, 0.5], 'line-dasharray': [3, 2] } },
      { id: 'route-ahead', type: 'line', source: 'route-ahead', layout: { 'line-cap': 'round' }, paint: { 'line-color': p.magenta, 'line-width': 2.2, 'line-opacity': 0.85, 'line-dasharray': [2, 2] } },
      { id: 'route-behind', type: 'line', source: 'route-behind', layout: { 'line-cap': 'round' }, paint: { 'line-color': p.magenta, 'line-width': 2.6, 'line-opacity': 0.9 } },
      { id: 'flown', type: 'line', source: 'flown', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': p.ink, 'line-width': 1.2, 'line-opacity': 0.75 } },
      { id: 'route-ticks', type: 'circle', source: 'ticks', paint: { 'circle-radius': 2, 'circle-color': p.paper, 'circle-stroke-color': p.magenta, 'circle-stroke-width': 1.2 } },
      { id: 'tick-labels', type: 'symbol', source: 'ticks', minzoom: 5, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 9, 'text-offset': [0, 1], 'text-letter-spacing': 0.1 }, paint: { 'text-color': p.magenta, 'text-halo-color': halo, 'text-halo-width': 1.5 } },
      { id: 'places', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['any', ['all', ['==', ['get', 'class'], 'city'], ['<=', ['coalesce', ['get', 'rank'], 99], 8]], ['all', ['==', ['get', 'class'], 'town'], ['>=', ['zoom'], 8]]],
        layout: { 'text-field': nameExpr, 'text-font': ['Noto Sans Regular'], 'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 9, 12], 'text-letter-spacing': 0.04, 'text-max-width': 8, 'text-padding': 6 }, paint: { 'text-color': p.ink2, 'text-halo-color': halo, 'text-halo-width': 1.6 } },
      { id: 'state-labels', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: ['==', ['get', 'class'], 'state'], maxzoom: 7.5,
        layout: { 'text-field': ['upcase', nameExpr], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-letter-spacing': 0.45 }, paint: { 'text-color': p.ink2, 'text-opacity': 0.55, 'text-halo-color': halo, 'text-halo-width': 1.2 } },
      { id: 'water-names', type: 'symbol', source: 'omt', 'source-layer': 'water_name', layout: { 'text-field': nameExpr, 'text-font': ['Noto Sans Italic'], 'text-size': 11, 'text-letter-spacing': 0.08, 'text-max-width': 7 }, paint: { 'text-color': p.water, 'text-halo-color': halo, 'text-halo-width': 1.4 } },
      { id: 'river-names', type: 'symbol', source: 'omt', 'source-layer': 'waterway', filter: ['all', ['==', ['get', 'class'], 'river'], ['in', nameExpr, ['literal', BIG_RIVER_NAMES]]],
        layout: { 'symbol-placement': 'line', 'text-field': nameExpr, 'text-font': ['Noto Sans Italic'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13], 'text-letter-spacing': 0.18, 'symbol-spacing': 280, 'text-offset': [0, -0.9], 'text-max-angle': 35, 'text-pitch-alignment': 'viewport' }, paint: { 'text-color': p.water, 'text-halo-color': halo, 'text-halo-width': 2 } },
      { id: 'big-river-names', type: 'symbol', source: 'rivers', filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Italic'], 'text-size': ['case', ['==', ['get', 'x'], 1], 15, 12.5],
          'text-letter-spacing': 0.12, 'text-pitch-alignment': 'viewport', 'text-padding': 6, 'symbol-sort-key': ['-', 1, ['get', 'x']], 'text-anchor': 'bottom', 'text-offset': [0, -0.3] },
        paint: { 'text-color': p.water, 'text-halo-color': halo, 'text-halo-width': 2.4, 'text-halo-blur': 0.4 } },
      { id: 'peaks', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 7, filter: ['<=', ['coalesce', ['get', 'rank'], 9], 3],
        layout: { 'text-field': ['case', ['has', 'ele_ft'], ['concat', nameExpr, '\n', ['to-string', ['get', 'ele_ft']], ' ft'], nameExpr], 'text-font': ['Noto Sans Italic'], 'text-size': 10, 'text-max-width': 9, 'text-padding': 8 }, paint: { 'text-color': p.relief, 'text-halo-color': halo, 'text-halo-width': 1.5 } },
      { id: 'fires', type: 'circle', source: 'fires', paint: { 'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'acres'], 1], 1, 3, 1000, 5, 50000, 9], 'circle-color': ['case', ['==', ['get', 'rx'], true], p.paper, p.fire], 'circle-stroke-color': p.fire, 'circle-stroke-width': 1.4, 'circle-opacity': 0.9 } },
      { id: 'fire-labels', type: 'symbol', source: 'fires', minzoom: 6, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Italic'], 'text-size': 10, 'text-offset': [0, 1.1], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': p.fire, 'text-halo-color': halo, 'text-halo-width': 1.4 } },
      { id: 'poi-ring', type: 'circle', source: 'pois', filter: ['==', ['get', 'p'], 1], paint: { 'circle-radius': 11, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['case', ['get', 'mine'], p.magenta, p.ink], 'circle-stroke-width': 0.8, 'circle-pitch-alignment': 'viewport' } },
      { id: 'poi-dot', type: 'circle', source: 'pois', paint: { 'circle-radius': ['match', ['get', 'p'], 1, 7.5, 2, 6, 4.5], 'circle-color': p.paper, 'circle-stroke-color': ['case', ['get', 'mine'], p.magenta, p.ink2], 'circle-stroke-width': ['case', ['get', 'mine'], 1.6, 1], 'circle-pitch-alignment': 'viewport' } },
      { id: 'poi-glyph', type: 'symbol', source: 'pois', layout: { 'icon-image': ['concat', 'g-', ['get', 'glyph']], 'icon-size': ['match', ['get', 'p'], 1, 0.9, 2, 0.75, 0.6], 'icon-allow-overlap': true, 'icon-ignore-placement': true } },
      { id: 'poi-labels', type: 'symbol', source: 'pois', filter: ['<=', ['get', 'p'], 2],
        layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Italic'], 'text-size': ['match', ['get', 'p'], 1, 12.5, 11], 'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 1.1, 'text-max-width': 9, 'text-padding': 4 },
        paint: { 'text-color': ['case', ['get', 'mine'], p.magenta, p.ink], 'text-halo-color': halo, 'text-halo-width': 1.8 } },
    ];
  }

  const EMPTY = { type: 'FeatureCollection', features: [] };
  function style(p) {
    return {
      version: 8,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources: {
        omt: { type: 'vector', url: OFM, attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://openmaptiles.org">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OSM contributors</a>' },
        hs: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 12, attribution: 'Terrain Tiles: AWS / Mapzen' },
        dem: { type: 'raster-dem', tiles: [DEM], encoding: 'terrarium', tileSize: 256, maxzoom: 12 },
        sat: { type: 'raster', tiles: [SAT], tileSize: 256, maxzoom: 18, attribution: 'Esri, Maxar, Earthstar Geographics' },
        cone: { type: 'geojson', data: EMPTY }, 'route-ahead': { type: 'geojson', data: EMPTY }, 'route-behind': { type: 'geojson', data: EMPTY },
        flown: { type: 'geojson', data: EMPTY }, ticks: { type: 'geojson', data: EMPTY }, pois: { type: 'geojson', data: EMPTY }, poilines: { type: 'geojson', data: EMPTY },
        rivers: { type: 'geojson', data: window.RIVERS || EMPTY }, fires: { type: 'geojson', data: EMPTY }, perims: { type: 'geojson', data: EMPTY }, wx: { type: 'geojson', data: EMPTY },
      },
      layers: layers(p),
    };
  }

  // chart-symbol glyphs drawn on canvas (recolored with theme)
  const GLYPHS = ['peak', 'volcano', 'lake', 'river', 'city', 'canyon', 'range', 'history', 'mine', 'crossing', 'landmark', 'forest', 'dunes', 'plains', 'basin', 'geology', 'saltflat', 'reservoir', 'airport', 'fire'];
  function drawGlyph(kind, color) {
    const s = 32, c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d'); x.strokeStyle = color; x.fillStyle = color; x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round';
    x.translate(16, 16); x.beginPath();
    switch (kind) {
      case 'peak': case 'range': x.moveTo(-8, 6); x.lineTo(-2, -6); x.lineTo(2, 0); x.lineTo(5, -4); x.lineTo(9, 6); x.stroke(); break;
      case 'volcano': x.moveTo(-9, 7); x.lineTo(-3, -5); x.lineTo(3, -5); x.lineTo(9, 7); x.stroke(); x.beginPath(); x.moveTo(-1, -8); x.lineTo(-2, -11); x.moveTo(2, -8); x.lineTo(3, -11); x.stroke(); break;
      case 'lake': case 'reservoir': case 'saltflat': for (let i = -1; i <= 1; i++) { x.moveTo(-8, i * 5); x.bezierCurveTo(-4, i * 5 - 3, 0, i * 5 + 3, 8, i * 5); } x.stroke(); break;
      case 'river': case 'crossing': x.moveTo(-9, 4); x.bezierCurveTo(-4, -6, 2, 8, 9, -4); x.stroke(); break;
      case 'city': x.arc(0, 0, 6, 0, 7); x.stroke(); x.beginPath(); x.arc(0, 0, 2.2, 0, 7); x.fill(); break;
      case 'canyon': x.moveTo(-9, -6); x.lineTo(-3, 6); x.lineTo(3, 6); x.lineTo(9, -6); x.stroke(); break;
      case 'history': x.moveTo(-6, 8); x.lineTo(-6, -8); x.lineTo(7, -4); x.lineTo(-6, 0); x.stroke(); break;
      case 'mine': x.moveTo(-7, 7); x.lineTo(7, -7); x.moveTo(-7, -7); x.lineTo(7, 7); x.stroke(); break;
      case 'forest': x.moveTo(0, -9); x.lineTo(-7, 5); x.lineTo(7, 5); x.closePath(); x.stroke(); x.beginPath(); x.moveTo(0, 5); x.lineTo(0, 9); x.stroke(); break;
      case 'dunes': x.moveTo(-9, 5); x.quadraticCurveTo(-4, -6, 0, 5); x.quadraticCurveTo(4, -3, 9, 5); x.stroke(); break;
      case 'plains': case 'basin': x.moveTo(-9, 2); x.lineTo(9, 2); x.moveTo(-6, 6); x.lineTo(6, 6); x.moveTo(-3, -2); x.lineTo(3, -2); x.stroke(); break;
      case 'geology': x.moveTo(-8, -6); x.lineTo(8, -6); x.moveTo(-8, 0); x.lineTo(8, 0); x.moveTo(-8, 6); x.lineTo(8, 6); x.stroke(); break;
      case 'airport': x.arc(0, 0, 7, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-10, 0); x.lineTo(-7, 0); x.moveTo(7, 0); x.lineTo(10, 0); x.moveTo(0, -10); x.lineTo(0, -7); x.moveTo(0, 7); x.lineTo(0, 10); x.stroke(); break;
      case 'fire': x.moveTo(0, -9); x.bezierCurveTo(8, -1, 6, 8, 0, 8); x.bezierCurveTo(-6, 8, -8, -1, 0, -9); x.fill(); break;
      default: x.moveTo(0, -7); x.lineTo(7, 0); x.lineTo(0, 7); x.lineTo(-7, 0); x.closePath(); x.stroke();
    }
    return x.getImageData(0, 0, s, s);
  }
  function addGlyphs(p) {
    for (const k of GLYPHS.concat(['default'])) {
      const id = 'g-' + k, img = drawGlyph(k, p.ink);
      if (M.map.hasImage(id)) M.map.updateImage(id, img); else M.map.addImage(id, img, { pixelRatio: 2 });
    }
  }
  M.glyphOf = (k) => (GLYPHS.indexOf(k) >= 0 ? k : 'default');

  M.init = function () {
    const el = document.getElementById('map');
    if (!window.maplibregl) { M.fail('The map library did not load. Everything else still works.'); return; }
    let map;
    try {
      const p = pal();
      map = new maplibregl.Map({ container: el, style: style(p), center: [WA.from.lon, WA.from.lat], zoom: 5, maxPitch: 85, attributionControl: false, fadeDuration: 150, pitchWithRotate: true, dragRotate: true, renderWorldCopies: false });
    } catch (e) {
      M.fail('This browser has no WebGL, so the 3D chart is off. Look-out, strip map, instruments and weather all still work.');
      return;
    }
    M.map = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('error', (e) => { if (e && e.error && /webgl/i.test(String(e.error.message))) M.fail('WebGL failed; the chart is off.'); });
    map.on('load', () => {
      M.ready = true;
      const at = el.querySelector('.maplibregl-ctrl-attrib'); if (at) at.classList.remove('maplibregl-compact-show');
      addGlyphs(pal());
      try { map.setTerrain({ source: 'dem', exaggeration: M.relief3 ? 4 : 2 }); } catch (e) { /* no terrain */ }
      setSky();
      map.on('click', 'poi-dot', (e) => { if (WA.S.syncPending) return; const f = e.features && e.features[0]; if (f) WA.ui.openDetail(f.properties.id); });
      map.on('click', 'fires', (e) => { if (WA.S.syncPending) return; const f = e.features && e.features[0]; if (f) WA.ui.openDetail(f.properties.id); });
      ['poi-dot', 'fires'].forEach((l) => { map.on('mouseenter', l, () => (map.getCanvas().style.cursor = 'pointer')); map.on('mouseleave', l, () => (map.getCanvas().style.cursor = '')); });
      map.on('click', (e) => { if (WA.S.syncPending) { WA.S.syncPending = false; document.body.classList.remove('syncing'); WA.syncTo(e.lngLat); WA.toast('Position synced to the route.'); M.follow = true; } });
      WA.emit('mapready');
    });
    const pause = (e) => { if (e && e.originalEvent && M.follow && !M.flying) { M.follow = false; WA.emit('follow'); } };
    ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart'].forEach((n) => map.on(n, pause));
    // aircraft
    const pe = document.createElement('div'); pe.className = 'plane-mk'; pe.innerHTML = planeSVG();
    M.plane = new maplibregl.Marker({ element: pe, rotationAlignment: 'map', pitchAlignment: 'viewport' }).setLngLat([WA.from.lon, WA.from.lat]).addTo(map);
    M.billboards = {};
  };
  function planeSVG() {
    return '<svg viewBox="-20 -20 40 40" width="42" height="42" aria-hidden="true"><path d="M0-17 L2.2-6 L15 2 L15 5 L2.2 1 L1.6 11 L6 14.5 L6 16.5 L0 15 L-6 16.5 L-6 14.5 L-1.6 11 L-2.2 1 L-15 5 L-15 2 L-2.2-6 Z" fill="var(--magenta)" stroke="var(--paper)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  M.fail = function (msg) {
    const el = document.getElementById('map');
    el.classList.add('nomap');
    el.innerHTML = '<div class="nomap-msg"><div class="nomap-rose">' + ((window.ILLUSTRATIONS && ILLUSTRATIONS.compass) || '') + '</div><p>' + msg + '</p></div>';
    M.map = null;
  };
  function setSky() {
    if (!M.map || !M.map.setSky) return;
    const p = pal();
    try { M.map.setSky({ 'sky-color': p.night ? '#0B1216' : '#C9D5D8', 'horizon-color': p.night ? '#1B2A31' : '#E6E8E0', 'fog-color': p.paper, 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0.6 }); } catch (e) { /* older */ }
  }

  M.recolor = function () {
    if (!M.map || !M.ready) return;
    const p = pal();
    for (const L of layers(p)) {
      if (!M.map.getLayer(L.id)) continue;
      for (const k in L.paint || {}) { try { M.map.setPaintProperty(L.id, k, L.paint[k]); } catch (e) { /* skip */ } }
    }
    addGlyphs(p); setSky();
  };
  M.setSat = function (on) { M.sat = on; WA.store.set('sat', on); if (M.map && M.ready) { M.map.setLayoutProperty('sat', 'visibility', on ? 'visible' : 'none'); M.recolor(); } };
  M.setRelief3 = function (on) { M.relief3 = on; WA.store.set('relief3', on); if (M.map && M.ready) try { M.map.setTerrain({ source: 'dem', exaggeration: on ? 4 : 2 }); } catch (e) { /* */ } };

  // ---- data layers ----
  M.setData = function (src, data) { if (M.map && M.ready && M.map.getSource(src)) M.map.getSource(src).setData(data); };
  const line = (c) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: c }, properties: {} });
  M.drawRoute = function () {
    const r = WA.route, ticks = [];
    const step = 100 * G.KM_PER_MI;
    for (let s = step; s < r.total - 20; s += step) { const a = G.along(r, s); ticks.push({ type: 'Feature', geometry: { type: 'Point', coordinates: a.pt }, properties: { label: Math.round(s / G.KM_PER_MI) + ' MI' } }); }
    M.setData('ticks', { type: 'FeatureCollection', features: ticks });
    M.lastSplit = -1;
  };
  M.splitRoute = function (s) {
    if (Math.abs(s - M.lastSplit) < 2) return; M.lastSplit = s;
    const r = WA.route, a = G.along(r, s), behind = r.coords.slice(0, a.i).concat([a.pt]), ahead = [a.pt].concat(r.coords.slice(a.i));
    M.setData('route-behind', behind.length > 1 ? line(behind) : EMPTY);
    M.setData('route-ahead', ahead.length > 1 ? line(ahead) : EMPTY);
  };
  // Only label what could actually be seen: limit point labels to ~380 km around the aircraft.
  const WINDOWED = ['places', 'peaks', 'water-names', 'state-labels', 'big-river-names'];
  M.labelWindow = function (pos, force) {
    const map = M.map; if (!map || !M.ready || !pos) return;
    if (!force && M.lwAt && G.hav([pos.lon, pos.lat], M.lwAt) < 25) return;
    M.lwAt = [pos.lon, pos.lat];
    const ring = []; for (let b = 0; b <= 360; b += 10) ring.push(G.dest(M.lwAt, b, 380));
    const within = ['within', { type: 'Polygon', coordinates: [ring] }];
    const base = {}; layers(pal()).forEach((l) => { base[l.id] = l.filter; });
    WINDOWED.forEach((id) => { if (map.getLayer(id)) try { map.setFilter(id, base[id] ? ['all', base[id], within] : within); } catch (e) { /* */ } });
  };
  M.drawCone = function (pos, horizonKm) {
    const wb = WA.windowBearing(pos), rad = Math.min(horizonKm, 250), pts = [[pos.lon, pos.lat]];
    for (let b = -55; b <= 55; b += 5) pts.push(G.dest([pos.lon, pos.lat], wb + b, rad));
    pts.push([pos.lon, pos.lat]);
    M.setData('cone', { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] }, properties: {} });
    M.labelWindow(pos);
  };
  M.drawFlown = function (track) {
    if (!track || track.length < 2) return M.setData('flown', EMPTY);
    M.setData('flown', line(track.map((p) => [p[0], p[1]])));
  };

  // ---- camera ----
  M.setMode = function (m) { M.mode = m; WA.store.set('cam', m); M.follow = true; M.camera(WA.pos, true); WA.emit('follow'); };
  M.camera = function (pos, force) {
    const map = M.map; if (!map || !pos || (!M.follow && !force)) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = (o) => { M.flying = true; if (reduce || force) map.jumpTo(o); else map.easeTo(Object.assign({ duration: 950, easing: (t) => t }, o)); setTimeout(() => (M.flying = false), force ? 50 : 1000); };
    const here = [pos.lon, pos.lat];
    if (M.mode === 'map') {
      if (!force && M.mapFitDone) return;
      M.mapFitDone = true; M.flying = true;
      const b = WA.route.bbox, sheetPad = document.body.classList.contains('sheet-open') ? Math.round(innerHeight * 0.4) : 120;
      map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 130, bottom: sheetPad, left: 70, right: 40 }, bearing: 0, pitch: 0, duration: reduce ? 0 : 900 });
      setTimeout(() => (M.flying = false), 950);
      return;
    }
    M.mapFitDone = false;
    if (M.mode === 'chase') {
      ease({ center: G.dest(here, pos.trk, 25), zoom: 8.2, pitch: 60, bearing: pos.trk });
      return;
    }
    // WINDOW: camera roughly over the aircraft, looking out the window side
    const pitch = 76, zoom = 7.8, H = map.getContainer().clientHeight || innerHeight;
    const mpp = 40075016 * Math.cos(pos.lat * G.D2R) / (512 * Math.pow(2, zoom));
    const camKm = (1.5 * H * mpp) / 1000, fov2 = 18.43;
    const alt = camKm * Math.cos(pitch * G.D2R), back = camKm * Math.sin(pitch * G.D2R);
    const ang = pitch - fov2 + 0.27 * 2 * fov2; // aircraft ~27% up from the bottom edge, above the look-out line
    const offset = Math.max(20, back - alt * Math.tan(ang * G.D2R));
    const wb = WA.windowBearing(pos);
    ease({ center: G.dest(here, wb, offset), zoom, pitch, bearing: wb });
  };
  M.flyTo = function (lon, lat) {
    if (!M.map) return;
    M.follow = false; WA.emit('follow'); M.flying = true;
    M.map.flyTo({ center: [lon, lat], zoom: 8.6, pitch: 55, bearing: M.map.getBearing(), duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 2200 });
    setTimeout(() => (M.flying = false), 2300);
  };

  // ---- illustrated billboards for nearby priority-1 POIs ----
  M.updateBillboards = function (pos, list) {
    if (!M.map || !window.illo) return;
    const keep = {};
    const here = [pos.lon, pos.lat];
    for (const f of list) {
      if (f.priority !== 1 || f.kind === 'fire') continue;
      const d = G.hav(here, [f.lon, f.lat]);
      if (d > 250) continue;
      keep[f.id] = 1;
      let mk = M.billboards[f.id];
      if (!mk) {
        const el = document.createElement('button'); el.className = 'bb'; el.type = 'button';
        let svg = ''; try { svg = window.illo(f.kind, { className: 'bb-illo' }) || ''; } catch (e) { svg = ''; }
        el.innerHTML = '<span class="bb-in">' + svg + '<span class="bb-name">' + WA.esc(f.name) + '</span><span class="bb-stem"></span></span>';
        el.addEventListener('click', (ev) => { ev.stopPropagation(); WA.ui.openDetail(f.id); });
        mk = M.billboards[f.id] = new maplibregl.Marker({ element: el, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' }).setLngLat([f.lon, f.lat]).addTo(M.map);
      }
      const sc = Math.max(0.42, Math.min(1, 1.15 - d / 260));
      mk.getElement().firstChild.style.transform = 'scale(' + sc.toFixed(2) + ')';
      mk.getElement().classList.toggle('mine', !!f.mine);
    }
    for (const id in M.billboards) if (!keep[id]) { M.billboards[id].remove(); delete M.billboards[id]; }
  };
  M.clearBillboards = function () { for (const id in M.billboards || {}) M.billboards[id].remove(); M.billboards = {}; };
  M.planeAt = function (pos) { if (M.plane) { M.plane.setLngLat([pos.lon, pos.lat]); M.plane.setRotation(pos.trk || 0); } };

  // tile URL template for offline save
  M.vectorTemplate = async function () {
    try { const j = await (await fetch(OFM)).json(); return j.tiles[0]; } catch (e) { return null; }
  };
  M.DEM = DEM;
})();
