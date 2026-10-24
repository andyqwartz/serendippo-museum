# SERENDIPPO — Museum of Fortunate Accidents

Un musée virtuel statique : un dossier d'images = une salle. Une seule commande génère tout le site.

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

## Ouvrir le site en local

Double-clic sur `index.html`, ou serveur local :

```sh
python3 -m http.server 8000
# puis http://localhost:8000
```

## Ajouter ou compléter une série

Crée un dossier dans `sources/` au nom de la série (majuscules, accents et espaces sont permis), dépose-y les images avec n'importe quels noms, puis lance depuis la racine du projet :

```sh
python3 tools/build.py
```

La commande renomme sur place les images en 001, 002, 003…, crée les versions WebP (complète et miniature), régénère `data/projects.js` et lance la vérification. Rouvre le site : la série est là.

Les images déjà numérotées gardent leur numéro, les nouvelles prennent les numéros suivants (dans l'ordre alphabétique naturel de leurs noms), donc rien ne se décale quand on ajoute des images. Les anciens noms sont conservés dans `_renommages.txt`, dans le dossier de la série. Pour retirer une image, supprime son fichier numéroté dans `sources/` et relance la commande : les autres gardent leur numéro. Seules les images nouvelles ou modifiées sont retraitées ; `python3 tools/build.py --force` retraite tout.

## Réglages

`data/config.json` contient le titre du site (`title`), la phrase d'accueil (`statement`), les paragraphes de la page À propos (`about`), le `contact` et, pour chaque série, son `number` (ordre des salles), son `year` et son `text` de présentation. Pour changer la couverture d'une salle, ajoute `"cover": "005.webp"` dans sa série. Le fichier doit rester du JSON strict (guillemets doubles, pas de virgule après le dernier élément). Relance ensuite `python3 tools/build.py`.

## Retirer une série (ou la salle de test)

Supprime d'abord son dossier de `sources/`, puis retire-la du site :

```sh
rm -r "sources/salle-test"
python3 tools/build.py --retirer salle-test
```

L'identifiant (`salle-test`, `saint-germain`) est le nom du dossier en minuscules, sans accents, avec des tirets.

## Règle absolue

La Memory Bank et `sources/` ne sont jamais commitées.

## Mise en ligne (plus tard, sur ordre)

Créer un dépôt GitHub nommé `serendippo-museum` (URL finale : `https://UTILISATEUR.github.io/serendippo-museum/`).

```sh
git remote add origin URL
git push -u origin main
```

Puis Settings > Pages > Source « Deploy from a branch » > branche `main`, dossier `/ (root)`.

Avant tout push : lancer `python3 tools/check.py` et `git ls-files` pour contrôler qu'aucun fichier de la Memory Bank ni de `sources/` n'est suivi.

## Dépannage

Si le chemin du projet contient des espaces, mets-le entre guillemets dans le terminal. Si Pillow manque : `python3 -m pip install pillow`. Si macOS refuse (« externally-managed-environment ») : `python3 -m venv .venv && source .venv/bin/activate && pip install pillow`, puis relance la commande dans ce même terminal (`.venv/` est ignoré par git).