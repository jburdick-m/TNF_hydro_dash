# Yuba Watershed Map Pair

Two print-quality PDF maps of how water is stored, tunneled, and traded
across the Yuba River watershed:

| File | What it is |
|---|---|
| `output/yuba_plumbing_map.pdf` | **The Plumbing of the Yuba** — georeferenced artistic map (24×18 in). Real USGS hydrography and terrain, schematic conveyance overlay, story callouts. |
| `output/yuba_schematic.pdf` | **Yuba Waterworks** — fully schematic tube-map-style engineering diagram (22×15 in). Flow runs east→west (headwaters at right) to match the map view. |

## Rebuilding

```bash
pip install matplotlib numpy shapely pillow tifffile
python3 maps/build_geo_map.py      # georeferenced map
python3 maps/build_schematic.py    # engineering schematic
```

Both scripts are deterministic given the checked-in data. Previews
(`*_preview.png`) are written alongside the PDFs.

## Layout of this directory

- `build_geo_map.py` / `build_schematic.py` — the two renderers.
- `style.py` — shared visual system: cream-paper palette (validated for
  color-vision-deficiency separation and contrast), operator colors
  (PG&E amber, NID green, Yuba Water purple, debris-era brown), fonts,
  line vocabulary (solid = canal, dashed = tunnel, dotted = penstock).
- `symbols.py` — reservoir lens / powerhouse / diversion-dam glyphs.
- `labeling.py` — greedy collision-avoiding label placement engine
  (measures true rendered text boxes, scores candidate offsets against
  placed labels, obstacles, and line vertices; draws leader lines).
- `geo.py` — GeoJSON loading, local projection, Chaikin smoothing,
  Douglas–Peucker simplification, NHD segment chaining.
- `prepare_data.py` — turns the raw NHD downloads into `data/linework.json`.
- `fonts/` — bundled OFL fonts (Playfair Display, Cormorant Garamond,
  Archivo), static instances cut from Google Fonts variable fonts.

## Data

- `data/rivers.geojson`, `data/canals_*.geojson`, `data/reservoirs.geojson`
  — USGS NHDPlus HR features (queried from `hydro.nationalmap.gov`).
- `data/huc8_18020125.geojson`, `data/huc8_18020126.geojson` — Yuba and
  Bear HUC8 boundaries (geoconnex.us).
- `data/hillshade.npz` — USGS 3DEP hillshade for the map window.
- `data/yuba_infrastructure.json` — the curated dataset: every reservoir,
  diversion dam, tunnel, canal, powerhouse, story callout, and annotation
  printed on the maps, with capacities/statistics compiled from FERC
  2310 / 2266 / 2246 relicensing records, SWRCB certifications, USGS &
  CDEC gauge data, and operator documents (PG&E, NID, Yuba Water Agency).

The maps are artistic schematics — not for navigation or engineering use.
