# SERENDIPPO — Museum of Fortunate Accidents

Un musée virtuel statique : un dossier d'images = une salle. Tu déposes des images, le site se met à jour tout seul.

## Principe

Chaque série d'images vit dans son propre dossier de `sources/` (ignoré par git, jamais publié). Le nom du dossier est le nom de la série, affiché partout sur le site. Les œuvres n'ont pas de titre : elles sont numérotées 001, 002, 003… et portent le nom de leur série. Tout le reste est généré.

```
sources/                      originaux, ignorés par git
  Saint-Germain/              une série = une salle
    nimporte-quel-nom.png     noms libres : ils seront renommés
data/config.json              réglages éditables (titre du site, textes, année des séries)
data/projects.js              GÉNÉRÉ : ne jamais l'éditer à la main
images/                       GÉNÉRÉ : WebP complet et miniature, par série
```

GitHub Pages ne sert que des fichiers statiques : il ne peut pas explorer des dossiers. La génération se fait donc avant la publication, automatiquement en local.

## Travailler en local (automatique)

```sh
python3 tools/serve.py
```

Sur Mac, double-clic sur `lancer.command` fait la même chose. Le serveur génère le site au démarrage, ouvre le navigateur, puis à chaque rafraîchissement de la page il vérifie si `sources/` a changé (image ou dossier ajouté, supprimé, modifié) et régénère le site avant de l'afficher. Pour ajouter une image : dépose-la dans le dossier de sa série, rafraîchis la page (F5). Pour ajouter une série : crée un dossier dans `sources/` (majuscules, accents et espaces permis), dépose-y des images, rafraîchis.

Les images sont renommées sur place en 001, 002, 003… Les images déjà numérotées gardent leur numéro, les nouvelles prennent les numéros suivants (dans l'ordre alphabétique naturel de leurs noms), donc rien ne se décale. Les anciens noms sont conservés dans `_renommages.txt`, dans le dossier de la série. Pour retirer une image, supprime son fichier numéroté dans `sources/` et rafraîchis : les autres gardent leur numéro.

Sans le serveur (double-clic sur `index.html`), le site affiche le dernier état généré. Dans ce cas, lance `python3 tools/build.py` à la main (`--force` retraite toutes les images).

## Publier

```sh
python3 tools/publish.py
```

La commande génère le site, le vérifie, affiche les changements, demande confirmation, puis commit et pousse sur GitHub. Prérequis, une seule fois : la section « Mise en ligne » ci-dessous.

## Réglages

`data/config.json` contient le titre du site (`title`), la phrase d'accueil (`statement`), les paragraphes de la page À propos (`about`), le `contact` et, pour chaque série, son `number` (ordre des salles), son `year` et son `text` de présentation. Pour changer la couverture d'une salle, ajoute `"cover": "005.webp"` dans sa série. Le fichier doit rester du JSON strict (guillemets doubles, pas de virgule après le dernier élément). Rafraîchis la page ensuite.

## Retirer une série (ou la salle de test)

Supprime d'abord son dossier de `sources/`, puis retire-la du site :

```sh
rm -r "sources/salle-test"
python3 tools/build.py --retirer salle-test
```

L'identifiant (`salle-test`, `saint-germain`) est le nom du dossier en minuscules, sans accents, avec des tirets.

## Règle absolue

La Memory Bank et `sources/` ne sont jamais commités.

## Mise en ligne (une seule fois, sur ordre)

Créer un dépôt GitHub nommé `serendippo-museum` (URL finale : `https://UTILISATEUR.github.io/serendippo-museum/`), puis :

```sh
git remote add origin URL
```

Puis Settings > Pages > Source « Deploy from a branch » > branche `main`, dossier `/ (root)`. Ensuite, chaque publication se fait avec `python3 tools/publish.py` (le premier push crée la branche sur GitHub). Avant de publier, la commande lance `tools/check.py`, qui bloque si la Memory Bank ou `sources/` est suivie par git.

## Dépannage

Si le chemin du projet contient des espaces, mets-le entre guillemets dans le terminal. Si Pillow manque : `python3 -m pip install pillow`. Si macOS refuse (« externally-managed-environment ») : `python3 -m venv .venv && source .venv/bin/activate && pip install pillow`, puis relance la commande dans ce même terminal (`.venv/` est ignoré par git). Si le port 8000 est occupé : `python3 tools/serve.py 8001`.