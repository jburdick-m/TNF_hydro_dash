"""Collision-aware label placement for the Yuba map pair.

A tiny greedy engine: every label proposes several candidate anchor positions
around its feature; we measure the true rendered text bbox (display coords),
score candidates against everything already placed plus user-supplied
obstacles (line geometry, markers, other text), and keep the best conflict-free
candidate. Optionally draws a leader line when the winning candidate is far
from the feature.

Works in display space so it is projection- and axes-agnostic.
"""
from dataclasses import dataclass, field

import numpy as np


@dataclass
class Box:
    x0: float
    y0: float
    x1: float
    y1: float

    def pad(self, p):
        return Box(self.x0 - p, self.y0 - p, self.x1 + p, self.y1 + p)

    def intersects(self, other):
        return not (self.x1 < other.x0 or other.x1 < self.x0
                    or self.y1 < other.y0 or other.y1 < self.y0)

    def area_overlap(self, other):
        dx = min(self.x1, other.x1) - max(self.x0, other.x0)
        dy = min(self.y1, other.y1) - max(self.y0, other.y0)
        return max(dx, 0) * max(dy, 0)


@dataclass
class LabelEngine:
    """Greedy label placer for one matplotlib Axes."""
    ax: object
    placed: list = field(default_factory=list)       # list[Box] display coords
    obstacles: list = field(default_factory=list)    # list[Box]
    line_pts: list = field(default_factory=list)     # Nx2 display points to avoid

    # ---------------------------------------------------------------- helpers
    def _renderer(self):
        fig = self.ax.figure
        if fig.canvas.get_renderer() is None:  # pragma: no cover
            fig.canvas.draw()
        return fig.canvas.get_renderer()

    def add_obstacle_box(self, x, y, w, h):
        """Reserve a display-space box (e.g. a marker) so labels avoid it."""
        self.obstacles.append(Box(x - w / 2, y - h / 2, x + w / 2, y + h / 2))

    def add_obstacle_data(self, x, y, pad_px=6):
        px, py = self.ax.transData.transform((x, y))
        self.obstacles.append(Box(px - pad_px, py - pad_px, px + pad_px, py + pad_px))

    def add_line_data(self, xs, ys, step=1):
        """Register a polyline (data coords) whose vertices labels should avoid."""
        pts = self.ax.transData.transform(np.column_stack([xs, ys])[::step])
        self.line_pts.extend(pts.tolist())

    def _text_box(self, text_artist):
        bb = text_artist.get_window_extent(renderer=self._renderer())
        return Box(bb.x0, bb.y0, bb.x1, bb.y1)

    def _line_penalty(self, box, pad=2):
        b = box.pad(pad)
        if not self.line_pts:
            return 0
        pts = np.asarray(self.line_pts)
        inside = ((pts[:, 0] > b.x0) & (pts[:, 0] < b.x1)
                  & (pts[:, 1] > b.y0) & (pts[:, 1] < b.y1))
        return int(inside.sum())

    # ---------------------------------------------------------------- placing
    def place(self, x, y, text, *, offsets=None, pad_px=3, leader=True,
              leader_kw=None, avoid_lines=True, max_line_hits=0,
              allow_overlap_fallback=False, clip_margin_px=4, **text_kw):
        """Place `text` near data point (x, y) picking the least-bad candidate.

        offsets: list of (dx_px, dy_px, ha, va) candidates, tried in order;
                 earlier candidates win ties (small distance bonus).
        Returns the Text artist, or None if nothing fit and fallback disabled.
        """
        if offsets is None:
            offsets = default_offsets()
        px, py = self.ax.transData.transform((x, y))
        fig = self.ax.figure
        axbb = self.ax.get_window_extent(renderer=self._renderer())

        best = None
        for rank, (dx, dy, ha, va) in enumerate(offsets):
            t = self.ax.annotate(
                text, xy=(x, y), xytext=(dx, dy), textcoords="offset points",
                ha=ha, va=va, annotation_clip=False, **text_kw)
            box = self._text_box(t).pad(pad_px)
            # out-of-axes check
            if (box.x0 < axbb.x0 + clip_margin_px or box.x1 > axbb.x1 - clip_margin_px
                    or box.y0 < axbb.y0 + clip_margin_px or box.y1 > axbb.y1 - clip_margin_px):
                t.remove()
                continue
            overlap = sum(box.area_overlap(b) for b in self.placed)
            overlap += sum(box.area_overlap(b) for b in self.obstacles)
            hits = self._line_penalty(box) if avoid_lines else 0
            score = overlap * 10 + hits * 40 + rank * 6 + np.hypot(dx, dy)
            if overlap == 0 and hits <= max_line_hits:
                if best is not None:
                    best[1].remove()
                self.placed.append(box)
                self._maybe_leader(t, px, py, dx, dy, leader, leader_kw)
                return t
            if best is None or score < best[0]:
                if best is not None:
                    best[1].remove()
                best = (score, t, box, dx, dy)
            else:
                t.remove()
        if best is not None:
            score, t, box, dx, dy = best
            if allow_overlap_fallback:
                self.placed.append(box)
                self._maybe_leader(t, px, py, dx, dy, leader, leader_kw)
                return t
            t.remove()
        return None

    def _maybe_leader(self, t, px, py, dx, dy, leader, leader_kw):
        if not leader or np.hypot(dx, dy) < 14:
            return
        kw = dict(color="#8d8471", lw=0.6, alpha=0.9, zorder=t.get_zorder() - 0.1)
        if leader_kw:
            kw.update(leader_kw)
        # draw from feature point toward the text anchor, stopping short
        inv = self.ax.transData.inverted()
        tx, ty = px + dx * self.ax.figure.dpi / 72, py + dy * self.ax.figure.dpi / 72
        ux, uy = tx - px, ty - py
        d = np.hypot(ux, uy)
        sx, sy = px + ux / d * 5, py + uy / d * 5
        ex, ey = px + ux / d * (d - 4), py + uy / d * (d - 4)
        (x0, y0), (x1, y1) = inv.transform([(sx, sy), (ex, ey)])
        self.ax.plot([x0, x1], [y0, y1], solid_capstyle="round", **kw)

    def reserve_artist(self, artist, pad_px=2):
        """Mark an existing artist's bbox as occupied."""
        bb = artist.get_window_extent(renderer=self._renderer())
        self.placed.append(Box(bb.x0, bb.y0, bb.x1, bb.y1).pad(pad_px))


def default_offsets(r1=7, r2=16, r3=30):
    """Candidate offsets ringing the feature: near, medium, far, 8 directions."""
    out = []
    for r in (r1, r2, r3):
        out += [
            (r, r * 0.55, "left", "bottom"),
            (-r, r * 0.55, "right", "bottom"),
            (r, -r * 0.55, "left", "top"),
            (-r, -r * 0.55, "right", "top"),
            (0, r, "center", "bottom"),
            (0, -r, "center", "top"),
            (r * 1.2, 0, "left", "center"),
            (-r * 1.2, 0, "right", "center"),
        ]
    return out


def halo(fg="#26221a", bg="#f6f1e3", lw=2.5):
    """path_effects kwargs for paper-colored text halo."""
    import matplotlib.patheffects as pe
    return [pe.withStroke(linewidth=lw, foreground=bg)]
