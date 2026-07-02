"""Preprocess raw NHD downloads into clean, merged linework for the maps.

Reads  maps/data/{rivers,canals_net,canals_non,reservoirs}.geojson
Writes maps/data/linework.json with, per named river/canal, a list of merged
polyline chains (lon/lat), longest first, plus simple metadata.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import geo

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

# Rivers we render, with stroke emphasis class (1=main stem, 2=fork, 3=trib)
RIVERS = {
    "Yuba River": 1,
    "North Yuba River": 2,
    "Middle Yuba River": 2,
    "South Yuba River": 2,
    "Deer Creek": 3,
    "Canyon Creek": 3,
    "Oregon Creek": 3,
    "Dry Creek": 3,
    "Slate Creek": 3,
    "Downie River": 3,
    "Fordyce Creek": 3,
    "Kanaka Creek": 4,
    "Poorman Creek": 4,
    "Humbug Creek": 4,
    "Bear River": 2,
    "Wolf Creek": 4,
    "Feather River": 2,
}

CANALS = [
    "South Yuba Canal", "Drum Canal", "Cascade Canal", "D-S Canal",
    "Cordua Canal", "Bear River Canal", "Chicago Park Ditch",
]

# The big named creeks appear multiple times in the bbox (e.g. three distinct
# "Deer Creek"s). Keep only chains that pass near an anchor point (lon, lat).
ANCHORS = {
    "Deer Creek": [(-121.05, 39.28), (-121.25, 39.22)],   # Nevada City / L. Wildwood
    "Dry Creek": [(-121.30, 39.24), (-121.42, 39.21)],    # Collins Lake -> Yuba
    "Canyon Creek": [(-120.62, 39.43)],                    # Bowman Lake outflow
    "Slate Creek": [(-121.05, 39.60)],                     # North Yuba trib
    "Wolf Creek": [(-121.15, 39.15)],                      # Grass Valley
    "Willow Creek": [(-121.1, 39.5)],
}


def near_anchor(chain, anchors, tol=0.09):
    a = np.asarray(chain)
    for ax, ay in anchors:
        d = np.hypot(a[:, 0] - ax, a[:, 1] - ay)
        if d.min() < tol:
            return True
    return False


def main():
    gj = geo.load_geojson(os.path.join(DATA, "rivers.geojson"))
    by_name = {}
    for props, line in geo.iter_lines(gj):
        nm = (props.get("GNIS_NAME") or props.get("gnis_name") or "").strip()
        if nm:
            by_name.setdefault(nm, []).append(line)

    out = {"rivers": {}, "canals": {}}
    for nm, cls in RIVERS.items():
        segs = by_name.get(nm, [])
        if not segs:
            print(f"  !! no geometry for {nm}")
            continue
        chains = geo.merge_segments(segs, tol=2e-4)
        if nm in ANCHORS:
            chains = [c for c in chains if near_anchor(c, ANCHORS[nm])]
        # drop tiny fragments (< 1.5 km)
        chains = [c for c in chains if geo.path_length_km(c) > 1.5]
        out["rivers"][nm] = {
            "class": cls,
            "chains": [np.round(c, 5).tolist() for c in chains],
            "km": round(sum(geo.path_length_km(c) for c in chains), 1),
        }
        print(f"  {nm}: {len(chains)} chains, {out['rivers'][nm]['km']} km")

    for tag in ("net", "non"):
        gj = geo.load_geojson(os.path.join(DATA, f"canals_{tag}.geojson"))
        for props, line in geo.iter_lines(gj):
            nm = (props.get("GNIS_NAME") or "").strip()
            if nm in CANALS:
                out["canals"].setdefault(nm, []).append(line)
    for nm in list(out["canals"]):
        chains = geo.merge_segments(out["canals"][nm], tol=2e-3)
        out["canals"][nm] = [np.round(c, 5).tolist() for c in chains]
        print(f"  canal {nm}: {len(chains)} chains")

    with open(os.path.join(DATA, "linework.json"), "w") as f:
        json.dump(out, f)
    print("wrote linework.json",
          os.path.getsize(os.path.join(DATA, "linework.json")) // 1024, "KB")


if __name__ == "__main__":
    main()
