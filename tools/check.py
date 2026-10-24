#!/usr/bin/env python3
"""Usage : python3 tools/check.py  (peut etre lance de n'importe ou)"""
import json, os, re, subprocess, sys
from pathlib import Path

os.chdir(Path(__file__).resolve().parent.parent)
errors = []

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
        if not w.get("w") or not w.get("h"):
            errors.append("w/h manquants : %s/%s" % (s, w["file"]))
        if "prompt" in w:
            errors.append("champ prompt interdit : %s/%s" % (s, w["file"]))

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
if re.search(r"\.(prompt|medium)\b", js):
    errors.append("js/main.js : champ supprimé (prompt ou medium) encore utilisé")

res = subprocess.run(["git", "ls-files"], capture_output=True, text=True)
for f in res.stdout.splitlines():
    if re.search(r"(^|/)\.?memory[-_ ]?bank(/|$)", f, re.I) or f.startswith("sources/"):
        errors.append("INTERDIT dans git : %s" % f)
    if f.startswith("images/") and f != f.lower():
        errors.append("majuscules dans un chemin suivi par git (casse sur GitHub Pages) : %s" % f)

if errors:
    print("\n".join("ERREUR " + e for e in errors))
    sys.exit(1)
print("OK : site cohérent, Memory Bank non suivie par git.")