# SERENDIPPO — Museum of Fortunate Accidents

> A static virtual museum where chance meets curation.  
> Drop a folder of images. GitHub builds the rest.

---

## The Idea

**One folder = one room.**  
Name the folder, fill it with images. No titles, no metadata required.  
Works are numbered 001, 002, 003… and inherit the series name.

Push to `main`. GitHub Actions wakes up:
- renames files to sequential numbers (stable — existing numbers never shift)
- generates WebP (full 2000px + thumb 640px)
- builds `data/projects.js` from `data/config.json`
- publishes to GitHub Pages

The live site updates in ~2 minutes. Watch it in the **Actions** tab.

```
sources/                    your originals, versioned
  saint-germain/            a series = a room
    whatever-name.png       free names → auto-renamed
data/config.json            editable settings (titles, texts, years, bilingual)
.github/workflows/pages.yml the pipeline
data/projects.js            GENERATED, git-ignored
images/                     GENERATED, git-ignored (WebP full + thumb)
```

---

## Add a Series or Images

**On GitHub (no install needed):**  
`Add file → Upload files → drop folder into sources/NAME/ → Commit`

**From your Mac:**  
Drop images into `sources/NAME/` (spaces, accents, caps welcome).  
Double-click `publier.command` — it builds, verifies, syncs, pushes.

Either way: stable numbering, `_renommages.txt` logs every rename, auto-committed by the workflow.

---

## Local Preview (Auto-Regen)

```bash
python3 tools/serve.py
```

Or double-click `lancer.command` on macOS.  
Server starts → builds → opens browser → **rebuilds on every page refresh** if `sources/` changed.

Offline mode: double-click `index.html` → shows last built state.  
Manual rebuild: `python3 tools/build.py` (`--force` to reprocess all).
---

## Qualité des images

La version affichée dans la galerie et la visionneuse est identique pixel pour pixel à ton original : WebP sans perte, résolution d'origine, profil couleur conservé. Seules les métadonnées sont retirées (EXIF, XMP, textes de génération comme les prompts), ce qui reste cohérent avec la règle « on ne garde pas les prompts ». Les miniatures (640 px) servent uniquement aux aperçus de l'accueil. `python3 tools/verify.py` compare chaque image générée à son original et confirme qu'elles sont identiques. Une image JPEG source reste aussi nette qu'elle l'est, jamais plus. Les fichiers sans perte sont plus lourds qu'un JPEG : GitHub Pages limite le site à 1 Go, et `tools/check.py` bloque la publication avant d'atteindre cette limite.

---

## Visionneuse

Un clic sur une œuvre ouvre la visionneuse : molette ou pincement pour zoomer, glisser pour se déplacer, double-clic (ou double-tap) pour passer de « ajusté » à la taille réelle, bouton 1:1 pour un pixel de l'image par pixel de l'écran, balayage horizontal pour changer d'œuvre. Raccourcis : flèches (œuvre précédente ou suivante), + et − (zoom), 0 (ajuster), 1 (1:1), F (plein écran), Échap (fermer). Le bouton « Plein écran » de l'en-tête met toute la galerie en plein écran (absent quand le navigateur ne le permet pas). Chaque œuvre a un lien direct, par exemple `salle.html?p=saint-germain#003`.

---


---

## Remove a Series or Image

Delete the folder or file in `sources/` (GitHub UI or locally), then push.  
The room/image vanishes. Other works keep their numbers.

---

## Describe Your Works (Optional)

Edit `data/config.json` — each work can have:

```json
{
  "id": "001",
  "file": "001.webp",
  "w": 2000,
  "h": 1135,
  "description": "A misty morning on the Seine, generated with a custom LoRA.",
  "date": "2026-03-15",
  "medium": "AI generation, Stable Diffusion XL"
}
```

Fields are optional — only filled fields appear.  
Date and medium show as subtle metadata. Description sits under the work number.

---

## Bilingual by Default

Every text field supports `{ "fr": "...", "en": "..." }`:
- Site title, statement, contact
- About page paragraphs
- Room title, room text
- Work description

Language toggle (FR/EN) in the header, persisted in `localStorage`.  
Defaults to browser language.

---

## Settings

`data/config.json` holds:
- `title`, `statement`, `about`, `contact` (all bilingual)
- Per series: `number` (room order), `year`, `text` (bilingual), `title` (bilingual), `cover` (filename), `works[]` (auto-managed + optional metadata)

JSON must stay strict (double quotes, no trailing commas).

---

## Hard Rules

- **Memory Bank never committed** — blocked by git hook, `check.py`, and the workflow
- `sources/` originals are in the repo — public repo = full-res downloads
- GitHub hard limit: **100 MB / file** — `check.py` flags >90 MB
- `images/` and `data/projects.js` are **generated**, **git-ignored**, built fresh on every push

---

## First Deploy (Once)

1. Create GitHub repo named `serendippo-museum`  
   → live at `https://USER.github.io/serendippo-museum/`
2. `git remote add origin URL`
3. Repo Settings → Pages → **Build and deployment → Source: GitHub Actions**
4. Double-click `publier.command` (or `python3 tools/publish.py`) for first push
5. If Pages wasn't ready: Actions tab → failed run → **Re-run all jobs**

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Actions red cross | Open failed run → read `build.py` / `check.py` logs. Previous site stays live. |
| Path has spaces | Wrap in quotes: `cd "SERENDIPPO — Museum..."` |
| Pillow missing | `python3 -m pip install pillow` (macOS: `python3 -m venv .venv && source .venv/bin/activate && pip install pillow`) |
| Port 8000 busy | `python3 tools/serve.py 8001` |
| Language not switching | Clear `localStorage` or click toggle twice |

---

## Philosophy

No CMS. No database. No build step on your machine.  
Just folders, files, and a pipeline that gets out of the way.

The museum is the images. Everything else is silence.
<!-- trigger rebuild -->
