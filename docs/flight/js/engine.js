// Window Atlas: position engine. Produces WA.pos (~1 Hz) from RELAY > ADS-B > GPS > ESTIMATE(+sync), PREVIEW overrides.
(function () {
  const G = WA.geo;
  const F = window.FLIGHT_DATA;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('wa.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('wa.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  WA.store = store;
  const qs = new URLSearchParams(location.search);
  WA.qs = qs;

  const nowS = () => Date.now() / 1000;
  function parseT(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v > 1e12 ? v / 1000 : v;
    const n = Number(v);
    if (!isNaN(n)) return n > 1e12 ? n / 1000 : n;
    const d = Date.parse(v);
    return isNaN(d) ? null : d / 1000;
  }
  WA.parseT = parseT;

  // ---- leg & schedule ----
  function pickEntry(legId, t) {
    const list = F.schedule.filter((s) => s.legId === legId).sort((a, b) => a.gateDep - b.gateDep);
    return list.find((s) => s.gateArr + 3600 > t) || list[list.length - 1];
  }
  function autoLeg(t) {
    const today = pickEntry('ORD-SMF', t);
    const first = F.schedule.filter((s) => s.legId === 'ORD-SMF').sort((a, b) => a.gateDep - b.gateDep)[0];
    // default: ORD-SMF today; SMF-ORD only once we're past ORD-SMF gateArr + 1 h
    if (t > first.gateArr + 3600) {
      const all = F.schedule.slice().sort((a, b) => a.gateDep - b.gateDep);
      const e = all.find((s) => s.gateArr + 3600 > t) || all[all.length - 1];
      return e.legId;
    }
    return today.legId;
  }

  const S = (WA.S = {
    legMode: qs.get('leg') || store.get('legMode', 'auto'), // 'auto' | legId
    side: qs.get('side') || store.get('side', (F.flight.seat && F.flight.seat.side) || 'right'),
    preview: qs.has('t') ? { frac: Math.max(0, Math.min(1, parseFloat(qs.get('t')) || 0)), playing: 0 } : null,
    gpsOn: false, gps: null, adsb: null, adsbFails: 0, adsbNext: 0,
    syncPending: false,
  });

  WA.leg = null; WA.route = null; WA.entry = null;
  function setupLeg() {
    const t = nowS();
    const id = S.legMode === 'auto' || !F.legs[S.legMode] ? autoLeg(t) : S.legMode;
    if (WA.leg && WA.leg.id === id) return false;
    WA.leg = F.legs[id];
    WA.route = G.buildRoute(WA.leg.waypoints);
    WA.entry = pickEntry(id, t);
    WA.from = F.airports[WA.leg.from]; WA.to = F.airports[WA.leg.to];
    S.offset = store.get('offset.' + id + '.' + WA.entry.date, 0);
    return true;
  }
  WA.setupLeg = setupLeg;
  WA.setLegMode = function (m) { S.legMode = m; store.set('legMode', m); if (setupLeg()) WA.emit('leg'); };

  // takeoff / landing, corrected by the relay's FlightAware times
  function times() {
    const e = WA.entry;
    let to = e.takeoff, ld = e.landing, gd = e.gateDep, ga = e.gateArr, tag = 'schedule';
    const fa = window.RelayFeed && RelayFeed.latest && RelayFeed.latest.fa;
    if (fa && (!fa.from || fa.from.indexOf(WA.leg.from) >= 0 || fa.from === WA.from.icao)) {
      const pick = (o) => o && (parseT(o.actual) || parseT(o.estimated));
      const ft = pick(fa.takeoff), fl = pick(fa.landing);
      // only trust if near this schedule entry (same day)
      if (ft && Math.abs(ft - e.takeoff) < 6 * 3600) { const dur = ld - to; to = ft; ld = fl && Math.abs(fl - e.landing) < 6 * 3600 ? fl : to + dur; tag = 'FlightAware'; }
      const gdep = pick(fa.gateDep), garr = pick(fa.gateArr);
      if (gdep && Math.abs(gdep - e.gateDep) < 6 * 3600) gd = gdep;
      if (garr && Math.abs(garr - e.gateArr) < 6 * 3600) ga = garr;
      if (fa.takeoff && parseT(fa.takeoff.actual)) tag = 'FlightAware actual';
    }
    return { takeoff: to, landing: ld, gateDep: gd, gateArr: Math.max(ga, ld), tag };
  }
  WA.times = times;

  // ---- dead-reckoning profile ----
  const CLIMB = 20 * 60, DESC = 25 * 60;
  function profile() {
    const T = times(), D = Math.max(1800, T.landing - T.takeoff), total = WA.route.total;
    const cruise = Math.max(60, D - CLIMB - DESC);
    const v = total / (0.65 * CLIMB + cruise + 0.7 * DESC); // km/s
    return { T, D, cruise, v, total };
  }
  function distAt(P, dt) { // dt seconds since takeoff
    const { v, cruise } = P;
    if (dt <= 0) return 0;
    if (dt < CLIMB) return v * (0.3 * dt + 0.35 * dt * dt / CLIMB);
    const s1 = 0.65 * v * CLIMB;
    if (dt < CLIMB + cruise) return s1 + v * (dt - CLIMB);
    const tau = Math.min(DESC, dt - CLIMB - cruise);
    return Math.min(P.total, s1 + v * cruise + v * (tau - 0.3 * tau * tau / DESC));
  }
  function speedAt(P, dt) {
    const { v, cruise } = P;
    if (dt <= 0 || dt >= P.D) return 0;
    if (dt < CLIMB) return v * (0.3 + 0.7 * dt / CLIMB);
    if (dt < CLIMB + cruise) return v;
    return v * (1 - 0.6 * (dt - CLIMB - cruise) / DESC);
  }
  function altAt(P, dt) {
    const fl = WA.leg.cruiseFL * 100, e0 = WA.from.elevFt, e1 = WA.to.elevFt;
    if (dt <= 0) return e0;
    if (dt >= P.D) return e1;
    if (dt < CLIMB) { const x = dt / CLIMB; return e0 + (fl - e0) * (1 - Math.pow(1 - x, 1.7)); }
    if (dt < CLIMB + P.cruise) return fl;
    const x = (dt - CLIMB - P.cruise) / DESC; return fl + (e1 - fl) * Math.pow(x, 0.9);
  }
  function estimate(t) {
    const P = profile(), dt = t - P.T.takeoff;
    const s = distAt(P, dt);
    const a = G.along(WA.route, s);
    const alt = altAt(P, dt), alt2 = altAt(P, dt + 60);
    const phase = dt < 0 ? (t < P.T.gateDep ? 'At gate' : 'Taxi') : dt >= P.D ? (t < P.T.gateArr ? 'Taxi in' : 'Arrived') : dt < CLIMB ? 'Climb' : dt < CLIMB + P.cruise ? 'Cruise' : 'Descent';
    return { lat: a.pt[1], lon: a.pt[0], alt, vr: Math.round(alt2 - alt), gs: speedAt(P, dt) * 3600 / G.KM_PER_NM, trk: G.courseAt(WA.route, s), s, phase, ground: dt < 0 || dt >= P.D };
  }
  // inverse: time at which the estimate reaches along-track s
  function timeForS(s) {
    const P = profile();
    let lo = 0, hi = P.D;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (distAt(P, m) < s) lo = m; else hi = m; }
    return P.T.takeoff + (lo + hi) / 2;
  }
  WA.estimate = estimate; WA.timeForS = timeForS; WA.profile = profile;

  // ---- sync ----
  WA.syncTo = function (lngLat) {
    const pr = G.project(WA.route, [lngLat.lng, lngLat.lat]);
    S.offset = timeForS(pr.s) - nowS();
    store.set('offset.' + WA.leg.id + '.' + WA.entry.date, S.offset);
    WA.emit('tick');
  };
  WA.nudge = function (min) {
    S.offset = (S.offset || 0) + min * 60;
    if (min === 0) S.offset = 0;
    store.set('offset.' + WA.leg.id + '.' + WA.entry.date, S.offset);
    WA.emit('tick');
  };

  // ---- ADS-B direct (usually CORS-blocked; quiet) ----
  async function adsbTry() {
    const t = Date.now();
    if (t < S.adsbNext || document.hidden) return;
    S.adsbNext = t + (S.adsbFails >= 2 ? 600000 : 60000);
    const urls = ['https://api.adsb.lol/v2/callsign/' + F.flight.icao, 'https://opendata.adsb.fi/api/v2/callsign/' + F.flight.icao];
    for (const u of urls) {
      try {
        const ctl = new AbortController(); const k = setTimeout(() => ctl.abort(), 8000);
        const r = await fetch(u, { signal: ctl.signal, cache: 'no-store' }); clearTimeout(k);
        if (!r.ok) throw 0;
        const j = await r.json();
        const ac = (j.ac || j.aircraft || [])[0];
        if (ac && ac.lat != null) {
          const tt = (j.now ? (j.now > 1e12 ? j.now / 1000 : j.now) : nowS()) - (ac.seen_pos || 0);
          S.adsb = { lat: ac.lat, lon: ac.lon, alt: typeof ac.alt_baro === 'number' ? ac.alt_baro : ac.alt_geom, ground: ac.alt_baro === 'ground', gs: ac.gs, trk: ac.track, vr: ac.baro_rate || ac.geom_rate, tas: ac.tas, mach: ac.mach, oat: ac.oat, wd: ac.wd, ws: ac.ws, reg: ac.r, type: ac.t, sq: ac.squawk, t: tt, src: u.indexOf('adsb.lol') > 0 ? 'adsb.lol' : 'adsb.fi' };
          S.adsbFails = 0; S.adsbNext = t + 60000;
          return;
        }
        throw 0;
      } catch (e) { /* quiet */ }
    }
    S.adsbFails++;
    if (S.adsbFails >= 2) S.adsbNext = t + 600000;
  }

  // ---- GPS ----
  let gpsWatch = null;
  WA.toggleGPS = function () {
    if (gpsWatch != null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; S.gpsOn = false; S.gps = null; WA.emit('tick'); return; }
    if (!navigator.geolocation) { WA.toast('No GPS available in this browser.'); return; }
    S.gpsOn = true;
    gpsWatch = navigator.geolocation.watchPosition((p) => {
      const c = p.coords;
      S.gps = { lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude != null ? c.altitude * G.FT_PER_M : null, gs: c.speed != null ? c.speed * 1.94384 : null, trk: c.heading, t: p.timestamp / 1000 };
    }, (err) => { WA.toast('GPS: ' + (err.message || 'unavailable')); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    WA.emit('tick');
  };

  // ---- the merged position ----
  let prev = null;
  function compute() {
    const t = nowS();
    const P = profile();
    let pos, src, srcDetail = '';
    if (S.preview) {
      const tt = P.T.takeoff + S.preview.frac * P.D;
      pos = estimate(tt); pos.t = tt; src = 'PREVIEW';
    } else {
      const relay = window.RelayFeed && RelayFeed.position(180);
      const ad = S.adsb && t - S.adsb.t < 180 ? S.adsb : null;
      const live = relay || ad;
      const gps = S.gps && S.gps.acc < 3000 && t - S.gps.t < 30 ? S.gps : null;
      const est = estimate(t + (S.offset || 0));
      if (live) {
        const age = Math.max(0, Math.round(t - live.t));
        // dead-reckon forward from the fix by age (bounded)
        let pt = [live.lon, live.lat];
        if (!live.ground && live.gs && live.trk != null && age < 400) pt = G.dest(pt, live.trk, live.gs * G.KM_PER_NM * age / 3600);
        pos = Object.assign({}, live, { lon: pt[0], lat: pt[1] });
        if (pos.alt == null) pos.alt = est.alt;
        if (pos.gs == null) pos.gs = est.gs;
        src = relay ? 'RELAY' : 'ADS-B'; srcDetail = age + ' s';
      } else if (gps) {
        pos = Object.assign({}, est, { lat: gps.lat, lon: gps.lon });
        if (gps.alt != null && gps.alt > 500) pos.alt = gps.alt;
        if (gps.gs != null && gps.gs > 30) pos.gs = gps.gs;
        if (gps.trk != null && !isNaN(gps.trk)) pos.trk = gps.trk;
        src = 'GPS'; srcDetail = '±' + Math.round(gps.acc) + ' m';
      } else {
        pos = est; src = 'EST'; srcDetail = Math.abs(S.offset || 0) > 30 ? 'synced ' + (S.offset > 0 ? '+' : '−') + Math.round(Math.abs(S.offset) / 60) + ' min' : 'schedule';
      }
      pos.t = t;
    }
    const pr = G.project(WA.route, [pos.lon, pos.lat]);
    pos.s = pr.s; pos.crossKm = pr.cross;
    if (pos.trk == null) pos.trk = G.courseAt(WA.route, pos.s);
    if (pos.vr == null && prev && pos.alt != null && prev.alt != null && pos.t - prev.t > 0.5) pos.vr = (pos.alt - prev.alt) / ((pos.t - prev.t) / 60);
    if (!pos.phase) pos.phase = pos.ground ? (pos.s < 20 ? 'Taxi' : 'Taxi in') : (pos.vr > 400 ? 'Climb' : pos.vr < -400 ? 'Descent' : 'Cruise');
    pos.src = src; pos.srcDetail = srcDetail;
    pos.frac = pos.s / WA.route.total;
    pos.togoKm = WA.route.total - pos.s;
    // ETA
    if (src === 'PREVIEW' || src === 'EST') pos.eta = P.T.landing + (src === 'EST' ? -(S.offset || 0) : 0);
    else pos.eta = pos.gs > 150 ? Math.max(t + (pos.togoKm / (pos.gs * G.KM_PER_NM)) * 3600 + 8 * 60, P.T.landing - 3600) : P.T.landing;
    if (src === 'PREVIEW') pos.eta = P.T.landing;
    pos.wall = src === 'PREVIEW' ? pos.t : t; // time used for clocks
    prev = pos;
    WA.pos = pos;
    return pos;
  }
  WA.computePos = compute;

  // preview controls
  WA.setPreview = function (frac) { S.preview = frac == null ? null : { frac: Math.max(0, Math.min(1, frac)), playing: S.preview ? S.preview.playing : 0 }; WA.emit('tick'); };
  WA.playPreview = function (rate) { if (!S.preview) S.preview = { frac: 0, playing: 0 }; S.preview.playing = S.preview.playing === rate ? 0 : rate; WA.emit('tick'); };

  let lastTick = Date.now();
  WA.engineTick = function () {
    const n = Date.now(), dt = (n - lastTick) / 1000; lastTick = n;
    if (S.preview && S.preview.playing) {
      const P = profile();
      S.preview.frac = Math.min(1, S.preview.frac + (dt * S.preview.playing) / P.D);
      if (S.preview.frac >= 1) S.preview.playing = 0;
    }
    if (!S.preview) adsbTry();
    if (S.legMode === 'auto' && setupLeg()) WA.emit('leg');
    return compute();
  };

  // tiny event bus
  const L = {};
  WA.on = (n, f) => (L[n] = L[n] || []).push(f);
  WA.emit = (n, a) => (L[n] || []).forEach((f) => { try { f(a); } catch (e) { console.warn(n, e); } });
})();
