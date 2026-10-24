#!/usr/bin/env python3
"""Envoie le musee sur GitHub : genere en local, verifie, commit, synchronise, push.
GitHub (workflow pages.yml) construit et publie ensuite le site tout seul.

Usage : python3 tools/publish.py   (ou double-clic sur publier.command)
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


if "origin" not in run(["git", "remote"]).stdout.split():
    sys.exit("Aucun dépôt distant « origin » : voir la section « Mise en ligne » du README. Rien n'a été envoyé.")

if subprocess.run([sys.executable, "tools/build.py"]).returncode != 0:
    sys.exit("Envoi annulé : le build ou la vérification a échoué.")

run(["git", "add", "-A"])
if subprocess.run([sys.executable, "tools/check.py"]).returncode != 0:
    subprocess.run(["git", "reset", "-q"])
    sys.exit("Envoi annulé : tools/check.py a échoué (index remis à zéro).")

if run(["git", "status", "--short"]).stdout.strip():
    run(["git", "commit", "-m", "Mise à jour du musée — " + datetime.now().strftime("%Y-%m-%d %H:%M")])
else:
    print("Aucun changement local à enregistrer.")

heads = subprocess.run(["git", "ls-remote", "--exit-code", "--heads", "origin", "main"], capture_output=True)
if heads.returncode == 0:
    if subprocess.run(["git", "pull", "--rebase", "origin", "main"]).returncode != 0:
        sys.exit("Synchronisation impossible (conflit). Rien n'a été envoyé : montre ce message à Hermes.")
if subprocess.run(["git", "push", "-u", "origin", "main"]).returncode != 0:
    sys.exit("L'envoi a échoué (voir le message ci-dessus).")
print("Envoyé. GitHub génère et publie le site en une à deux minutes (onglet Actions du dépôt).")