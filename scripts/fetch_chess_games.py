#!/usr/bin/env python3
"""Download all chess.com games for a player via the public API.

Writes to chess/<username>/:
  games.json           all games, one flat list (API JSON per game)
  YYYY-MM.pgn          per-month PGN
  all_games.pgn        every game concatenated, oldest first

Usage: python scripts/fetch_chess_games.py [username]   (default: salmonshilll)
"""

import json
import sys
from pathlib import Path

import requests

USERNAME = sys.argv[1] if len(sys.argv) > 1 else "salmonshilll"
API = "https://api.chess.com/pub/player/{user}/games/archives"
# chess.com requires a descriptive User-Agent with contact info
HEADERS = {"User-Agent": "TNF_hydro_dash chess fetcher (contact: jburdick.m@gmail.com)"}

OUT_DIR = Path(__file__).resolve().parent.parent / "chess" / USERNAME.lower()


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    resp = requests.get(API.format(user=USERNAME), headers=HEADERS, timeout=30)
    resp.raise_for_status()
    archives = resp.json()["archives"]
    print(f"{USERNAME}: {len(archives)} monthly archives")

    all_games = []
    all_pgn_parts = []
    for url in archives:  # API returns archives oldest first
        month = "-".join(url.rsplit("/", 2)[-2:])  # .../2025/03 -> 2025-03
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        games = r.json()["games"]
        all_games.extend(games)

        month_pgn = "\n\n".join(g["pgn"].strip() for g in games if g.get("pgn"))
        (OUT_DIR / f"{month}.pgn").write_text(month_pgn + "\n", encoding="utf-8")
        all_pgn_parts.append(month_pgn)
        print(f"  {month}: {len(games)} games")

    (OUT_DIR / "games.json").write_text(
        json.dumps(all_games, indent=1), encoding="utf-8"
    )
    (OUT_DIR / "all_games.pgn").write_text(
        "\n\n".join(all_pgn_parts) + "\n", encoding="utf-8"
    )
    print(f"total: {len(all_games)} games -> {OUT_DIR}")


if __name__ == "__main__":
    main()
