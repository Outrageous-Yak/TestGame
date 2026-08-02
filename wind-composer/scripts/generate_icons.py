#!/usr/bin/env python3
"""Generate PWA icons as PNG files."""

from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
  print("PIL not installed; skipping icon generation")
  raise SystemExit(0)

OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

def make_icon(size: int, path: Path) -> None:
    img = Image.new("RGB", (size, size), "#12161f")
    draw = ImageDraw.Draw(img)
    margin = size // 6
    draw.ellipse([margin, margin, size - margin, size - margin], fill="#6b9fd4")
    draw.arc([margin, margin, size - margin, size - margin], 200, 340, fill="#c8d4e8", width=max(2, size // 24))
    img.save(path)

for sz in (192, 512):
    make_icon(sz, OUT / f"icon-{sz}.png")
print("Icons written to", OUT)
