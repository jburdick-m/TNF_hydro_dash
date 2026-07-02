"""Build the schematic engineering diagram: maps/output/yuba_schematic.pdf

A tube-map-style flow diagram. Geography is abandoned: each stream is a
straight line, flow runs left (headwaters) to right (valley), and every
diversion is an explicit connector. Not to scale, deliberately.

Coordinate system: x 0..100 (downstream-ish), y 0..64 (streams stacked).
All label positions are hand-tuned against the geometry; if you move a line,
re-render and check its neighborhood.
"""
import os
import sys

import numpy as np

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import style
import symbols
from labeling import halo

OUT = os.path.join(HERE, "output")

# ------------------------------------------------------------------ rows
Y_NORTH = 52.0
Y_OREGON = 45.5
Y_MIDDLE = 40.0
Y_CANYON = 30.0
Y_SOUTH = 21.0
Y_DEER = 11.5
Y_BEAR = 3.5
Y_MAIN = 32.0

RIVER_LW_MAIN = 3.2
RIVER_LW_FORK = 2.4
RIVER_LW_THIN = 1.1   # reach below a heavy diversion

# The diagram is authored west->east left->right, then mirrored so that
# headwaters sit on the RIGHT (east), matching the geographic map view.
def FX(x):
    return 100.0 - x


def _flip_rot(rot):
    r = -rot
    if r < -90:
        r += 180
    elif r > 90:
        r -= 180
    return r


def river_path(ax, pts, lw=RIVER_LW_FORK, color=style.RIVER, z=4, alpha=1.0):
    pts = np.asarray(pts, float).copy()
    pts[:, 0] = FX(pts[:, 0])
    ax.plot(pts[:, 0], pts[:, 1], color=color, lw=lw, zorder=z,
            solid_capstyle="round", solid_joinstyle="round", alpha=alpha)
    return pts


def conveyance(ax, pts, color, kind="canal", lw=2.0, z=5, arrow_frac=0.55):
    pts = np.asarray(pts, float).copy()
    pts[:, 0] = FX(pts[:, 0])
    ls = style.LINESTYLE.get(kind, "-")
    ax.plot(pts[:, 0], pts[:, 1], color=color, lw=lw, linestyle=ls, zorder=z,
            solid_capstyle="round")
    symbols.mid_arrowhead(ax, pts, color, frac=arrow_frac, size=11,
                          zorder=z + 0.1)
    return pts


def main():
    style.register_fonts()
    fig = plt.figure(figsize=(22, 15), dpi=100)
    ax = fig.add_axes([0.015, 0.015, 0.97, 0.97])
    ax.set_xlim(0, 100)
    ax.set_ylim(-3.5, 64)
    ax.set_facecolor(style.PAPER)
    fig.patch.set_facecolor(style.PAPER)
    ax.set_xticks([])
    ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    fig.canvas.draw()

    # ------------------------------------------------------------ rivers
    C = (74, Y_MAIN)  # North/Middle confluence -> "Yuba River" begins
    river_path(ax, [(6, Y_NORTH), (54, Y_NORTH)])
    river_path(ax, [(54, Y_NORTH), (74 - (Y_NORTH - Y_MAIN), Y_NORTH), C],
               lw=RIVER_LW_FORK)
    river_path(ax, [(13, Y_NORTH + 5), (18, Y_NORTH)], lw=1.2)   # Downie
    river_path(ax, [(39, Y_NORTH + 5), (44, Y_NORTH)], lw=1.2)   # Slate Ck
    conveyance(ax, [(41.5, Y_NORTH + 2.6), (39.9, Y_NORTH + 4.9)],
               style.INK_MUTE, "tunnel", lw=1.1, arrow_frac=0.75)
    river_path(ax, [(8, Y_MIDDLE), (15, Y_MIDDLE)])
    river_path(ax, [(15, Y_MIDDLE), (52, Y_MIDDLE)], lw=RIVER_LW_THIN)
    river_path(ax, [(52, Y_MIDDLE), (74 - (Y_MIDDLE - Y_MAIN), Y_MIDDLE), C],
               lw=RIVER_LW_FORK)
    river_path(ax, [(38, Y_OREGON), (46.5, Y_OREGON)], lw=1.2)   # Oregon Ck
    river_path(ax, [(46.5, Y_OREGON), (52, Y_MIDDLE)], lw=RIVER_LW_THIN)
    river_path(ax, [(13, Y_CANYON), (27, Y_CANYON)], lw=1.4)     # Canyon Ck
    river_path(ax, [(27, Y_CANYON), (40, Y_CANYON), (49, Y_SOUTH)],
               lw=RIVER_LW_THIN)
    river_path(ax, [(29, Y_CANYON + 4.5), (27.3, Y_CANYON + 1.7)],
               lw=1.0)                                           # Jackson Ck
    river_path(ax, [(12, Y_SOUTH), (33, Y_SOUTH)])               # S Yuba
    river_path(ax, [(33, Y_SOUTH), (67, Y_SOUTH),
                    (67 + (Y_MAIN - Y_SOUTH), Y_MAIN)], lw=RIVER_LW_THIN)
    river_path(ax, [(28.6, Y_SOUTH + 4.8), (31.9, Y_SOUTH + 1.5)],
               lw=1.2)                                           # Fordyce Ck
    river_path(ax, [(40, Y_DEER), (64, Y_DEER),
                    (64 + (Y_MAIN - Y_DEER), Y_MAIN)], lw=1.4)   # Deer Ck
    river_path(ax, [C, (97, Y_MAIN)], lw=RIVER_LW_MAIN)          # Yuba
    river_path(ax, [(97, Y_MAIN + 16), (97, Y_MAIN - 24)], lw=2.2,
               alpha=0.4)                                        # Feather
    river_path(ax, [(28, Y_BEAR), (96.5, Y_BEAR)], lw=1.8, alpha=0.4)

    # ------------------------------------------------------------ conveyances
    # Milton-Bowman tunnel: Middle Yuba -> Bowman Lake (enters from above)
    conveyance(ax, [(15, Y_MIDDLE - 0.3), (15, Y_CANYON + 4.0),
                    (24.4, Y_CANYON + 1.9), (25.1, Y_CANYON + 1.3)],
               style.NID, "tunnel")
    # Bowman-Spaulding conduit: Bowman dam -> Spaulding 3 -> lake
    conveyance(ax, [(25.4, Y_CANYON - 0.15), (25.4, Y_SOUTH + 3.8),
                    (27.9, Y_SOUTH + 1.5)], style.NID, "canal")
    conveyance(ax, [(29.1, Y_SOUTH + 1.2), (31.3, Y_SOUTH + 1.05)],
               style.NID, "canal", lw=1.4, arrow_frac=0.6)
    # Lohman Ridge tunnel: Our House (Middle) -> Oregon Ck at Log Cabin
    conveyance(ax, [(40, Y_MIDDLE + 0.3), (40, Y_OREGON - 1.6),
                    (42.5, Y_OREGON - 0.3)], style.YWA, "tunnel")
    # Camptonville tunnel: Log Cabin (Oregon) -> New Bullards Bar
    conveyance(ax, [(46.8, Y_OREGON + 0.3), (49.3, Y_OREGON + 2.8),
                    (49.3, Y_NORTH - 1.6), (50.6, Y_NORTH - 0.6)],
               style.YWA, "tunnel")
    # New Colgate tunnel & penstock: NBB dam -> PH above the forks
    conveyance(ax, [(54.6, Y_NORTH - 0.9), (55.9, Y_NORTH - 3.3),
                    (71.3, Y_NORTH - 3.3 - 15.4)], style.YWA, "penstock")
    conveyance(ax, [(72.5, Y_MAIN + 1.0), (73.6, Y_MAIN + 0.15)],
               style.YWA, "penstock", lw=1.4)
    # Drum Canal: Spaulding -> Bear basin (Drum Forebay)
    conveyance(ax, [(31.8, Y_SOUTH - 1.3), (31.8, Y_BEAR + 4.5),
                    (35.1, Y_BEAR + 0.9)], style.PGE, "canal")
    # South Yuba Canal: Spaulding -> Deer Creek powerhouse
    conveyance(ax, [(34.4, Y_SOUTH - 1.1), (34.4, Y_DEER + 4.8),
                    (39.4, Y_DEER + 0.6)], style.PGE, "canal")
    # NID distribution canals off Deer Creek at Scotts Flat
    conveyance(ax, [(48.5, Y_DEER - 0.2), (52.3, Y_DEER - 4.0)], style.NID,
               "canal", lw=1.4)
    conveyance(ax, [(45.0, Y_DEER - 0.2), (48.8, Y_DEER - 4.0)], style.NID,
               "canal", lw=1.4)
    # Daguerre Point diversions (steep exits)
    conveyance(ax, [(90.55, Y_MAIN + 1.15), (91.6, Y_MAIN + 3.1)],
               style.DEBRIS, "canal", lw=1.4)
    conveyance(ax, [(90.55, Y_MAIN - 1.15), (91.6, Y_MAIN - 3.1)],
               style.DEBRIS, "canal", lw=1.4)

    # ------------------------------------------------------------ reservoirs
    R = {
        "Jackson Meadows": (8, Y_MIDDLE, 69205),
        "Milton": (15, Y_MIDDLE, 295),
        "French Lake": (13, Y_CANYON, 13940),
        "Faucherie": (17, Y_CANYON, 3980),
        "Sawmill": (21, Y_CANYON, 3030),
        "Bowman Lake": (26, Y_CANYON, 68510),
        "Fordyce Lake": (27.5, Y_SOUTH + 5.9, 49426),
        "Lake Spaulding": (33, Y_SOUTH, 75912),
        "New Bullards Bar": (51.8, Y_NORTH, 966103),
        "Scotts Flat": (46.5, Y_DEER, 48547),
        "Lake Wildwood": (60, Y_DEER, 3840),
        "Englebright Lake": (79, Y_MAIN, 70000),
        "Drum Forebay": (35.6, Y_BEAR + 0.6, 800),
    }
    res_xy = {}
    for nm, (x, y, af) in R.items():
        r = symbols.res_radius(af, base=0.55, k=0.42)
        symbols.draw_reservoir(ax, FX(x), y, r)
        res_xy[nm] = (x, y, r)

    # ------------------------------------------------------------ structures
    PH = [
        (25.9, Y_CANYON - 0.85, "Bowman", style.NID),
        (28.5, Y_SOUTH + 1.35, "Spaulding 3", style.PGE),
        (31.2, Y_SOUTH - 0.75, "Spaulding 1", style.PGE),
        (34.9, Y_SOUTH - 0.75, "Spaulding 2", style.PGE),
        (36.9, Y_BEAR + 1.6, "Drum", style.PGE),
        (39.6, Y_DEER + 0.55, "Deer Creek", style.NID),
        (72.0, Y_MAIN + 1.35, "New Colgate", style.YWA),
        (79.6, Y_MAIN - 0.9, "Narrows", style.YWA),
    ]
    for x, y, nm, col in PH:
        symbols.draw_powerhouse(ax, FX(x), y, 1.15, col)
    for x, y in [(15, Y_MIDDLE), (40, Y_MIDDLE), (46.5, Y_OREGON),
                 (90, Y_MAIN)]:
        symbols.draw_div_dam(ax, FX(x), y, 1.5, style.INK, zorder=8)
    # storage dam ticks
    symbols.draw_dam_tick(ax, FX(54.15), Y_NORTH, 2.6, style.INK)
    symbols.draw_dam_tick(ax, FX(81.15), Y_MAIN, 1.8, style.INK)

    fig.canvas.draw()

    # ============================================================ text
    def TC(x, y, s, fs=10.5, fam=style.SANS, fw=600, col=style.INK,
           ha="center", va="center", rot=0, ls=1.35, z=12, fstyle="normal",
           alpha=1.0):
        return ax.text(x, y, s, fontsize=fs, family=fam, fontweight=fw,
                       color=col, ha=ha, va=va, rotation=rot,
                       rotation_mode="anchor", zorder=z, linespacing=ls,
                       fontstyle=fstyle, alpha=alpha,
                       path_effects=halo(bg=style.PAPER))

    def T(x, y, s, fs=10.5, fam=style.SANS, fw=600, col=style.INK,
          ha="center", va="center", rot=0, ls=1.35, z=12, fstyle="normal",
          alpha=1.0):
        ha = {"left": "right", "right": "left"}.get(ha, ha)
        return TC(FX(x), y, s, fs=fs, fam=fam, fw=fw, col=col, ha=ha, va=va,
                  rot=_flip_rot(rot), ls=ls, z=z, fstyle=fstyle, alpha=alpha)

    def SUB(x, y, s, ha="center", rot=0, fs=8.2, va="center", alpha=1.0):
        return T(x, y, s, fs=fs, fw=400, col=style.INK_SOFT, ha=ha, va=va,
                 rot=rot)

    # river names
    RN = dict(fs=13, fam=style.SERIF, fstyle="italic", fw=600,
              col=style.RIVER_DK, ha="right")
    T(5.4, Y_NORTH, "NORTH YUBA", **RN)
    T(7.4, Y_MIDDLE - 1.5, "MIDDLE YUBA", **RN)
    T(10.2, Y_CANYON, "CANYON CREEK", **RN)
    T(11.4, Y_SOUTH, "SOUTH YUBA", **RN)
    T(38.2, Y_DEER, "DEER CREEK", **RN)
    T(37.4, Y_OREGON, "OREGON CK", fs=10, fam=style.SERIF, fstyle="italic",
      fw=600, col=style.RIVER_DK, ha="right")
    T(27.4, Y_BEAR, "BEAR RIVER", fs=13, fam=style.SERIF, fstyle="italic",
      fw=600, col=style.RIVER, ha="right", alpha=0.65)
    T(96.2, Y_MAIN - 11.5, "FEATHER\nRIVER", fs=11, fam=style.SERIF,
      fstyle="italic", fw=600, col=style.RIVER, ha="right", va="top",
      alpha=0.75)
    T(75.2, Y_MAIN + 0.6, "Yuba River", fs=11.5, fam=style.SERIF,
      fstyle="italic", fw=700, col=style.RIVER_DK, va="bottom")
    T(94.6, Y_MAIN - 1.1, "Marysville", fs=9, fam=style.SERIF,
      fstyle="italic", fw=400, col=style.INK_SOFT, va="top")
    # spurs
    SP = dict(fs=9, fam=style.SERIF, fstyle="italic", fw=400,
              col=style.RIVER_DK, ha="right")
    T(12.6, Y_NORTH + 5.0, "Downie R.", **SP)
    T(38.6, Y_NORTH + 5.0, "Slate Ck", **SP)
    SUB(39.8, Y_NORTH + 5.9, "Slate Ck Diversion → South Feather\nPower Project (Feather basin)", fs=7.5)
    T(28.0, Y_SOUTH + 5.4, "Fordyce Ck", **SP)
    T(29.4, Y_CANYON + 4.9, "Jackson Ck", fs=9, fam=style.SERIF,
      fstyle="italic", fw=400, col=style.RIVER_DK, ha="left")

    # ----------------------------------------------------- reservoir labels
    def rlabel(key, dx, dy, name, sub=None, fw=600, fs=10.5, ha="center"):
        x, y, r = res_xy[key]
        T(x + dx, y + dy, name, fw=fw, fs=fs, ha=ha)
        if sub:
            SUB(x + dx, y + dy - 1.15, sub, ha=ha)

    rlabel("Jackson Meadows", 0, 3.4, "Jackson Meadows",
           "69,205 af · NID · 1965")
    rlabel("Milton", 3.4, 2.3, "Milton Diversion Dam · 295 af", fs=9.5)
    rlabel("French Lake", -2.6, 1.9, "French Lake",
           "13,940 af · 1859", ha="right", fs=9.5)
    rlabel("Faucherie", 0, 1.9, "Faucherie · 3,980 af", fs=9.5)
    rlabel("Sawmill", -0.4, -1.8, "Sawmill · 3,030 af", fs=9.5)
    rlabel("Bowman Lake", 0.6, 4.4, "Bowman Lake",
           "68,510 af · NID · 1876 / 1927")
    rlabel("Fordyce Lake", 2.9, 0.3, "Fordyce Lake",
           "49,426 af · PG&E · 1873", ha="left", fs=9.5)
    rlabel("Lake Spaulding", 3.3, 2.7, "LAKE SPAULDING",
           "75,912 af · PG&E · 1913", fw=700)
    rlabel("New Bullards Bar", 0, 4.6, "NEW BULLARDS BAR",
           "966,103 af · Yuba Water · 1969", fw=700)
    rlabel("Scotts Flat", 1.1, 3.1, "Scotts Flat", "48,547 af · NID · 1948")
    rlabel("Lake Wildwood", 0, 2.75, "Lake Wildwood",
           "3,840 af · private · 1970", fs=9.5)
    rlabel("Englebright Lake", -1.9, 3.4, "ENGLEBRIGHT",
           "70,000 af · USACE · 1941", fw=700)
    rlabel("Drum Forebay", -1.1, -1.7, "Drum Forebay", fs=9.5)

    # ----------------------------------------------------- structure labels
    T(40, Y_MIDDLE - 1.8, "Our House Div. Dam", fs=9.5)
    T(52.3, Y_OREGON - 1.2, "Log Cabin Div. Dam", fs=9.5)
    T(86.9, Y_MAIN + 2.4, "Daguerre Point Dam", fs=9.5)
    SUB(86.9, Y_MAIN + 1.45, "1906 debris dam · USACE")
    T(30.0, Y_CANYON - 1.1, "Bowman PH · 3.6 MW", fs=9, ha="left")
    ax.plot([FX(26.7), FX(29.8)], [Y_CANYON - 0.9, Y_CANYON - 1.1],
            color=style.INK_MUTE, lw=0.6, zorder=11)
    T(24.2, Y_SOUTH + 1.3, "Spaulding 3 · 5.8 MW", fs=9, ha="right")
    ax.plot([FX(24.4), FX(27.7)], [Y_SOUTH + 1.3, Y_SOUTH + 1.25],
            color=style.INK_MUTE, lw=0.6, zorder=11)
    T(27.6, Y_SOUTH - 1.6, "Spaulding 1 · 7 MW", fs=9, ha="right")
    T(38.2, Y_SOUTH - 1.6, "Spaulding 2 · 4.4 MW", fs=9, ha="left")
    T(41.5, Y_BEAR + 1.4, "Drum 1 & 2 · 105.9 MW", fs=9.5, ha="left")
    SUB(41.5, Y_BEAR + 0.4, "PG&E's first plant, 1913", ha="left")
    T(37.6, Y_DEER - 1.5, "Deer Creek PH · 5.7 MW", fs=9.5)
    SUB(37.6, Y_DEER - 2.5, "PG&E's first construction project, 1908 — now NID's")
    T(69.4, Y_MAIN - 2.1, "NEW COLGATE PH", fw=700, fs=10.5)
    SUB(69.4, Y_MAIN - 3.1, "340 MW · 1,306-ft head · largest Pelton wheels ever cast")
    ax.plot([FX(70.6), FX(71.8)], [Y_MAIN - 1.55, Y_MAIN + 0.75],
            color=style.INK_MUTE, lw=0.6, zorder=11)
    T(76.0, Y_MAIN - 0.9, "Narrows 1 & 2\n12 + 55 MW", fs=8.5, ha="left",
      va="top")

    # ----------------------------------------------------- conveyance labels
    NID_, PGE_, YWA_, DEB_ = style.NID, style.PGE, style.YWA, style.DEBRIS
    T(16.2, 37.4, "MILTON–BOWMAN TUNNEL", fs=9.5, col=NID_, ha="left")
    SUB(16.2, 35.9, "450 cfs max · takes ~96% of the\nMiddle Yuba's Jul–Sep flow",
        ha="left")
    T(24.6, 26.5, "BOWMAN–SPAULDING\nCONDUIT", fs=9.5, col=NID_, ha="right")
    SUB(24.6, 24.4, "300 cfs · ~97% of Bowman's\nsummer releases", ha="right")
    T(41.0, 43.4, "LOHMAN RIDGE TUNNEL", fs=9.5, col=YWA_, ha="left")
    SUB(41.0, 42.3, "860 cfs · 3.7 mi", ha="left")
    T(48.4, 49.6, "CAMPTONVILLE TUNNEL", fs=9.5, col=YWA_, ha="right")
    SUB(48.4, 48.5, "1,100 cfs · 1.2 mi", ha="right")
    T(63.2, 42.3, "NEW COLGATE TUNNEL & PENSTOCK", fs=9.5, col=YWA_, rot=-45)
    SUB(59.7, 38.5, "3,430 cfs · 26-ft bore · 5.2 mi")
    T(30.9, 13.2, "DRUM CANAL", fs=9.5, col=PGE_, ha="right")
    SUB(30.9, 11.6, "840 cfs · ~200,000 af/yr\nexported to the Bear basin",
        ha="right")
    T(36.2, 16.9, "SOUTH YUBA CANAL", fs=9.5, col=PGE_, rot=-50)
    SUB(42.7, 16.1, "146 cfs · dug 1854–58")
    T(52.8, 9.4, "CASCADE CANAL", fs=8.5, col=NID_, rot=-45)
    T(45.6, 9.4, "D–S CANAL", fs=8.5, col=NID_, rot=-45)
    SUB(45.5, 6.4, "NID distribution — 500 mi of canals serve\nNevada City, Grass Valley & 30,000 acres")
    T(91.6, Y_MAIN + 4.6, "HALLWOOD–CORDUA", fs=9, col=DEB_)
    SUB(91.6, Y_MAIN + 3.7, "625 cfs")
    T(91.6, Y_MAIN - 4.1, "SOUTH YUBA–BROPHY", fs=9, col=DEB_)
    SUB(91.6, Y_MAIN - 5.1, "lower-river diversions: 1,085 cfs")
    SUB(66, Y_BEAR + 1.1,
        "→ Dutch Flat · Chicago Park · Rollins — the Bear River staircase runs largely on Yuba water")

    # ----------------------------------------------------- flow badges
    BD = dict(fs=8.2, fam=style.SANS, fw=400, col=style.INK_SOFT,
              fstyle="italic")
    T(31, Y_MIDDLE + 0.9, "for 50 years the river below kept 3–5 cfs;\nnew license: 11–120 cfs by season", va="bottom", **BD)
    T(57, Y_SOUTH + 0.9, "the dam's river outlet passes just 16 cfs — spills\nreach the river via Dam No. 2's Jordan Ck channel", va="bottom", **BD)
    T(58.5, Y_MIDDLE - 3.4, "two-tunnel relay: about half of the\nMiddle Yuba's July flow ends up\nin New Bullards Bar", **BD)
    T(9.5, Y_NORTH - 2.6, "the least-diverted fork —\nfamous free-flowing whitewater", ha="left", **BD)

    # ============================================================ chrome
    TC(2.2, 63.4, "YUBA WATERWORKS", fs=34, fam=style.SERIF_DISPLAY, fw=700,
       ha="left", va="top")
    TC(2.35, 60.3, "An engineering schematic of every major dam, tunnel, canal & powerhouse",
       fs=14, fam=style.SERIF, fstyle="italic", fw=500, col=style.INK_SOFT,
       ha="left", va="top")
    ax.plot([2.4, 34.5], [58.95, 58.95], color=style.FRAME, lw=0.8, zorder=22)
    TC(2.35, 58.4, "Flow runs east → west: headwaters at right, valley at left — matching the map view  ·  not to scale  ·  reservoir symbols scale with log capacity",
       fs=9.5, fw=400, col=style.INK_MUTE, ha="left", va="top")

    # legend (center-left void of the mirrored diagram)
    lx, ly = 7.0, 2.6
    ax.plot([lx, lx + 2.2], [ly + 12.4, ly + 12.4], color=style.RIVER, lw=2.4)
    TC(lx + 2.9, ly + 12.4, "river · width = relative flow", fs=9, fw=400,
       ha="left")
    ax.plot([lx, lx + 2.2], [ly + 10.6, ly + 10.6], color=style.PGE, lw=2)
    TC(lx + 2.9, ly + 10.6, "canal / flume (open)", fs=9, fw=400, ha="left")
    ax.plot([lx, lx + 2.2], [ly + 8.8, ly + 8.8], color=style.YWA, lw=2,
            linestyle=style.LINESTYLE["tunnel"])
    TC(lx + 2.9, ly + 8.8, "tunnel (bored through ridge)", fs=9, fw=400,
       ha="left")
    ax.plot([lx, lx + 2.2], [ly + 7.0, ly + 7.0], color=style.YWA, lw=2,
            linestyle=style.LINESTYLE["penstock"])
    TC(lx + 2.9, ly + 7.0, "penstock (pressure pipe to turbine)", fs=9,
       fw=400, ha="left")
    symbols.draw_reservoir(ax, lx + 1.1, ly + 5.0, 0.85)
    TC(lx + 2.9, ly + 5.0, "reservoir · dam at flat edge", fs=9, fw=400,
       ha="left")
    symbols.draw_powerhouse(ax, lx + 1.1, ly + 3.3, 1.1, style.INK_SOFT)
    TC(lx + 2.9, ly + 3.3, "powerhouse", fs=9, fw=400, ha="left")
    symbols.draw_div_dam(ax, lx + 1.1, ly + 1.7, 1.4, style.INK)
    TC(lx + 2.9, ly + 1.7, "diversion dam — water leaves the river", fs=9,
       fw=400, ha="left")
    TC(lx, ly + 14.3, "HOW TO READ", fs=11, fw=700, ha="left")
    # owner key (left margin below the title, above the mirrored descent)
    ox, oy = 4.8, 55.6
    TC(ox, oy, "WHO MOVES THE WATER", fs=11, fw=700, ha="left")
    for i, (col, lab) in enumerate([
            (style.RIVER, "natural river"),
            (style.PGE, "PG&E · Drum–Spaulding (FERC 2310)"),
            (style.NID, "Nevada Irrigation District · Yuba–Bear (FERC 2266)"),
            (style.YWA, "Yuba Water Agency · Yuba River Dev. (FERC 2246)"),
            (style.DEBRIS, "irrigation districts & debris-era works")]):
        yy = oy - 1.9 - i * 1.8
        ax.add_patch(plt.Rectangle((ox, yy - 0.4), 1.6, 0.8, facecolor=col,
                                   edgecolor="none"))
        TC(ox + 2.3, yy, lab, fs=9, fw=400, ha="left")

    # ------------------------------------------------------- footer stats
    ax.plot([2.2, 97.8], [0.1, 0.1], color=style.FRAME, lw=0.8, zorder=22)
    tiles = [
        ("2,359,000 af", "average year's unimpaired runoff — swings 369,000 (1977) to 5,604,000 (2017)"),
        ("1.43M af", "storage in the reservoirs shown — two-thirds of it behind New Bullards Bar"),
        ("~676 MW", "installed hydropower across the basin's four interlocked FERC projects"),
        ("200,000 af/yr", "leaves the basin for the Bear via Drum Canal — about 8% of runoff"),
    ]
    for i, (num, cap) in enumerate(tiles):
        tx = 2.2 + i * 24.5
        TC(tx, -1.15, num, fs=14, fw=700, ha="left")
        TC(tx, -2.45, cap, fs=7.8, fw=400, col=style.INK_SOFT, ha="left")
    TC(97.8, -3.35, "Sources: FERC 2310 / 2266 / 2246 relicensing records · SWRCB certifications · USGS & CDEC gauge data · operator documents (PG&E, NID, Yuba Water Agency)",
       fs=7, fw=400, col=style.INK_MUTE, ha="right")

    os.makedirs(OUT, exist_ok=True)
    fig.savefig(os.path.join(OUT, "yuba_schematic.pdf"))
    fig.savefig(os.path.join(OUT, "yuba_schematic_preview.png"), dpi=72)
    print("wrote schematic")


if __name__ == "__main__":
    main()
