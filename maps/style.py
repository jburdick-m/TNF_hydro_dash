"""Shared visual system for the Yuba watershed map pair.

Both maps (georeferenced artistic map + schematic engineering diagram) import
from here so color, type, and symbol vocabulary stay identical.

Palette validated for CVD separation / chroma / contrast on the cream paper
surface (dataviz validator: all checks pass).
"""
import os

from matplotlib import font_manager

# ---------------------------------------------------------------- surfaces
PAPER = "#f6f1e3"        # cream paper
PAPER_DEEP = "#efe7d2"   # margin / title-block wash
WATERSHED_FILL = "#ece4cd"  # inside-the-basin wash, slightly darker than paper
NEIGHBOR_FILL = "#f0eada"   # adjacent basin (Bear) wash

# ---------------------------------------------------------------- ink
INK = "#26221a"          # primary text
INK_SOFT = "#5a5344"     # secondary text
INK_MUTE = "#8d8471"     # tertiary / tick labels
HAIRLINE = "#d8cfb4"     # gridlines, neatline inner
FRAME = "#4a4232"        # neatline outer

# ---------------------------------------------------------------- water & operators
RIVER = "#1d6ea8"        # natural rivers & lake fill stroke
RIVER_DK = "#134f7c"     # emphasis / labels of water
LAKE_FILL = "#7fb2d6"
LAKE_EDGE = "#134f7c"

PGE = "#c05a10"          # PG&E Drum-Spaulding system (amber)
NID = "#0e8a60"          # Nevada Irrigation District (green)
YWA = "#8b3aa0"          # Yuba Water Agency (purple)
DEBRIS = "#a04f2a"       # debris-era / USACE structures (brown)
BVID = "#a04f2a"         # Browns Valley ID shares the earth tone

OWNER_COLORS = {
    "PG&E": PGE,
    "NID": NID,
    "YWA": YWA,
    "USACE": DEBRIS,
    "BVID": DEBRIS,
    "natural": RIVER,
}

# ---------------------------------------------------------------- type
_HERE = os.path.dirname(os.path.abspath(__file__))
_FONT_DIRS = [
    os.path.join(_HERE, "fonts"),
]

SERIF = "Cormorant Garamond"     # artistic map: titles, stories, river labels
SERIF_DISPLAY = "Playfair Display"  # big title only
SANS = "Archivo"                 # schematic: everything; geo map: stats/keys
SANS_NARROW = "Archivo Narrow"   # dense annotation


def register_fonts():
    """Register bundled fonts with matplotlib; fall back silently if absent."""
    found = set()
    for d in _FONT_DIRS:
        if not os.path.isdir(d):
            continue
        for f in os.listdir(d):
            if f.lower().endswith((".ttf", ".otf")):
                try:
                    font_manager.fontManager.addfont(os.path.join(d, f))
                    found.add(f)
                except Exception:
                    pass
    return found


# ---------------------------------------------------------------- line vocabulary
# solid = open canal/ditch • dashed = tunnel/pipe (underground) •
# dash-dot = penstock • river width scales with stream order
LINESTYLE = {
    "canal": "-",
    "conduit": "-",
    "tunnel": (0, (5, 2.2)),
    "pipeline": (0, (5, 2.2)),
    "penstock": (0, (1, 1.6)),
}

# marker vocabulary (both maps)
#   reservoir: filled circle sized by capacity (geo map uses real polygon too)
#   diversion dam: open triangle-down
#   powerhouse: filled square
#   dam (storage): thick tick across the river
MARKER = {
    "reservoir": "o",
    "diversion_dam": "v",
    "powerhouse": "s",
    "dam": "|",
}
