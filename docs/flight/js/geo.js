// Window Atlas: geodesy, route model, solar position. Pure functions on window.WA.geo.
(function () {
  const R = 6371.0088; // km
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const KM_PER_NM = 1.852, KM_PER_MI = 1.609344, FT_PER_M = 3.28084;

  function hav(a, b) { // a,b = [lon,lat]
    const dLat = (b[1] - a[1]) * D2R, dLon = (b[0] - a[0]) * D2R;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function bearing(a, b) {
    const f1 = a[1] * D2R, f2 = b[1] * D2R, dl = (b[0] - a[0]) * D2R;
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) * R2D + 360) % 360;
  }
  function dest(a, brg, km) {
    const d = km / R, t = brg * D2R, f1 = a[1] * D2R, l1 = a[0] * D2R;
    const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
    const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
    return [((l2 * R2D + 540) % 360) - 180, f2 * R2D];
  }
  const norm180 = (x) => ((x % 360) + 540) % 360 - 180;
  const norm360 = (x) => ((x % 360) + 360) % 360;

  // Local equirectangular projection around a point for segment projection (fine for < ~500 km segments).
  function projectSeg(p, a, b) {
    const k = Math.cos(((a[1] + b[1]) / 2) * D2R);
    const ax = a[0] * k, ay = a[1], bx = b[0] * k, by = b[1], px = p[0] * k, py = p[1];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const cross = (dx * (py - ay) - dy * (px - ax)); // >0 means left of a->b (lon east = +x, lat north = +y)
    return { t, q, sideSign: cross > 0 ? -1 : 1 }; // +1 = right of travel direction
  }

  function buildRoute(coords) {
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));
    const total = cum[cum.length - 1];
    const bbox = coords.reduce((b, c) => [Math.min(b[0], c[0]), Math.min(b[1], c[1]), Math.max(b[2], c[0]), Math.max(b[3], c[1])], [180, 90, -180, -90]);
    return { coords, cum, total, bbox };
  }
  // point at along-route distance s (km)
  function along(route, s) {
    const { coords, cum, total } = route;
    s = Math.max(0, Math.min(total, s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1e-9, t = (s - cum[i - 1]) / seg;
    const a = coords[i - 1], b = coords[i];
    return { pt: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], brg: bearing(a, b), i };
  }
  // smoothed course at s, looking +-w km
  function courseAt(route, s, w = 15) {
    const a = along(route, Math.max(0, s - w)).pt, b = along(route, Math.min(route.total, s + w)).pt;
    return hav(a, b) > 0.5 ? bearing(a, b) : along(route, s).brg;
  }
  // project a point onto the route: along-track km, signed cross-track km (+ right of travel)
  function project(route, p) {
    let best = null;
    const c = route.coords;
    for (let i = 1; i < c.length; i++) {
      const r = projectSeg(p, c[i - 1], c[i]);
      const d = hav(p, r.q);
      if (!best || d < best.d) best = { d, s: route.cum[i - 1] + (route.cum[i] - route.cum[i - 1]) * r.t, side: r.sideSign, q: r.q };
    }
    return { s: best.s, cross: best.d * best.side, dist: best.d, q: best.q };
  }

  // NOAA solar position (azimuth from north clockwise, elevation degrees)
  function sun(date, lat, lon) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545) / 36525;
    const L0 = norm360(280.46646 + T * (36000.76983 + T * 0.0003032));
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = Math.sin(M * D2R) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * D2R) * 0.000289;
    const trueLong = L0 + C;
    const omega = 125.04 - 1934.136 * T;
    const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R);
    const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(omega * D2R);
    const decl = Math.asin(Math.sin(eps * D2R) * Math.sin(lambda * D2R)) * R2D;
    const y = Math.tan((eps / 2) * D2R) ** 2;
    const eqTime = 4 * R2D * (y * Math.sin(2 * L0 * D2R) - 2 * e * Math.sin(M * D2R) + 4 * e * y * Math.sin(M * D2R) * Math.cos(2 * L0 * D2R) - 0.5 * y * y * Math.sin(4 * L0 * D2R) - 1.25 * e * e * Math.sin(2 * M * D2R));
    const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    const tst = (minutes + eqTime + 4 * lon + 1440) % 1440;
    let ha = tst / 4 - 180;
    const zen = Math.acos(Math.sin(lat * D2R) * Math.sin(decl * D2R) + Math.cos(lat * D2R) * Math.cos(decl * D2R) * Math.cos(ha * D2R)) * R2D;
    const elev = 90 - zen;
    let az = Math.atan2(Math.sin(ha * D2R), Math.cos(ha * D2R) * Math.sin(lat * D2R) - Math.tan(decl * D2R) * Math.cos(lat * D2R)) * R2D + 180;
    return { az: norm360(az), elev };
  }

  // Rough state / time-zone classifier for the 40th-parallel corridor (lat 38-43.5)
  function stateAt(lon, lat) {
    if (lon > -90.2) return 'Illinois';
    if (lon > -95.9) return 'Iowa';
    if (lon > -102.05) return lat < 40 ? 'Kansas' : 'Nebraska';
    if (lon > -104.05) return lat < 41 ? 'Colorado' : 'Nebraska';
    if (lon > -109.05) return lat < 41 ? 'Colorado' : 'Wyoming';
    if (lon > -111.05) return lat < 41 ? 'Utah' : 'Wyoming';
    if (lon > -114.04) return lat > 42 ? 'Idaho' : 'Utah';
    if (lat > 39 ? lon > -120.0 : lon > -120 + (39 - lat) * (5.37 / 4)) return lat > 42 ? 'Oregon' : 'Nevada';
    return 'California';
  }
  function tzAt(lon) {
    if (lon > -101.4) return 'Central';
    if (lon > -114.04) return 'Mountain';
    return 'Pacific';
  }
  const TZ_IANA = { Central: 'America/Chicago', Mountain: 'America/Denver', Pacific: 'America/Los_Angeles' };

  window.WA = window.WA || {};
  WA.geo = { R, D2R, R2D, KM_PER_NM, KM_PER_MI, FT_PER_M, hav, bearing, dest, norm180, norm360, buildRoute, along, courseAt, project, sun, stateAt, tzAt, TZ_IANA };
})();
