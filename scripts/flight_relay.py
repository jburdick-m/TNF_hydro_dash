#!/usr/bin/env python3
"""Live position relay for the AA2735 Window Atlas (docs/flight/).

The free ADS-B feeds (adsb.lol, adsb.fi) don't send CORS headers, so a phone
browser can't read them directly, and phone GPS is unreliable in a cabin. This
script runs on GitHub Actions, polls those feeds (plus FlightAware's public
flight page for schedule/delay info) server-side, and republishes a compact
JSON snapshot to an ntfy.sh topic, which browsers *can* read
(GET https://ntfy.sh/<topic>/json?poll=1&since=20m).

Stdlib only. Runs until the tracked leg has landed, or MAX_MINUTES.
"""
import json
import os
import re
import sys
import time
import urllib.request

CALLSIGN = os.environ.get("CALLSIGN", "AAL2735")
TOPIC = os.environ.get("NTFY_TOPIC", "aa2735-window-atlas-k7q2m9")
MAX_MINUTES = float(os.environ.get("MAX_MINUTES", "345"))

POLL_EVERY = 20          # s between ADS-B polls
PUBLISH_AIRBORNE = 75    # s between publishes in flight (ntfy.sh caps anonymous daily messages)
PUBLISH_IDLE = 600       # s between heartbeat publishes on the ground / no data
FA_EVERY = 240           # s between FlightAware page fetches
TRACK_STEP = 180         # s between kept track points
TRACK_MAX = 90

FEEDS = [
    ("adsb.lol", f"https://api.adsb.lol/v2/callsign/{CALLSIGN}"),
    ("adsb.fi", f"https://opendata.adsb.fi/api/v2/callsign/{CALLSIGN}"),
    ("airplanes.live", f"https://api.airplanes.live/v2/callsign/{CALLSIGN}"),
]
FA_URL = f"https://www.flightaware.com/live/flight/{CALLSIGN}"
UA = "Mozilla/5.0 (X11; Linux x86_64) AA2735-window-atlas-relay"


def get(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def log(*a):
    print(time.strftime("%H:%M:%SZ", time.gmtime()), *a, flush=True)


def poll_adsb():
    """Freshest matching aircraft across the feeds, normalised, or None."""
    best = None
    for name, url in FEEDS:
        try:
            d = json.loads(get(url))
        except Exception as e:  # noqa: BLE001 — any feed may be down; try the next
            log("feed", name, "failed:", e)
            continue
        now_ms = d.get("now") or time.time() * 1000
        for ac in d.get("ac") or []:
            if (ac.get("flight") or "").strip().upper() != CALLSIGN or ac.get("lat") is None:
                continue
            seen = ac.get("seen_pos", ac.get("seen", 0)) or 0
            t = now_ms / 1000 - seen
            if best is None or t > best["t"]:
                alt = ac.get("alt_baro")
                best = {
                    "src": name,
                    "t": round(t),
                    "lat": round(ac["lat"], 4),
                    "lon": round(ac["lon"], 4),
                    "alt": alt if isinstance(alt, (int, float)) else 0,
                    "ground": alt == "ground",
                    "altGeom": ac.get("alt_geom"),
                    "gs": ac.get("gs"),
                    "trk": ac.get("track") if ac.get("track") is not None else ac.get("true_heading"),
                    "vr": ac.get("baro_rate", ac.get("geom_rate")),
                    "tas": ac.get("tas"),
                    "mach": ac.get("mach"),
                    "oat": ac.get("oat"),
                    "wd": ac.get("wd"),
                    "ws": ac.get("ws"),
                    "selAlt": ac.get("nav_altitude_mcp"),
                    "reg": ac.get("r"),
                    "type": ac.get("t"),
                    "hex": ac.get("hex"),
                    "sq": ac.get("squawk"),
                }
        if best:
            break  # first feed with the aircraft is good enough
    return best


def poll_flightaware():
    """Schedule/delay summary of FlightAware's current AAL2735 flight, or None."""
    try:
        html = get(FA_URL, timeout=25)
        m = re.search(r"var trackpollBootstrap = (\{.*?\});\s*</script>", html, re.S)
        if not m:
            return None
        flights = json.loads(m.group(1)).get("flights") or {}
        f = next(iter(flights.values()), None)
        if not f or "origin" not in f:
            return None
        pick = lambda o: {k: (o or {}).get(k) for k in ("scheduled", "estimated", "actual")}
        out = {
            "from": f["origin"].get("iata"),
            "to": f["destination"].get("iata"),
            "takeoff": pick(f.get("takeoffTimes")),
            "landing": pick(f.get("landingTimes")),
            "gateArr": pick(f.get("gateArrivalTimes")),
            "gateDep": pick(f.get("gateDepartureTimes")),
            "status": f.get("flightStatus"),
            "cancelled": f.get("cancelled"),
            "diverted": f.get("diverted"),
            "gate": (f.get("destination") or {}).get("gate"),
            "terminal": (f.get("destination") or {}).get("terminal"),
        }
        coord = f.get("coord")
        if coord and f.get("altitude"):
            out["pos"] = {
                "lat": coord[1], "lon": coord[0],
                "alt": (f.get("altitude") or 0) * 100,
                "gs": f.get("groundspeed"), "trk": f.get("heading"),
                "t": f.get("timestamp"),
            }
        return out
    except Exception as e:  # noqa: BLE001
        log("flightaware failed:", e)
        return None


def publish(payload):
    body = json.dumps(payload, separators=(",", ":")).encode()
    req = urllib.request.Request(
        f"https://ntfy.sh/{TOPIC}", data=body, method="POST",
        headers={"User-Agent": UA, "Title": f"{CALLSIGN} position", "Tags": "airplane"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            r.read()
        log("published", len(body), "bytes")
        return True
    except Exception as e:  # noqa: BLE001
        log("publish failed:", e)
        return False


def main():
    start = time.time()
    deadline = start + MAX_MINUTES * 60
    track, fa, pos = [], None, None
    last_pub = last_fa = 0.0
    seen_airborne = False
    landed_at = None
    log(f"relay {CALLSIGN} -> ntfy.sh/{TOPIC} for up to {MAX_MINUTES:.0f} min")

    while time.time() < deadline:
        now = time.time()
        if now - last_fa >= FA_EVERY:
            fa = poll_flightaware() or fa
            last_fa = now
            if fa:
                log("FA", fa.get("from"), "->", fa.get("to"), "takeoff", fa["takeoff"], "landing", fa["landing"])

        p = poll_adsb()
        if p:
            pos = p
            if not p["ground"] and p["alt"] > 1000:
                seen_airborne = True
            if not track or p["t"] - track[-1][3] >= TRACK_STEP:
                track.append([p["lon"], p["lat"], int(p["alt"] or 0), p["t"]])
                track[:] = track[-TRACK_MAX:]
        airborne = bool(pos and not pos["ground"] and now - pos["t"] < 300)

        due = PUBLISH_AIRBORNE if airborne else PUBLISH_IDLE
        if now - last_pub >= due:
            payload = {"v": 1, "callsign": CALLSIGN, "sent": round(now), "pos": pos, "fa": fa,
                       "track": [[x, y, a] for x, y, a, _ in track]}
            # ntfy turns >4 KB messages into attachments; thin the track if needed
            while len(json.dumps(payload, separators=(",", ":"))) > 3900 and len(payload["track"]) > 4:
                payload["track"] = payload["track"][::2]
            if publish(payload):
                last_pub = now

        # finished: we saw this leg airborne and it has landed
        landed = fa and (fa.get("landing") or {}).get("actual")
        if seen_airborne and (landed or (pos and pos["ground"])):
            landed_at = landed_at or now
            if now - landed_at > 900:
                log("leg landed; exiting")
                break
        time.sleep(POLL_EVERY)
    return 0


if __name__ == "__main__":
    sys.exit(main())
