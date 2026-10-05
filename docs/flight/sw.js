// AA2735 Window Atlas service worker: app shell (network-first, cached fallback), map tiles/fonts cache-first, live APIs network-only.
const VERSION = 'wa-v15';
const SHELL = 'shell-' + VERSION, TILES = 'tiles-v1', TILE_CAP = 6000;
const SHELL_FILES = ['index.html', 'manifest.json', 'css/app.css', 'vendor/maplibre/maplibre-gl.js', 'vendor/maplibre/maplibre-gl.css',
  'data/route.js', 'data/rivers.js', 'data/pois.js', 'data/pois-extra.js', 'js/relay-feed.js', 'js/illustrations.js', 'js/engrave-kit.js', 'js/plates-sierra.js', 'js/plates-basin.js', 'js/plates-rockies.js', 'js/geo.js', 'js/relief-contours.js', 'js/relief-engraved.js', 'vendor/maplibre-contour/maplibre-contour.min.js', 'js/engine.js', 'js/map.js', 'js/map-illustrations.js', 'js/live.js', 'js/ui.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const TILE_HOSTS = ['tiles.openfreemap.org', 's3.amazonaws.com', 'server.arcgisonline.com', 'services.arcgisonline.com', 'basemap.nationalmap.gov', 'fonts.gstatic.com', 'fonts.googleapis.com'];
const LIVE_HOSTS = ['ntfy.sh', 'api.adsb.lol', 'opendata.adsb.fi', 'api.open-meteo.com', 'api.bigdatacloud.net', 'services3.arcgis.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(SHELL_FILES.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

let trimming = false;
async function trim() {
  if (trimming) return; trimming = true;
  try { const c = await caches.open(TILES); const ks = await c.keys(); for (let i = 0; i < ks.length - TILE_CAP; i++) await c.delete(ks[i]); } catch (e) { /* */ }
  trimming = false;
}
let puts = 0;
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (LIVE_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return; // network-only
  if (TILE_HOSTS.indexOf(url.hostname) >= 0) {
    if (url.hostname === 'tiles.openfreemap.org' && url.pathname === '/planet') { e.respondWith(netFirst(req, TILES, 6000)); return; }
    e.respondWith(caches.open(TILES).then(async (c) => {
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); if (++puts % 200 === 0) trim(); }
      return res;
    }));
    return;
  }
  if (url.origin === self.location.origin) e.respondWith(netFirst(req, SHELL, 9000));
});
async function netFirst(req, cacheName, ms) {
  const c = await caches.open(cacheName);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    if (res && res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}
