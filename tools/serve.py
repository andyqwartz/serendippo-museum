#!/usr/bin/env python3
"""Serveur local du musee avec generation automatique.

Usage : python3 tools/serve.py [PORT]      (defaut 8000)

Au demarrage, puis a chaque chargement de page, le serveur regarde si sources/ a change
(image ou dossier ajoute, supprime, modifie). Si oui, il lance tools/build.py avant de servir
la page : il suffit de rafraichir le navigateur."""
import os, subprocess, sys, threading, webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
PAGES = ("/", "/index.html", "/salle.html", "/a-propos.html")
lock = threading.Lock()
state = {"sig": None}


def signature():
    sig = []
    src = Path("sources")
    if src.exists():
        for p in sorted(src.rglob("*")):
            if any(part.startswith((".", "_", "tmpren-")) for part in p.parts):
                continue
            st = p.stat()
            sig.append((str(p), st.st_size if p.is_file() else 0, int(st.st_mtime)))
    return sig


def ensure_built():
    with lock:
        sig = signature()
        if sig == state["sig"]:
            return
        print("\n[serve] changement détecté dans sources/ : régénération du site…")
        res = subprocess.run([sys.executable, "tools/build.py"])
        if res.returncode == 0:
            state["sig"] = signature()
            print("[serve] site à jour.\n")
        else:
            print("[serve] ERREUR de génération (code %d), corrige puis rafraîchis la page.\n" % res.returncode)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] in PAGES:
            ensure_built()
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


ensure_built()
try:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
except OSError:
    sys.exit("Port %d occupé. Essaie : python3 tools/serve.py %d" % (PORT, PORT + 1))
url = "http://localhost:%d/" % PORT
print("Musée servi sur %s (Ctrl+C pour arrêter)" % url)
threading.Timer(0.5, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nArrêt.")