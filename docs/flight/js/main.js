// Window Atlas: boot, theme, data loading, 1 Hz loop, wake lock, offline save, service worker.
(function () {
  const G = WA.geo, S = WA.S, $ = (s) => document.querySelector(s);

  // ---------- theme ----------
  const forced = WA.qs.get('theme');
  WA.themeMode = forced === 'day' || forced === 'night' ? forced : WA.store.get('theme', 'auto');
  function applyTheme(t) {
    const root = document.documentElement;
    if (root.dataset.theme === t) return;
    root.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'night' ? '#0E1519' : '#E8EBE4';
    WA.map.recolor();
    WA.emit('theme', t);
  }
  function autoTheme() {
    if (WA.themeMode !== 'auto') return applyTheme(WA.themeMode);
    const p = WA.pos;
    if (!p) return applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day');
    applyTheme(G.sun(new Date(p.wall * 1000), p.lat, p.lon).elev < -4 ? 'night' : 'day');
  }
  WA.setTheme = function (m) { WA.themeMode = m; WA.store.set('theme', m); autoTheme(); $('#theme-btn').textContent = m.toUpperCase(); };

  // ---------- late-arriving data from other modules ----------
  function loadScript(src, tries) {
    const s = document.createElement('script');
    s.src = src + (tries ? '?r=' + tries : ''); s.async = true;
    s.onload = () => { WA.emit('data', src); };
    s.onerror = () => { s.remove(); if (tries < 6) setTimeout(() => loadScript(src, tries + 1), 15000 * (tries + 1)); };
    document.head.appendChild(s);
  }

  // ---------- wake lock ----------
  WA.wakeLock = null;
  WA.toggleWake = async function (btn) {
    try {
      if (WA.wakeLock) { await WA.wakeLock.release(); WA.wakeLock = null; WA.wakeWanted = false; }
      else { WA.wakeLock = await navigator.wakeLock.request('screen'); WA.wakeWanted = true; WA.wakeLock.addEventListener('release', () => { WA.wakeLock = null; }); }
    } catch (e) { WA.toast('This browser will not keep the screen on.'); }
    if (btn) btn.setAttribute('aria-pressed', !!WA.wakeLock);
  };
  document.addEventListener('visibilitychange', async () => { if (!document.hidden && WA.wakeWanted && !WA.wakeLock) { try { WA.wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* */ } } });

  // ---------- save the corridor offline ----------
  WA.saveOffline = async function () {
    const prog = $('#save-prog');
    const say = (t) => { if (prog) prog.textContent = t; };
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { say('Offline saving needs the service worker; reload once and try again.'); return; }
    say('Finding tiles…');
    const vt = await WA.map.vectorTemplate();
    const r = WA.route, tiles = {};
    for (let z = 4; z <= 9; z++) {
      const n = Math.pow(2, z);
      for (let s = 0; s <= r.total; s += 20) {
        const c = G.along(r, s).pt;
        for (const off of [-120, -60, 0, 60, 120]) {
          const p = G.dest(c, G.courseAt(r, s) + 90, off);
          const x = Math.floor(((p[0] + 180) / 360) * n), la = p[1] * G.D2R;
          const y = Math.floor(((1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2) * n);
          tiles[z + '/' + x + '/' + y] = [z, x, y];
        }
      }
    }
    const urls = [];
    for (const k in tiles) {
      const [z, x, y] = tiles[k];
      if (vt) urls.push(vt.replace('{z}', z).replace('{x}', x).replace('{y}', y));
      urls.push(WA.map.DEM.replace('{z}', z).replace('{x}', x).replace('{y}', y));
    }
    let done = 0, fail = 0, i = 0;
    async function worker() { while (i < urls.length) { const u = urls[i++]; try { const res = await fetch(u, { mode: 'cors' }); if (!res.ok) fail++; } catch (e) { fail++; } done++; if (done % 10 === 0 || done === urls.length) say('Saved ' + done + ' / ' + urls.length + ' tiles' + (fail ? ' · ' + fail + ' failed' : '') + '.'); } }
    await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
    say('Route saved: ' + (done - fail) + ' tiles for zoom 4–9 along a 240 km corridor.' + (fail ? ' ' + fail + ' failed; try again on better wifi.' : ''));
  };

  // ---------- boot ----------
  function boot() {
    WA.setupLeg();
    WA.computePos();
    autoTheme();
    $('#theme-btn').textContent = WA.themeMode.toUpperCase();
    WA.ui.bind();
    WA.map.init();
    WA.ui.rebuildPois();
    WA.ui.computeLook();
    WA.ui.renderHud();
    document.querySelectorAll('#cam button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cam === WA.map.mode));

    WA.on('mapready', () => {
      WA.map.drawRoute(); WA.ui.allPoisMap(); WA.map.camera(WA.pos, true); WA.map.recolor();
      if (window.RelayFeed && RelayFeed.latest) WA.map.drawFlown(RelayFeed.latest.track);
      if (WA.live.fires.length) WA.live.fireRun(true);
      WA.ui.drawWx();
    });
    WA.on('leg', () => { WA.computePos(); WA.map.drawRoute(); WA.map.clearBillboards(); WA.ui.rebuildPois(); WA.map.mapFitDone = false; WA.map.camera(WA.pos, true); WA.live.fireRun(true); WA.live.weather(WA.pos, true); });
    WA.on('data', () => { WA.map.clearBillboards(); WA.ui.rebuildPois(); WA.ui.renderSheet(true); });
    WA.on('pois', () => { WA.ui.computeLook(); WA.ui.strip.build(); WA.ui.renderSheet(); });
    WA.on('wx', () => { WA.ui.drawWx(); WA.ui.strip.drawWx(); WA.ui.renderSheet(); WA.ui.renderHud(); });
    WA.on('tick', () => { WA.computePos(); frame(true); });

    loadScript('js/illustrations.js', 0);
    ['js/plates-sierra.js', 'js/plates-basin.js', 'js/plates-rockies.js'].forEach((f) => loadScript(f, 0));
    loadScript('data/pois.js', 0);
    loadScript('data/pois-extra.js', 0);

    if (window.RelayFeed) RelayFeed.start((snap) => { WA.map.drawFlown(snap.track); frame(true); });

    let n = 0;
    setInterval(() => { if (!document.hidden) frame(false, ++n); }, 1000);
    setTimeout(() => { WA.live.fireRun(); WA.live.weather(WA.pos); }, 2500);
    window.addEventListener('resize', () => { WA.ui.strip.build(); WA.map.camera(WA.pos, true); });
  }

  let lastLookAt = 0;
  function frame(force, n) {
    const pos = force ? WA.pos || WA.computePos() : WA.engineTick();
    if (!pos) return;
    if (force || Date.now() - lastLookAt > 2000) { WA.ui.computeLook(); lastLookAt = Date.now(); }
    WA.ui.renderHud();
    WA.ui.renderSheet();
    const m = WA.map;
    if (m.map && m.ready) {
      m.planeAt(pos);
      m.splitRoute(pos.s);
      const altM = (pos.alt || 0) / G.FT_PER_M;
      m.drawCone(pos, 3.57 * Math.sqrt(Math.max(1, altM)));
      m.camera(pos);
      if (!n || n % 3 === 0) m.updateBillboards(pos, WA.ui.list);
    }
    if (!n || n % 10 === 0) { autoTheme(); WA.live.weather(pos); WA.live.revgeo(pos); WA.live.groundElev(pos); }
    if (n && n % 600 === 0) WA.live.fireRun();
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
