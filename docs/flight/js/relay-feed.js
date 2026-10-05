// Live position from the GitHub Actions relay (scripts/flight_relay.py), read via ntfy.sh.
// The relay polls adsb.lol / adsb.fi / FlightAware server-side (they have no CORS) and
// publishes a compact snapshot every ~75 s in flight. This file only reads it.
//
//   RelayFeed.start(onUpdate)   onUpdate({pos, fa, track, sent, receivedAt})
//   RelayFeed.latest            last snapshot or null
(function () {
  const TOPIC = 'aa2735-window-atlas-k7q2m9';
  const URL = 'https://ntfy.sh/' + TOPIC + '/json?poll=1&since=30m';
  const EVERY_MS = 30000;
  let timer = null, failures = 0, cb = null;

  async function poll() {
    try {
      const ctl = new AbortController();
      const kill = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch(URL, { cache: 'no-store', signal: ctl.signal });
      clearTimeout(kill);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const lines = (await res.text()).trim().split('\n').filter(Boolean);
      let snap = null;
      for (let i = lines.length - 1; i >= 0 && !snap; i--) {
        try {
          const ev = JSON.parse(lines[i]);
          if (ev.event === 'message' && ev.message) snap = JSON.parse(ev.message);
        } catch (e) { /* skip malformed line */ }
      }
      failures = 0;
      if (snap) {
        snap.receivedAt = Date.now();
        RelayFeed.latest = snap;
        if (cb) cb(snap);
      }
    } catch (e) {
      failures++;
    }
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (document.hidden) return; // resumes on visibilitychange
    const backoff = Math.min(EVERY_MS * Math.pow(2, Math.max(0, failures - 2)), 5 * 60000);
    timer = setTimeout(poll, failures ? backoff : EVERY_MS);
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden && cb) poll(); });

  const RelayFeed = {
    latest: null,
    start(onUpdate) { cb = onUpdate; poll(); },
    stop() { clearTimeout(timer); cb = null; },
    // Normalised position if fresh enough to trust, else null.
    position(maxAgeS = 180) {
      const p = RelayFeed.latest && RelayFeed.latest.pos;
      if (!p || p.lat == null) return null;
      const age = Date.now() / 1000 - p.t;
      return age <= maxAgeS ? Object.assign({ ageS: Math.round(age) }, p) : null;
    },
  };
  window.RelayFeed = RelayFeed;
})();
