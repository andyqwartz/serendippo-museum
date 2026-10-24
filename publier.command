#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 tools/publish.py
echo
echo "Appuie sur Entrée pour fermer."
read _