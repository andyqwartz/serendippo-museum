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
        # Validate optional fields if present
        for opt in ("description", "date", "medium"):
            if opt in w and not isinstance(w[opt], str):
                errors.append("champ %s doit être une chaîne : %s/%s" % (opt, s, w["file"]))

# Validate bilingual structure for site keys
for key in ("title", "statement", "contact"):
    val = data.get(key)
    if val is not None and not (isinstance(val, dict) and "fr" in val and "en" in val):
        errors.append("clé %s doit être bilingue {fr, en} : %s" % (key, val))
if "about" in data:
    val = data["about"]
    if not (isinstance(val, dict) and "fr" in val and "en" in val and isinstance(val["fr"], list) and isinstance(val["en"], list)):
        errors.append("clé about doit être bilingue {fr: [...], en: [...]}")

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
if "function t" not in js:
    errors.append("js/main.js : fonction t() pour traduction manquante")
if re.search(r"\.prompt\b", js):
    errors.append("js/main.js : champ supprimé (prompt) encore utilisé")

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