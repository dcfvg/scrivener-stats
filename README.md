# scrivener-stats

Application React/Vite autonome pour visualiser les statistiques d'écriture Scrivener.

## Scripts

- `npm run dev` : serveur Vite de développement
- `npm run build` : build statique
- `npm run back` : build puis serveur local installable sur `http://127.0.0.1:4678/`
- `npm run preview` : prévisualisation du build déjà généré

## Auto-chargement local

Le mode serveur local peut générer un `server-config.json` temporaire pour charger automatiquement un CSV.
Le mode statique reste compatible avec :

- `?path=http://.../writing-history.csv`
- le dépôt manuel de fichiers dans le navigateur

## Installation

Le build produit un manifeste, un service worker et des icônes, donc Chrome peut proposer l’installation de l’app comme pour `phd-render`.
