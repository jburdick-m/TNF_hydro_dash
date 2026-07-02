"""Build the georeferenced artistic map:  maps/output/yuba_plumbing_map.pdf

Layers (bottom to top):
  paper -> tinted hillshade -> basin washes -> watershed boundary ->
  rivers (smoothed, tapered) -> canals/conduits by operator -> tunnels ->
  reservoirs -> structure symbols -> labels -> story callouts -> chrome.
"""
import json
import math
import os
import sys

import numpy as np

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb
from matplotlib.patches import PathPatch, Polygon as MplPolygon
from matplotlib.path import Path as MplPath

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import geo
import style
import symbols
from labeling import LabelEngine, halo

DATA = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "output")

# display window (lon/lat)
LON0, LON1 = -121.685, -120.355
LAT0, LAT1 = 39.015, 39.785
X0, Y0 = geo.project(LON0, LAT0)
X1, Y1 = geo.project(LON1, LAT1)

FIG_W = 24.0  # inches


def P(lon, lat):
    return geo.project(lon, lat)


# ---------------------------------------------------------------- base layers
def draw_paper_and_terrain(ax):
    ax.set_facecolor(style.PAPER)
    z = np.load(os.path.join(DATA, "hillshade.npz"))
    hs = z["hs"].astype(float) / 255.0
    b = z["bbox"]
    bx0, by0 = geo.project(b[0], b[1])
    bx1, by1 = geo.project(b[2], b[3])
    paper = np.array(to_rgb(style.PAPER))
    dark = np.array(to_rgb("#8f8567"))
    # multiply-style tint: shadows sink toward warm gray, light stays paper
    img = paper[None, None, :] * (0.62 + 0.38 * hs[..., None]) \
        + dark[None, None, :] * 0.10 * (1 - hs[..., None])
    ax.imshow(np.clip(img, 0, 1), extent=[bx0, bx1, by0, by1],
              origin="upper", zorder=0, interpolation="bilinear",
              aspect="auto")


def huc_polys(path):
    gj = geo.load_geojson(os.path.join(DATA, path))
    rings = []
    for _, rs in geo.iter_polys(gj):
        rings.append(geo.project_arr(rs[0]))
    return rings


def draw_basins(ax):
    yuba = huc_polys("huc8_18020125.geojson")
    bear = huc_polys("huc8_18020126.geojson")
    # dim the world outside the Yuba basin: big rect with the basin as a hole
    outer = np.array([[X0 - 50, Y0 - 50], [X1 + 50, Y0 - 50],
                      [X1 + 50, Y1 + 50], [X0 - 50, Y1 + 50],
                      [X0 - 50, Y0 - 50]])
    ring = max(yuba, key=len)
    verts = np.vstack([outer, ring[::-1], ring[-1:][::-1]])
    codes = ([MplPath.MOVETO] + [MplPath.LINETO] * (len(outer) - 1)
             + [MplPath.MOVETO] + [MplPath.LINETO] * len(ring))
    ax.add_patch(PathPatch(MplPath(verts, codes), facecolor=style.PAPER,
                           alpha=0.42, edgecolor="none", zorder=1.5))
    for r in bear:
        ax.add_patch(MplPolygon(r, closed=True, fill=False, zorder=2,
                                edgecolor=style.INK_MUTE, lw=0.8,
                                linestyle=(0, (1, 3))))
    for r in yuba:
        ax.add_patch(MplPolygon(r, closed=True, fill=False, zorder=2,
                                edgecolor=style.INK_SOFT, lw=1.6,
                                linestyle=(0, (5, 2.5))))
    return yuba, bear


RIVER_LW = {1: 3.4, 2: 2.3, 3: 1.3, 4: 0.85}
CONTEXT_RIVERS = {"Bear River", "Feather River", "Wolf Creek"}


def draw_rivers(ax, eng=None):
    lw = json.load(open(os.path.join(DATA, "linework.json")))
    chains_by_name = {}
    for nm, d in lw["rivers"].items():
        cls = d["class"]
        ctx = nm in CONTEXT_RIVERS
        kept = []
        for c in d["chains"]:
            p = geo.project_arr(np.array(c))
            p = geo.chaikin(geo.simplify(p, 0.03), 2)
            width = RIVER_LW[cls] * (0.75 if ctx else 1.0)
            a = 0.45 if ctx else (0.95 if cls <= 2 else 0.8)
            ax.plot(p[:, 0], p[:, 1], color=style.RIVER, lw=width,
                    solid_capstyle="round", solid_joinstyle="round",
                    zorder=4, alpha=a)
            if eng is not None:
                eng.add_line_data(p[:, 0], p[:, 1],
                                  step=max(1, len(p) // 150))
            kept.append(p)
        chains_by_name[nm] = kept
    return chains_by_name


def draw_canals(ax, eng=None):
    lw = json.load(open(os.path.join(DATA, "linework.json")))
    OWNER = {
        "South Yuba Canal": style.PGE, "Drum Canal": style.PGE,
        "Bear River Canal": style.PGE, "Chicago Park Ditch": style.NID,
        "Cascade Canal": style.NID, "D-S Canal": style.NID,
        "Cordua Canal": style.DEBRIS,
    }
    CONTEXT = {"Bear River Canal", "Chicago Park Ditch"}
    out = {}
    for nm, chains in lw["canals"].items():
        col = OWNER.get(nm, style.NID)
        ctx = nm in CONTEXT
        kept = []
        for c in chains:
            p = geo.project_arr(np.array(c))
            p = geo.chaikin(geo.simplify(p, 0.02), 2)
            ax.plot(p[:, 0], p[:, 1], color=col, lw=1.2 if ctx else 2.2,
                    zorder=5, solid_capstyle="round",
                    alpha=0.45 if ctx else 1.0)
            if eng is not None:
                eng.add_line_data(p[:, 0], p[:, 1], step=max(1, len(p) // 60))
            kept.append(p)
        out[nm] = kept
    return out


def draw_reservoirs(ax):
    gj = geo.load_geojson(os.path.join(DATA, "reservoirs.geojson"))
    centers = {}
    for props, rings in geo.iter_polys(gj):
        nm = props.get("GNIS_NAME") or ""
        area = props.get("AREASQKM") or 0
        r0 = geo.project_arr(rings[0])
        ax.add_patch(MplPolygon(r0, closed=True, facecolor=style.LAKE_FILL,
                                edgecolor=style.LAKE_EDGE, lw=0.9, zorder=6))
        cx, cy = r0[:, 0].mean(), r0[:, 1].mean()
        if nm not in centers or area > centers[nm][2]:
            centers[nm] = (cx, cy, area, r0)
    return centers


# ---------------------------------------------------------------- infra
def load_infra():
    with open(os.path.join(DATA, "yuba_infrastructure.json")) as f:
        return json.load(f)


def owner_color(owner):
    return {"PG&E": style.PGE, "NID": style.NID, "YWA": style.YWA,
            "USACE": style.DEBRIS, "BVID": style.DEBRIS,
            "DEBRIS": style.DEBRIS, "private": style.INK_MUTE}.get(
                owner, style.NID)


def draw_conveyances(ax, eng, infra, nhd_canals):
    """Manual-geometry conveyances + labels along every named conveyance."""
    for cv in infra["conveyances"]:
        col = owner_color(cv["owner"])
        if cv.get("nhd"):
            chains = [np.asarray(c) for c in nhd_canals.get(cv["nhd"], [])]
            if not chains:
                continue
            main_chain = max(chains, key=len)
        else:
            pts = geo.project_arr(np.array(cv["geometry"]))
            pts = geo.chaikin(pts, 2)
            ls = style.LINESTYLE.get(cv["kind"], "-")
            ax.plot(pts[:, 0], pts[:, 1], color=col, lw=2.4, linestyle=ls,
                    zorder=5.5, solid_capstyle="round")
            symbols.mid_arrowhead(ax, pts, col, frac=0.5, size=9, zorder=5.6)
            eng.add_line_data(pts[:, 0], pts[:, 1], step=max(1, len(pts)//40))
            main_chain = pts
        if not cv.get("label"):
            continue
        (lx, ly), ang = geo.point_along(main_chain, cv.get("label_frac", 0.5))
        side = cv.get("label_side", "above")
        rad = math.radians(ang + 90)
        off = {"above": 1.15, "below": -1.7, "left": 1.15,
               "right": -1.7}[side]
        if cv.get("label_off"):
            off = cv["label_off"] * (1 if off > 0 else -1)
        sx, sy = lx + math.cos(rad) * off, ly + math.sin(rad) * off
        t = ax.text(sx, sy, cv["label"], fontsize=8.2, family=style.SANS,
                    fontweight=600, color=col, ha="center", va="center",
                    rotation=ang, rotation_mode="anchor", zorder=12,
                    path_effects=halo())
        eng.reserve_artist(t)
        if cv.get("sub"):
            sx2 = lx + math.cos(rad) * (off - (1.05 if off > 0 else -1.05) * -1)
            # place sub one text-line further out
            sx2, sy2 = lx + math.cos(rad) * (off + (1.05 if off > 0 else -1.05)), \
                ly + math.sin(rad) * (off + (1.05 if off > 0 else -1.05))
            t2 = ax.text(sx2, sy2, cv["sub"], fontsize=7.0,
                         family=style.SANS, color=style.INK_SOFT,
                         ha="center", va="center", rotation=ang,
                         rotation_mode="anchor", zorder=12,
                         path_effects=halo())
            eng.reserve_artist(t2)


def draw_structures(ax, eng, infra):
    """Diversion dams & powerhouses (symbols now, labels via engine later)."""
    pts = []
    for st in infra["structures"]:
        x, y = P(st["lon"], st["lat"])
        col = owner_color(st["owner"])
        if st["kind"] == "diversion_dam":
            symbols.draw_div_dam(ax, x, y, 1.35, style.INK, zorder=8)
        else:
            symbols.draw_powerhouse(ax, x, y, 1.5, col, zorder=8)
        eng.add_obstacle_data(st["lon"], st["lat"], pad_px=8)
        if st.get("label"):
            pts.append((x, y, st))
    return pts


def draw_cities(ax, eng, infra):
    out = []
    for c in infra["cities"]:
        x, y = P(c["lon"], c["lat"])
        ax.scatter([x], [y], s=13, facecolor=style.PAPER,
                   edgecolor=style.INK, linewidths=1.1, zorder=9)
        eng.add_obstacle_data(c["lon"], c["lat"], pad_px=6)
        out.append((x, y, c["name"]))
    return out


def draw_landmarks(ax, eng, infra):
    out = []
    for lm in infra["landmarks"]:
        x, y = P(lm["lon"], lm["lat"])
        if "ft" in lm["name"]:
            ax.scatter([x], [y], marker="^", s=34, facecolor="none",
                       edgecolor=style.INK_SOFT, linewidths=1.2, zorder=8)
        else:
            ax.scatter([x], [y], marker="D", s=26, facecolor="none",
                       edgecolor=style.DEBRIS, linewidths=1.2, zorder=8)
        eng.add_obstacle_data(lm["lon"], lm["lat"], pad_px=7)
        out.append((x, y, lm))
    return out


def wrap_text(s, width_chars):
    import textwrap
    return "\n".join(textwrap.wrap(s, width_chars))


def _measure(ax, s, **kw):
    """Width/height of text `s` in data units (temp artist, measured)."""
    t = ax.text(X0 + 20, Y0 + 20, s, **kw)
    bb = t.get_window_extent(renderer=ax.figure.canvas.get_renderer())
    t.remove()
    inv = ax.transData.inverted()
    (x0, y0), (x1, y1) = inv.transform([(bb.x0, bb.y0), (bb.x1, bb.y1)])
    return abs(x1 - x0), abs(y1 - y0)


def story_rects(ax, infra):
    """Compute card rectangles (x, y, w, h) in data coords, measured."""
    body_kw = dict(fontsize=8.6, family=style.SERIF, linespacing=1.42)
    rects = []
    for st in infra["stories"]:
        x, y = P(st["box"][0], st["box"][1])   # top-left
        w = st.get("width", 15.0)
        chars = max(24, int(w * 3.4))
        body = wrap_text(st["text"], chars)
        bw, bh = _measure(ax, body, **body_kw)
        while bw > w - 1.9 and chars > 22:
            chars -= 2
            body = wrap_text(st["text"], chars)
            bw, bh = _measure(ax, body, **body_kw)
        tfs = 11.5
        tw, _ = _measure(ax, st["title"], fontsize=tfs, family=style.SERIF,
                         fontweight="bold", fontstyle="italic")
        if tw > w - 1.8:
            tfs = max(8.8, tfs * (w - 1.8) / tw)
        h = 2.15 + bh + 0.9
        rects.append((x, y - h, w, h, st, body, tfs))
    return rects


def draw_stories(ax, rects):
    for (x, y, w, h, st, body, tfs) in rects:
        draw_card(ax, x, y, w, h, z=20)
        ax.text(x + 0.9, y + h - 1.25, st["title"], fontsize=tfs,
                family=style.SERIF, fontweight="bold", fontstyle="italic",
                color=style.INK, ha="left", va="center", zorder=22)
        ax.text(x + 0.9, y + h - 2.25, body, fontsize=8.6,
                family=style.SERIF, color=style.INK_SOFT, ha="left",
                va="top", zorder=22, linespacing=1.42)
        # leader to anchor if close enough
        axp, ayp = P(*st["anchor"])
        cx, cy = x + w / 2, y + h / 2
        ex = min(max(axp, x), x + w)
        ey = min(max(ayp, y), y + h)
        d = math.hypot(axp - ex, ayp - ey)
        if st.get("leader") is False:
            d = 0
        if 1.0 < d < 14.0:
            ux, uy = axp - ex, ayp - ey
            ax.plot([ex + ux * 0.02, axp - ux * 0.06],
                    [ey + uy * 0.02, ayp - uy * 0.06],
                    color=style.INK_MUTE, lw=0.8, zorder=19.5)
            ax.scatter([axp], [ayp], s=10, facecolor=style.INK_MUTE,
                       edgecolor="none", zorder=19.6)


RIVER_LABELS = [
    ("North Yuba River", -120.99, 0.0, "NORTH YUBA RIVER", 11.5),
    ("Middle Yuba River", -120.87, 0.0, "MIDDLE YUBA RIVER", 10.5),
    ("South Yuba River", -120.88, 0.0, "SOUTH YUBA RIVER", 10.5),
    ("Yuba River", -121.505, 0.0, "YUBA RIVER", 12.5),
    ("Deer Creek", -121.115, 0.0, "Deer Creek", 9.0),
    ("Canyon Creek", -120.612, 0.0, "Canyon Ck", 8.5),
    ("Oregon Creek", -121.083, 0.0, "Oregon Ck", 8.0),
    ("Dry Creek", -121.36, 0.0, "Dry Creek", 8.5),
    ("Slate Creek", -121.09, 0.0, "Slate Ck", 8.0),
    ("Downie River", -120.834, 0.0, "Downie R.", 8.0),
    ("Fordyce Creek", -120.54, 0.0, "Fordyce Ck", 8.0),
    ("Bear River", -120.86, 0.0, "BEAR RIVER", 9.5),
    ("Feather River", -121.615, 0.0, "FEATHER RIVER", 9.5),
]


def draw_river_labels(ax, eng, rivers):
    for nm, lon_at, _, text, fs in RIVER_LABELS:
        chains = rivers.get(nm)
        if not chains:
            continue
        chain = max(chains, key=len)
        x_target = lon_at * geo.KX * 111.32
        d = np.abs(chain[:, 0] - x_target)
        i = int(np.argmin(d))
        frac_len = np.hypot(*np.diff(chain, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(frac_len)])
        frac = cum[i] / cum[-1] if cum[-1] > 0 else 0.5
        (lx, ly), ang = geo.point_along(chain, frac)
        ctx = nm in CONTEXT_RIVERS
        rad = math.radians(ang + 90)
        t = ax.text(lx + math.cos(rad) * 1.15, ly + math.sin(rad) * 1.15,
                    text, fontsize=fs, family=style.SERIF,
                    fontstyle="italic", fontweight=600,
                    color=style.RIVER if ctx else style.RIVER_DK,
                    alpha=0.65 if ctx else 1.0, ha="center", va="center",
                    rotation=ang, rotation_mode="anchor", zorder=11,
                    path_effects=halo())
        eng.reserve_artist(t)


# ---------------------------------------------------------------- chrome
def draw_title_block(ax):
    x, y = geo.project(-121.655, 39.73)
    kw = dict(ha="left", zorder=22)
    ax.text(x, y, "THE PLUMBING OF THE YUBA",
            fontsize=44, family=style.SERIF_DISPLAY, fontweight="bold",
            color=style.INK, va="top", **kw)
    ax.text(x + 0.15, y - 3.6, "How a Sierra Nevada river is stored, tunneled, and traded between watersheds",
            fontsize=17.5, family=style.SERIF, fontstyle="italic",
            color=style.INK_SOFT, va="top", **kw)
    ax.text(x + 0.15, y - 7.0,
            "Yuba River watershed, California  ·  1,339 square miles",
            fontsize=10.5, family=style.SANS, color=style.INK_MUTE,
            va="top", **kw)
    rule_y = y - 6.0
    ax.plot([x + 0.1, x + 42], [rule_y, rule_y], color=style.FRAME, lw=0.8,
            zorder=22)


def draw_card(ax, x, y, w, h, z=21):
    """Inset panel: paper card with hairline border and soft shadow."""
    ax.add_patch(plt.Rectangle((x + 0.35, y - 0.45), w, h, zorder=z - 0.2,
                               facecolor="#3a3426", alpha=0.18,
                               edgecolor="none"))
    ax.add_patch(plt.Rectangle((x, y), w, h, zorder=z - 0.1,
                               facecolor=style.PAPER,
                               edgecolor=style.FRAME, lw=1.0))


def legend_line(ax, x, y, color, kind, label, sub=None):
    ls = style.LINESTYLE.get(kind, "-")
    ax.plot([x, x + 2.6], [y, y], color=color, lw=2.2, linestyle=ls,
            solid_capstyle="round", zorder=22)
    ax.text(x + 3.3, y, label, fontsize=10.5, family=style.SANS,
            va="center", color=style.INK, zorder=22)
    if sub:
        ax.text(x + 3.3, y - 1.15, sub, fontsize=8.5, family=style.SANS,
                va="center", color=style.INK_MUTE, zorder=22)


def draw_legend(ax):
    """'How to read this map' card, left edge under the title block."""
    cx, cy = geo.project(-121.669, 39.34)   # card lower-left
    W, H = 22.5, 32.5
    draw_card(ax, cx, cy, W, H)
    x = cx + 1.5
    y = cy + H - 2.2
    ax.text(x, y, "HOW TO READ THIS MAP", fontsize=13, family=style.SANS,
            fontweight="bold", color=style.INK, zorder=22)
    ax.text(x, y - 1.9,
            "Color = who moves the water.\n"
            "Solid = open canal or flume.\n"
            "Dashed = tunnel, bored through a ridge.",
            fontsize=9.5, family=style.SANS, color=style.INK_SOFT,
            va="top", zorder=22, linespacing=1.55)
    yy = y - 8.2
    rows = [
        (style.RIVER, "-", "Natural river", "width = relative size"),
        (style.PGE, "-", "PG&E · Drum–Spaulding", "FERC 2310 · since 1913"),
        (style.NID, "-", "Nevada Irrigation District", "Yuba–Bear · FERC 2266 · 1965"),
        (style.YWA, "tunnel", "Yuba Water Agency", "Yuba River Dev. · FERC 2246 · 1969"),
        (style.DEBRIS, "-", "Irrigation & debris-era works", "USACE · local districts"),
    ]
    for col, kind, lab, sub in rows:
        legend_line(ax, x, yy, col, kind, lab, sub)
        yy -= 3.1
    # symbol rows
    sx = x + 1.2
    symbols.draw_reservoir(ax, sx, yy - 0.4, 0.95, zorder=22)
    ax.text(sx + 2.3, yy - 0.4, "Reservoir · dam at flat edge",
            fontsize=10.5, family=style.SANS, va="center", color=style.INK,
            zorder=22)
    yy -= 2.6
    symbols.draw_powerhouse(ax, sx, yy - 0.4, 1.5, style.INK_SOFT, zorder=22)
    ax.text(sx + 2.3, yy - 0.4, "Powerhouse", fontsize=10.5,
            family=style.SANS, va="center", color=style.INK, zorder=22)
    yy -= 2.6
    symbols.draw_div_dam(ax, sx, yy - 0.2, 1.6, style.INK_SOFT, zorder=22)
    ax.text(sx + 2.3, yy - 0.3, "Diversion dam · water leaves river",
            fontsize=10.5, family=style.SANS, va="center", color=style.INK,
            zorder=22)


def draw_frame(ax, fig):
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_xticks([])
    ax.set_yticks([])
    # double neatline
    fig_w, fig_h = fig.get_size_inches()
    pad_o, pad_i = 0.012, 0.018
    for pad, lw, col in [(pad_o, 2.6, style.FRAME), (pad_i, 0.9, style.FRAME)]:
        fig.add_artist(plt.Rectangle((pad, pad * fig_w / fig_h),
                                     1 - 2 * pad,
                                     1 - 2 * pad * fig_w / fig_h,
                                     transform=fig.transFigure, fill=False,
                                     lw=lw, edgecolor=col, zorder=50))


def draw_scalebar(ax, x, y, km=20):
    """x, y in data coords; bar of `km` kilometers with ticks each 5."""
    seg = km / 4
    for i in range(4):
        col = style.INK if i % 2 == 0 else style.PAPER
        ax.add_patch(plt.Rectangle((x + i * seg, y), seg, 0.55,
                                   facecolor=col, edgecolor=style.INK,
                                   lw=0.7, zorder=20))
    for i in range(0, 5, 2):
        ax.text(x + i * seg, y - 0.9, f"{int(i * seg)}",
                ha="center", va="top", fontsize=8.5, family=style.SANS,
                color=style.INK_SOFT, zorder=20)
    ax.text(x + km + 1.2, y - 0.9, "km", ha="left", va="top", fontsize=8.5,
            family=style.SANS, color=style.INK_SOFT, zorder=20)
    # miles below
    mi = km * 0.621371
    ax.text(x, y + 1.15, "0", ha="center", va="bottom", fontsize=8.5,
            family=style.SANS, color=style.INK_SOFT, zorder=20)
    ax.text(x + km, y + 1.15, f"{mi:.0f} mi", ha="center", va="bottom",
            fontsize=8.5, family=style.SANS, color=style.INK_SOFT, zorder=20)


def draw_north(ax, x, y, h=3.2):
    ax.annotate("", xy=(x, y + h), xytext=(x, y),
                arrowprops=dict(arrowstyle="-|>", color=style.INK,
                                lw=1.4, mutation_scale=16), zorder=20)
    ax.text(x, y + h + 0.6, "N", ha="center", va="bottom", fontsize=13,
            family=style.SERIF, fontweight="bold", color=style.INK, zorder=20)


def main():
    style.register_fonts()
    infra = load_infra()
    ratio = (Y1 - Y0) / (X1 - X0)
    fig = plt.figure(figsize=(FIG_W, FIG_W * ratio), dpi=100)
    pad = 0.018
    pad_v = pad / ratio
    ax = fig.add_axes([pad, pad_v, 1 - 2 * pad, 1 - 2 * pad_v])
    ax.set_xlim(X0, X1)
    ax.set_ylim(Y0, Y1)
    ax.set_aspect("equal")

    draw_paper_and_terrain(ax)
    draw_basins(ax)
    fig.canvas.draw()
    eng = LabelEngine(ax)
    rivers = draw_rivers(ax, eng)
    canals = draw_canals(ax, eng)
    lakes = draw_reservoirs(ax)
    for nm, (cx, cy, area, ring) in lakes.items():
        eng.add_line_data(ring[:, 0], ring[:, 1], step=max(1, len(ring)//30))
    draw_conveyances(ax, eng, infra, canals)
    struct_pts = draw_structures(ax, eng, infra)
    city_pts = draw_cities(ax, eng, infra)
    lm_pts = draw_landmarks(ax, eng, infra)

    # story cards: reserve rects as obstacles before ANY label placement
    from labeling import Box
    rects = story_rects(ax, infra)
    for (x, y, w, h, st, body, tfs) in rects:
        px0, py0 = ax.transData.transform((x, y))
        px1, py1 = ax.transData.transform((x + w, y + h))
        eng.obstacles.append(Box(px0, py0, px1, py1))
    # legend & title zones as obstacles
    for (lon0, lat0, lon1, lat1) in [(-121.6795, 39.335, -121.405, 39.638),
                                     (-121.675, 39.655, -121.10, 39.782)]:
        px0, py0 = ax.transData.transform(P(lon0, lat0))
        px1, py1 = ax.transData.transform(P(lon1, lat1))
        eng.obstacles.append(Box(px0, py0, px1, py1))

    draw_river_labels(ax, eng, rivers)

    # ---------------- point labels through the collision engine
    from labeling import default_offsets
    misses = []

    def place2(x, y, txt, **kw):
        """Two-pass placement: strict, then wider rings + tolerated hits."""
        t = eng.place(x, y, txt, **kw)
        if t is None:
            t = eng.place(x, y, txt,
                          offsets=default_offsets(10, 24, 44),
                          max_line_hits=3, **kw)
        if t is None:
            t = eng.place(x, y, txt,
                          offsets=default_offsets(12, 30, 55),
                          max_line_hits=8, allow_overlap_fallback=True, **kw)
        return t
    NAME_KW = dict(fontsize=9.5, family=style.SANS, fontweight=600,
                   color=style.INK, path_effects=halo(), zorder=13)
    MAJOR_KW = dict(fontsize=11, family=style.SANS, fontweight="bold",
                    color=style.INK, path_effects=halo(), zorder=13)
    SUB_COL = style.INK_SOFT
    res_centers = {}
    for r in infra["reservoirs"]:
        x, y = P(r["lon"], r["lat"])
        res_centers[r["name"]] = (x, y)
        if r.get("kind") == "diversion_dam":
            symbols.draw_div_dam(ax, x, y, 1.35, style.INK, zorder=8)
        txt = r["label"] + (f"\n{r['sub']}" if r.get("sub") else "")
        kw = MAJOR_KW if r.get("major") else NAME_KW
        t = place2(x, y, txt, linespacing=1.25,
                   leader_kw=dict(color=style.INK_MUTE, lw=0.7), **kw)
        if t is None:
            misses.append(("res", r["label"]))
    for (x, y, st) in struct_pts:
        txt = st["label"] + (f"\n{st['sub']}" if st.get("sub") else "")
        kw = dict(NAME_KW)
        kw["fontsize"] = 8.5
        if st.get("context"):
            kw["color"] = style.INK_SOFT
        t = place2(x, y, txt, linespacing=1.25,
                   leader_kw=dict(color=style.INK_MUTE, lw=0.7), **kw)
        if t is None:
            misses.append(("struct", st["label"]))
    for (x, y, nm) in city_pts:
        t = place2(x, y, nm, fontsize=9.5, family=style.SERIF,
                   fontstyle="italic", color=style.INK,
                   path_effects=halo(), zorder=12, leader=False)
        if t is None:
            misses.append(("city", nm))
    for (x, y, lm) in lm_pts:
        txt = lm["name"] + (f"\n{lm['note']}" if lm.get("note") else "")
        t = place2(x, y, txt, fontsize=8, family=style.SANS,
                   color=style.INK_SOFT, linespacing=1.25,
                   path_effects=halo(), zorder=12,
                   leader="ft" not in lm["name"])
        if t is None:
            misses.append(("landmark", lm["name"]))
    # free-floating italic annotations
    for an in infra.get("annotations", []):
        x, y = P(an["lon"], an["lat"])
        t = place2(x, y, an["text"], fontsize=8.3, family=style.SERIF,
                   fontstyle="italic", color=style.INK_SOFT,
                   linespacing=1.35, path_effects=halo(), zorder=11.5,
                   leader=False)
        if t is None:
            misses.append(("note", an["text"][:24]))
    if misses:
        print("UNPLACED LABELS:", misses)

    draw_stories(ax, rects)
    ax.text(*P(-120.372, 39.028),
            "Hydrography: USGS NHDPlus HR  ·  Terrain: USGS 3DEP  ·  Statistics: FERC 2310 / 2266 / 2246 records, SWRCB certifications, USGS & CDEC gauges  ·  An artistic schematic — not for navigation",
            fontsize=7.5, family=style.SANS, color=style.INK_SOFT,
            ha="right", va="bottom", zorder=22, path_effects=halo())
    draw_title_block(ax)
    draw_legend(ax)
    draw_frame(ax, fig)
    draw_scalebar(ax, *geo.project(-120.645, 39.055))
    draw_north(ax, *geo.project(-120.68, 39.049))

    os.makedirs(OUT, exist_ok=True)
    fig.savefig(os.path.join(OUT, "yuba_plumbing_map.pdf"))
    fig.savefig(os.path.join(OUT, "yuba_plumbing_map_preview.png"), dpi=72)
    print("wrote", os.path.join(OUT, "yuba_plumbing_map.pdf"))


if __name__ == "__main__":
    main()
