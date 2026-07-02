"""Symbol vocabulary shared by both maps.

Reservoir = water-drop lens (triangle-over-dam tick), scaled by log capacity.
Powerhouse = small square with lightning slash.
Storage dam = heavy tick across the line. Diversion dam = open chevron.
Tunnels are dashed, canals solid, penstocks dotted — see style.LINESTYLE.
"""
import math

import numpy as np
from matplotlib.patches import Circle, FancyArrowPatch, Polygon, Rectangle

import style


def res_radius(capacity_af, base=2.4, k=1.9):
    """Symbol radius (pts-ish units caller scales) from acre-feet, log-scaled."""
    if not capacity_af or capacity_af <= 0:
        return base
    return base + k * math.log10(max(capacity_af, 100) / 100.0)


def draw_reservoir(ax, x, y, r, color=style.LAKE_FILL, edge=style.LAKE_EDGE,
                   zorder=6):
    """Lens-shaped reservoir symbol (flat bottom = the dam)."""
    th = np.linspace(0, math.pi, 40)
    xs = x + r * np.cos(th)
    ys = y + r * 0.85 * np.sin(th)
    pts = np.column_stack([np.append(xs, [x - r]), np.append(ys, [y])])
    p = Polygon(pts, closed=True, facecolor=color, edgecolor=edge,
                linewidth=1.0, zorder=zorder)
    ax.add_patch(p)
    ax.plot([x - r * 1.15, x + r * 1.15], [y, y], color=edge,
            lw=2.2, solid_capstyle="round", zorder=zorder + 0.1)
    return p


def draw_powerhouse(ax, x, y, s, color, zorder=7):
    p = Rectangle((x - s / 2, y - s / 2), s, s, facecolor="white",
                  edgecolor=color, linewidth=1.3, zorder=zorder)
    ax.add_patch(p)
    # lightning bolt
    bolt = np.array([[0.18, 0.82], [0.45, 0.52], [0.32, 0.52], [0.78, 0.18],
                     [0.55, 0.50], [0.68, 0.50], [0.18, 0.82]])
    bolt = (bolt - 0.5) * s + [x, y]
    ax.add_patch(Polygon(bolt, closed=True, facecolor=color,
                         edgecolor="none", zorder=zorder + 0.1))
    return p


def draw_div_dam(ax, x, y, s, color, angle=0, zorder=7):
    """Open chevron = diversion dam (water leaves the river here)."""
    a = math.radians(angle)
    base = np.array([[-1, 0.9], [0, -0.6], [1, 0.9]]) * s / 2
    rot = np.array([[math.cos(a), -math.sin(a)], [math.sin(a), math.cos(a)]])
    pts = base @ rot.T + [x, y]
    ax.add_patch(Polygon(pts, closed=False, fill=False, edgecolor=color,
                         linewidth=1.6, joinstyle="miter", zorder=zorder))


def draw_dam_tick(ax, x, y, s, color=style.INK, angle=90, zorder=7):
    a = math.radians(angle)
    dx, dy = math.cos(a) * s / 2, math.sin(a) * s / 2
    ax.plot([x - dx, x + dx], [y - dy, y + dy], color=color, lw=3.0,
            solid_capstyle="round", zorder=zorder)


def flow_arrow(ax, p0, p1, color, lw=1.4, style_key="canal", mutation=9,
               zorder=5, alpha=1.0, connectionstyle=None):
    ls = style.LINESTYLE.get(style_key, "-")
    arr = FancyArrowPatch(
        p0, p1, arrowstyle="-|>", mutation_scale=mutation, color=color,
        lw=lw, linestyle=ls, shrinkA=2, shrinkB=2, zorder=zorder, alpha=alpha,
        connectionstyle=connectionstyle or "arc3,rad=0.0", capstyle="round")
    ax.add_patch(arr)
    return arr


def mid_arrowhead(ax, pts, color, frac=0.55, size=8, zorder=6):
    """Small direction arrow at `frac` along a polyline (data coords)."""
    pts = np.asarray(pts, dtype=float)
    d = np.hypot(*(np.diff(pts, axis=0)).T)
    cum = np.concatenate([[0], np.cumsum(d)])
    if cum[-1] == 0:
        return
    t = cum[-1] * frac
    i = max(0, min(int(np.searchsorted(cum, t)) - 1, len(pts) - 2))
    p = pts[i] + (pts[i + 1] - pts[i]) * 0.5
    v = pts[i + 1] - pts[i]
    ax.annotate("", xy=p + v * 1e-3, xytext=p,
                arrowprops=dict(arrowstyle="-|>", color=color, lw=0,
                                mutation_scale=size), zorder=zorder,
                annotation_clip=True)
