# PokéWorld Rework — Code & Architecture Rules

Binding rules for every contributor, human or AI. Read this file before you change anything.
`npm test` enforces most of these rules automatically (see `tests/StaticRules.test.js`).
A change that breaks a test is not finished.

---

## 1. Project goals

1. **Full remake** of the original game (https://github.com/play-pokeworld/play-pokeworld.github.io) on a clean architecture.
   - The rendering must stay **near-identical** to the original.
   - Improvements are welcome when they are deliberate. Examples: choosing a nickname, the edge fade on the save card grid, a random theme on new save cards.
2. Long-term maintainability comes before short-term speed.
3. Every delivered zip carries a **version number** (`GameConfig.VERSION` and `package.json` stay in sync).

## 2. Language

- **Code, identifiers and comments are written in English only.**
- **No hardcoded user-visible text in code**, debug logs included.
  - Every string goes through `t('key', params)` (`src/localization/LocalizationManager.js`).
  - Write `console.log(t('debug_xxx', {...}))`, never `console.log('...')`.
  - Tooling under `tests/` and `tools/` is developer-facing and exempt from this rule.
- Each language has one flat table per domain: `src/localization/<lang>/<domain>.js`.
  - A new domain must also be registered in `LocaleCatalog.js`.
- **Parity:** FR and EN define exactly the same keys and the same `{placeholders}`.
  - **No collisions:** a key is defined only once per language.
- Reserved key namespaces:

  | Namespace | Content |
  |---|---|
  | `item.<id>.name` / `item.<id>.desc` | item name / item description |
  | `type.<id>` | type |
  | `location.<id>` | location |
  | `pokemon.<dexId>` | Pokémon name |
  | `move.<id>` | move name |
  | `move_desc.<id>` | move description |
  | `quests.*` | quests |
  | `channel_<id>` | notification channel |
  | `theme_<id>` | UI theme |
  | `save_bg_<id>` | save card theme |
  | `lang_label_<id>` | language label |
  | `avatar_<id>` | trainer avatar |
  | `ball_<id>` | Poké Ball |

- Game data saved to disk uses **ids or slugs**, never translated names. For example, a Pokémon is stored as `species: 'charmander'`.

## 3. Files and classes

- **One file = one class = one purpose.**
  - Split any file that declares several classes, or that mixes responsibilities.
  - Split any file that hardcodes a list of object types inside unrelated logic.
- Group related files in folders. Examples: `core/events/`, `data/quests/`, `panels/settings/`, `ui/dashboard/`.
- Constants live in `src/config/` as frozen objects. This covers ids, storage keys, timings, layout and asset paths.
  - No magic strings or numbers in logic.
- Raw game tables live in `src/data/raw/`.
  - They are plain ESM exports: no `globalThis` or `window` surface.
  - They are wrapped by typed repositories: `PokemonDB`, `LocationDB`, `ItemDB`, `QuestDB`.

## 4. Layers

```
config/  ← constants only
core/    ← BaseObject, EventBus + typed events, LocalStore, TextFormatter, PageManager, Engine
data/    ← models and repositories (DOM-free)
systems/ ← game logic singletons (DOM-free)
ui/      ← the ONLY layer that touches the DOM (widgets, AppShell, dialogs)
panels/  ← game windows composed from ui/ widgets
pages/   ← top-level screens (SaveMenuPage, GamePage)
localization/
```

- **Systems and data never touch the DOM.**
  - They publish typed events through `EventBus` (`new XxxChangedEvent(...)`).
  - Views subscribe with `this.listen(XxxChangedEvent, callback)`, which unsubscribes automatically on destroy.
- **Only `src/ui/` (plus `main.js`) uses `document` / `window`.** `AppShell` owns `<html>` and `<body>`.
- **Only `core/LocalStore.js` uses `localStorage`.** Every key is declared in `config/StorageKeys.js`, with legacy migrations in `LEGACY_STORAGE_KEYS`.
- **Images are resolved only by `config/AssetPaths.js`.**
  - Assets live in the root `assets/` folder, never under `src/`.
  - Pokémon sprites: `assets/images/pokemon/<species>.png` or `<species>_<form>.png`.
  - Shiny sprites: same file name under `assets/images/pokemon/shiny/` (`AssetPaths.pokemonSprite(species, form, true)`).
  - Trainer sprites: `assets/images/trainers/<trainerName>.png`.
  - The images are part of the repository and of every delivered zip (a test checks that each species has a sprite).
- **Team mutations go through `TeamSystem`** (e.g. `setLead(index)`), which saves and emits `TeamChangedEvent`. Views never reorder `save.team` themselves.

## 5. UI construction

- **Never create windows, buttons or panels with raw HTML.** That means no `innerHTML`, no HTML strings and no `createElement` outside `src/ui/`.
- Build every screen from the base widgets. Examples: `UIContainer`, `UIText`, `UIButton`, `UIImage`, `UIIcon`, `UIPanel`, `DraggablePanel`, `UIModal`, `StaticModalPanel`, `UITabBar`, `UIDropdown`, `UISwitch`, `UISlider`, `UIProgressBar`, `UITextInput`, `UISortableList` (lists reordered by drag & drop).
  - If a needed widget does not exist, add one in `src/ui/`.
- **Widgets expose methods that map to CSS classes**, for example `button.setVariant('primary')`, `button.text.setAlignment('center')` and `text.setColor('accent')`.
  - **No CSS in code:** no `.style.xxx =` and no `cssText`.
  - Dynamic values (drag position, progress) go through CSS custom properties via `_setCssVariable('--pw-…', value)`.
- Rich text uses `UIText.setRichText(template, params)`.
  - `TextFormatter` parses it into nodes, with a whitelist of `b`, `strong`, `i`, `em` and `br`.
  - It is never injected as HTML.
- Icons come from `ui/icons/IconRegistry.js`. No emoji and no copy-pasted SVG markup in panels.
- **Keep the original ids and class names** so that the original stylesheet (`design-system.css`) keeps applying.
  - The overlay ids of the original are reserved. Never reuse `#settings-modal`, `#quest-modal`, `#confirm-modal`, `#poke-modal`, `#battle-summary-modal` or `#unified-selector-modal` for another element.
- Panel pattern — **a dashboard panel receives its starting column in its constructor**
  (`DashboardColumns.LEFT | CENTER | RIGHT`). Within a column, the first panel created is at the top
  and the last one at the bottom; the layout saved by the player is restored on top of that order:

```js
export class XxxPanel extends DraggablePanel {
  /** @param {string} column - Starting dashboard column (DashboardColumns value) */
  constructor(column) {
    super({ id: WindowIds.XXX, column, title: t('xxx_title'), icon: 'map', bodyClassName: 'pw-xxx-root', name: 'XxxPanel' });
    this.addChild(new UIContainer({ className: 'pw-xxx-grid', children: [...] }));
    this.listen(SomethingChangedEvent, () => this._refresh());
  }
}
```

- **A DraggablePanel is always fully visible: no scroll inside a panel.** Columns and windows take the
  height of their content; `#main-dashboard` is the only scroll container and scrolls to the bottom of
  the longest column (`assets/css/dashboard-layout.css`). Never give a `.win-body` a fixed height or an
  `overflow: auto`.
- **Dragging a window** is handled by `ui/dashboard/WindowDragController.js` (owned by `DashboardView`):
  the window follows the pointer through a CSS transform (`--pw-drag-x/y`) once per animation frame, and
  the placeholder only moves when the drop target changes. Never animate `left/top` or use
  `transition: all` on `.dash-win`.
- **Live views are built once and updated in place.** A view refreshed by game events (battle tick,
  team change) keeps its nodes and calls setters (`UIText.setText`, `UIProgressBar.setValue`,
  `UIImage.setSource`, `addClass`…). Every setter is a **no-op when the value is unchanged**, so a refresh
  that changes nothing causes no DOM mutation. Rebuild children only when the structure changes
  (e.g. `PokemonMoveList` rebuilds only when the move ids or the opponent types change).
- **Modals open through a request event**, never through a reference:
  `EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.XXX, params))`.
  Each `UIModal` listens to that event and opens itself (`open(params)`) when the id is its own.
  Modal ids live in `config/ModalIds.js`.
- **Full-screen screens (shop, bag, badges, PC box…) extend `UIFullscreenPanel`** (`src/ui/`), one
  subclass per screen in `src/panels/fullscreen/`, added to the `GamePage` children and opened by
  `ModalOpenRequestedEvent(ModalIds.XXX)`. They fill the three slots `setTitle()`, `setFilters()` (fixed
  toolbar, built with `FilterBar`) and `setContent()` (the only scrolling area); the state
  (selection, tab, quantity) lives in the screen, the rules in a DOM-free system.
- **Location actions are `UIActionTile`s** built by `panels/components/LocationActions.js` from the
  location data (`shop`, `champion`, encounters); a locked action is an informational row, never a
  greyed-out button.
- **A modal opened from another modal stacks above it** (higher overlay z-index, registered after it
  in `GamePage`); the first modal stays open and refreshes through events when the second one closes.

## 6. Pages and navigation

- Change pages only through `Engine.getInstance().getPageManager().openPage(PageIds.XXX)`.
- **Pages never import other pages.** Only `pages/PageRegistry.js` imports page classes, which avoids circular includes.
- **Pages are pure composition.** Every panel and modal lives in its own file and is created with `new`
  inside the page constructor, but **a page never keeps a reference to it** (no `this._teamPanel = new …`).
  Panels and modals talk through the EventBus (see the static test "pages never keep a reference").

## 7. CSS

- Stylesheets live in `assets/css/` and are imported by `style.css`.
- `design-system.css` is the original stylesheet and the **single source of truth** for palette, fonts and theme tokens.
  - `variables.css` only adds tokens that the original does not define.
- Use tokens such as `var(--light2)`, `var(--pw-border-color)` and `var(--pw-bg-surface)`, not hex values, so that the UI themes keep working.
- Avoid `!important`. Prefer `:where()` for low-specificity base rules.
- Theme-specific overrides of legacy rules go in `save-menu.css` (save screen) or `panels.css` (game
  windows), scoped with `:root[data-theme="…"]`. Light themes are `light` and `sakura`.
- **Scroll performance** (the dashboard scrolls on the compositor, keep it that way):
  - animate only `transform` and `opacity`; never animate `background-position`, `left/top`,
    `width/height` or use `transition: all`;
  - never animate a full-viewport layer other than with a `transform` (the animated backdrop is a
    `translate3d` of `body::before`, disabled by `prefers-reduced-motion`);
  - a scroll container needs `will-change: scroll-position` (Chromium scrolls a non-opaque scroller
    on the main thread at device pixel ratio < 1.5 otherwise);
  - no `backdrop-filter` / big `box-shadow` on elements that move while scrolling.

## 8. Data and saves

- Every save operation goes through `SaveSystem`, which persists via `SaveStorage` and `LocalStore`.
- A new save card gets a **random theme** at creation (`SaveThemes.random()`).
- **The save format is versioned** by `config/SaveSchema.js`. Any change of the serialized shape bumps
  `SaveSchema.VERSION`, and `SaveData.deserialize()` keeps reading every older version (including the
  original game's `G` object). Add a test per migration (`tests/DataLayer.test.js`).
- **Store facts, derive counts.** A count that can be computed (caught species, seen species…) is never
  stored next to the data it counts (`PokedexData.getCaughtCount()`, not `player.caughtCount`).
- The data model is documented in `docs/DATA_MODEL.md`; keep it up to date.
- **Static definitions are separate from per-save state.** `data/raw/*` + repositories (`PokemonDB`,
  `MoveDB`, `ItemDB`…) are read-only and identical for every save; progress (Pokédex, team, wallet…)
  lives in models owned by `SaveData`.
- **No localized text and no emoji in `data/raw/`.** Names and descriptions are localization keys
  derived from the id (`pokemon.<id>`, `move.<id>`, `move_desc.<id>`, `type.<id>`, `location.<id>`).
- **Ids are lowercase and stable**: types (`fire`), moves (`ember`), species slugs (`charmander`).
  Inputs from older tables are normalized at load (`TypeChart.normalize`).
- Generated tables say so in their header and are rebuilt by `node tools/data/build-all.mjs ../orig`
  (`npm run data -- <original repository root>`), never edited by hand. Fix the generator or its transcription file instead.
- **Every table passes `DataValidator`** (cross references, known effect kinds, known condition
  keys); the test suite requires an empty problem list.
- **Saves are migrated before they are read.** `SaveMigrator` applies pure, individually tested
  migrations (`MigrationVnToVn+1.js`); models only read the current shape.
- **One write per operation**: systems mutate the models, then call `SaveSystem.saveCurrent()` once.
- **Mutate before dispatch**: a model changes its state first, then dispatches its event, so
  listeners always read the new state.
- **Quests are objective types.** One class per `ObjectiveTypes` value (`data/quests/objectives/`),
  declaring the events it listens to; `QuestSystem` routes events, never `if (type === …)` chains.
- **Battle effects are data.** Moves, talents and held items carry `{ kind, …, when? }` effects from
  frozen vocabularies; the engine reads them in phase files and handler tables
  (`MOVE_EFFECT_HANDLERS`), never by item / move / talent id. Every kind has a state in
  `BattleEffectCoverage.js` (see `docs/BATTLE_EFFECTS.md`).
- **Game rules take a `Random`.** No `Math.random()` in rules or systems; tests use
  `Random.sequence([...])`. Rule constants live in `config/*Rules.js`.
- **The battle engine is PokéChill's.** Its differences from the official Pokémon games are intended:
  document them as PokéChill rules ("in PokéChill…"), never as bugs or "unlike the main series".
  Deviations from the *original PokéWorld code* are listed in `docs/BATTLE_EFFECTS.md`.
- **Catch: the ball comes only from the Poké Ball filters, the rate only from the ball.** Owning the
  species or being in a quest never picks the ball; the species never changes the rate. The filters
  are written by `PokeballSystem` only, the catch is done by `CatchSystem` only.
- **Hand-made content goes to `src/data/content/*-content.js`**, never to `data/raw/` (rewritten by the
  generators). Repositories merge them with `withContent` / `withContentList`: a new id adds an entry,
  an existing id replaces the generated one. How-to for content authors: `docs/GUIDE_CONTENU.md`.
- **Trainer battles go through a `TrainerBattleContext`** built by `TrainerSystem` (team choice,
  rematch team, rewards, badges); `BattleSystem` stays generic and never reads trainer data.
- **Purchases go through `ShopSystem`** (DOM-free): offers come from `ShopCatalog` (shop data +
  `config/ShopRules.js`), counters from `StatisticsData.purchases`.
- **Battle log entries are language neutral** (`{ key, params }` with raw ids); only
  `BattleLogFormatter` turns them into text.

## 9. Verification before delivery

```bash
npm test                      # static rules, localization, systems, game data, widgets, panels, launcher
node --check <edited files>   # especially after regex edits of localization tables
```

- `start.bat` must stay **pure ASCII with CRLF** line endings (`.gitattributes`), and must never read `%errorlevel%` inside a `( )` block.
- Update `README.md`, `docs/AUDIT.md` and this file when a rule or the structure changes.
- **Every phase ships a French explanation file** `docs/PHASE_vX.Y.md` (what was done, decisions, what
  is deferred) so the project owner can judge it.
