# GitHub Pages deployment

## Option A — deploy the built app

Use the contents of `dist/` as the GitHub Pages artifact.

The built `dist/index.html` references hashed JS/CSS assets and contains copied runtime assets under `dist/src/assets/` so legacy sprite paths resolve correctly.

## Option B — rebuild before deploy

```bash
npm install
npm run build
```

Then deploy `dist/`.