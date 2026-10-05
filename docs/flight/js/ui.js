// Window Atlas: overlays, look-out engine, bottom sheet (look-out list, strip map, instruments, weather, fires, settings), detail view.
(function () {
  const G = WA.geo, S = WA.S, $ = (s, r) => (r || document).querySelector(s);
  const esc = (WA.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const U = (WA.ui = { tab: WA.store.get('tab', 'look'), filter: WA.store.get('filter', 'mine'), detail: null, list: [] });
  const fmtCache = {};
  function fmt(t, tz, opts) {
    const k = tz + JSON.stringify(opts || {});
    if (!fmtCache[k]) { try { fmtCache[k] = new Intl.DateTimeFormat('en-US', Object.assign({ hour: 'numeric', minute: '2-digit', timeZone: tz }, opts || {})); } catch (e) { fmtCache[k] = new Intl.DateTimeFormat('en-US', Object.assign({ hour: 'numeric', minute: '2-digit' }, opts || {})); } }
    return fmtCache[k].format(new Date(t * 1000));
  }
  const hm = (t, tz) => fmt(t, tz).replace(' AM', 'a').replace(' PM', 'p');
  const hmz = (t, tz) => fmt(t, tz, { timeZoneName: 'short' }).replace(' AM', 'a').replace(' PM', 'p');
  const n0 = (x) => (x == null || isNaN(x) ? '—' : Math.round(x).toLocaleString('en-US'));
  const minus = (s) => String(s).replace('-', '−');
  const dur = (sec) => { sec = Math.max(0, Math.round(sec / 60)); const h = Math.floor(sec / 60), m = sec % 60; return h ? h + ' h ' + String(m).padStart(2, '0') + ' min' : m + ' min'; };
  const CARD = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const card = (b) => CARD[Math.round(G.norm360(b) / 22.5) % 16];
  WA.windowBearing = (pos) => G.norm360((pos.trk || 0) + (S.side === 'left' ? -90 : 90));
  WA.toast = function (msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._k); t._k = setTimeout(() => t.classList.remove('on'), 3200); };
  const illo = (kind, cls, id) => { try { return window.illo ? window.illo(kind, { className: cls, id }) || '' : ''; } catch (e) { return ''; } };

  // ------------------------------------------------------------------ POIs
  let poiBase = [], poiLegId = null;
  U.rebuildPois = function () {
    const seen = {}, raw = [];
    for (const src of [window.POIS, window.POIS_EXTRA]) for (const p of Array.isArray(src) ? src : []) { if (p && p.id && !seen[p.id] && p.lat != null) { seen[p.id] = 1; raw.push(p); } }
    const leg = WA.leg.id;
    poiBase = raw.filter((p) => !p.legs || !p.legs.length || p.legs.indexOf(leg) >= 0).map((p) => Object.assign({}, p, geomFor(p)));
    // remove anything that is far outside the corridor
    poiBase = poiBase.filter((p) => Math.abs(p.cross) < 420 && p.s > -50);
    poiLegId = leg;
    U.allPoisMap();
    U.computeLook(true);
    U.strip.build();
  };
  function geomFor(p) {
    const r = WA.route;
    let best = G.project(r, [p.lon, p.lat]);
    if (Array.isArray(p.line) && p.line.length > 1) {
      for (const c of p.line) { const q = G.project(r, c); if (Math.abs(q.cross) < Math.abs(best.cross)) best = q; }
    }
    return { s: best.s, cross: best.cross };
  }
  U.pois = function () { return poiBase.concat((WA.live.fires || []).map((f) => Object.assign({}, f, geomFor(f)))); };
  U.byId = function (id) { return U.pois().find((p) => p.id === id); };
  const sideOf = (p) => (p.cross >= 0 ? 'right' : 'left');
  U.allPoisMap = function () {
    const feats = [], lines = [];
    for (const p of poiBase) {
      const mine = sideOf(p) === S.side;
      feats.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: p.id, name: p.name, p: p.priority || 3, mine, glyph: WA.map.glyphOf(p.kind) } });
      if (Array.isArray(p.line) && p.line.length > 1) lines.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: p.line }, properties: { id: p.id, kind: p.kind, mine } });
    }
    WA.map.setData('pois', { type: 'FeatureCollection', features: feats });
    WA.map.setData('poilines', { type: 'FeatureCollection', features: lines });
  };

  // ------------------------------------------------------------------ look-out math
  function tEff(pos) { return pos.src === 'EST' ? pos.t + (S.offset || 0) : pos.t; }
  U.computeLook = function () {
    const pos = WA.pos; if (!pos) return;
    const here = [pos.lon, pos.lat], hKm = Math.max(0.3, (pos.alt || 0) / 3281);
    const horizon = 3.57 * Math.sqrt(Math.max(1, (pos.alt || 0) / G.FT_PER_M));
    const live = pos.src === 'RELAY' || pos.src === 'ADS-B' || pos.src === 'GPS';
    const gsKms = Math.max(0.05, ((pos.gs > 150 ? pos.gs : WA.leg.filedSpeedKt) * G.KM_PER_NM) / 3600);
    const te = tEff(pos);
    U.list = U.pois().map((p) => {
      const d = p.s - pos.s, side = sideOf(p), ab = Math.abs(p.cross);
      let eta = live ? d / gsKms : WA.timeForS(Math.max(0, p.s)) - te;
      if (pos.ground && pos.s < 30) eta = WA.timeForS(Math.max(0, p.s)) - te;
      const rel = G.norm360(G.bearing(here, [p.lon, p.lat]) - (pos.trk || 0));
      const clock = Math.round(rel / 30) % 12 || 12;
      const elevKm = ((p.elevFt || 0) / 3281) * 0.5;
      const dep = Math.atan2(Math.max(0.2, hKm - elevKm), Math.max(1, ab)) * G.R2D;
      const angle = dep > 15 ? 'low' : dep > 5 ? 'mid' : 'on the horizon';
      const passed = d < -Math.max(25, ab * 0.6);
      const visible = ab < Math.min(horizon, 320) + (p.extentKm || 0) / 2;
      return Object.assign(p, { d, side, mine: side === S.side, eta, clock, angle, passed, visible, distNow: G.hav(here, [p.lon, p.lat]), abKm: ab });
    }).sort((a, b) => a.s - b.s);
    // next on your side
    const up = U.list.filter((p) => !p.passed && p.mine && p.visible);
    U.next = up.filter((p) => p.eta > -120 && (p.priority || 3) <= 2)[0] || up.filter((p) => p.eta > -120)[0] || null;
    U.horizon = horizon;
  };
  function lookPhrase(p) {
    const when = p.eta < 60 && p.eta > -90 ? 'now' : p.eta < 0 ? 'abeam ' + dur(-p.eta) + ' ago' : 'in ' + dur(p.eta);
    return when + ' · ' + p.clock + " o'clock " + p.angle + ' · ' + n0(p.distNow / G.KM_PER_MI) + ' mi';
  }

  // ------------------------------------------------------------------ overlays
  U.renderHud = function () {
    const pos = WA.pos; if (!pos) return;
    const T = WA.times(), from = WA.from, to = WA.to;
    $('#hud-leg').innerHTML = esc(from.iata) + ' <span class="arrow">→</span> ' + esc(to.iata);
    $('#hud-phase').textContent = pos.phase || '';
    $('#hud-dep').textContent = hm(T.takeoff, from.tz);
    $('#hud-arr').textContent = hm(pos.eta || T.landing, to.tz);
    const f = Math.max(0, Math.min(1, pos.frac || 0));
    $('#prog-fill').style.width = (f * 100).toFixed(1) + '%';
    $('#prog-plane').style.left = (f * 100).toFixed(1) + '%';
    // source tag
    const tag = $('#src-tag');
    tag.textContent = pos.src === 'EST' ? 'EST · ' + pos.srcDetail : pos.src === 'PREVIEW' ? 'PREVIEW · ' + Math.round(f * 100) + '%' : pos.src === 'RELAY' ? 'RELAY · ADS-B ' + pos.srcDetail : pos.src + ' · ' + pos.srcDetail;
    tag.dataset.src = pos.src;
    // instruments
    $('#r-alt').textContent = n0(pos.alt);
    $('#r-alt-tr').textContent = pos.vr > 300 ? '↑' : pos.vr < -300 ? '↓' : '';
    $('#r-gs').textContent = n0(pos.gs);
    $('#r-mph').textContent = pos.gs == null ? '—' : n0(pos.gs * 1.15078);
    $('#r-trk').textContent = String(Math.round(G.norm360(pos.trk || 0))).padStart(3, '0') + '°';
    $('#r-oat').textContent = minus(Math.round(oat(pos)));
    // look-out line
    const n = U.next, lo = $('#lookout');
    if (n) {
      lo.querySelector('.lo-when').textContent = lookPhrase(n);
      lo.querySelector('.lo-name').textContent = n.name;
      lo.querySelector('.lo-tag').textContent = n.tagline || '';
    } else {
      lo.querySelector('.lo-when').textContent = pos.ground ? (pos.s < 50 ? 'on the ground at ' + WA.from.iata : 'arrived') : 'nothing charted ahead on your side';
      lo.querySelector('.lo-name').textContent = WA.live.place && WA.live.place.state ? 'Over ' + WA.live.place.state : (POI_COUNT() ? 'Open sky' : 'Charting features…');
      lo.querySelector('.lo-tag').textContent = '';
    }
    const pl = WA.live.place;
    $('#below').textContent = pl ? 'Below: ' + [pl.county, pl.state].filter(Boolean).join(', ') : 'Below: ' + G.stateAt(pos.lon, pos.lat);
    const wx = WA.live.wx;
    $('#wxline').textContent = wx ? WA.live.verdictText[wx.cls] + (wx.ws != null ? ' · jet ' + Math.round(wx.ws) + ' kt ' + card(wx.wd) : '') : '';
    // preview bar
    const pv = $('#pvbar');
    pv.hidden = !S.preview;
    if (S.preview) { $('#pv-range').value = Math.round(S.preview.frac * 1000); $('#pv-time').textContent = hmz(pos.t, G.TZ_IANA[G.tzAt(pos.lon)]); $('#pv-60').setAttribute('aria-pressed', S.preview.playing === 60); $('#pv-240').setAttribute('aria-pressed', S.preview.playing === 240); }
    $('#follow').hidden = !WA.map.map || WA.map.mode === 'map'; $('#follow').setAttribute('aria-pressed', !!WA.map.follow);
  };
  const POI_COUNT = () => poiBase.length;
  function oat(pos) { return pos.oat != null ? pos.oat : 15 - 1.98 * ((pos.alt || 0) / 1000); }

  // ------------------------------------------------------------------ sheet
  U.openSheet = function (tab) {
    if (tab) U.setTab(tab);
    document.body.classList.add('sheet-open');
    $('#sheet').setAttribute('aria-hidden', 'false');
    U.renderSheet(true);
  };
  U.closeSheet = function () { document.body.classList.remove('sheet-open', 'sheet-full'); $('#sheet').setAttribute('aria-hidden', 'true'); U.detail = null; };
  U.setTab = function (t) {
    U.tab = t; U.detail = null; WA.store.set('tab', t);
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === t));
    document.querySelectorAll('.panel').forEach((p) => (p.hidden = p.id !== 'p-' + t));
    $('#p-detail').hidden = true;
    $('#sheet-body').scrollTop = 0;
    U.renderSheet(true);
    if (t === 'strip') U.strip.scroll(true);
  };
  U.renderSheet = function (force) {
    if (!document.body.classList.contains('sheet-open')) return;
    if (U.detail) return renderDetailLive();
    const t = U.tab;
    if (t === 'look') renderLook();
    else if (t === 'strip') U.strip.tick();
    else if (t === 'inst') renderInst();
    else if (t === 'wx') renderWx();
    else if (t === 'fires') renderFires();
    else if (t === 'set' && force) renderSettings();
    else if (t === 'set') renderSettingsLive();
  };

  // ----- look-out list
  function renderLook() {
    const pos = WA.pos, el = $('#look-list');
    const items = U.list.filter((p) => p.visible && (U.filter === 'both' || p.mine));
    const ahead = items.filter((p) => !p.passed), behind = items.filter((p) => p.passed).reverse();
    document.querySelectorAll('#look-filter button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === U.filter));
    if (!POI_COUNT() && !(WA.live.fires || []).length) { el.innerHTML = '<p class="quiet">The feature gazetteer is still being engraved. It will appear here as soon as it arrives.</p>'; return; }
    const row = (p) => '<li><button class="lk' + (p.mine ? ' mine' : '') + (p.kind === 'fire' ? ' fire' : '') + '" data-id="' + esc(p.id) + '">' +
      '<span class="lk-eta">' + (p.passed ? hm(pos.wall + p.eta, G.TZ_IANA[G.tzAt(p.lon)]) : p.eta < -60 ? dur(-p.eta) + ' ago' : p.eta < 60 ? 'now' : dur(p.eta)) + '</span>' +
      '<span class="lk-main"><span class="lk-name">' + (p.priority === 1 ? '<span class="p1" title="Priority">✦</span>' : '') + esc(p.name) + '</span>' +
      '<span class="lk-meta">' + esc(p.side === 'right' ? 'Right' : 'Left') + ' · ' + p.clock + " o'clock " + p.angle + ' · ' + n0(p.abKm / G.KM_PER_MI) + ' mi off · ' + esc(p.kind) + '</span>' +
      (p.tagline ? '<span class="lk-tag">' + esc(p.tagline) + '</span>' : '') + '</span></button></li>';
    el.innerHTML = '<ol class="lk-list">' + (ahead.map(row).join('') || '<li class="quiet">Nothing else charted ahead on this side.</li>') + '</ol>' +
      (behind.length ? '<details class="behind"><summary>Behind us · ' + behind.length + '</summary><ol class="lk-list">' + behind.map(row).join('') + '</ol></details>' : '');
  }

  // ----- detail
  U.openDetail = function (id) {
    const p = U.list.find((x) => x.id === id) || U.byId(id); if (!p) return;
    U.detail = id;
    if (!document.body.classList.contains('sheet-open')) { document.body.classList.add('sheet-open'); $('#sheet').setAttribute('aria-hidden', 'false'); }
    document.querySelectorAll('.panel').forEach((x) => (x.hidden = true));
    const el = $('#p-detail'); el.hidden = false;
    const elev = p.elevFt ? n0(p.elevFt) + ' ft' : '';
    const fig = illo(p.kind, 'd-illo', p.id);
    el.innerHTML = '<div class="d-top"><button class="txtbtn" id="d-back">← ' + esc(tabName(U.tab)) + '</button><span class="d-kind">' + esc(p.kind) + (p.era ? ' · ' + esc(p.era) : '') + '</span></div>' +
      '<figure class="d-fig">' + (fig || '<div class="d-noillo"></div>') + plateAnnot(p, elev) + '</figure>' +
      '<p class="d-plate">' + esc(plateCaption(p)) + '</p>' +
      '<h2 class="d-name">' + esc(p.name) + '</h2>' + (p.tagline ? '<p class="d-tagline">' + esc(p.tagline) + '</p>' : '') +
      '<p class="d-live" id="d-live"></p>' +
      (p.lookFor ? '<h3 class="sc">What to look for</h3><p>' + esc(p.lookFor) + '</p>' : '') +
      (p.blurb ? '<p>' + esc(p.blurb) + '</p>' : '') +
      (p.history ? '<h3 class="sc">History</h3><p>' + esc(p.history) + '</p>' : '') +
      (Array.isArray(p.nearby) && p.nearby.length ? '<h3 class="sc">Nearby</h3><ul class="d-near">' + p.nearby.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      (p.fact ? '<p class="d-fact"><span class="sc">Fact</span> ' + esc(p.fact) + '</p>' : '') +
      (p.kind === 'fire' ? '<p class="d-fact">' + (p.acres != null ? n0(p.acres) + ' acres · ' : '') + (p.contained != null ? p.contained + '% contained · ' : '') + (p.discovered ? 'discovered ' + new Date(p.discovered).toLocaleDateString() : '') + '</p>' : '') +
      '<div class="d-actions"><button class="btn" id="d-show">Show on map</button><button class="btn" id="d-plane">Back to plane</button></div>';
    $('#d-back').onclick = () => { U.detail = null; U.setTab(U.tab); };
    $('#d-show').onclick = () => { document.body.classList.remove('sheet-full'); U.closeSheet(); WA.map.flyTo(p.lon, p.lat); };
    $('#d-plane').onclick = () => { U.closeSheet(); WA.map.follow = true; WA.map.camera(WA.pos, true); WA.emit('follow'); };
    renderDetailLive();
    drawLeader(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLeader);
    $('#sheet-body').scrollTop = 0;
  };
  // ----- detail plate: King-survey annotation (hairline leader, italic name, small-caps elevation)
  const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  const roman = (n) => { let o = ''; for (const [v, r] of ROMAN) while (n >= v) { o += r; n -= v; } return o; };
  const DIR8 = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  function plateCaption(p) {
    const all = (window.POIS || []).concat(window.POIS_EXTRA || []);
    const i = all.findIndex((x) => x.id === p.id);
    const trk = (WA.pos && WA.pos.trk) || 0, from = G.norm360(trk + (p.side === 'left' ? 90 : -90));
    return 'Plate ' + (i >= 0 ? roman(i + 1) : '—') + ' · ' + p.name + (p.kind === 'crossing' ? '' : ', from the ' + DIR8[Math.round(from / 45) % 8]);
  }
  function plateAnnot(p, elev) {
    let a = [.5, .3]; try { const I = window.ILLUSTRATIONS; if (I && I.anchor) a = I.anchor(p.kind, { id: window.hasBespoke && window.hasBespoke(p.id) ? null : p.id }); } catch (e) { /* default */ }
    // the illustration sits at inset 8% 6% 4% of a 5:3 figure, the annotation layer is 100 x 60
    const ax = 6 + 88 * a[0], ay = 0.6 * (8 + 88 * a[1]), left = a[0] > 0.42;
    const tx = left ? 4.5 : 95.5, anc = left ? 'start' : 'end';
    return '<svg class="d-annot" viewBox="0 0 100 60" aria-hidden="true" data-ax="' + ax.toFixed(2) + '" data-ay="' + ay.toFixed(2) + '" data-side="' + (left ? 'l' : 'r') + '">' +
      '<text class="d-t1" x="' + tx + '" y="7.6" text-anchor="' + anc + '">' + esc(p.name) + '</text>' +
      (elev ? '<text class="d-t2" x="' + tx + '" y="11.4" text-anchor="' + anc + '">elev. ' + esc(elev) + '</text>' : '') +
      '<path class="d-lead" d=""/><circle class="d-dot" cx="' + ax.toFixed(2) + '" cy="' + ay.toFixed(2) + '" r=".55"/></svg>';
  }
  // after layout: underline the label and run the leader from its end to the subject
  function drawLeader() {
    const sv = document.querySelector('#p-detail .d-annot'); if (!sv) return;
    const t1 = sv.querySelector('.d-t1'), t2 = sv.querySelector('.d-t2'), lead = sv.querySelector('.d-lead');
    let w = 20; try { w = Math.max(t1.getComputedTextLength(), t2 ? t2.getComputedTextLength() : 0); } catch (e) { /* hidden */ }
    if (!w) return;
    const ax = +sv.dataset.ax, ay = +sv.dataset.ay, L = sv.dataset.side === 'l', y = t2 ? 13.2 : 9.4;
    const x0 = L ? 4.5 : 95.5, x1 = L ? x0 + w + 1.2 : x0 - w - 1.2;
    const dx = ax - x1, dy = ay - y, d = Math.hypot(dx, dy) || 1, ex = ax - dx / d * 1.3, ey = ay - dy / d * 1.3;
    lead.setAttribute('d', 'M' + x0 + ' ' + y + 'H' + x1.toFixed(2) + 'L' + ex.toFixed(2) + ' ' + ey.toFixed(2));
  }
  function renderDetailLive() {
    const p = U.list.find((x) => x.id === U.detail), el = $('#d-live'); if (!p || !el) return;
    el.textContent = (p.mine ? 'Your side' : 'Other side') + ' · ' + (p.passed ? 'passed ' + dur(-p.eta) + ' ago' : lookPhrase(p)) + ' · ' + n0(p.abKm / G.KM_PER_MI) + ' mi from the route';
  }
  const tabName = (t) => ({ look: 'Look out', strip: 'Strip map', inst: 'Instruments', wx: 'Weather', fires: 'Fires', set: 'Settings' }[t] || 'Back');

  // ----- instruments
  function renderInst() {
    const pos = WA.pos, el = $('#inst'); if (!pos) return;
    const T = WA.times(), L = WA.live, now = pos.wall;
    const altM = (pos.alt || 0) / G.FT_PER_M, gr = L.ground, agl = gr != null ? altM - gr : null;
    const horizon = 3.57 * Math.sqrt(Math.max(1, altM));
    const sun = G.sun(new Date(now * 1000), pos.lat, pos.lon), wb = WA.windowBearing(pos);
    const sunRel = G.norm180(sun.az - wb), glare = sun.elev > -2 && Math.abs(sunRel) < 80;
    const tas = pos.tas || (pos.gs ? pos.gs : null);
    const tK = oat(pos) + 273.15, a = 38.967854 * Math.sqrt(tK);
    const mach = pos.mach || (tas ? tas / a : null);
    const tzHere = G.TZ_IANA[G.tzAt(pos.lon)];
    const row = (k, v, sub) => '<div class="ir"><span class="ik sc">' + k + '</span><span class="iv">' + v + (sub ? '<span class="isub">' + sub + '</span>' : '') + '</span></div>';
    const vr = pos.vr != null ? (pos.vr > 0 ? '+' : '') + n0(pos.vr) + ' fpm' : '';
    const flownMi = pos.s / G.KM_PER_MI, togoMi = pos.togoKm / G.KM_PER_MI;
    let html = '<div class="ribbon" aria-label="Track ' + Math.round(pos.trk) + ' degrees"><div class="rb-in" id="rb-in" style="transform:translateX(' + (-(G.norm360(pos.trk) + 180) * 4) + 'px)">' + ribbonSVG() + '</div><span class="rb-mark"></span></div>';
    html += row('Altitude', n0(pos.alt) + ' ft', n0(altM) + ' m' + (vr ? ' · ' + minus(vr) : '') + ' · ' + esc(pos.phase || ''));
    html += row('Ground speed', n0(pos.gs) + ' kt', n0((pos.gs || 0) * 1.15078) + ' mph');
    html += row('Track', String(Math.round(G.norm360(pos.trk))).padStart(3, '0') + '° ' + card(pos.trk), 'your window faces ' + card(wb) + ' ' + String(Math.round(wb)).padStart(3, '0') + '°');
    html += row('Outside air', minus(Math.round(oat(pos))) + ' °C', minus(Math.round(oat(pos) * 9 / 5 + 32)) + ' °F' + (pos.oat == null ? ' · ISA estimate' : ''));
    html += row('Mach', mach ? mach.toFixed(2) : '—', pos.mach ? 'from the aircraft' : 'approx. from speed and temperature');
    html += row('Distance', n0(flownMi) + ' mi flown', n0(togoMi) + ' mi to go · ' + Math.round((pos.frac || 0) * 100) + '%');
    html += row('ETA ' + esc(WA.to.iata), hmz(pos.eta, WA.to.tz), dur(pos.eta - now) + ' remaining · times from ' + esc(T.tag));
    html += row('Local time below', hmz(now, tzHere), esc(G.tzAt(pos.lon)) + ' time');
    html += row('Ground below', gr != null ? n0(gr * G.FT_PER_M) + ' ft' : '—', agl != null ? n0(agl * G.FT_PER_M) + ' ft above the terrain' : 'terrain tile loading');
    html += row('Horizon', n0(horizon / G.KM_PER_MI) + ' mi', n0(horizon) + ' km in clear air');
    html += row('Sun', 'az ' + Math.round(sun.az) + '° · el ' + minus(sun.elev.toFixed(0)) + '°', sun.elev < -0.8 ? 'below the horizon' : glare ? 'on your side: expect glare, try the shade' : 'on the other side of the aircraft');
    if (L.place) html += row('Below you', esc([L.place.locality, L.place.county, L.place.state].filter(Boolean).join(', ')), '');
    if (pos.reg || pos.type) html += row('Aircraft', esc([pos.reg, pos.type].filter(Boolean).join(' · ')), pos.sq ? 'squawk ' + esc(pos.sq) : '');
    if (pos.ws != null) { const hw = pos.ws * Math.cos((pos.wd - pos.trk) * G.D2R); html += row('Wind', Math.round(pos.ws) + ' kt from ' + card(pos.wd), Math.abs(Math.round(hw)) + ' kt ' + (hw >= 0 ? 'headwind' : 'tailwind')); }
    html += row('Source', esc(pos.src) + (pos.srcDetail ? ' · ' + esc(pos.srcDetail) : ''), pos.src === 'EST' ? 'dead reckoning from the schedule; sync in Settings if it drifts' : '');
    const plane = window.ILLUSTRATIONS && ILLUSTRATIONS.plane;
    if (plane) html += '<figure class="inst-plane">' + plane + '<figcaption class="sc">Boeing 737-800 · your seat: rear, ' + esc(S.side) + ' side</figcaption></figure>';
    el.innerHTML = html;
  }
  let ribbonCache = '';
  function ribbonSVG() {
    if (ribbonCache) return ribbonCache;
    let s = '<svg width="2880" height="34" viewBox="0 0 2880 34" aria-hidden="true">';
    for (let d = -180; d <= 540; d += 5) {
      const x = (d + 180) * 4, deg = G.norm360(d);
      const big = deg % 30 === 0;
      s += '<line x1="' + x + '" x2="' + x + '" y1="' + (big ? 18 : 24) + '" y2="34" />';
      if (big) s += '<text x="' + x + '" y="13">' + ({ 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg] || String(deg).padStart(3, '0')) + '</text>';
    }
    return (ribbonCache = s + '</svg>');
  }

  // ----- weather
  function renderWx() {
    const L = WA.live, el = $('#wx'), pos = WA.pos;
    if (!L.wx) { el.innerHTML = '<p class="quiet">Asking Open-Meteo about the sky below and ahead…</p>'; return; }
    const w = L.wx, hw = w.ws != null && pos ? w.ws * Math.cos((w.wd - pos.trk) * G.D2R) : null;
    let html = '<p class="wx-verdict">' + esc(L.verdictText[w.cls]) + '</p>';
    html += '<p class="wx-sub">Cloud low ' + n0(w.lo) + '% · mid ' + n0(w.mid) + '% · high ' + n0(w.hi) + '%' + (w.vis != null ? ' · visibility ' + n0(w.vis / 1609) + ' mi' : '') + '</p>';
    if (w.ws != null) html += '<p class="wx-line"><span class="sc">Jet stream · ' + w.lvl + ' hPa</span><br>' + Math.round(w.ws) + ' kt from ' + card(w.wd) + (hw != null ? ', ' + Math.abs(Math.round(hw)) + ' kt ' + (hw >= 0 ? 'headwind' : 'tailwind') : '') + (w.temp != null ? ' · ' + minus(Math.round(w.temp)) + ' °C aloft' : '') + '</p>';
    html += '<p class="wx-line"><span class="sc">Ahead</span><br>' + esc(aheadSummary()) + '</p>';
    html += '<ol class="wx-seg">' + L.wxAhead.map((a) => '<li data-cls="' + a.cls + '"><span class="wx-dot"></span><span>' + n0(Math.max(0, a.s - (pos ? pos.s : 0)) / G.KM_PER_MI) + ' mi · ' + esc(G.stateAt(a.lon, a.lat)) + '</span><span class="wx-c">' + esc(L.verdictText[a.cls].replace('Ground view: ', '')) + '</span></li>').join('') + '</ol>';
    if (L.smf) { const d = L.smf; html += '<p class="wx-line"><span class="sc">At ' + esc(WA.to.iata) + ' · ' + esc(WA.to.city) + '</span><br>' + Math.round(d.temperature_2m) + ' °F, ' + esc(L.wmo(d.weather_code)) + ', wind ' + Math.round(d.wind_speed_10m) + ' kt from ' + card(d.wind_direction_10m) + '</p>'; }
    html += '<p class="quiet small">Model analysis from Open-Meteo; updated every 10 min or 100 km.</p>';
    el.innerHTML = html;
  }
  function aheadSummary() {
    const a = WA.live.wxAhead.slice(1); if (!a.length) return 'Destination ahead.';
    const groups = [];
    for (const x of a) { const st = G.stateAt(x.lon, x.lat), good = x.cls === 'clear'; const g = groups[groups.length - 1]; if (g && g.good === good) { if (g.states.indexOf(st) < 0) g.states.push(st); } else groups.push({ good, states: [st] }); }
    return groups.slice(0, 3).map((g) => (g.good ? 'clear views' : 'cloud') + ' over ' + g.states.join(' and ')).join(', then ').replace(/^./, (c) => c.toUpperCase()) + '.';
  }
  U.aheadSummary = aheadSummary;
  U.drawWx = function () {
    const a = WA.live.wxAhead; if (!a.length) return;
    const feats = [];
    for (let i = 0; i < a.length; i++) {
      const s0 = Math.max(0, a[i].s - 75), s1 = Math.min(WA.route.total, a[i].s + 75), c = [];
      for (let s = s0; s <= s1; s += 15) c.push(G.along(WA.route, s).pt);
      if (c.length > 1) feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: c }, properties: { cls: a[i].cls === 'clear' ? 'clear' : 'cloud' } });
    }
    WA.map.setData('wx', { type: 'FeatureCollection', features: feats });
  };

  // ----- fires
  function renderFires() {
    const el = $('#fires'), f = U.list.filter((p) => p.kind === 'fire');
    if (!WA.live.fires.length) { el.innerHTML = '<p class="quiet">No current NIFC incidents within 200 km of the route' + (navigator.onLine === false ? ' (offline)' : '') + '.</p>'; return; }
    el.innerHTML = '<ol class="lk-list">' + f.map((p) => '<li><button class="lk fire' + (p.mine ? ' mine' : '') + '" data-id="' + esc(p.id) + '"><span class="lk-eta">' + (p.passed ? 'passed' : dur(p.eta)) + '</span><span class="lk-main"><span class="lk-name">' + esc(p.name) + '</span><span class="lk-meta">' + esc(p.tagline) + '</span><span class="lk-tag">' + (p.side === 'right' ? 'Right' : 'Left') + ' side · ' + n0(p.abKm / G.KM_PER_MI) + ' mi from route' + (p.discovered ? ' · since ' + new Date(p.discovered).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '') + '</span></span></button></li>').join('') + '</ol><p class="quiet small">NIFC WFIGS current incidents and perimeters. Prescribed burns are marked as such.</p>';
  }

  // ----- settings
  function seg(name, opts, cur) { return '<div class="seg" role="group" aria-label="' + name + '">' + opts.map(([v, l]) => '<button data-set="' + name + '" data-v="' + v + '" aria-pressed="' + (String(cur) === String(v)) + '">' + l + '</button>').join('') + '</div>'; }
  function renderSettings() {
    const el = $('#set'), legs = Object.keys(window.FLIGHT_DATA.legs);
    el.innerHTML =
      '<h3 class="sc">Leg</h3>' + seg('leg', [['auto', 'Auto']].concat(legs.map((l) => [l, l.replace('-', ' → ')])), S.legMode) +
      '<h3 class="sc">Window</h3>' + seg('side', [['left', 'Left'], ['right', 'Right']], S.side) +
      '<h3 class="sc">Theme</h3>' + seg('theme', [['auto', 'Auto'], ['day', 'Day'], ['night', 'Night']], WA.themeMode) +
      '<h3 class="sc">Basemap</h3>' + seg('basemap', [['relief', 'Relief'], ['topo', 'USGS Topo'], ['sat', 'Satellite'], ['chart', 'Classic']], WA.map.basemap) + ' ' + seg('relief', [['2', 'Relief ×2'], ['4', 'Relief ×4']], WA.map.relief3 ? '4' : '2') +
      '<h3 class="sc">Terrain style</h3>' + seg('reliefstyle', WA.map.reliefStyles(), WA.map.reliefStyle) +
      '<h3 class="sc">Position</h3><p class="quiet small" id="set-src"></p>' +
      '<div class="btnrow"><button class="btn" id="b-gps">' + (S.gpsOn ? 'Stop GPS' : 'Use GPS') + '</button><button class="btn" id="b-sync">Sync position</button></div>' +
      '<div class="btnrow"><button class="btn" data-nudge="-5">−5 min</button><button class="btn" data-nudge="5">+5 min</button><button class="btn" data-nudge="0">Reset offset</button></div>' +
      '<h3 class="sc">Preview</h3><div class="btnrow"><button class="btn" id="b-prev">' + (S.preview ? 'Back to live' : 'Preview the flight') + '</button></div>' +
      '<h3 class="sc">Device</h3><div class="btnrow"><button class="btn" id="b-wake" aria-pressed="' + !!WA.wakeLock + '">Keep screen on</button><button class="btn" id="b-save">Save route offline</button></div><p class="quiet small" id="save-prog"></p>' +
      '<h3 class="sc">Credits</h3><p class="small credits">Map data: OpenFreeMap © OpenMapTiles © OpenStreetMap contributors. Terrain: AWS / Mapzen Terrain Tiles. Relief: Esri World Hillshade (Esri, USGS, NASA). Topo: USGS The National Map. Imagery: Esri, Maxar, Earthstar Geographics. Rivers: Natural Earth. Weather: Open-Meteo. Fires: NIFC WFIGS. Place names: BigDataCloud. Live position: adsb.lol, adsb.fi, FlightAware via relay. Type: IM Fell DW Pica (Igino Marini), B612 (Airbus / Intactile). In the spirit of Clarence King’s Geological Exploration of the Fortieth Parallel, 1867–72.</p>';
    renderSettingsLive();
  }
  function renderSettingsLive() {
    const e = $('#set-src'); if (!e || !WA.pos) return;
    const p = WA.pos, off = S.offset || 0;
    e.textContent = 'Now: ' + p.src + (p.srcDetail ? ' · ' + p.srcDetail : '') + (Math.abs(off) > 30 ? ' · estimate offset ' + (off > 0 ? '+' : '−') + Math.round(Math.abs(off) / 60) + ' min' : '') + '. Relay updates every ~75 s; GPS often fails in flight, so sync by tapping where you see you are.';
  }

  // ------------------------------------------------------------------ strip map
  const strip = (U.strip = { k: 1.9, top: 56, lastUserScroll: 0 });
  strip.y = (s) => strip.top + s * strip.k;
  strip.build = function () {
    const el = $('#strip'); if (!el || !WA.route) return;
    const r = WA.route, W = Math.min(560, Math.max(300, el.clientWidth || 360)), cx = W / 2, H = strip.y(r.total) + 70;
    strip.W = W;
    const P = [], T = (x, y, cls, t, anchor) => P.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" class="' + cls + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + esc(t) + '</text>');
    P.push('<rect class="st-wxbg" x="0" y="0" width="' + W + '" height="' + H + '" />');
    P.push('<g id="st-wx"></g>');
    // column heads
    T(cx - 18, 22, 'st-head', 'LEFT WINDOW', 'end'); T(cx + 18, 22, 'st-head', 'RIGHT WINDOW', 'start');
    T(cx, 40, 'st-ap', WA.from.iata + ' · ' + WA.from.name, 'middle');
    // crossings
    for (const c of crossings()) {
      const y = strip.y(c.s);
      P.push('<line class="st-cross' + (c.major ? ' major' : '') + '" x1="6" x2="' + (W - 6) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" />');
      T(W - 8, y - 3, 'st-crosslab', c.label, 'end');
    }
    // spine + ticks
    P.push('<line class="st-spine" x1="' + cx + '" x2="' + cx + '" y1="' + strip.top + '" y2="' + strip.y(r.total) + '" />');
    const step = 100 * G.KM_PER_MI;
    for (let s = 0; s <= r.total; s += step / 2) {
      const y = strip.y(s), big = Math.round(s / step * 2) % 2 === 0;
      P.push('<line class="st-tick" x1="' + (cx - (big ? 9 : 5)) + '" x2="' + (cx + (big ? 9 : 5)) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" />');
      if (big && s > 0) P.push('<text class="st-mi" data-s="' + s.toFixed(1) + '" x="' + (cx + 12) + '" y="' + (y + 3).toFixed(1) + '">' + Math.round(s / G.KM_PER_MI) + ' mi</text>');
    }
    T(cx, strip.y(r.total) + 22, 'st-ap', WA.to.iata + ' · ' + WA.to.name, 'middle');
    // features
    const feats = U.pois().filter((p) => Math.abs(p.cross) < 260 && p.s >= 0 && p.s <= r.total).sort((a, b) => a.s - b.s);
    const last = { left: -1e9, right: -1e9 };
    const clip = (t, n) => (t.length > n ? t.slice(0, n - 1).trim() + '…' : t);
    for (const p of feats) {
      const side = sideOf(p), mine = side === S.side, sgn = side === 'right' ? 1 : -1;
      const big = p.priority === 1, want = strip.y(p.s), gap = big ? 50 : 32;
      if ((p.priority || 3) === 3 && want < last[side] + 24) continue; // thin out minor items
      const y = Math.max(want, last[side] + gap);
      last[side] = y;
      const xt = cx + sgn * 22, room = big ? cx - 80 : cx - 34;
      const chars = Math.max(12, Math.floor(room / 6.6));
      P.push('<g class="st-f' + (mine ? ' mine' : '') + (p.kind === 'fire' ? ' fire' : '') + '" data-id="' + esc(p.id) + '" tabindex="0" role="button" aria-label="' + esc(p.name) + '">');
      P.push('<path class="st-lead" d="M' + cx + ' ' + want.toFixed(1) + ' L' + (cx + sgn * 10) + ' ' + want.toFixed(1) + ' L' + (xt - sgn * 2).toFixed(1) + ' ' + y.toFixed(1) + '" />');
      P.push('<circle class="st-dot" cx="' + cx + '" cy="' + want.toFixed(1) + '" r="' + (big ? 3.4 : 2.4) + '" />');
      const anchor = sgn > 0 ? 'start' : 'end';
      T(xt, y + 4, 'st-name' + (big ? ' big' : ''), clip(p.name, chars), anchor);
      T(xt, y + 16, 'st-kind', clip(p.kind + (p.elevFt ? ' · ' + n0(p.elevFt) + ' ft' : '') + ' · ' + n0(Math.abs(p.cross) / G.KM_PER_MI) + ' mi off', chars + 8), anchor);
      if (big) {
        const svg = illo(p.kind, 'st-illo', p.id);
        if (svg) { const ix = sgn > 0 ? W - 50 : 6; P.push('<svg x="' + ix + '" y="' + (y - 20).toFixed(1) + '" width="44" height="44" class="st-illo-wrap">' + svg.replace(/^<svg/, '<svg width="44" height="44"') + '</svg>'); }
      }
      P.push('</g>');
    }
    P.push('<g id="st-plane"><line class="st-now" x1="0" x2="' + W + '" y1="0" y2="0" /><path class="st-pl" d="M0 9 L-6 -7 L0 -3 L6 -7 Z" transform="translate(' + cx + ',0)" /><text id="st-plane-t" class="st-nowt" x="6" y="-4"></text></g>');
    el.innerHTML = '<svg id="strip-svg" width="' + W + '" height="' + H.toFixed(0) + '" viewBox="0 0 ' + W + ' ' + H.toFixed(0) + '">' + P.join('') + '</svg>';
    strip.drawWx(); strip.tick(true);
  };
  strip.drawWx = function () {
    const g = $('#st-wx'); if (!g) return;
    g.innerHTML = WA.live.wxAhead.map((a) => '<rect class="st-wx ' + (a.cls === 'clear' ? 'clear' : 'cloud') + '" x="' + (strip.W / 2 - 4) + '" width="8" y="' + strip.y(Math.max(0, a.s - 75)).toFixed(1) + '" height="' + (150 * strip.k).toFixed(1) + '" />').join('');
  };
  strip.tick = function (force) {
    const pos = WA.pos, pl = $('#st-plane'); if (!pos || !pl) return;
    pl.setAttribute('transform', 'translate(0,' + strip.y(pos.s).toFixed(1) + ')');
    $('#st-plane-t').textContent = 'NOW · ' + hm(pos.wall, G.TZ_IANA[G.tzAt(pos.lon)]);
    // ETA labels on the mile ticks (update at most every 30 s)
    if (force || !strip.etaAt || Date.now() - strip.etaAt > 30000) {
      strip.etaAt = Date.now();
      const te = tEff(pos), live = pos.src === 'RELAY' || pos.src === 'ADS-B';
      document.querySelectorAll('#strip .st-mi').forEach((t) => {
        const s = +t.dataset.s, mi = Math.round(s / G.KM_PER_MI);
        if (s < pos.s) { t.textContent = mi + ' mi'; return; }
        const eta = live && pos.gs > 150 ? pos.wall + (s - pos.s) / (pos.gs * G.KM_PER_NM / 3600) : pos.wall + (WA.timeForS(s) - te);
        const pt = G.along(WA.route, s).pt;
        t.textContent = mi + ' mi · ' + hm(eta, G.TZ_IANA[G.tzAt(pt[0])]);
      });
    }
    strip.scroll(force);
  };
  strip.scroll = function (force) {
    const body = $('#sheet-body');
    if (!body || U.tab !== 'strip' || U.detail || !WA.pos) return;
    if (!force && Date.now() - strip.lastUserScroll < 20000) return;
    const target = strip.y(WA.pos.s) - body.clientHeight * 0.35 + ($('#strip').offsetTop || 0);
    strip.auto = true; body.scrollTop = Math.max(0, target);
    setTimeout(() => (strip.auto = false), 100);
  };
  function crossings() {
    const r = WA.route, out = [];
    let pst = null, ptz = null, plon = null;
    for (let s = 0; s <= r.total; s += 2) {
      const pt = G.along(r, s).pt, st = G.stateAt(pt[0], pt[1]), tz = G.tzAt(pt[0]);
      if (pst && st !== pst) {
        const river = (pst === 'Illinois' && st === 'Iowa') || (pst === 'Iowa' && st === 'Illinois') ? ' · Mississippi River' : (pst === 'Iowa' && st === 'Nebraska') || (pst === 'Nebraska' && st === 'Iowa') ? ' · Missouri River' : '';
        out.push({ s, label: (pst + ' → ' + st).toUpperCase() + river.toUpperCase(), major: true });
      }
      if (ptz && tz !== ptz) out.push({ s, label: (ptz + ' → ' + tz + ' time').toUpperCase(), major: true });
      if (plon != null && (plon + 100) * (pt[0] + 100) < 0) out.push({ s, label: '100TH MERIDIAN', major: false });
      for (const [lon, nm] of [[-107.55, 'CONTINENTAL DIVIDE · EAST RIM, GREAT DIVIDE BASIN ≈'], [-108.95, 'CONTINENTAL DIVIDE · WEST RIM ≈']]) if (plon != null && (plon - lon) * (pt[0] - lon) < 0 && pt[1] > 40.6 && pt[1] < 42.4) out.push({ s, label: nm, major: false });
      pst = st; ptz = tz; plon = pt[0];
    }
    for (const p of poiBase) if ((p.kind === 'crossing' || p.kind === 'river') && Math.abs(p.cross) < 12) out.push({ s: p.s, label: p.name.toUpperCase(), major: false });
    out.sort((a, b) => a.s - b.s);
    return out.filter((c, i) => !i || c.s - out[i - 1].s > 6 || c.label !== out[i - 1].label);
  }

  // ------------------------------------------------------------------ wire up static controls
  U.bind = function () {
    $('#lookout').addEventListener('click', () => { if (document.body.classList.contains('sheet-open')) U.closeSheet(); else U.openSheet('look'); });
    $('#readouts').addEventListener('click', () => U.openSheet('inst'));
    $('#src-tag').addEventListener('click', () => U.openSheet('set'));
    $('#wxline').addEventListener('click', (e) => { e.stopPropagation(); U.openSheet('wx'); });
    $('#sheet-close').addEventListener('click', U.closeSheet);
    $('#sheet-grow').addEventListener('click', () => document.body.classList.toggle('sheet-full'));
    $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) U.setTab(b.dataset.tab); });
    $('#look-filter').addEventListener('click', (e) => { const b = e.target.closest('button[data-f]'); if (!b) return; U.filter = b.dataset.f; WA.store.set('filter', U.filter); renderLook(); });
    $('#sheet-body').addEventListener('click', (e) => {
      const lk = e.target.closest('[data-id]'); if (lk && !e.target.closest('#p-detail')) { U.openDetail(lk.dataset.id); return; }
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.set) return applySetting(b.dataset.set, b.dataset.v);
      if (b.dataset.nudge != null) { WA.nudge(+b.dataset.nudge); renderSettingsLive(); return; }
      if (b.id === 'b-gps') { WA.toggleGPS(); b.textContent = S.gpsOn ? 'Stop GPS' : 'Use GPS'; }
      if (b.id === 'b-sync') { S.syncPending = true; document.body.classList.add('syncing'); U.closeSheet(); if (WA.map.map) { WA.map.setMode('map'); } WA.toast('Tap the map where you see you are. It snaps to the route.'); }
      if (b.id === 'b-prev') { WA.setPreview(S.preview ? null : (WA.pos ? WA.pos.frac : 0)); renderSettings(); }
      if (b.id === 'b-wake') WA.toggleWake(b);
      if (b.id === 'b-save') WA.saveOffline();
    });
    $('#sheet-body').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('g[data-id]')) { e.preventDefault(); U.openDetail(e.target.dataset.id); } });
    $('#sheet-body').addEventListener('scroll', () => { if (!strip.auto) strip.lastUserScroll = Date.now(); }, { passive: true });
    $('#cam').addEventListener('click', (e) => { const b = e.target.closest('button[data-cam]'); if (b) WA.map.setMode(b.dataset.cam); });
    // Follow: single tap toggles on/off; double tap returns to the default follow view (and turns follow on).
    let followTap = null;
    $('#follow').addEventListener('click', () => {
      if (followTap) { clearTimeout(followTap); followTap = null; WA.map.resetView(); WA.toast('Default view'); return; }
      followTap = setTimeout(() => { followTap = null; WA.map.setFollow(!WA.map.follow); }, 300);
    });
    $('#theme-btn').addEventListener('click', () => { const m = { auto: 'day', day: 'night', night: 'auto' }[WA.themeMode]; WA.setTheme(m); });
    $('#pv-range').addEventListener('input', (e) => WA.setPreview(+e.target.value / 1000));
    $('#pv-60').addEventListener('click', () => WA.playPreview(60));
    $('#pv-240').addEventListener('click', () => WA.playPreview(240));
    $('#pv-live').addEventListener('click', () => WA.setPreview(null));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (S.syncPending) { S.syncPending = false; document.body.classList.remove('syncing'); } else U.closeSheet(); } });
    WA.on('follow', () => { $('#follow').hidden = !WA.map.map || WA.map.mode === 'map'; $('#follow').setAttribute('aria-pressed', !!WA.map.follow); document.querySelectorAll('#cam button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.cam === WA.map.mode)); });
  };
  function applySetting(k, v) {
    if (k === 'leg') WA.setLegMode(v);
    if (k === 'side') { S.side = v; WA.store.set('side', v); U.allPoisMap(); U.computeLook(); U.strip.build(); WA.map.camera(WA.pos, true); }
    if (k === 'theme') WA.setTheme(v);
    if (k === 'sat') WA.map.setSat(v === '1');
    if (k === 'basemap') WA.map.setBasemap(v);
    if (k === 'relief') WA.map.setRelief3(v === '4');
    if (k === 'reliefstyle') WA.map.setReliefStyle(v);
    renderSettings(); U.renderHud();
  }
})();
