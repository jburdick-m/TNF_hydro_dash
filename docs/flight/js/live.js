// Window Atlas: network feeds other than position: weather (Open-Meteo), fires (NIFC WFIGS), reverse geocode, ground elevation.
(function () {
  const G = WA.geo;
  const L = (WA.live = { wx: null, wxAhead: [], smf: null, fires: [], perims: null, place: null, ground: null });
  async function getJSON(u, ms = 15000) {
    const ctl = new AbortController(); const k = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(u, { signal: ctl.signal, cache: 'no-store' }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(k); }
  }

  // ---------- weather ----------
  let wxAt = 0, wxPt = null, wxBusy = false;
  const LEVELS = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150];
  const LEVEL_FT = { 1000: 360, 925: 2500, 850: 4800, 700: 9900, 600: 13800, 500: 18300, 400: 23600, 300: 30100, 250: 34000, 200: 38700, 150: 44600 };
  function nearestLevel(ft) { let b = 250, d = 1e9; for (const l of LEVELS) { const x = Math.abs(LEVEL_FT[l] - ft); if (x < d) { d = x; b = l; } } return b; }
  function classify(lo, mid, vis) {
    const c = Math.max(lo || 0, (mid || 0) * 0.8);
    if (vis != null && vis < 5000) return 'obscured';
    if (c < 20) return 'clear';
    if (c < 60) return 'patchy';
    return 'overcast';
  }
  L.verdictText = { clear: 'Ground view: clear', patchy: 'Patchy low cloud', overcast: 'Overcast below', obscured: 'Haze or low visibility' };
  const WMO = { 0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'fog', 48: 'rime fog', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 80: 'showers', 81: 'showers', 82: 'heavy showers', 95: 'thunderstorms', 96: 'thunderstorms, hail', 99: 'thunderstorms, hail' };
  L.wmo = (c) => WMO[c] || 'conditions ' + c;

  L.weather = async function (pos, force) {
    if (wxBusy || !pos) return;
    const moved = wxPt ? G.hav(wxPt, [pos.lon, pos.lat]) : 1e9;
    if (!force && Date.now() - wxAt < 600000 && moved < 100) return;
    wxBusy = true; wxAt = Date.now(); wxPt = [pos.lon, pos.lat];
    try {
      const lvl = nearestLevel(pos.alt || 34000);
      // samples along the remaining route (incl. current position), every ~150 km
      const r = WA.route, pts = [[pos.lon, pos.lat, pos.s]];
      for (let s = pos.s + 150; s < r.total; s += 150) { const a = G.along(r, s); pts.push([a.pt[0], a.pt[1], s]); }
      if (pts.length > 25) pts.length = 25;
      const lat = pts.map((p) => p[1].toFixed(3)).join(','), lon = pts.map((p) => p[0].toFixed(3)).join(',');
      const cur = 'cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_' + lvl + 'hPa,wind_direction_' + lvl + 'hPa,temperature_' + lvl + 'hPa';
      const j = await getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=' + cur + '&wind_speed_unit=kn&timezone=GMT');
      const arr = Array.isArray(j) ? j : [j];
      L.wxAhead = arr.map((o, i) => { const c = o.current || {}; return { s: pts[i][2], lon: pts[i][0], lat: pts[i][1], lo: c.cloud_cover_low, mid: c.cloud_cover_mid, hi: c.cloud_cover_high, vis: c.visibility, cls: classify(c.cloud_cover_low, c.cloud_cover_mid, c.visibility) }; });
      const c0 = arr[0].current || {};
      L.wx = { t: Date.now(), lvl, lo: c0.cloud_cover_low, mid: c0.cloud_cover_mid, hi: c0.cloud_cover_high, vis: c0.visibility, cls: L.wxAhead[0].cls, ws: c0['wind_speed_' + lvl + 'hPa'], wd: c0['wind_direction_' + lvl + 'hPa'], temp: c0['temperature_' + lvl + 'hPa'] };
      // destination
      const to = WA.to;
      const d = await getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + to.lat + '&longitude=' + to.lon + '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover&wind_speed_unit=kn&temperature_unit=fahrenheit&timezone=auto');
      L.smf = d.current;
      WA.emit('wx');
    } catch (e) { console.info('weather unavailable', e.message || e); }
    wxBusy = false;
  };

  // ---------- fires ----------
  let fireAt = 0;
  L.fireRun = async function (force) {
    if (!force && Date.now() - fireAt < 30 * 60000) return;
    fireAt = Date.now();
    const b = WA.route.bbox, env = [b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2].join(',');
    const base = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/';
    const q = '/FeatureServer/0/query?where=1%3D1&geometry=' + env + '&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects&f=geojson';
    try {
      const j = await getJSON(base + 'WFIGS_Incident_Locations_Current' + q + '&outFields=IncidentName,IncidentSize,PercentContained,FireDiscoveryDateTime,IncidentTypeCategory&resultRecordCount=600', 25000);
      const out = [];
      for (const f of j.features || []) {
        if (!f.geometry) continue;
        const [lon, lat] = f.geometry.coordinates, p = f.properties || {};
        const pr = G.project(WA.route, [lon, lat]);
        if (pr.dist > 200) continue;
        const rx = p.IncidentTypeCategory === 'RX';
        const acres = p.IncidentSize;
        if (!rx && (acres == null || acres < 10) && pr.dist > 60) continue; // skip tiny distant spot fires
        const nm = titleCase(p.IncidentName || 'Unnamed');
        out.push({ id: 'fire-' + nm.replace(/\W+/g, '-').toLowerCase() + '-' + Math.round(lon * 100), name: (rx ? nm + ' (prescribed burn)' : nm + ' Fire').replace(/ Fire Fire$/, ' Fire'), kind: 'fire', lat, lon, priority: acres > 5000 ? 1 : acres > 300 ? 2 : 3,
          acres, contained: p.PercentContained, discovered: p.FireDiscoveryDateTime, rx,
          tagline: rx ? 'Prescribed burn' : (acres ? Math.round(acres).toLocaleString() + ' acres' : 'Size not reported') + (p.PercentContained != null ? ' · ' + p.PercentContained + '% contained' : ''),
          lookFor: rx ? 'A thin column of smoke from a planned, managed burn.' : 'A smoke plume or a brown haze layer drifting downwind; at night, an orange glow.',
          blurb: (rx ? 'A prescribed fire reported to the National Interagency Fire Center.' : 'An active wildfire incident reported to the National Interagency Fire Center (WFIGS).') + (p.FireDiscoveryDateTime ? ' Discovered ' + new Date(p.FireDiscoveryDateTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + '.' : ''),
          fact: 'Source: NIFC WFIGS current incidents.' });
      }
      L.fires = out;
      WA.map.setData('fires', { type: 'FeatureCollection', features: out.map((f) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [f.lon, f.lat] }, properties: { id: f.id, acres: f.acres || 1, rx: f.rx, label: f.acres > 100 || f.rx ? f.name : '' } })) });
      WA.emit('pois');
    } catch (e) { console.info('fires unavailable', e.message || e); }
    try {
      const j = await getJSON(base + 'WFIGS_Interagency_Perimeters_Current' + q + '&outFields=poly_IncidentName,poly_GISAcres,attr_PercentContained&maxAllowableOffset=0.005&resultRecordCount=300', 30000);
      L.perims = j;
      WA.map.setData('perims', j);
    } catch (e) { console.info('perimeters unavailable', e.message || e); }
  };
  function titleCase(s) { return String(s).toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()); }

  // ---------- reverse geocode ----------
  let geoAt = 0, geoPt = null;
  L.revgeo = async function (pos) {
    if (!pos || Date.now() - geoAt < 60000 || (geoPt && G.hav(geoPt, [pos.lon, pos.lat]) < 10)) return;
    geoAt = Date.now(); geoPt = [pos.lon, pos.lat];
    try {
      const j = await getJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + pos.lat.toFixed(4) + '&longitude=' + pos.lon.toFixed(4) + '&localityLanguage=en', 10000);
      const admin = (j.localityInfo && j.localityInfo.administrative) || [];
      const county = (admin.find((a) => a.adminLevel === 6) || {}).name;
      L.place = { county, state: j.principalSubdivision, locality: j.locality || j.city };
      WA.emit('place');
    } catch (e) { /* offline */ }
  };

  // ---------- ground elevation from terrarium tiles (no WebGL needed) ----------
  const tileCache = {};
  let gAt = 0, gPt = null;
  L.groundElev = async function (pos) {
    if (!pos || (gPt && G.hav(gPt, [pos.lon, pos.lat]) < 3 && Date.now() - gAt < 60000)) return;
    gAt = Date.now(); gPt = [pos.lon, pos.lat];
    const z = 10, n = Math.pow(2, z);
    const xf = ((pos.lon + 180) / 360) * n, la = pos.lat * G.D2R;
    const yf = ((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n;
    const x = Math.floor(xf), y = Math.floor(yf), key = x + '/' + y;
    try {
      let ctx = tileCache[key];
      if (!ctx) {
        const img = new Image(); img.crossOrigin = 'anonymous';
        img.src = WA.map.DEM.replace('{z}', z).replace('{x}', x).replace('{y}', y);
        await img.decode();
        const c = document.createElement('canvas'); c.width = c.height = 256; ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
        tileCache[key] = ctx;
      }
      const px = Math.min(255, Math.floor((xf - x) * 256)), py = Math.min(255, Math.floor((yf - y) * 256));
      const d = ctx.getImageData(px, py, 1, 1).data;
      L.ground = d[0] * 256 + d[1] + d[2] / 256 - 32768; // metres
    } catch (e) { /* offline */ }
  };
})();
