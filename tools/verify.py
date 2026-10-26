#!/usr/bin/env python3
"""Verifie que chaque image "full" de images/ est identique pixel pour pixel a son original de sources/.
Usage : python3 tools/verify.py   (apres python3 tools/build.py)"""
import os, re, sys, unicodedata
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageOps
except ImportError:
    sys.exit("ERREUR : Pillow manquant. Lance : python3 -m pip install pillow")

Image.MAX_IMAGE_PIXELS = None
os.chdir(Path(__file__).resolve().parent.parent)
EXT = {".png", ".jpg", ".jpeg", ".webp"}


def slugify(name):
    s = name.replace("œ", "oe").replace("Œ", "oe").replace("æ", "ae").replace("Æ", "ae")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-") or "serie"


total = same = 0
src_root = Path("sources")
folders = sorted(d for d in src_root.iterdir() if d.is_dir() and not d.name.startswith((".", "_")))
for folder in folders:
    slug = slugify(folder.name)
    for src in sorted(folder.iterdir()):
        if src.name.startswith((".", "_")) or src.suffix.lower() not in EXT or not src.stem.isdigit():
            continue
        total += 1
        out = Path("images") / slug / "full" / (src.stem + ".webp")
        if not out.exists():
            print("MANQUANTE   %s" % out)
            continue
        im = ImageOps.exif_transpose(Image.open(src))
        if im.mode not in ("RGB", "RGBA"):
            alpha = im.mode in ("LA", "PA") or "transparency" in im.info
            im = im.convert("RGBA" if alpha else "RGB")
        w = Image.open(out)
        w.load()
        if w.size != im.size:
            print("TAILLE      %s : original %s, généré %s" % (src, im.size, w.size))
            continue
        if w.mode != im.mode:
            w = w.convert(im.mode)
        if ImageChops.difference(im, w).getbbox() is not None:
            print("DIFFÉRENTE  %s" % src)
            continue
        same += 1
        print("identique   %s/%s (%dx%d)" % (folder.name, src.name, im.size[0], im.size[1]))
print("\n%d image(s) vérifiée(s), %d identique(s), %d différente(s) ou manquante(s)." % (total, same, total - same))
sys.exit(0 if total == same and total > 0 else 1)