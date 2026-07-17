# PokéWorld

PokéWorld est un jeu web fan-made inspiré des jeux Pokémon et de PokéClicker.

## Lancer le projet

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run validate
npm run smoke
```

Le dossier `dist/` contient la version prête à ouvrir dans un navigateur après build.

## Notes

- Les dépendances ne doivent pas être commitées.
- `node_modules/` est exclu des ZIP de livraison.
- Les sauvegardes sont stockées dans le navigateur via `localStorage`.
