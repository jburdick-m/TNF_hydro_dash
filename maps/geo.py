"""Geometry helpers: GeoJSON loading, projection, smoothing, merging."""
import json
import math

import numpy as np

# Reference latitude for the local equirectangular projection. At the Yuba's
# scale (~1.3 x 0.9 deg) distortion is < 0.5%, fine for a display map.
LAT0 = 39.4
KX = math.cos(math.radians(LAT0))


def project(lon, lat):
    """Lon/lat -> local km-ish coordinates (equal-ish area at map scale)."""
    return lon * KX * 111.32, lat * 111.32


def project_arr(coords):
    a = np.asarray(coords, dtype=float)
    out = a.copy()
    out[..., 0] = a[..., 0] * KX * 111.32
    out[..., 1] = a[..., 1] * 111.32
    return out


def load_geojson(path):
    with open(path) as f:
        return json.load(f)


def iter_lines(gj):
    """Yield (props, np.ndarray Nx2 lon/lat) for every LineString part."""
    for feat in gj.get("features", []):
        g = feat.get("geometry") or {}
        props = feat.get("properties", {})
        if g.get("type") == "LineString":
            yield props, np.asarray(g["coordinates"], dtype=float)[:, :2]
        elif g.get("type") == "MultiLineString":
            for part in g["coordinates"]:
                yield props, np.asarray(part, dtype=float)[:, :2]


def iter_polys(gj):
    """Yield (props, [rings]) for every Polygon part (rings = Nx2 lon/lat)."""
    for feat in gj.get("features", []):
        g = feat.get("geometry") or {}
        props = feat.get("properties", {})
        if g.get("type") == "Polygon":
            yield props, [np.asarray(r, dtype=float)[:, :2] for r in g["coordinates"]]
        elif g.get("type") == "MultiPolygon":
            for poly in g["coordinates"]:
                yield props, [np.asarray(r, dtype=float)[:, :2] for r in poly]


def chaikin(pts, iters=2, closed=False):
    """Chaikin corner-cutting for gently organic linework."""
    pts = np.asarray(pts, dtype=float)
    for _ in range(iters):
        if len(pts) < 3:
            return pts
        q = pts[:-1] * 0.75 + pts[1:] * 0.25
        r = pts[:-1] * 0.25 + pts[1:] * 0.75
        mid = np.empty((2 * len(q), 2))
        mid[0::2], mid[1::2] = q, r
        if closed:
            pts = mid
        else:
            pts = np.vstack([pts[:1], mid, pts[-1:]])
    return pts


def simplify(pts, tol):
    """Douglas-Peucker."""
    pts = np.asarray(pts, dtype=float)
    if len(pts) < 3:
        return pts
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i0, i1 = stack.pop()
        if i1 <= i0 + 1:
            continue
        seg = pts[i1] - pts[i0]
        L = np.hypot(*seg)
        if L == 0:
            d = np.hypot(*(pts[i0 + 1:i1] - pts[i0]).T)
        else:
            d = np.abs(np.cross(seg, pts[i0 + 1:i1] - pts[i0])) / L
        j = int(np.argmax(d))
        if d[j] > tol:
            k = i0 + 1 + j
            keep[k] = True
            stack += [(i0, k), (k, i1)]
    return pts[keep]


def merge_segments(segs, tol=1e-4):
    """Greedily chain segments whose endpoints touch (within tol, degrees).

    NHD flowlines come as many small pieces; merging gives long strokes that
    smooth nicely. Returns list of Nx2 arrays.
    """
    segs = [np.asarray(s, dtype=float) for s in segs if len(s) >= 2]
    used = [False] * len(segs)
    ends = np.array([[s[0], s[-1]] for s in segs])  # (n, 2, 2)
    chains = []
    for i in range(len(segs)):
        if used[i]:
            continue
        used[i] = True
        chain = list(map(tuple, segs[i]))
        grew = True
        while grew:
            grew = False
            head, tail = np.array(chain[0]), np.array(chain[-1])
            for j in range(len(segs)):
                if used[j]:
                    continue
                s0, s1 = ends[j]
                if np.hypot(*(tail - s0)) < tol:
                    chain += list(map(tuple, segs[j][1:]))
                elif np.hypot(*(tail - s1)) < tol:
                    chain += list(map(tuple, segs[j][::-1][1:]))
                elif np.hypot(*(head - s1)) < tol:
                    chain = list(map(tuple, segs[j][:-1])) + chain
                elif np.hypot(*(head - s0)) < tol:
                    chain = list(map(tuple, segs[j][::-1][:-1])) + chain
                else:
                    continue
                used[j] = True
                grew = True
                break
        chains.append(np.asarray(chain))
    chains.sort(key=len, reverse=True)
    return chains


def path_length_km(pts_lonlat):
    p = project_arr(pts_lonlat)
    return float(np.hypot(*(np.diff(p, axis=0)).T).sum())


def point_along(pts, frac):
    """Point + tangent angle (deg) at fraction `frac` of a polyline's length."""
    pts = np.asarray(pts, dtype=float)
    d = np.hypot(*(np.diff(pts, axis=0)).T)
    cum = np.concatenate([[0], np.cumsum(d)])
    target = cum[-1] * frac
    i = int(np.searchsorted(cum, target)) - 1
    i = max(0, min(i, len(pts) - 2))
    seg = cum[i + 1] - cum[i]
    t = 0 if seg == 0 else (target - cum[i]) / seg
    p = pts[i] * (1 - t) + pts[i + 1] * t
    ang = math.degrees(math.atan2(pts[i + 1, 1] - pts[i, 1],
                                  pts[i + 1, 0] - pts[i, 0]))
    if ang > 90:
        ang -= 180
    if ang < -90:
        ang += 180
    return p, ang
