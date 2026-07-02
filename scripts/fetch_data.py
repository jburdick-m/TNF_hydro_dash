#!/usr/bin/env python3
"""Fetch CDEC data for the Tahoe NF hydrology dashboard.

Produces small static JSON files under docs/data/ that the (otherwise
fully client-side) dashboard reads. CDEC does not send CORS headers, so
anything sourced from CDEC has to be fetched here rather than in the
browser. USGS streamflow and NWS forecasts are fetched live by the
frontend and never touch this script.

Outputs:
  docs/data/snow.json        snow pillows: 365d daily SWE + day-of-year percentile bands
  docs/data/soil.json        soil moisture: 90d hourly (decimated) at 3 depths + latest
  docs/data/reservoirs.json  reservoirs: 365d daily storage + capacity + latest
  docs/data/meta.json        generation timestamp

Station inventory lives in docs/data/stations.json (shared with the frontend).
"""

import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "docs" / "data"

CDEC_CSV = "https://cdec.water.ca.gov/dynamicapp/req/CSVDataServlet"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "TNF-hydro-dashboard (github.com/jburdick-m/TNF_hydro_dash)"})

# Percentile levels for ribbon bands, matching the frontend's expectations.
QUANTS = {"p10": 0.10, "p25": 0.25, "p50": 0.50, "p75": 0.75, "p90": 0.90}


def cdec_fetch(station, sensor, dur, start, end=None, retries=3):
    """Fetch one CDEC station/sensor as a DataFrame with [datetime, value]."""
    end = end or datetime.now().strftime("%Y-%m-%d")
    params = {
        "Stations": station,
        "SensorNums": sensor,
        "dur_code": dur,
        "Start": start,
        "End": end,
    }
    for attempt in range(retries):
        try:
            r = SESSION.get(CDEC_CSV, params=params, timeout=120)
            r.raise_for_status()
            from io import StringIO
            df = pd.read_csv(StringIO(r.text), na_values=["---", "ART", "BRT", "m", ""])
            if df.empty or "DATE TIME" not in df.columns:
                return pd.DataFrame(columns=["datetime", "value"])
            out = pd.DataFrame({
                "datetime": pd.to_datetime(df["DATE TIME"], errors="coerce"),
                "value": pd.to_numeric(df["VALUE"], errors="coerce"),
            }).dropna(subset=["datetime"])
            return out
        except Exception as e:  # noqa: BLE001 - retry any transport/parse hiccup
            if attempt == retries - 1:
                print(f"  ! {station}/{sensor}/{dur}: {e}", file=sys.stderr)
                return pd.DataFrame(columns=["datetime", "value"])
            time.sleep(2 ** attempt)


def smooth_circular(series, window=11):
    """Centered rolling mean that wraps around the day-of-year boundary."""
    n = len(series)
    if n == 0:
        return series
    pad = window // 2
    wrapped = pd.concat([series.iloc[-pad:], series, series.iloc[:pad]])
    sm = wrapped.rolling(window, center=True, min_periods=1).mean()
    return sm.iloc[pad:pad + n]


def doy_percentiles(df, min_years=5):
    """Day-of-year percentile bands from a full period-of-record daily series.

    Returns a DataFrame indexed by day-of-year (1..366) with min/max and the
    QUANTS percentiles, lightly smoothed so the ribbons don't look serrated.
    """
    d = df.dropna(subset=["value"]).copy()
    if d.empty or d["datetime"].dt.year.nunique() < min_years:
        return None
    d["doy"] = d["datetime"].dt.dayofyear
    g = d.groupby("doy")["value"]
    bands = pd.DataFrame({"min": g.min(), "max": g.max()})
    for name, q in QUANTS.items():
        bands[name] = g.quantile(q)
    bands = bands.reindex(range(1, 367)).interpolate(limit_direction="both")
    for col in bands.columns:
        bands[col] = smooth_circular(bands[col])
    return bands.round(1)


def compact_daily(df, days=365):
    """Trailing daily series as parallel arrays (dates as YYYY-MM-DD)."""
    cutoff = datetime.now() - timedelta(days=days)
    d = df[df["datetime"] >= cutoff].dropna(subset=["value"])
    d = d.set_index("datetime")["value"].resample("D").mean().dropna()
    return {
        "dates": [ts.strftime("%Y-%m-%d") for ts in d.index],
        "values": [round(float(v), 1) for v in d.values],
    }


def latest_value(df, max_age_days=14):
    d = df.dropna(subset=["value"])
    if d.empty:
        return None
    row = d.iloc[-1]
    if row["datetime"] < datetime.now() - timedelta(days=max_age_days):
        return None
    return {"t": row["datetime"].strftime("%Y-%m-%d %H:%M"), "v": round(float(row["value"]), 1)}


def bands_to_json(bands):
    return {col: [round(float(v), 1) for v in bands[col]] for col in bands.columns}


def fetch_daily_flow(st):
    """Full period-of-record daily flow for a CDEC station, trying sensible
    sensor/duration combos (many FERC gages report only event/hourly data)."""
    sid = st["id"]
    start = st.get("por_start", "1990-01-01")
    for sensor, dur in ((41, "D"), (20, "D"), (20, "H"), (20, "E")):
        df = cdec_fetch(sid, sensor, dur, start)
        if len(df.dropna(subset=["value"])) > 300:
            if dur in ("H", "E"):
                s = df.set_index("datetime")["value"].resample("D").mean().dropna()
                df = pd.DataFrame({"datetime": s.index, "value": s.values})
            return df
    return pd.DataFrame(columns=["datetime", "value"])


def build_flow(stations):
    out = {}
    for st in stations:
        sid = st["id"]
        print(f"flow: {sid} ({st['name']})")
        full = fetch_daily_flow(st)
        if full.empty:
            continue
        full = full[full["value"] >= 0]
        bands = doy_percentiles(full)
        entry = {"recent": compact_daily(full), "latest": None}
        # latest from a short recent hourly/event pull so the map shows near-real-time flow
        recent_start = (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d")
        for sensor, dur in ((20, "H"), (20, "E"), (41, "D")):
            r = cdec_fetch(sid, sensor, dur, recent_start)
            lv = latest_value(r, max_age_days=7)
            if lv:
                entry["latest"] = lv
                break
        if bands is not None:
            entry["bands"] = bands_to_json(bands)
        out[sid] = entry
    return out


DREAMFLOWS_REALTIME = "https://www.dreamflows.com/realtime.csv.php"
DREAMFLOWS_DAILY = "https://www.dreamflows.com/flows-canv.csv.php"


def _dreamflows_rows(url):
    """Parse a Dreamflows CSV feed -> list of {river_id, ts, flow, confidence}.
    Both feeds share a 15-column format behind a several-line preamble."""
    import csv as csv_mod
    r = SESSION.get(url, timeout=60)
    r.raise_for_status()
    header = None
    out = []
    for row in csv_mod.reader(r.text.splitlines()):
        if not row:
            continue
        if header is None:
            if row[0].strip() == "RiverId":
                header = {name: i for i, name in enumerate(row)}
            continue
        if len(row) < len(header):
            continue
        try:
            flow = float(row[header["RiverFlow"]])
        except ValueError:  # qualitative entries like "Low", or "n/a"
            continue
        out.append({
            "river_id": row[header["RiverId"]].strip(),
            "ts": f"{row[header['Date']].strip()} {row[header['Time']].strip()}",
            "flow": round(flow, 1),
            "confidence": row[header["Confidence"]].strip(),
        })
    return out


def build_dreamflows(stations, keep_days=180):
    """Operator gages (PG&E / NID / PCWA / YCWA FERC points) via Dreamflows'
    bulk CSV feeds — the only machine-readable source for these. One gentle
    fetch of each feed per scheduled run; history accumulates across runs
    since the feeds carry only current/last-3-day values. Credit
    Dreamflows.com wherever displayed.
    """
    if not stations:
        return {}
    out_path = DATA_DIR / "dreamflows.json"
    old = json.loads(out_path.read_text()) if out_path.exists() else {}

    points = {}   # river_id -> {ts: flow}
    latest = {}   # river_id -> (ts, flow, confidence)
    for url in (DREAMFLOWS_DAILY, DREAMFLOWS_REALTIME):
        try:
            for p in _dreamflows_rows(url):
                points.setdefault(p["river_id"], {})[p["ts"]] = p["flow"]
                cur = latest.get(p["river_id"])
                if cur is None or p["ts"] > cur[0]:
                    latest[p["river_id"]] = (p["ts"], p["flow"], p["confidence"])
        except Exception as e:  # noqa: BLE001
            print(f"  ! dreamflows fetch failed ({url}): {e}", file=sys.stderr)

    if not points:
        return old

    cutoff = (datetime.now() - timedelta(days=keep_days)).strftime("%Y-%m-%d")
    out = {}
    for st in stations:
        ent = old.get(st["id"], {"recent": {"dates": [], "values": []}, "latest": None})
        merged = dict(zip(ent["recent"]["dates"], ent["recent"]["values"]))
        merged.update(points.get(str(st["df_id"]), {}))
        keep = sorted(t for t in merged if t >= cutoff)
        ent["recent"] = {"dates": keep, "values": [merged[t] for t in keep]}
        lv = latest.get(str(st["df_id"]))
        if lv:
            ent["latest"] = {"t": lv[0], "v": lv[1]}
            ent["confidence"] = lv[2]
        out[st["id"]] = ent
        print(f"dreamflows: {st['id']} ({st['name']}) -> {ent['latest']} ({len(keep)} pts)")
    return out


def build_snow(stations):
    out = {}
    for st in stations:
        sid = st["id"]
        print(f"snow: {sid} ({st['name']})")
        full = cdec_fetch(sid, 3, "D", st.get("por_start", "1970-01-01"))
        # Snow pillows occasionally report small negative drift; clamp at 0.
        full["value"] = full["value"].clip(lower=0)
        if full.empty:
            continue
        bands = doy_percentiles(full)
        entry = {"recent": compact_daily(full), "latest": latest_value(full)}
        if bands is not None:
            entry["bands"] = bands_to_json(bands)
            # % of median for the stat tile
            lv = entry["latest"]
            if lv:
                doy = datetime.strptime(lv["t"][:10], "%Y-%m-%d").timetuple().tm_yday
                med = bands.loc[doy, "p50"]
                entry["pct_median"] = round(100 * lv["v"] / med) if med and med > 0.5 else None
        out[sid] = entry
    return out


def soil_context(sid, sensor, dur, label, por_start="2018-01-01"):
    """Full-record daily series for one depth — powers the water-year overlay.
    Records here are only 3-6 years old, so the frontend shows year-vs-year
    traces rather than percentile bands."""
    df = cdec_fetch(sid, sensor, dur, por_start)
    if df.empty:
        return None
    df = df[(df["value"] >= 0) & (df["value"] <= 100)]
    s = df.set_index("datetime")["value"].resample("D").mean().dropna()
    if len(s) < 200:
        return None
    return {
        "depth": label,
        "dates": [ts.strftime("%Y-%m-%d") for ts in s.index],
        "values": [round(float(v), 1) for v in s.values],
    }


def build_soil(stations, days=120):
    out = {}
    start = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    for st in stations:
        sid = st["id"]
        print(f"soil: {sid} ({st['name']})")
        dur = st.get("dur", "E")
        depths = {}
        latest = {}
        for label, sensor in st.get("soil_sensors", {}).items():
            df = cdec_fetch(sid, sensor, dur, start)
            if df.empty:
                continue
            # Soil moisture % — drop obvious sensor glitches.
            df = df[(df["value"] >= 0) & (df["value"] <= 100)]
            # Decimate to 3-hourly means to keep payload small.
            s = df.set_index("datetime")["value"].resample("3h").mean().dropna()
            depths[label] = {
                "t": [ts.strftime("%Y-%m-%d %H:%M") for ts in s.index],
                "v": [round(float(v), 1) for v in s.values],
            }
            lv = latest_value(df)
            if lv:
                latest[label] = lv
        if depths:
            out[sid] = {"depths": depths, "latest": latest}
            # multi-year context for every depth (dailies keep the payload small)
            ctx = {}
            for label, sensor in st.get("soil_sensors", {}).items():
                c = soil_context(sid, sensor, dur, label)
                if c:
                    ctx[label] = {"dates": c["dates"], "values": c["values"]}
            if ctx:
                out[sid]["context"] = ctx
    return out


def build_soil_mesh(stations, days=120):
    """UC Davis sensor-mesh clusters: many single-depth nodes reporting ~daily.
    Collapse each cluster to a daily median across nodes. The full record is
    fetched (it's ~daily cadence anyway) so the multi-year context comes free."""
    out = {}
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    for st in stations:
        print(f"soil mesh: {st['id']} ({st['name']})")
        frames = []
        for node in st["nodes"]:
            df = cdec_fetch(node, st.get("sensor", 197), st.get("dur", "E"), st.get("por_start", "2018-01-01"))
            df = df[(df["value"] >= 0) & (df["value"] <= 100)]
            if not df.empty:
                frames.append(df.set_index("datetime")["value"].resample("D").mean().rename(node))
        if not frames:
            continue
        merged = pd.concat(frames, axis=1)
        med_full = merged.median(axis=1).dropna()
        med = med_full[med_full.index >= cutoff]
        n_nodes = merged.notna().sum(axis=1)
        out[st["id"]] = {
            "depths": {st.get("depth_label", "~10 in"): {
                "t": [ts.strftime("%Y-%m-%d") for ts in med.index],
                "v": [round(float(v), 1) for v in med.values],
            }},
            "latest": {st.get("depth_label", "~10 in"): {
                "t": med.index[-1].strftime("%Y-%m-%d"),
                "v": round(float(med.iloc[-1]), 1),
            }} if len(med) else {},
            "nodes_reporting": int(n_nodes.iloc[-1]) if len(n_nodes) else 0,
            "nodes_total": len(st["nodes"]),
        }
        if len(med_full) >= 200:
            out[st["id"]]["context"] = {
                st.get("depth_label", "~10 in"): {
                    "dates": [ts.strftime("%Y-%m-%d") for ts in med_full.index],
                    "values": [round(float(v), 1) for v in med_full.values],
                }
            }
    return out


def build_reservoirs(stations):
    out = {}
    for st in stations:
        sid = st["id"]
        print(f"reservoir: {sid} ({st['name']})")
        full = cdec_fetch(sid, 15, "D", st.get("por_start", "1980-01-01"))
        if full.empty:
            # some reservoirs only report hourly storage
            full = cdec_fetch(sid, 15, "H", (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d"))
        if full.empty:
            continue
        full = full[full["value"] >= 0]
        entry = {"recent": compact_daily(full), "latest": latest_value(full)}
        cap = st.get("capacity_af")
        if cap and entry["latest"]:
            entry["pct_capacity"] = round(100 * entry["latest"]["v"] / cap)
        out[sid] = entry
    return out


def main():
    stations = json.loads((DATA_DIR / "stations.json").read_text())
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    flow = build_flow([s for s in stations["stations"] if s["type"] == "flow" and s.get("source") == "cdec"])
    (DATA_DIR / "flow.json").write_text(json.dumps(flow, separators=(",", ":")))

    df = build_dreamflows([s for s in stations["stations"] if s.get("source") == "dreamflows"])
    (DATA_DIR / "dreamflows.json").write_text(json.dumps(df, separators=(",", ":")))

    snow = build_snow([s for s in stations["stations"] if s["type"] == "snow"])
    (DATA_DIR / "snow.json").write_text(json.dumps(snow, separators=(",", ":")))

    soil = build_soil([s for s in stations["stations"] if s["type"] == "soil"])
    soil.update(build_soil_mesh([s for s in stations["stations"] if s["type"] == "soil_mesh"]))
    (DATA_DIR / "soil.json").write_text(json.dumps(soil, separators=(",", ":")))

    res = build_reservoirs([s for s in stations["stations"] if s["type"] == "reservoir"])
    (DATA_DIR / "reservoirs.json").write_text(json.dumps(res, separators=(",", ":")))

    meta = {"generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    (DATA_DIR / "meta.json").write_text(json.dumps(meta))
    print("done:", meta["generated"])


if __name__ == "__main__":
    main()
