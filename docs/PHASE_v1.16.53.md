# Phase 1.16.53 — the pass driven by the catalogue, screen by screen

The previous pass (1.16.52) was rejected: it measured internal tokens and declared itself compliant
without ever comparing a screen to `catalogue/CATALOGUE_AFFICHAGES.html`. This pass starts from the
opposite end: the catalogue file is opened in a browser, a section is rendered next to the same
screen of the game at the same width, the divergences are listed, and the game is changed until the
pair matches.

## What the comparison found first

Opening the catalogue's own dashboard frame at 1:1 (1280 px) next to the live dashboard made the
problem obvious, and none of it was about radius values:

| | catalogue | game before this pass |
|---|---|---|
| font | `system-ui, -apple-system, 'Segoe UI'` | 14 declarations of a display face, `--pw-font-main` on every element |
| weights | 600 / 700 / 800 only, never 900 | 135 declarations at 900, 1 at 1000 |
| text shadow | 5 in the whole file, on captions over photos | 111 declarations |
| letter spacing | on small-caps labels only | 85 declarations, most on titles and buttons |
| page | one flat colour, `--pw-bg-page` `#101012` | `--dark1` + a white wash + a whole painted landscape of sky/grass |
| header | flat band, accent circle, brand 15/800 | lighter gradient band, drop shadow, translucent cream square, 22 px title |
| window body | 10 px padding | 6–8 px |
| wallet | one cell per currency, `--pw-bg-header`, radius 10 | bare columns, or one lone cell |
| shortcut row | `.scrow`: 34 px, radius 9, header surface, hairline mixed at 50 % with the destination colour | 32 px, radius 8, full-saturation coloured frame, gradient fill |
| tutorial card | `.qcard.hi`: 1 px accent hairline | 2 px gold frame in a hard-coded colour |
| surfaces | `#24221E` / `#1C1A17` / `#2B2924` / `#101012` | 68 rules on `--dark1`, 46 on `--dark2`, 22 on `--dark3` |

## What was changed

1. **Typography** — `--pw-font-main` is now the catalogue stack. The display face is no longer
   declared (`core/fonts.css`), and every sheet that named it reads the token.
2. **Weights** — 135 `font-weight: 900` and the single `1000` are now 700. The catalogue never goes
   past 800.
3. **Text shadow and letter spacing** — removed where the catalogue has none; kept where the rule
   also paints a saturated background (14) or sets `text-transform: uppercase` (35).
4. **Palette** — `--pw-bg-page` `#101012`, `--pw-bg-sprite` `#2B2924`, `--pw-radius-sm` 7 px, plus
   the four state colours of the catalogue (`--shield`, `--ok`, `--warn`, `--heal`).
5. **Page and header** — `body` is one flat colour, `body::after` no longer paints a landscape,
   `body::before` no longer scrolls a pixel strip. `#header` is the `.topb` of the catalogue.
6. **Legacy surfaces** — every `background: var(--dark1|--dark2|--dark3)` now points at the
   catalogue surface of the same role (131 declarations). The legacy greys stay declared for the
   borders that legitimately use them.
7. **Dashboard** — grid of the catalogue (10 px padding, 10 px gaps), 10 px window bodies,
   `--pw-win-hdr` 42 px on the header colour, wallet with one cell per currency, shortcut rows as
   `.scrow` (destination colour on the icon, hairline mixed at 50 %), tutorial card at one accent
   hairline, window drop shadow removed.
8. **Two freeze-by-value tests rewritten in their intention** — the dungeon tile test (the tile is
   an action tile of its row, marked by a tint) and the dashboard-hairline test (one row grammar,
   no saturated frame, no gradient).

## What is verified, and how

Verified by a rendered pair, at the same width, one file per screen, in
`PASSATION/shots/2026-11-09/grammaire11653/`:

- `dashboard-catalogue.png` / `dashboard-game.png` / `dashboard-side-by-side.png` — the catalogue's
  dashboard frame and the live dashboard, side by side;
- `BAG.png`, `BOX.png`, `POKEDEX.png`, `MARKET.png`, `SHOP.png`, `BADGES.png`, `DICTIONARY.png`,
  `GUIDE.png` — the eight full screens re-shot after the pass, no page errors.

`npm test` — **906 passed, 0 failed**.

## What is written but not yet verified against the catalogue

Honest list, so the next pass starts here:

- the 13 PC windows other than the dashboard ones (Lieu, Carte, Équipe, Combat, Quêtes, Succès,
  Poké Balls, Raccourcis, Monnaies, Pension, Mine, Base secrète, Entraînement) — they inherit the new
  typography and surfaces but have not been paired one by one;
- the 35 modal sections (fiches, éditeurs, gestion, bilan, énigmes, réglages…);
- the 10 themes and the tablet/mobile devices of the catalogue;
- the cream fills of `--light1` still used in 35 places (the catalogue keeps cream for the primary
  button and the light caption bar of a badge tile, not for panels).
