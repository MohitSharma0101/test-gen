"""Zoom into part of an answer-sheet page so small or faint writing is readable.

Usage: python3 -I scripts/ai-runner/crop.py <page.jpg> <x0> <y0> <x1> <y1> <out.jpg> [--rotate 90|180|270]
x/y are fractions of the page (0..1), e.g. 0 0.5 1 1 = bottom half.
The crop is upscaled to 1500 px on its long side, with contrast and sharpness boosted.
"""
import sys
from PIL import Image, ImageEnhance, ImageOps

args = sys.argv[1:]
rotate = 0
if "--rotate" in args:
    i = args.index("--rotate")
    rotate = int(args[i + 1])
    del args[i : i + 2]
src, x0, y0, x1, y1, out = args[0], *map(float, args[1:5]), args[5]
img = Image.open(src).convert("L")
if rotate:
    img = img.rotate(-rotate, expand=True)
w, h = img.size
box = (int(max(0, x0) * w), int(max(0, y0) * h), int(min(1, x1) * w), int(min(1, y1) * h))
crop = img.crop(box)
scale = 1500 / max(crop.size)
if scale > 1:
    crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.LANCZOS)
crop = ImageOps.autocontrast(crop, cutoff=1)
crop = ImageEnhance.Sharpness(crop).enhance(1.6)
crop.save(out, quality=88)
print(out, crop.size)
