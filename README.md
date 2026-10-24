# SERENDIPPO — Museum of Fortunate Accidents

Un musée virtuel statique : un dossier d'images = une salle. Tu ajoutes des dossiers et des images, GitHub génère et publie le site tout seul.

## Principe

Chaque série d'images vit dans son propre dossier de `sources/`. Le nom du dossier est le nom de la série, affiché partout sur le site. Les œuvres n'ont pas de titre : elles sont numérotées 001, 002, 003… et portent le nom de leur série. À chaque envoi sur GitHub, un workflow (GitHub Actions) renomme les images, crée les versions WebP, génère les pages et publie le site sur GitHub Pages. Il n'y a rien d'autre à faire.

```
sources/                      tes images, versionnées avec le projet
  Saint-Germain/              une série = une salle
    nimporte-quel-nom.png     noms libres : ils seront renommés
data/config.json              réglages éditables (titre du site, textes, année des séries)
.github/workflows/pages.yml   le workflow qui génère et publie le site
data/projects.js              GÉNÉRÉ, ignoré par git
images/                       GÉNÉRÉ, ignoré par git : WebP complet et miniature
```

## Ajouter une série ou des images

Sur GitHub, sans rien installer : ouvre le dépôt, « Add file » > « Upload files », glisse un dossier ou des images (dans `sources/NOM DE LA SERIE/`), puis « Commit changes ». L'interface web limite la taille et le nombre de fichiers par envoi : pour les gros lots, utilise la méthode ci-dessous.

Depuis le Mac : dépose les images dans `sources/NOM DE LA SERIE/` (majuscules, accents et espaces permis), puis double-clic sur `publier.command`. Il génère et vérifie en local, récupère les renommages faits par GitHub, enregistre et envoie.

Dans les deux cas, GitHub renomme les images, génère le site et le publie en une à deux minutes (suivi dans l'onglet Actions du dépôt). Les images déjà numérotées gardent leur numéro, les nouvelles prennent les suivants (dans l'ordre alphabétique naturel de leurs noms), donc rien ne se décale. Quand GitHub renomme des images, il enregistre le renommage dans le dépôt (commit « Renommage automatique des images ») et `_renommages.txt` garde les anciens noms.

## Prévisualiser en local (automatique)

```sh
python3 tools/serve.py
```

Sur Mac, double-clic sur `lancer.command` fait la même chose. Le serveur génère le site au démarrage, ouvre le navigateur, puis régénère tout seul à chaque rafraîchissement si `sources/` a changé. Sans le serveur (double-clic sur `index.html`), le site affiche le dernier état généré ; `python3 tools/build.py` régénère à la main (`--force` retraite toutes les images).

## Retirer une série ou une image

Supprime le dossier ou l'image dans `sources/` (sur GitHub ou en local), puis envoie : la série ou l'image disparaît du site. Les autres images gardent leur numéro.

## Réglages

`data/config.json` contient le titre du site (`title`), la phrase d'accueil (`statement`), les paragraphes de la page À propos (`about`), le `contact` et, pour chaque série, son `number` (ordre des salles), son `year` et son `text` de présentation. Pour changer la couverture d'une salle, ajoute `"cover": "005.webp"` dans sa série. Le fichier doit rester du JSON strict (guillemets doubles, pas de virgule après le dernier élément).

## Règles absolues

La Memory Bank n'est jamais commitée : le hook git, `tools/check.py` et le workflow la bloquent. Les originaux de `sources/` sont dans le dépôt : si le dépôt est public, ils sont téléchargeables en pleine résolution. GitHub refuse les fichiers de plus de 100 Mo.

## Mise en ligne (une seule fois, sur ordre)

Crée un dépôt GitHub nommé `serendippo-museum` (URL finale : `https://UTILISATEUR.github.io/serendippo-museum/`), puis connecte le projet avec `git remote add origin URL`. Dans le dépôt, Settings > Pages > Build and deployment > Source : choisis « GitHub Actions ». Fais ensuite le premier envoi avec `publier.command` (ou `python3 tools/publish.py`). Si le premier déploiement a échoué parce que Pages n'était pas encore réglé, onglet Actions > ouvre l'exécution en échec > « Re-run all jobs ».

## Dépannage

Si l'onglet Actions affiche une croix rouge, ouvre l'exécution et lis l'étape en échec : les messages de `tools/build.py` et `tools/check.py` disent quoi corriger, et le site précédent reste en ligne tant que la génération échoue. Si le chemin du projet contient des espaces, mets-le entre guillemets dans le terminal. Si Pillow manque en local : `python3 -m pip install pillow` (ou, si macOS refuse : `python3 -m venv .venv && source .venv/bin/activate && pip install pillow`). Si le port 8000 est occupé : `python3 tools/serve.py 8001`.