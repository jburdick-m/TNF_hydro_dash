# Tahoe National Forest — Hydrology Dashboard

A geospatial dashboard of hydro-meteorological conditions across the Tahoe National
Forest: **streamflow, snowpack (SWE), soil moisture, reservoir storage, forecasts,
and webcams**, on an interactive station map. Works on desktop and mobile.

It is a **fully static site** — no server, no build step, no framework. Open
`docs/index.html` and it runs. That also makes it free to host (GitHub Pages).

## How data flows

| Source | What | How it reaches the page |
|---|---|---|
| **USGS NWIS** | real-time streamflow (Truckee basin + N Yuba, Deer Ck, NF American) and period-of-record daily statistics for percentile ribbons | fetched **live in the browser** (NWIS sends CORS headers) |
| **NOAA NWS** | 7-day point forecasts (precip, snow, temps) | fetched **live in the browser** |
| **CA DWR CDEC** | snow pillows, **soil moisture** (CW3E + UC Davis stations), reservoir storage, and FERC/operator stream gages that USGS doesn't carry (Jones Bar, Our House Dam, Oregon Ck, N Yuba abv Slate Ck, S Yuba nr Cisco, Englebright release, MF American at Oxbow) | CDEC has **no CORS**, so `scripts/fetch_data.py` runs on a GitHub Actions schedule (every 3 h) and commits compact JSON to `docs/data/` |
| **Caltrans** | road webcams (I-80, Hwy 20, Hwy 49) | hotlinked JPEGs, auto-refresh |
| **USFS EDW** | forest administrative boundary | static GeoJSON in `docs/geo/` |

The station inventory (IDs, coordinates, sensors, reservoir capacities) lives in
`docs/data/stations.json` and is shared by the fetch script and the frontend.
Every station in it was verified against live feeds on 2026-07-01; known-dead
stations (e.g. CDEC GYB, stale since 2024 — USGS 11413000 covers that site) were
excluded.

## Repo layout

```
docs/                  the site (point GitHub Pages here)
  index.html
  css/styles.css
  js/                  app.js (orchestration) · map.js (Leaflet) · charts.js (Plotly) · data.js (fetchers)
  data/                stations.json (inventory) + generated JSON (snow/soil/flow/reservoirs/meta)
  geo/                 Tahoe NF boundary GeoJSON
scripts/fetch_data.py  CDEC fetcher (run by GitHub Actions, or by hand)
.github/workflows/update-data.yml   the 3-hourly refresh
archive/               previous Dash app and legacy data files
```

## Run locally

```bash
# optional: refresh CDEC data first
pip install -r requirements.txt
python scripts/fetch_data.py

# serve the site (any static server works)
python -m http.server -d docs 8000
# -> http://localhost:8000
```

## Free hosting on GitHub Pages

1. Merge to `main`.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*,
   Branch = `main`, folder = `/docs`. Save.
3. The site appears at `https://<user>.github.io/TNF_hydro_dash/` — reachable from
   any device.
4. The `Update CDEC data` workflow (schedule runs on the default branch) commits
   fresh JSON every 3 hours, and Pages redeploys automatically. You can also
   trigger it manually from the Actions tab.

No cost, no server to maintain. If you ever outgrow Pages (e.g. want a real API
or sub-hourly CDEC data), the same `docs/` folder can be dropped onto any static
host (Cloudflare Pages, Google Cloud Storage bucket, etc.) unchanged.

## Reading the charts

Streamflow and SWE charts show the last 12 months against **day-of-year
percentile bands** built from each station's full period of record — warm bands
below normal (dry), a neutral band for the 25th–75th percentile, cool bands above
normal (wet); the white line is the observed value. Soil moisture plots
volumetric water content at each sensor depth (light = shallow, dark = deep).
Every chart has a "view as table" twin.

## Notes & caveats

- All data are provisional and subject to revision by the source agencies.
- CDEC-derived panels are as fresh as the last scheduled run (timestamp in the
  header). USGS flow, NWS forecast, and webcams are live at page load.
- Some percentile bands are suppressed where the record is under ~5 years
  (e.g. S Yuba nr Cisco, online 2026).
- Possible future sources: NRCS SNOTEL/AWDB, USBR RISE (Truckee reservoirs),
  CNRFC forecast flows, Dreamflows (operator gages; check their republication
  policy before scraping).
