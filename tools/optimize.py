#!/usr/bin/env python3
"""Usage : python3 tools/optimize.py SLUG
Lit sources/SLUG/*.png|jpg|jpeg|webp
Ecrit images/SLUG/full (2000 px max) et images/SLUG/thumb (640 px max) en WebP
Affiche les lignes JSON a coller dans data/projects.js"""
import sys
from pathlib import Path
from PIL import Image

EXT = {".png", ".jpg", ".jpeg", ".webp"}
slug = sys.argv[1]
src = Path("sources") / slug
full = Path("images") / slug / "full"
thumb = Path("images") / slug / "thumb"
full.mkdir(parents=True, exist_ok=True)
thumb.mkdir(parents=True, exist_ok=True)
for p in sorted(src.iterdir()):
    if p.suffix.lower() not in EXT:
        continue
    im = Image.open(p).convert("RGB")
    ident = p.stem.lower().replace(" ", "-")
    name = ident + ".webp"
    a = im.copy()
    a.thumbnail((2000, 2000))
    a.save(full / name, "WEBP", quality=82, method=6)
    b = im.copy()
    b.thumbnail((640, 640))
    b.save(thumb / name, "WEBP", quality=78, method=6)
    w, h = a.size
    print('{ "id": "%s", "file": "%s", "w": %d, "h": %d, "title": "", "year": "", "medium": "", "alt": "" },' % (ident, name, w, h))