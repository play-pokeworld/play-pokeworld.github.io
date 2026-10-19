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
- Build every screen from the base widgets. Examples: `UIContainer`, `UIText`, `UIButton`, `UIImage`, `UIIcon`, `UIPanel`, `DraggablePanel`, `UIModal`, `StaticModalPanel`, `UITabBar`, `UIDropdown`, `UISwitch`, `UISlider`, `UIProgressBar`, `UITextInput`.
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
- **Modals open through a request event**, never through a reference:
  `EventBus.getInstance().dispatch(new ModalOpenRequestedEvent(ModalIds.XXX, params))`.
  Each `UIModal` listens to that event and opens itself (`open(params)`) when the id is its own.
  Modal ids live in `config/ModalIds.js`.

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

## 8. Saves

- Every operation goes through `SaveSystem`, which persists via `SaveStorage` and `LocalStore`.
- A new save card gets a **random theme** at creation (`SaveThemes.random()`).

## 9. Verification before delivery

```bash
npm test                      # static rules, localization, systems, widgets, panels, launcher
node --check <edited files>   # especially after regex edits of localization tables
```

- `start.bat` must stay **pure ASCII with CRLF** line endings (`.gitattributes`), and must never read `%errorlevel%` inside a `( )` block.
- Update `README.md`, `docs/AUDIT.md` and this file when a rule or the structure changes.
