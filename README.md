# SERENDIPPO — Museum of Fortunate Accidents

## Ouvrir le site en local

Double-clic sur `index.html` ou serveur local :

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

## Ajouter une salle (4 gestes)

1. Mettre les originaux dans `sources/SLUG/`
2. Lancer `python3 tools/optimize.py Saint-Germain`
3. Coller les lignes affichées dans le tableau `works` d'une nouvelle salle de `data/projects.js` en remplissant `title`, `year`, `medium`, `alt`
4. Lancer `python3 tools/check.py`

## Supprimer la salle de test

- Retirer l'objet `salle-test` du tableau `rooms` dans `data/projects.js`
- Supprimer `images/salle-test/` et `sources/salle-test/`
- Lancer `python3 tools/check.py`

## Règle absolue

La Memory Bank et `sources/` ne sont jamais commitées.

## Mise en ligne (plus tard, sur ordre)

Créer un dépôt GitHub nommé `serendippo-museum` (URL finale : `https://UTILISATEUR.github.io/serendippo-museum/`).

```sh
git remote add origin URL
git push -u origin main
```

Puis Settings > Pages > Source « Deploy from a branch » > branche `main`, dossier `/ (root)`.

Avant tout push : relancer `python3 tools/check.py` et `git ls-files` pour contrôler qu'aucun fichier de la Memory Bank n'est suivi.