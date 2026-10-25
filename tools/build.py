#!/usr/bin/env python3
"""SERENDIPPO : generateur du musee.

Usage :
  python3 tools/build.py          renumerote sources/, genere images/ et data/projects.js, verifie
  python3 tools/build.py --force  reconstruit toutes les images meme si elles sont a jour

Convention : sources/NOM DE LA SERIE/ contient les images (png, jpg, jpeg, webp, noms libres).
Un dossier = une serie = une salle. Les oeuvres sont numerotees 001, 002, ... et portent le nom du dossier.
Meme regles en local (serve.py, publish.py) et sur GitHub (workflow pages.yml).
images/ et data/projects.js sont GENERES : ils ne sont pas suivis par git."""
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
    cfg = {"title": {"fr": "SERENDIPPO", "en": "SERENDIPPO"}, "author": "",
           "statement": {"fr": "Un musée d'accidents heureux.", "en": "A museum of fortunate accidents."},
           "about": {"fr": [], "en": []}, "contact": {"fr": "", "en": ""}, "series": {}}
    if PROJECTS.exists():
        try:
            old = read_js(PROJECTS)
            for k in SITE_KEYS:
                if k in old:
                    cfg[k] = old[k]
            for r in old.get("rooms", []):
                key = slugify(r.get("slug") or r.get("title", {}).get("fr", "") or "serie")
                cfg["series"][key] = {"folder": r.get("title", {}).get("fr", key), "number": r.get("number", ""),
                                      "year": r.get("year", ""), "text": r.get("text", {"fr": "", "en": ""}),
                                      "title": r.get("title", {"fr": key, "en": key})}
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
    # full: résolution d'origine, WebP qualité 95 (near-lossless)
    im.save(fo, "WEBP", quality=95, method=6)
    # thumb: 640px max, qualité 78
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


def read_works(slug, existing_works=None):
    """Read works from images/ and merge with existing metadata from config."""
    works = []
    full = IMG / slug / "full"
    if not full.exists():
        return works
    
    # Build lookup of existing works by id
    existing = {}
    if existing_works:
        for w in existing_works:
            existing[w["id"]] = w
    
    for f in sorted(full.glob("*.webp"), key=lambda p: natural(p.name)):
        if not f.stem.isdigit():
            print("  ignoré (nom non numéroté) : %s" % f)
            continue
        if not (IMG / slug / "thumb" / f.name).exists():
            print("  ignoré (miniature manquante) : %s" % f)
            continue
        with Image.open(f) as im:
            w, h = im.size
        
        work = {"id": f.stem, "file": f.name, "w": w, "h": h}
        
        # Merge existing metadata if available
        if f.stem in existing:
            ex = existing[f.stem]
            for key in ("description", "date", "medium"):
                if key in ex and ex[key]:
                    work[key] = ex[key]
        
        works.append(work)
    return works


def main():
    force = "--force" in sys.argv[1:]
    errors = []
    cfg = load_config()
    series = cfg.setdefault("series", {})

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
    if IMG.exists():
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
        # Initialize bilingual text and title if not present
        if "text" not in entry or isinstance(entry["text"], str):
            entry["text"] = {"fr": entry.get("text", ""), "en": ""}
        if "title" not in entry or isinstance(entry["title"], str):
            entry["title"] = {"fr": entry.get("folder", slug), "en": entry.get("folder", slug)}
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
        if slug not in folders:
            continue
        # Get existing works metadata from config
        existing_works = e.get("works", [])
        works = read_works(slug, existing_works)
        if not works:
            print("Série %s sans image : ignorée" % slug)
            continue
        files = [w["file"] for w in works]
        cover = e.get("cover") if e.get("cover") in files else files[0]
        # Store works metadata back to config for persistence
        e["works"] = works
        rooms.append({"slug": slug, "number": e.get("number", ""), "title": e.get("title", {"fr": slug, "en": slug}),
                      "year": e.get("year", ""), "text": e.get("text", {"fr": "", "en": ""}), "cover": cover, "works": works})

    # Build output with bilingual support
    out = {}
    for k in SITE_KEYS:
        val = cfg.get(k, [] if k == "about" else "")
        # Ensure bilingual structure
        if k in ("title", "statement", "contact") and isinstance(val, str):
            out[k] = {"fr": val, "en": val}
        elif k == "about" and isinstance(val, list):
            out[k] = {"fr": val, "en": val}
        else:
            out[k] = val
    out["rooms"] = rooms
    PROJECTS.write_text("window.MUSEUM = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n",
                        encoding="utf-8")
    save_config(cfg)
    total = sum(len(r["works"]) for r in rooms)
    print("\nSite généré : %d salle(s), %d œuvre(s)." % (len(rooms), total))
    res = subprocess.run([sys.executable, "tools/check.py"])
    sys.exit(1 if errors else res.returncode)


main()