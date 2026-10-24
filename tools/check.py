#!/usr/bin/env python3
"""Usage : python3 tools/check.py  (depuis la racine du projet)"""
import json, re, subprocess, sys
from pathlib import Path

errors = []
raw = Path("data/projects.js").read_text(encoding="utf-8").strip()
raw = re.sub(r"^window\.MUSEUM\s*=\s*", "", raw).rstrip(";")
try:
    data = json.loads(raw)
except Exception as e:
    sys.exit("ERREUR : data/projects.js n'est pas du JSON valide : %s" % e)

for room in data["rooms"]:
    s = room["slug"]
    for w in room["works"]:
        for kind in ("full", "thumb"):
            p = Path("images") / s / kind / w["file"]
            if not p.exists():
                errors.append("fichier manquant : %s" % p)
        if not w.get("alt"):
            errors.append("alt vide : %s/%s" % (s, w["file"]))
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

res = subprocess.run(["git", "ls-files"], capture_output=True, text=True)
for f in res.stdout.splitlines():
    if re.search(r"(^|/)\.?memory[-_ ]?bank(/|$)", f, re.I) or f.startswith("sources/"):
        errors.append("INTERDIT dans git : %s" % f)

if errors:
    print("\n".join("ERREUR " + e for e in errors))
    sys.exit(1)
print("OK : site cohérent, Memory Bank non suivie par git.")