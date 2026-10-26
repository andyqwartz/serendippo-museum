#!/usr/bin/env python3
"""Usage : python3 tools/check.py  (peut etre lance de n'importe ou)"""
import json, os, re, subprocess, sys
from pathlib import Path

os.chdir(Path(__file__).resolve().parent.parent)
errors = []


def webp_chunks(path):
    names = []
    with open(path, "rb") as f:
        head = f.read(12)
        if head[:4] != b"RIFF" or head[8:12] != b"WEBP":
            return None
        while True:
            h = f.read(8)
            if len(h) < 8:
                break
            names.append(h[:4])
            size = int.from_bytes(h[4:8], "little")
            f.seek(size + (size & 1), 1)
    return names


try:
    raw = Path("data/projects.js").read_text(encoding="utf-8").strip()
    if not raw.startswith("window.MUSEUM"):
        raise ValueError("ne commence pas par window.MUSEUM =")
    raw = re.sub(r"^window\.MUSEUM\s*=\s*", "", raw).rstrip(";")
    data = json.loads(raw)
except Exception as e:
    sys.exit("ERREUR : data/projects.js invalide : %s (relance python3 tools/build.py)" % e)

try:
    json.loads(Path("data/config.json").read_text(encoding="utf-8"))
except Exception as e:
    errors.append("data/config.json absent ou invalide : %s" % e)

if not data.get("rooms"):
    errors.append("aucune salle dans data/projects.js")
for room in data.get("rooms", []):
    s = room["slug"]
    if not re.fullmatch(r"[a-z0-9-]+", s):
        errors.append("slug invalide (minuscules, chiffres, tirets) : %s" % s)
    if room.get("cover") not in [w["file"] for w in room["works"]]:
        errors.append("cover absente des oeuvres : %s" % s)
    for w in room["works"]:
        for kind in ("full", "thumb"):
            p = Path("images") / s / kind / w["file"]
            if not p.exists():
                errors.append("fichier manquant : %s" % p)
                continue
            names = webp_chunks(p)
            if names is None:
                errors.append("pas un WebP valide : %s" % p)
            elif b"EXIF" in names or b"XMP " in names:
                errors.append("métadonnées EXIF/XMP présentes (prompts possibles) : %s" % p)
        if not w.get("w") or not w.get("h"):
            errors.append("w/h manquants : %s/%s" % (s, w["file"]))
        if "prompt" in w:
            errors.append("champ prompt interdit : %s/%s" % (s, w["file"]))

if Path("images").exists():
    size = sum(f.stat().st_size for f in Path("images").rglob("*") if f.is_file())
    if size > 950 * 1024 * 1024:
        errors.append("images/ pèse %d Mo : GitHub Pages limite le site à 1 Go" % (size // (1024 * 1024)))

files = list(Path(".").glob("*.html")) + list(Path("css").glob("*.css")) + list(Path("js").glob("*.js"))
for f in files:
    t = f.read_text(encoding="utf-8")
    if re.search(r'(src|href)="/(?!/)', t) or re.search(r"url\(\s*['\"]?/", t):
        errors.append("chemin absolu dans %s" % f)
    if re.search(r'(src|href)="https?://', t) or "fetch(" in t or 'type="module"' in t:
        errors.append("ressource externe, fetch ou module dans %s" % f)

css = Path("css/style.css").read_text(encoding="utf-8")
if "prefers-color-scheme" not in css or 'data-theme="dark"' not in css:
    errors.append("css : thèmes clair et sombre manquants")
if re.search(r"#ff4d2e|accent", css, re.I):
    errors.append("css : couleur d'accent interdite")

js = Path("js/main.js").read_text(encoding="utf-8")
if "function caption" not in js:
    errors.append("js/main.js : fonction caption() manquante")
if re.search(r"\.prompt\b", js):
    errors.append("js/main.js : champ supprimé (prompt) encore utilisé")
if "Viewer.open" not in js:
    errors.append("js/main.js : la visionneuse n'est pas branchée (Viewer.open manquant)")
if re.search(r"openLightbox|closeLightbox", js):
    errors.append("js/main.js : ancien code de visionneuse (openLightbox/closeLightbox) encore présent")
m = re.search(r"function initRoom\b.*?\n\}", js, re.S)
if m and re.search(r"""["']thumb["']""", m.group(0)):
    errors.append("js/main.js : initRoom utilise la miniature, la galerie doit afficher « full »")

if not Path("js/viewer.js").exists():
    errors.append("js/viewer.js manquant")
for page in ("index.html", "salle.html", "a-propos.html"):
    t = Path(page).read_text(encoding="utf-8")
    if "js/viewer.js" not in t or "js/main.js" not in t or t.index("js/viewer.js") > t.index("js/main.js"):
        errors.append("%s : js/viewer.js doit être chargé avant js/main.js" % page)

for name in ("js/main.js", "js/viewer.js", "css/style.css"):
    if Path(name).exists():
        t2 = Path(name).read_text(encoding="utf-8")
        if "headerButton" in t2 or "fullscreen-toggle" in t2:
            errors.append("%s : le bouton plein écran de l'en-tête doit être supprimé" % name)
css2 = Path("css/style.css").read_text(encoding="utf-8")
if re.search(r"\.viewer-(bar|cap)\s*\{[^}]*position:\s*absolute", css2):
    errors.append("css : la barre ou la légende de la visionneuse recouvre l'image (position absolute interdite)")

if not Path(".github/workflows/pages.yml").exists():
    errors.append("workflow GitHub Actions manquant : .github/workflows/pages.yml")

res = subprocess.run(["git", "-c", "core.quotepath=false", "ls-files"], capture_output=True, text=True)
for f in res.stdout.splitlines():
    if re.search(r"(^|/)\.?memory[-_ ]?bank(/|$)", f, re.I):
        errors.append("INTERDIT dans git (Memory Bank) : %s" % f)
    if f.startswith("images/") or f == "data/projects.js":
        errors.append("fichier généré suivi par git (il est produit par GitHub Actions) : %s" % f)
    p = Path(f)
    if p.is_file() and p.stat().st_size > 90 * 1024 * 1024:
        errors.append("fichier trop gros pour GitHub (plus de 90 Mo) : %s" % f)

if errors:
    print("\n".join("ERREUR " + e for e in errors))
    sys.exit(1)
print("OK : site cohérent, Memory Bank non suivie par git.")