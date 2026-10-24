#!/usr/bin/env python3
"""SERENDIPPO : generateur du musee. Une seule commande.

Usage :
  python3 tools/build.py                  renumerote, optimise, ecrit data/projects.js, verifie
  python3 tools/build.py --force          reconstruit toutes les images meme si elles sont a jour
  python3 tools/build.py --retirer SLUG   retire une serie du site (images + config), jamais sources/

Convention : sources/NOM DE LA SERIE/ contient les images (png, jpg, jpeg, webp, noms libres).
Un dossier = une serie = une salle. Les oeuvres sont numerotees 001, 002, ... et portent le nom du dossier."""
import json, os, re, shutil, subprocess, sys, unicodedata
from datetime import date
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("ERREUR : Pillow manquant. Lance : python3 -m pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

EXT = {".png", ".jpg", ".jpeg", ".webp"}
WIDTH = 3
SRC = Path("sources")
IMG = Path("images")
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


def fix_case_dirs():
    if not IMG.exists():
        return
    for d in sorted(IMG.iterdir()):
        if d.is_dir() and not d.name.startswith(".") and d.name != slugify(d.name):
            target = IMG / slugify(d.name)
            if target.exists() and not target.samefile(d):
                print("Attention : %s et %s existent tous les deux, fusion manuelle nécessaire" % (d, target))
                continue
            tmp = IMG / ("tmpren-" + d.name)
            d.rename(tmp)
            tmp.rename(target)
            print("Dossier renommé : %s -> %s" % (d.name, target.name))


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


def convert(src, slug, stem, force):
    full = IMG / slug / "full"
    thumb = IMG / slug / "thumb"
    full.mkdir(parents=True, exist_ok=True)
    thumb.mkdir(parents=True, exist_ok=True)
    name = stem + ".webp"
    fo, to = full / name, thumb / name
    if not force and fo.exists() and to.exists() and fo.stat().st_mtime >= src.stat().st_mtime:
        return name, False
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    a = im.copy()
    a.thumbnail((2000, 2000))
    a.save(fo, "WEBP", quality=82, method=6)
    b = im.copy()
    b.thumbnail((640, 640))
    b.save(to, "WEBP", quality=78, method=6)
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
    args = sys.argv[1:]
    force = "--force" in args
    skip = set()
    errors = []
    cfg = load_config()
    series = cfg.setdefault("series", {})
    fix_case_dirs()

    if "--retirer" in args:
        i = args.index("--retirer")
        if i + 1 >= len(args):
            sys.exit("Usage : python3 tools/build.py --retirer SLUG")
        slug = slugify(args[i + 1])
        series.pop(slug, None)
        shutil.rmtree(IMG / slug, ignore_errors=True)
        skip.add(slug)
        print("Série retirée : %s" % slug)
        if SRC.exists() and any(slugify(d.name) == slug for d in SRC.iterdir() if d.is_dir()):
            print("ATTENTION : un dossier de sources/ correspond encore à cette série. "
                  "Supprime-le, sinon elle reviendra au prochain build.")

    folders = {}
    if SRC.exists():
        for d in sorted(SRC.iterdir(), key=lambda p: natural(p.name)):
            if d.is_dir() and not d.name.startswith((".", "_")):
                s = slugify(d.name)
                if s in skip:
                    continue
                if s in folders:
                    print("Attention : %s donne le même identifiant que %s, ignoré" % (d.name, folders[s].name))
                    continue
                folders[s] = d

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

    rooms = []
    for slug, e in sorted(series.items(), key=lambda kv: natural(str(kv[1].get("number") or "99"))):
        works = read_works(slug)
        if not works:
            print("Série %s sans image : ignorée" % slug)
            continue
        files = [w["file"] for w in works]
        cover = e.get("cover") if e.get("cover") in files else files[0]
        rooms.append({"slug": slug, "number": e.get("number", ""), "title": e.get("folder") or slug,
                      "year": e.get("year", ""), "text": e.get("text", ""), "cover": cover, "works": works})

    if IMG.exists():
        for d in sorted(IMG.iterdir()):
            if d.is_dir() and not d.name.startswith(".") and d.name not in series:
                print("Attention : images/%s n'a pas de série (pas de dossier dans sources/), ignoré." % d.name)

    out = {k: cfg.get(k, [] if k == "about" else "") for k in SITE_KEYS}
    out["rooms"] = rooms
    PROJECTS.write_text("window.MUSEUM = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n",
                        encoding="utf-8")
    save_config(cfg)
    total = sum(len(r["works"]) for r in rooms)
    print("\nSite généré : %d salle(s), %d œuvre(s)." % (len(rooms), total))
    res = subprocess.run([sys.executable, "tools/check.py"])
    sys.exit(1 if errors else res.returncode)


main()