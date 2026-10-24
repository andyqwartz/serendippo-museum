#!/usr/bin/env python3
"""Publie le musee : build + verification + commit + push, en une commande.

Usage : python3 tools/publish.py
Demande confirmation (oui/non) avant de commiter et de pousser.
Prerequis (une seule fois) : depot GitHub + remote origin, voir README, section Mise en ligne."""
import os, subprocess, sys
from datetime import datetime
from pathlib import Path

os.chdir(Path(__file__).resolve().parent.parent)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("ERREUR : %s\n%s%s" % (" ".join(cmd), r.stdout, r.stderr))
    return r


if subprocess.run([sys.executable, "tools/build.py"]).returncode != 0:
    sys.exit("Publication annulée : le build ou la vérification a échoué.")

if "origin" not in run(["git", "remote"]).stdout.split():
    sys.exit("Aucun dépôt distant « origin » : voir la section « Mise en ligne » du README. Rien n'a été publié.")

status = run(["git", "status", "--short"]).stdout.strip()
if not status:
    sys.exit("Rien à publier.")
lines = status.splitlines()
print("\n".join(lines[:30]))
if len(lines) > 30:
    print("… (+%d autres fichiers)" % (len(lines) - 30))

try:
    ans = input("\nPublier ces changements sur GitHub ? (oui/non) ").strip().lower()
except EOFError:
    ans = ""
if ans != "oui":
    sys.exit("Publication annulée : rien n'a été commité ni poussé.")

run(["git", "add", "-A"])
if subprocess.run([sys.executable, "tools/check.py"]).returncode != 0:
    subprocess.run(["git", "reset", "-q"])
    sys.exit("Publication annulée : tools/check.py a échoué (index remis à zéro).")

msg = "Mise à jour du musée — " + datetime.now().strftime("%Y-%m-%d %H:%M")
run(["git", "commit", "-m", msg])
if subprocess.run(["git", "push", "-u", "origin", "main"]).returncode != 0:
    sys.exit("Le commit est fait en local, mais le push a échoué (voir le message ci-dessus).")
print("Publié. GitHub Pages met le site à jour en une à deux minutes.")