#!/usr/bin/env python3
"""Build App Store + web + OG icons from the rounded marketing mockup.

App Store 1024 must be square, RGB (no alpha), full-bleed. Apple applies
the mask. iMessage / Facebook / Twitter use the 1200x630 OG image.
"""

from __future__ import annotations

import random
import shutil
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else ROOT / "native/ios/AppIcon-source.png"
)
NAVY = (0, 11, 30)


def is_mockup_background(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 185 and g > 185 and b > 185 and max(r, g, b) - min(r, g, b) < 28


def fill_rounded_corners(im: Image.Image, fill: tuple[int, int, int]) -> Image.Image:
    rgb = im.convert("RGB")
    pixels = rgb.load()
    w, h = rgb.size
    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque(
        [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    )
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        if not is_mockup_background(pixels[x, y]):
            continue
        pixels[x, y] = fill
        if x > 0:
            q.append((x - 1, y))
        if x + 1 < w:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y + 1 < h:
            q.append((x, y + 1))
    return rgb


def save_rgb_png(im: Image.Image, path: Path, size: int | None = None) -> None:
    out = im.convert("RGB")
    if size:
        out = out.resize((size, size), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, format="PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)} {out.size} {out.mode}")


def rounded(im: Image.Image, radius: int) -> Image.Image:
    rgba = im.convert("RGBA")
    mask = Image.new("L", rgba.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, rgba.size[0] - 1, rgba.size[1] - 1),
        radius=radius,
        fill=255,
    )
    rgba.putalpha(mask)
    return rgba


def make_og(icon: Image.Image, path: Path) -> None:
    w, h = 1200, 630
    canvas = Image.new("RGB", (w, h), NAVY)
    rng = random.Random(42)
    draw = ImageDraw.Draw(canvas)
    for _ in range(90):
        x = rng.randint(0, w - 1)
        y = rng.randint(0, h - 1)
        s = rng.choice([1, 1, 1, 2])
        a = rng.randint(90, 180)
        color = (a, a - 20, 40)
        draw.ellipse((x, y, x + s, y + s), fill=color)
    icon_size = 500
    tile = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    badge = rounded(tile, radius=110)
    x = (w - icon_size) // 2
    y = (h - icon_size) // 2
    canvas.paste(badge, (x, y), badge)
    canvas.save(path, format="PNG", optimize=True)
    print(f"wrote {path.relative_to(ROOT)} {canvas.size} {canvas.mode}")


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"missing source icon: {SOURCE}")

    source_dest = ROOT / "native/ios/AppIcon-source.png"
    if SOURCE.resolve() != source_dest.resolve():
        shutil.copyfile(SOURCE, source_dest)

    filled = fill_rounded_corners(Image.open(SOURCE), NAVY)
    # Crop the mockup's padding + pre-applied iOS mask so Apple can round a
    # true full-bleed 1024 square (RGB, no alpha).
    w, h = filled.size
    inset = int(min(w, h) * 0.09)
    store = (
        filled.crop((inset, inset, w - inset, h - inset))
        .resize((1024, 1024), Image.Resampling.LANCZOS)
        .convert("RGB")
    )

    save_rgb_png(store, ROOT / "native/ios/AppIcon-1024.png")
    save_rgb_png(
        store,
        ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png",
    )
    placeholder = (
        ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    )
    if placeholder.exists():
        placeholder.unlink()
        print("removed Capacitor placeholder AppIcon-512@2x.png")

    save_rgb_png(store, ROOT / "app/icon.png", 512)
    save_rgb_png(store, ROOT / "app/apple-icon.png", 180)
    save_rgb_png(store, ROOT / "public/icon-512.png", 512)
    save_rgb_png(store, ROOT / "public/icon-192.png", 192)
    save_rgb_png(store, ROOT / "public/apple-touch-icon.png", 180)
    save_rgb_png(store, ROOT / "public/last-storyteller-logo.png", 1024)
    save_rgb_png(store, ROOT / "public/last-storyteller-book.png", 1024)
    make_og(store, ROOT / "public/og-share.png")

    # Next/Turbopack's ICO decoder requires PNG-backed ICO frames to be RGBA.
    ico = store.resize((32, 32), Image.Resampling.LANCZOS).convert("RGBA")
    ico.save(
        ROOT / "app/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32)],
    )
    print("wrote app/favicon.ico")


if __name__ == "__main__":
    main()
