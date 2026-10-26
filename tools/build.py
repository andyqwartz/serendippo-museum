#!/usr/bin/env python3
"""SERENDIPPO : generateur du musee.

Usage :
  python3 tools/build.py          renumerote sources/, genere images/ et data/projects.js, verifie
  python3 tools/build.py --force  reconstruit toutes les images meme si elles sont a jour

Convention : sources/NOM DE LA SERIE/ contient les images (png, jpg, jpeg, webp, noms libres).
Un dossier = une serie = une salle. Les oeuvres sont numerotees 001, 002, ... et portent le nom du dossier.
Image "full" = identique pixel pour pixel a l'original (WebP sans perte, resolution d'origine,
profil couleur conserve, metadonnees retirees). Miniature "thumb" = 640 px, pour l'accueil seulement.
Meme regles en local (serve.py, publish.py) et sur GitHub (workflow pages.yml).
images/ et data/projects.js sont GENERES : ils ne sont pas suivis par git."""
import json, os, re, shutil, subprocess, sys, unicodedata
from datetime import date
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("ERREUR : Pillow manquant. Lance : python3 -m pip install pillow")

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

EXT = {".png", ".jpg", ".jpeg", ".webp"}
WIDTH = 3
MAX_SIDE = 16383
PIPELINE = "2-full-lossless-original-size"
SRC = Path("sources")
IMG = Path("images")
STAMP = IMG / ".pipeline"
CONFIG = Path("data/config.json")
PROJECTS = Path("data/projects.js")
SITE_KEYS = ("title", "author", "statement", "about", "contact")


def slugify(name):
    s = name.replace("œ", "oe").replace("Œ", "oe").replace("æ", "ae").replace("Æ", "ae")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "serie"


def natural(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def read_js(path):
    raw = path.read_text(encoding="utf-8").strip()
    raw = re.sub(r"^window\.MUSEUM\s*=\s*", "", raw).rstrip(";").strip()
    return json.loads(raw)


def load_config():
    if CONFIG.exists():
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    cfg = {"title": "SERENDIPPO", "author": "", "statement": "A museum of fortunate accidents.",
           "about": [], "contact": "", "series": {}}
    if PROJECTS.exists():
        try:
            old = read_js(PROJECTS)
            for k in SITE_KEYS:
                if k in old:
                    cfg[k] = old[k]
            for r in old.get("rooms", []):
                key = slugify(r.get("slug") or r.get("title") or "serie")
                cfg["series"][key] = {"folder": r.get("title", key), "number": r.get("number", ""),
                                      "year": r.get("year", ""), "text": r.get("text", "")}
            print("Migration : data/config.json créé depuis l'ancien data/projects.js")
        except Exception as e:
            print("Attention : ancien projects.js illisible (%s), config créée par défaut" % e)
    return cfg


def save_config(cfg):
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    CONFIG.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def next_number(series):
    nums = [int(v["number"]) for v in series.values() if str(v.get("number", "")).isdigit()]
    return "%02d" % (max(nums) + 1 if nums else 1)


def renumber(folder):
    files = [p for p in folder.iterdir()
             if p.is_file() and p.suffix.lower() in EXT and not p.name.startswith((".", "_"))]
    taken, todo = {}, []
    for p in sorted(files, key=lambda p: natural(p.name)):
        if p.stem.isdigit() and int(p.stem) > 0 and int(p.stem) not in taken:
            taken[int(p.stem)] = p
        else:
            todo.append(p)
    nxt = max(taken) + 1 if taken else 1
    plan = [(n, taken[n]) for n in sorted(taken)]
    for p in todo:
        plan.append((nxt, p))
        nxt += 1
    moves = []
    for n, p in plan:
        new = "%0*d%s" % (WIDTH, n, p.suffix.lower())
        if p.name != new:
            moves.append((p, new))
    tmps = []
    for i, (p, new) in enumerate(moves):
        tmp = folder / ("tmpren-%d%s" % (i, p.suffix))
        p.rename(tmp)
        tmps.append((tmp, new, p.name))
    for tmp, new, old in tmps:
        tmp.rename(folder / new)
    if tmps:
        with open(folder / "_renommages.txt", "a", encoding="utf-8") as f:
            for tmp, new, old in tmps:
                f.write("%s -> %s\n" % (old, new))
        print("  %d fichier(s) renommé(s) (journal : %s/_renommages.txt)" % (len(tmps), folder.name))
    return [(n, folder / ("%0*d%s" % (WIDTH, n, p.suffix.lower()))) for n, p in plan]


def prepare(src):
    im0 = Image.open(src)
    icc = im0.info.get("icc_profile")
    im = ImageOps.exif_transpose(im0)
    if im.mode not in ("RGB", "RGBA"):
        alpha = im.mode in ("LA", "PA") or "transparency" in im.info
        im = im.convert("RGBA" if alpha else "RGB")
    return im, icc


def convert(src, slug, stem, force):
    full = IMG / slug / "full"
    thumb = IMG / slug / "thumb"
    full.mkdir(parents=True, exist_ok=True)
    thumb.mkdir(parents=True, exist_ok=True)
    name = stem + ".webp"
    fo, to = full / name, thumb / name
    if not force and fo.exists() and to.exists() and fo.stat().st_mtime >= src.stat().st_mtime:
        return name, False
    im, icc = prepare(src)
    a = im
    if max(a.size) > MAX_SIDE:
        a = im.copy()
        a.thumbnail((MAX_SIDE, MAX_SIDE))
        print("  Attention : %s dépasse %d px, réduite (limite du format WebP)" % (src.name, MAX_SIDE))
    a.info = {}
    a.save(fo, "WEBP", lossless=True, quality=100, method=4, exact=True,
           icc_profile=icc, exif=b"", xmp=b"")
    b = im.copy()
    b.thumbnail((640, 640))
    b.info = {}
    b.save(to, "WEBP", quality=80, method=6, icc_profile=icc, exif=b"", xmp=b"")
    return name, True


def prune(slug, keep):
    for kind in ("full", "thumb"):
        d = IMG / slug / kind
        if d.exists():
            for f in sorted(d.iterdir()):
                if f.is_file() and f.name not in keep:
                    f.unlink()
                    print("  supprimé (obsolète) : %s" % f)


def read_works(slug):
    works = []
    full = IMG / slug / "full"
    if not full.exists():
        return works
    for f in sorted(full.glob("*.webp"), key=lambda p: natural(p.name)):
        if not f.stem.isdigit():
            print("  ignoré (nom non numéroté) : %s" % f)
            continue
        if not (IMG / slug / "thumb" / f.name).exists():
            print("  ignoré (miniature manquante) : %s" % f)
            continue
        with Image.open(f) as im:
            w, h = im.size
        works.append({"id": f.stem, "file": f.name, "w": w, "h": h})
    return works


def main():
    force = "--force" in sys.argv[1:]
    errors = []
    cfg = load_config()
    series = cfg.setdefault("series", {})

    IMG.mkdir(exist_ok=True)
    stamp = STAMP.read_text(encoding="utf-8").strip() if STAMP.exists() else ""
    if stamp != PIPELINE:
        print("Nouvelle méthode d'encodage : toutes les images sont régénérées.")
        force = True

    folders = {}
    if SRC.exists():
        for d in sorted(SRC.iterdir(), key=lambda p: natural(p.name)):
            if d.is_dir() and not d.name.startswith((".", "_")):
                s = slugify(d.name)
                if s in folders:
                    print("Attention : %s donne le même identifiant que %s, ignoré" % (d.name, folders[s].name))
                    continue
                folders[s] = d

    # images/ est entierement genere : tout dossier qui ne correspond pas a une serie est supprime
    for d in sorted(IMG.iterdir()):
        if d.is_dir() and d.name not in folders:
            shutil.rmtree(d)
            print("Supprimé (série retirée ou dossier mal nommé) : images/%s" % d.name)

    for slug, d in folders.items():
        entry = series.setdefault(slug, {})
        entry["folder"] = unicodedata.normalize("NFC", d.name)
        if not entry.get("number"):
            entry["number"] = next_number(series)
        entry.setdefault("year", str(date.today().year))
        entry.setdefault("text", "")
        print("Série %s (%s)" % (entry["folder"], slug))
        done = renumber(d)
        keep = set()
        regenerated = 0
        for n, p in done:
            stem = "%0*d" % (WIDTH, n)
            try:
                name, changed = convert(p, slug, stem, force)
                regenerated += int(changed)
            except Exception as e:
                errors.append("%s : %s" % (p, e))
                print("  ERREUR image %s : %s" % (p.name, e))
                name = stem + ".webp"
            keep.add(name)
        if done:
            prune(slug, keep)
        print("  %d image(s), %d (re)générée(s)" % (len(done), regenerated))

    STAMP.write_text(PIPELINE + "\n", encoding="utf-8")

    rooms = []
    for slug, e in sorted(series.items(), key=lambda kv: natural(str(kv[1].get("number") or "99"))):
        if slug not in folders:
            continue
        works = read_works(slug)
        if not works:
            print("Série %s sans image : ignorée" % slug)
            continue
        files = [w["file"] for w in works]
        cover = e.get("cover") if e.get("cover") in files else files[0]
        rooms.append({"slug": slug, "number": e.get("number", ""), "title": e.get("folder") or slug,
                      "year": e.get("year", ""), "text": e.get("text", ""), "cover": cover, "works": works})

    out = {k: cfg.get(k, [] if k == "about" else "") for k in SITE_KEYS}
    out["rooms"] = rooms
    PROJECTS.write_text("window.MUSEUM = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n",
                        encoding="utf-8")
    save_config(cfg)
    total = sum(len(r["works"]) for r in rooms)
    size = sum(f.stat().st_size for f in IMG.rglob("*") if f.is_file())
    print("\nSite généré : %d salle(s), %d œuvre(s), images/ = %d Mo (limite GitHub Pages : 1 Go)."
          % (len(rooms), total, size // (1024 * 1024)))
    res = subprocess.run([sys.executable, "tools/check.py"])
    sys.exit(1 if errors else res.returncode)


main()