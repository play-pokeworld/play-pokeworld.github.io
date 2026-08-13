#!/usr/bin/env node
/**
 * PokéWorld — builds previews/apercu-ui.html: a fully self-contained visual
 * proof page rendered with the REAL views, the REAL PokeCard component and
 * the REAL stylesheet (inlined). No network needed.
 */
import fs from 'node:fs';
import vm from 'node:vm';
import { BagView } from '../src/ui/views/BagView.js';
import { BoxView } from '../src/ui/views/BoxView.js';
import { PokedexView } from '../src/ui/views/PokedexView.js';
import { pokeCardHTML } from '../src/ui/components/poke-card.js';
import { filterBarHTML } from '../src/ui/components/filter-bar.js';
import { moneyRowHTML } from '../src/ui/components/money-row.js';
import { ShopView } from '../src/ui/views/ShopView.js';
import { MarketView } from '../src/ui/views/MarketView.js';
import { saveContextMenuHTML, saveIconGridHTML, saveProfileCurrentIconHTML } from '../src/ui/components/save-extras.js';
import { pokeFullCardHTML } from '../src/ui/components/poke-full-card.js';
import { TrainingWindowView } from '../src/ui/views/TrainingWindowView.js';
import { HatcheryWindowView } from '../src/ui/views/HatcheryWindowView.js';
import { MineWindowView } from '../src/ui/views/MineWindowView.js';
import { SettingsModalView } from '../src/ui/views/SettingsModalView.js';
import { SaveMenuView } from '../src/ui/views/SaveMenuView.js';
import { StarterModalView } from '../src/ui/views/StarterModalView.js';
import { PokeDetailView } from '../src/ui/views/PokeDetailView.js';
import { ManagementMenuView } from '../src/ui/views/ManagementMenuView.js';
import { InfoPanelView } from '../src/ui/views/InfoPanelView.js';
import { LearnableMovesPanelView } from '../src/ui/views/LearnableMovesPanelView.js';
import { SessionSummaryView } from '../src/ui/views/SessionSummaryView.js';
import { AtollPanelView } from '../src/ui/views/AtollPanelView.js';
import { DexDetailView } from '../src/ui/views/DexDetailView.js';
import { AfkRecapView } from '../src/ui/views/AfkRecapView.js';
import { StoryWindowView, NpcDialogView, _RepeatableUpgradeView } from '../src/ui/views/StoryWindowView.js';
import { PuzzleListView, PuzzleExplorationView, SpecialFormsView } from '../src/ui/views/PuzzleViews.js';
import { BaseNpcDialogView, BasePcDialogView, BaseNpcEditorView } from '../src/ui/views/BaseViews.js';
import { AtollFactoryPrepView } from '../src/ui/views/AtollFactoryPrepView.js';
import { LocationInfoView } from '../src/ui/views/LocationInfoView.js';
import { MapOverlaysView } from '../src/ui/views/MapOverlaysView.js';
import { GuidePanelView, TutorialCardView } from '../src/ui/views/GuidePanelView.js';
import { DashboardChromeView } from '../src/ui/views/DashboardChromeView.js';
import { trainerCardHTML } from '../src/ui/components/trainer-card.js';
import { saveCardHTML } from '../src/ui/components/save-card.js';

const css = fs.readFileSync(new URL('../src/assets/styles/design-system.css', import.meta.url), 'utf8');

// ── Real renderBoxFiltersHtml (extracted from the classic file, stubbed) ──
const helpersSrc = fs.readFileSync(new URL('../src/data/game-helpers.js', import.meta.url), 'utf8');
function extractFn(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error('fn not found: ' + name);
  let depth = 0; const i = src.indexOf('{', start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(start, j + 1); }
  }
  throw new Error('unbalanced: ' + name);
}
const FR = {
  box_filter_all_regions: 'Toutes régions', box_filter_all_types: 'Tous types',
  box_filter_all_shiny: 'Tous', box_filter_shiny_only: 'Shiny', box_filter_non_shiny_only: 'Non shiny',
  box_filter_all_evo: 'Toutes', box_filter_evo_missing: 'Évol. manquante',
  box_filter_all_favorites: 'Tous', box_filter_favorite_only: 'Favoris', box_filter_not_favorite: 'Non favoris',
  box_filter_all_locked: 'Tous', box_filter_locked_only: 'Verrouillés', box_filter_unlocked_only: 'Déverrouillés',
  box_filter_all_iv: 'Tous', box_filter_iv_complete: 'IV complets', box_filter_iv_incomplete: 'IV incomplets',
  box_filter_all_ev: 'Tous', box_filter_ev_complete: 'EV complets', box_filter_ev_incomplete: 'EV incomplets',
  box_filter_all_ranks: 'Tous rangs', box_filter_reset: 'Réinitialiser',
  box_filter_region: 'Région', box_filter_type: 'Type', box_filter_shiny: 'Shiny',
  box_filter_evolution: 'Évolution', box_filter_favorite: 'Favori', box_filter_locked: 'Verrou',
  box_filter_iv: 'IV', box_filter_ev: 'EV', box_filter_rank: 'Rang', filters_title: 'Filtres',
  box_filter_search_placeholder: 'Rechercher un Pokémon…',
};
const sandbox = {
  t: (k) => FR[k] || k,
  ensureBoxFilters: () => ({ region: 'all', type: 'all', shiny: 'all', evo: 'all', favorite: 'all', locked: 'all', iv: 'all', ev: 'all', rank: 'all' }),
  getBoxFilterRegions: () => ['all', 'Kanto', 'Johto', 'Hoenn'],
  getBoxFilterTypes: () => ['all', 'Eau', 'Feu', 'Plante', 'Électrik'],
  getRegionDisplayName: (r) => r,
};
sandbox.PokeUI = { components: { filterBarHTML } };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  extractFn(helpersSrc, 'boxFilterOptionHtml') + '\n' + extractFn(helpersSrc, 'renderBoxFiltersHtml'),
  sandbox
);
const boxFiltersHtml = sandbox.renderBoxFiltersHtml();

// ── Sample data ─────────────────────────────────────────────────────────
const poke = (name, level, emoji, shiny = false) => ({ name, level, emoji, shiny, imgSrc: null });

const bagModel = {
  tabs: [
    { id: 'all', label: 'Tout', count: 47, active: true },
    { id: 'balls', label: 'Balls', count: 18 },
    { id: 'heal', label: 'Soins', count: 12 },
    { id: 'ct', label: 'CT/CS', count: 9 },
  ],
  sorts: [
    { id: 'name', label: 'Nom A→Z', active: true },
    { id: 'name_desc', label: 'Nom Z→A' },
    { id: 'qty', label: 'Quantité 9→0' },
    { id: 'qty_asc', label: 'Quantité 0→9' },
  ],
  sortLabel: 'Tri :',
  search: { value: '', placeholder: 'Rechercher un objet…' },
  resetLabel: 'Réinitialiser',
  items: [
    { key: 'pokeball', name: 'Poké Ball', qty: 23, iconHtml: '<span style="font-size:22px">🔴</span>' },
    { key: 'potion', name: 'Potion', qty: 12, iconHtml: '<span style="font-size:22px">🧪</span>' },
    { key: 'cs01', name: 'CS01 — Coupe', qty: 1, iconHtml: '<span style="font-size:22px">💿</span>', equippedName: 'Bulbizarre' },
  ],
};

// Box cards render NO per-card buttons anymore (user rule): the card
// itself opens the sheet (left/right click).
const boxCards = [
  { id: 'bulba', ...poke('Bulbizarre', 12, '🌱'), cardTitle: 'Clic ou Clic Droit pour voir la fiche', ficheLabel: null, ficheTitle: null, action: null },
  { id: 'sala', ...poke('Salamèche', 14, '🔥'), cardTitle: 'Clic ou Clic Droit pour voir la fiche', ficheLabel: null, ficheTitle: null, action: null },
  { id: 'cara', ...poke('Carapuce', 11, '💧', true), cardTitle: 'Clic ou Clic Droit pour voir la fiche', ficheLabel: null, ficheTitle: null, action: null },
  { id: 'pika', ...poke('Pikachu', 20, '⚡'), cardTitle: 'Clic ou Clic Droit pour voir la fiche', ficheLabel: null, ficheTitle: null, action: null },
];
const boxModel = {
  locked: false,
  filtersHtml: boxFiltersHtml,
  emptyAll: false, emptyFiltered: false,
  swapMode: false,
  countLabel: 'Boîte 1 — 4 / 30 Pokémon',
  fullscreenLabel: '⛶ Agrandir',
  cards: boxCards,
};

const dexCells = [];
const dexNames = ['Bulbizarre', 'Herbizarre', 'Florizarre', 'Salamèche', 'Reptincel', 'Dracaufeu', 'Carapuce', 'Carabaffe', 'Tortank', 'Chenipan', 'Chrysacier', 'Papilusion'];
for (let i = 1; i <= 12; i++) {
  dexCells.push({
    id: i, name: dexNames[i - 1],
    seen: i !== 11, caught: i <= 6,
    shiny: i === 7,
    imgSrc: null, emoji: ['🌱', '🌿', '🌳', '🔥', '🔥', '🐉', '💧', '💧', '🌊', '🐛', '🛡️', '🦋'][i - 1],
  });
}
const dexModel = {
  stats: ['Vus : <b>11</b>', 'Capturés : <b>6</b> / 151', 'Shiny : <b>1</b> / 151', 'Régions : <b>Kanto</b>'],
  charm: { title: '✨ Complétez un Pokédex régional à 100 % pour obtenir le Charme Chroma (1/2048 régional)', regions: [{ name: 'Kanto', caught: 6, total: 151, pct: 4, done: false }] },
  cells: dexCells,
  // NEW (your request): the Pokédex has the SAME FilterBar as bag/box
  // (region, type, shiny chips, rank, name search, sort, reset).
  filterBar: {
    className: 'dex-filterbar',
    chips: [
      { label: 'Tous', active: true, call: 'setDexFilter', callArgs: "'shiny','all'" },
      { label: '★ Shiny', active: false, call: 'setDexFilter', callArgs: "'shiny','shiny'" },
      { label: 'Standard', active: false, call: 'setDexFilter', callArgs: "'shiny','normal'" },
    ],
    fields: [
      { label: 'Région', name: 'dex-region', current: 'all', options: [{ value: 'all', label: 'Toutes régions' }, { value: 'kanto', label: 'Kanto' }], changeCall: 'setDexFilter', changeArgs: "'region', this.value" },
      { label: 'Type', name: 'dex-type', current: 'all', options: [{ value: 'all', label: 'Tous types' }, { value: 'Plante', label: 'Plante' }, { value: 'Feu', label: 'Feu' }, { value: 'Eau', label: 'Eau' }, { value: 'Électrik', label: 'Électrik' }], changeCall: 'setDexFilter', changeArgs: "'type', this.value" },
      { label: 'Rang', name: 'dex-rank', current: 'all', options: [{ value: 'all', label: 'Tous rangs' }, { value: 'E', label: 'E' }, { value: 'A', label: 'A' }, { value: 'S', label: 'S' }], changeCall: 'setDexFilter', changeArgs: "'rank', this.value" },
      { label: 'Tri', name: 'dex-sort', current: 'number', options: [{ value: 'number', label: 'N° 1→9' }, { value: 'number_desc', label: 'N° 9→1' }, { value: 'name', label: 'Nom A→Z' }, { value: 'name_desc', label: 'Nom Z→A' }, { value: 'rank', label: 'Rang S→E' }, { value: 'rank_asc', label: 'Rang E→S' }], changeCall: 'setDexFilter', changeArgs: "'sort', this.value" },
    ],
    search: { value: '', placeholder: 'Rechercher un Pokémon…', action: 'filter-dex' },
    reset: { label: 'Réinitialiser', call: 'resetDexFilters' },
  },
};

const bag = BagView.toHTML(bagModel);
const box = BoxView.toHTML(boxModel);
const dex = PokedexView.toHTML(dexModel);

// ── Wave 4: the three "machine" windows through the REAL views ─────────
// DS2807: the unified disc node (.pw-poke-circle-bg) rides EVERY sprite,
// exactly like the in-game spriteImg / pokemonSpriteVNode helpers.
const spr = (emoji, size = 58) => `<span class="pw-poke-circle-wrap" style="width:${size}px;height:${size}px"><span class="pw-poke-circle-bg"></span><span style="position:relative;z-index:2;font-size:${Math.round(size * 0.62)}px;line-height:${size}px;display:block;text-align:center">${emoji}</span></span>`;
const trainingModel = {
  className: 'training-window',
  header: { classes: 'hatchery-upgrade-row', actions: [{ label: 'Gestion de l\'entraînement', iconHtml: '⚙️', call: 'openTrainingManagementMenu', callArgs: "'upgrades'" }] },
  gridClass: 'training-slot-grid',
  slots: [
    {
      cardClass: 'training-slot-card pw-poke-card', classes: '',
      headClass: 'training-slot-head', title: 'Slot 1', statusLabel: 'Prêt !',
      pokemonClass: 'training-slot-pokemon', spriteClass: 'training-slot-sprite',
      pokemon: { spriteHtml: spr('🔥'), contextCall: 'openTrainingSlotPokeModal', contextArgs: 0, name: 'Salamèche', levelLabel: 'Nv.14',
        metaHtml: '<small>EVs 12/36 · Talents 1/3 · Capacités 14</small>' },
      noticesHtml: ['<div class="training-slot-result">Dernier : +2 EV Att. (3 rounds)</div>'],
      actionsRowClass: 'training-slot-actions',
      actions: [
        { label: 'Changer', call: 'openTrainingSlotSelector', callArgs: 0 },
        { label: 'Retirer', call: 'clearTrainingSlot', callArgs: 0, classes: 'pw-btn-danger' },
        { label: 'Auto : activé', iconHtml: '⚙️', call: 'toggleTrainingAutomationSlot', callArgs: '0, false', classes: 'training-slot-auto-btn is-on' },
      ],
      modesGridClass: 'training-mode-grid', modeRowClass: 'training-mode-row', modeTitleClass: 'training-mode-title',
      modes: [
        { classes: 'training-mode--move', title: 'Capacités', descHtml: 'Apprendre une capacité manquante', clickable: true, call: 'startTrainingBattle', callArgs: "'move', 0" },
        { classes: 'training-mode--talent', title: 'Talents', descHtml: 'Débloquer un talent', clickable: true, call: 'startTrainingBattle', callArgs: "'talent', 0" },
        { classes: 'training-mode--ev', title: 'EV (stats)', descHtml: 'Monter les EV', clickable: true, call: 'startTrainingBattle', callArgs: "'ev', 0" },
        { classes: 'training-mode--hidden', title: '🔒 Capacité cachée', descHtml: 'Débloqué après la Ligue de Kanto', clickable: false },
        { classes: 'training-mode--level', title: 'Niveau', descHtml: 'Monter des niveaux', clickable: true, call: 'startTrainingBattle', callArgs: "'level', 0" },
      ],
    },
    {
      cardClass: 'training-slot-card pw-poke-card', classes: 'is-active',
      headClass: 'training-slot-head', title: 'Slot 2', statusLabel: 'En cours…',
      pokemonClass: 'training-slot-pokemon', spriteClass: 'training-slot-sprite',
      pokemon: { spriteHtml: spr('⚡'), contextCall: 'openTrainingSlotPokeModal', contextArgs: 1, name: 'Pikachu', levelLabel: 'Nv.20',
        metaHtml: '<small>EVs 30/36 · Talents 2/3 · Capacités 20</small>' },
      noticesHtml: ['<div class="training-slot-result">Combat visible dans le panneau live</div>'],
      actionsRowClass: 'training-slot-actions',
      actions: [
        { label: 'Annuler', iconHtml: '✕', call: 'cancelTrainingSlot', callArgs: 1, classes: 'pw-btn-danger' },
        { label: 'Auto : désactivé', iconHtml: '⚙️', call: 'toggleTrainingAutomationSlot', callArgs: '1, false', classes: 'training-slot-auto-btn is-off' },
      ],
      modesGridClass: 'training-mode-grid', modeRowClass: 'training-mode-row', modeTitleClass: 'training-mode-title',
      modes: [
        { classes: 'training-mode--move', title: 'Capacités', descHtml: 'Slot actif — modes indisponibles', clickable: false },
        { classes: 'training-mode--ev', title: 'EV (stats)', descHtml: 'Slot actif — modes indisponibles', clickable: false },
      ],
    },
  ],
  gridFooterHtml: '<div class="training-locked-slot"><b>Slot verrouillé</b><button class="hbtn" data-action="legacy-call" data-call="openTrainingUpgradeMenu" data-call-args="">⚙️ Multi-slot (1 000 000₽)</button></div>',
};
const hatcheryModel = {
  className: 'hatchery-window',
  header: { classes: 'hatchery-upgrade-row', actions: [{ label: 'Gestion de la pension', iconHtml: '⚙️', call: 'openHatcheryUpgradeMenu', callArgs: '' }] },
  gridClass: 'pw-col',
  slots: [
    {
      cardClass: 'hatchery-slot-card', classes: 'is-breed',
      mainClass: 'hatchery-slot-main', mediaClass: 'hatchery-slot-media', infoClass: 'hatchery-slot-info',
      nameClass: 'hatchery-slot-name', statusClass: 'hatchery-slot-status', progressWrapClass: 'hatchery-slot-progress',
      main: {
        action: { call: 'openUnifiedSelectorModal', callArgs: "'box_view'" },
        mediaHtml: spr('🥚'),
        nameHtml: 'Œuf de Roucool <span>Slot #1</span>',
        statusText: 'Incubation 5 / 10 KO',
        progress: { pct: 50, barClass: 'hatchery-progress is-normal' },
      },
      actionsRowClass: 'pw-machine-card-actions--end',
      actions: [],
    },
    {
      cardClass: 'hatchery-slot-card', classes: 'is-exp',
      mainClass: 'hatchery-slot-main', mediaClass: 'hatchery-slot-media', infoClass: 'hatchery-slot-info',
      nameClass: 'hatchery-slot-name', statusClass: 'hatchery-slot-status', progressWrapClass: 'hatchery-slot-progress',
      main: {
        action: { call: 'openUnifiedSelectorModal', callArgs: "'box_view'" },
        mediaHtml: spr('💧'),
        nameHtml: 'Carapuce <span>Slot #2</span>',
        statusText: 'Garderie passive Niv. 12 · 7 / 10 KO',
        progress: { pct: 70, barClass: 'hatchery-progress is-normal' },
      },
      actionsRowClass: 'pw-machine-card-actions--end',
      actions: [{ label: 'Retirer', call: 'withdrawPokemonFromDaycare', callArgs: 1, classes: 'hatchery-hatch-btn pw-btn-cancel' }],
    },
    { offerClass: 'pw-hatchery-offer pw-hatchery-offer--exp',
      offer: { label: 'Placer un Pokémon (Slot #3)', rightHtml: '<b class="pw-hatchery-offer-mode">(Garderie)</b>', call: 'openUnifiedSelectorModal', callArgs: "'hatchery_queue_2'" } },
  ],
};
const mineTiles = [];
for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
  const depth = (x + y) % 7 < 4 ? 4 - ((x * 3 + y * 5) % 4) : 0;
  mineTiles.push({ depth: x === 3 && y === 2 ? 0 : depth, x, y, clickable: true,
    itemKey: x === 3 && y === 2 ? 'stardust' : null, itemCenter: x === 3 && y === 2, itemCollected: false,
    iconHtml: x === 3 && y === 2 ? '<span style="font-size:20px">✨</span>' : null });
}
const mineModel = {
  className: 'mine-window',
  header: { classes: 'hatchery-upgrade-row', actions: [{ label: 'Gestion de la mine', iconHtml: '⚙️', call: 'openMineManagementMenu', callArgs: "'upgrades'" }] },
  title: 'Mine', subtitle: 'Creusez pour trouver des trésors. Chaque coup coûte de l\'énergie.',
  energy: { label: 'Énergie', valueText: '72 / 100', pct: 72, hint: 'L\'énergie se recharge avec le temps.' },
  tools: [
    { id: 'chisel', label: 'Burin', cost: 5, selected: true, call: 'setMineTool', callArgs: "'chisel'" },
    { id: 'hammer', label: 'Marteau', cost: 10, selected: false, call: 'setMineTool', callArgs: "'hammer'" },
  ],
  grid: { cols: 8, tiles: mineTiles },
  treasures: { label: 'Trésors', found: 1, total: 4, rows: [
    { collected: true, name: 'Poussière Étoile' }, { collected: false, name: 'Pierre Feu' },
    { collected: false, name: 'Pépite' }, { collected: false, name: 'Fossile Dôme' }] },
  newLayerLabel: 'Nouvelle couche',
};
const training = TrainingWindowView.toHTML(trainingModel);
const hatchery = HatcheryWindowView.toHTML(hatcheryModel);
const mine = MineWindowView.toHTML(mineModel);

// Wave 5: save-game main menu face through the REAL SaveMenuView + SaveCard.
const saveCard = (over) => saveCardHTML({
  mode: 'menu', idLabel: 'ID', badgesLabel: 'Badges', pokedexLabel: 'Pokédex',
  playtimeLabel: 'Temps de jeu', clickHintLabel: 'Clic pour jouer · Clic droit pour gérer',
  spriteHtml: spr('🔥', 56),
  ...over,
});
const saveMenu = SaveMenuView.toHTML({
  title: 'PokéWorld', subtitle: 'Choisis une sauvegarde ou crée une nouvelle aventure.',
  newLabel: 'Nouvelle partie', importLabel: 'Importer',
  empty: null,
  cardsHtml: [
    saveCard({ id: 'PW-ALPHA1', name: 'Ma Partie', background: 'classic', badges: 3, caught: 42, playTimeText: '5h12',
      spriteHtml: spr('🔥', 56) }),
    saveCard({ id: 'PW-BETA22', name: 'Nuzlocke Émeraude', background: 'emerald', badges: 8, caught: 121, playTimeText: '31h47',
      spriteHtml: spr('🌿', 56) }),
  ],
});
const saveMenuEmpty = SaveMenuView.toHTML({
  title: 'PokéWorld', subtitle: 'Choisis une sauvegarde ou crée une nouvelle aventure.',
  newLabel: 'Nouvelle partie', importLabel: 'Importer',
  empty: { title: 'Aucune sauvegarde', desc: 'Crée une nouvelle partie ou importe un fichier de sauvegarde.' },
  cardsHtml: [],
});

// Wave 6: the starter overlay through the REAL StarterModalView (Kanto).
const starterModal = StarterModalView.toHTML({
  welcome: 'Bienvenue dans le monde de PokéWorld !',
  title: 'Choisis ton premier Pokémon',
  subtitle: 'Ce choix est définitif pour cette sauvegarde.',
  required: 'Tu dois choisir un starter pour commencer l’aventure.',
  chooseLabel: 'Choisir',
  region: 'kanto',
  starters: [
    { id: 1, name: 'Bulbizarre', desc: 'Bulbizarre — Plante/Poison', spriteHtml: spr('🌱', 56) },
    { id: 4, name: 'Salamèche', desc: 'Salamèche — Feu', spriteHtml: spr('🔥', 56) },
    { id: 7, name: 'Carapuce', desc: 'Carapuce — Eau', spriteHtml: spr('💧', 56) },
  ],
});

// Wave 10: the detailed Pokémon sheet through the REAL PokeDetailView driven
// by the same STRUCTURED models the classic adapter now produces (stat rows,
// talent block, rank panel, evolution methods, move rows, shiny/protection
// toggles) — no hand-built fragments left in this sample.
const statM = (name, pct, color, value) => ({ name, pct, color, value });
const moveM = (typeName, typeCls, name, meta, extra = {}) => ({
  name, typeCls: `type-${typeCls}`, typeName, typeColor: '#555', meta, title: 'Infos',
  context: { call: 'openMoveInfo', args: "'tackle',0" }, ...extra,
});
const pokeDetail = PokeDetailView.toHTML({
  titleHtml: '<span class="shiny-tag">★</span>Salamèche <span class="poke-detail-id">#4</span>',
  hero: {
    nameHtml: '<b>Salamèche</b><span>Niveau 14 · Équipe</span>',
    spriteHtml: spr('🦎', 96),
    spriteClass: 'poke-detail-sprite-card is-shiny',
    typesHtml: '<span class="type-badge type-fire" style="font-size:12px;padding:4px 10px">Feu</span>',
    shinyToggle: { on: true, call: 'toggleShinySkin', args: '0', label: 'Forme shiny activée' },
    protections: {
      favorite: { on: true, label: 'Favori', call: 'togglePokemonFavorite', args: "0, ''" },
      lock: { on: false, label: 'Verrouillé', call: 'togglePokemonLock', args: "0, ''" },
    },
  },
  stats: {
    tabs: [
      { id: 'base', label: 'Stats de base', active: true },
      { id: 'iv', label: 'IV' },
      { id: 'ev', label: 'EV' },
    ],
    panels: [
      { id: 'base', active: true, rows: [statM('PV', 18, '#60BE58', 44), statM('Attaque', 24, '#D3425F', 52), statM('Défense', 20, '#539DDF', 43), statM('Vit.', 26, '#FBA64C', 58)] },
      { id: 'iv', rows: [statM('PV', 50, '#60BE58', '3/6'), statM('Attaque', 100, '#D3425F', '6/6')] },
      { id: 'ev', rows: [statM('Attaque', 33, '#D3425F', '2/6'), statM('Vit.', 67, '#FBA64C', '4/6')] },
    ],
  },
  sections: [
    { title: 'Talents', kind: 'talent', talent: {
      readonly: false, locked: false, title: 'Talents', iconHtml: '',
      changeArgs: "0, '', this.value",
      options: [
        { value: 'blaze', label: ' Brasier [Commun]', selected: true },
        { value: 'solar_power', label: '  Force Soleil [Rare] — (talent verrouillé)', disabled: true },
      ],
      desc: 'Augmente la puissance des capacités Feu quand les PV sont bas.',
      hidden: { isHidden: true, label: 'Talent Caché : Force Soleil', rarity: 'Rare', desc: 'Booste les capacités spéciales sous le soleil.' },
    } },
    { title: 'Rang', kind: 'rank', rank: { rank: 'B', label: 'Rang du Pokémon', bst: 309 } },
    { title: 'Évolutions', kind: 'evos', wide: true, evos: {
      title: ' Méthodes',
      rows: ['<b>Niveau</b> Atteint le niveau 16 → <b>Reptincel</b>'],
    } },
  ],
  moves: {
    titleLabel: 'Capacités',
    cancelHtml: '',
    knownRows: [
      moveM('Normal', 'normal', 'Charge', '40 Pui. · Physique'),
      moveM('Feu', 'fire', 'Flammèche', '40 Pui. · Spéciale'),
    ],
    knownEmptyLabel: 'Aucune capacité.',
    learn: {
      titleLabel: 'Capacités apprises',
      hintHtml: '',
      rows: [moveM('Feu', 'fire', 'Déflagration', '110 Pui. · Spéciale', {
        stateClass: 'learnable clickable',
        action: { action: 'legacy-call', call: 'learnMove', callArgs: "0,'fire_blast'" },
      })],
      emptyLabel: 'Aucune capacité à apprendre.',
    },
    fullListBtnHtml: '<button class="hbtn poke-detail-full-list-btn" style="width:calc(100% - 24px);margin:8px auto 4px;display:block" data-action="legacy-call" data-call="openLearnableMovesPanel" data-call-args="\'team\',0">Voir toutes les capacités apprises</button>',
  },
});

// Settings modal body (same model shape as buildSettingsModel, FR labels).
const settings = SettingsModalView.toHTML({
  currentLang: 'fr', currentTheme: 'dark',
  lang: { heading: 'Langue / Language', choices: [{ label: 'Français', lang: 'fr' }, { label: 'English', lang: 'en' }] },
  theme: { heading: 'Thème', swatches: [{ label: 'Sombre', theme: 'dark' }, { label: 'Clair', theme: 'light' }, { label: 'Game Boy', theme: 'gameboy' }, { label: 'Feu', theme: 'fire' }] },
  save: { heading: 'Sauvegarde', saveLabel: 'Sauvegarder', loadLabel: 'Charger', exportLabel: 'Exporter', importLabel: 'Importer',
    deleteLabel: 'Supprimer la sauvegarde', deleteWarning: '⚠️ Cette action est irréversible : toute ta progression sera effacée.',
    confirmLabel: 'Confirmer la suppression', cancelLabel: 'Annuler' },
});

const selectorCard = pokeCardHTML({
  title: 'Cliquer pour sélectionner',
  ...poke('Carapuce', 11, '💧', true),
  shinyTitle: 'Forme Shiny',
  levelLabel: 'Lv.11',
  size: 'standard',
  select: { call: 'selectUnifiedCard', callArgs: "'box','cara'", contextCall: 'openBoxPokeModal', contextArgs: "'cara'" },
});

// Wave 3: the complete Party/Battle card — same anchors the 60fps ticker drives.
const fullCard = pokeFullCardHTML({
  active: true, shiny: false, shinyStar: false,
  sprite: { imgSrc: null, emoji: '🔥', title: 'Fiche', click: null, context: { call: 'openPokeInfo', args: '4' }, handlers: true },
  item: { key: 'charcoal', spriteHtml: '<span style="font-size:18px">🪵</span>', empty: false, readonly: false, click: { call: 'openHeldItemPicker', args: '0' }, context: { call: 'openItemInfo', args: "'charcoal'" }, title: 'Changer' },
  name: 'Salamèche', level: 14,
  hp: { current: 31, max: 44, pct: 70, cls: 'high' },
  xp: { pct: 42 },
  statusBadgesHtml: '<span class="buff-badge atk-up">ATK ▲</span>',
  moves: 'bars',
  moveCells: [
    { name: 'Charge', typeLabel: 'Normal', typeCls: 'normal', next: true, contextArgs: "'tackle',-1", effHtml: '<span class="move-eff-badge neutral">×1</span>', title: 'Infos' },
    { name: 'Flammèche', typeLabel: 'Feu', typeCls: 'fire', next: false, contextArgs: "'ember',-1", effHtml: '<span class="move-eff-badge super">×2</span>', title: 'Infos' },
    { name: 'Grincement', typeLabel: 'Normal', typeCls: 'normal', next: false, contextArgs: "'growl',-1", effHtml: '', title: 'Infos' },
    { empty: true },
  ],
});

const TYPES = [
  ['normal', 'Normal'], ['fire', 'Feu'], ['water', 'Eau'], ['electric', 'Élec'], ['grass', 'Plante'],
  ['ice', 'Glace'], ['fighting', 'Combat'], ['poison', 'Poison'], ['ground', 'Sol'], ['flying', 'Vol'],
  ['psychic', 'Psy'], ['bug', 'Insecte'], ['rock', 'Roche'], ['ghost', 'Spectre'], ['dragon', 'Dragon'],
  ['dark', 'Ténèbres'], ['steel', 'Acier'], ['fairy', 'Fée'],
];
const typeBadges = TYPES.map(([cls, label]) => `<span class="type-badge type-${cls}" style="font-size:12px;padding:4px 10px">${label}</span>`).join(' ');

function frame(title, inner) {
  return `<div class="pw-modal-container" style="height:auto;max-height:none;margin:0;width:100%;max-width:none">
    <div class="pw-modal-header"><div class="pw-modal-title">${title}</div><span class="pw-modal-close">✕</span></div>
    ${inner}
  </div>`;
}

// Wave 8: machine management screens through the REAL ManagementMenuView —
// ONE shell (title + tabs + content) shared by the three machines, uniform
// DS upgrade grids and automation toggles.
const mgmtTabs = (machine, active, staffLabel, staffId) => [
  { id: 'upgrades', label: 'Améliorations', iconHtml: '', call: `open${machine}ManagementMenu`, args: `'upgrades'`, active: active === 'upgrades' },
  { id: 'automation', label: 'Automatisation', iconHtml: '', call: `open${machine}ManagementMenu`, args: `'automation'`, active: active === 'automation' },
  { id: staffId, label: staffLabel, iconHtml: '', call: `open${machine}ManagementMenu`, args: `'${staffId}'`, active: active === staffId },
];
const mgmtTraining = ManagementMenuView.toHTML({
  machine: 'training', title: "Gestion de l'entraînement", titleIconHtml: '',
  tabs: mgmtTabs('Training', 'upgrades', 'Dresseurs', 'trainers'),
  blocks: [{
    kind: 'upgrades',
    cards: [
      { title: 'Double slot', value: '1/2', state: 'buy', call: 'upgradeTrainingMultiSlot', args: '', buyLabel: '25 000₽' },
      { title: 'Taille de la file', value: '0/4', state: 'buy', call: 'upgradeTrainingQueueSize', args: '', buyLabel: '7 500₽' },
      { title: 'Slot 1 · Automatisation', value: 'Acheter (100 000₽)', state: 'buy', call: 'buyTrainingAutomationSlot', args: '0', buyLabel: 'Acheter' },
      { title: 'Slot 2 · Automatisation', value: 'Possédé', state: 'owned', stateLabel: 'Possédé' },
    ],
  }],
});
// Wave 11: the automation SLOT CARDS and the STAFF list are DS components
// too (hatcherySlotCardVNode / automationSlotCardVNode / staffListVNode) —
// zero data-style, zero staged fragments left in the management screens.
const hatchField = (label, options) => ({ label, changeCall: 'setHatcherySlotAutomationOption', changeArgs: "0, 'filterShiny', this.value", options });
const mgmtHatchery = ManagementMenuView.toHTML({
  machine: 'hatchery', title: 'Gestion de la pension', titleIconHtml: '',
  tabs: mgmtTabs('Hatchery', 'automation', 'Éleveurs', 'trainers'),
  blocks: [
    {
      kind: 'toggles',
      cards: [
        { iconHtml: '', label: 'Éclosion automatique', purchased: true, enabled: true, call: 'toggleAutomationButton', args: `'autoHatch'`, onLabel: 'Activé', offLabel: 'Désactivé', lockedLabel: "Débloquer dans Améliorations" },
        { iconHtml: '', label: 'Remplissage automatique', purchased: true, enabled: false, call: 'toggleAutomationButton', args: `'autoSeedHatchery'`, onLabel: 'Activé', offLabel: 'Désactivé', lockedLabel: "Débloquer dans Améliorations" },
      ],
    },
    {
      kind: 'slots', variant: 'hatchery', class: 'management-slot-stack',
      cards: [{
        title: 'Slot #1', mode: 'breed', modeLabel: 'Incubation',
        desc: 'Œuf / +1 IV (Niv. 100 uniquement)',
        priority: { label: 'Priorité :', current: 'fossil', currentLabel: 'Fossile', call: 'toggleHatcherySlotPriority', args: '0' },
        modeLabelCtl: { label: 'Mode :' },
        modeBtn: { label: 'Incubation', mode: 'breed', call: 'toggleHatcherySlotMode', args: '0' },
        rules: [
          hatchField('Shiny :', [{ value: 'all', label: 'Tous', selected: true }, { value: 'shiny', label: 'Shiny' }]),
          { label: 'IV :', changeCall: 'setHatcherySlotAutomationOption', changeArgs: "0, 'filterIv', this.value", options: [{ value: 'all', label: 'Tous', selected: true }, { value: 'complete', label: 'Max (36)' }] },
          { label: 'Tri :', changeCall: 'setHatcherySlotAutomationOption', changeArgs: "0, 'sort', this.value", options: [{ value: 'iv_desc', label: 'IV décroissants', selected: true }, { value: 'dex', label: 'N° Pokédex' }] },
        ],
        queue: {
          title: "File d'attente", capacity: '1/6',
          listHtml: '<div class="queue-chip"><span style="font-size:18px">🌱</span><span>Bulbizarre · 10 KO</span><button class="queue-remove-btn">✕</button></div>',
          stop: true,
          add: { label: '+ Ajouter depuis la boîte', call: 'openUnifiedSelectorModal', args: "'hatchery_queue_0'" },
          clear: { label: 'Vider la file', call: 'clearHatcheryQueue', args: '0' },
        },
      }],
    },
  ],
});
// Wave 11 — training automation slot card (DS component as well).
const mgmtTrainingAuto = ManagementMenuView.toHTML({
  machine: 'training', title: "Gestion de l'entraînement", titleIconHtml: '',
  tabs: mgmtTabs('Training', 'automation', 'Dresseurs', 'trainers'),
  blocks: [{
    kind: 'slots', class: 'training-auto-slot-list vertical',
    cards: [{
      title: 'Entraînement auto — Slot 1', state: 'owned',
      enabled: true, onLabel: 'Auto : activé', offLabel: 'Auto : désactivé',
      toggle: { call: 'toggleTrainingAutomationSlot', args: '0' },
      rules: [
        { label: 'Mode :', changeCall: 'setTrainingAutomationOption', changeArgs: "0, 'mode', this.value", options: [{ value: 'all', label: 'Tout (rotation)', selected: true }, { value: 'ev', label: 'EV (stats)' }] },
        { label: 'Shiny :', changeCall: 'setTrainingAutomationOption', changeArgs: "0, 'filterShiny', this.value", options: [{ value: 'all', label: 'Tous', selected: true }, { value: 'shiny', label: 'Shiny' }] },
        { label: 'EV :', changeCall: 'setTrainingAutomationOption', changeArgs: "0, 'filterEv', this.value", options: [{ value: 'all', label: 'Tous', selected: true }, { value: 'complete', label: 'EV complets' }] },
        { label: 'Tri :', changeCall: 'setTrainingAutomationOption', changeArgs: "0, 'sort', this.value", options: [{ value: 'level_desc', label: 'Niveau décroissant', selected: true }, { value: 'dex', label: 'N° Pokédex' }] },
      ],
      queue: {
        title: "File d'attente", capacity: '0/4',
        listHtml: '<div class="queue-cap">0/4 Pokémon</div><div class="dict-muted">Aucun Pokémon en file.</div>',
        add: { label: '🗃 Ajouter depuis la boîte', call: 'openUnifiedSelectorModal', args: "'training_queue_0'" },
        clear: { label: 'Vider la file', call: 'clearTrainingQueue', args: '0' },
      },
    }],
  }],
});
// Wave 11 — staff list (DS component, ui/components/staff.js).
const mgmtStaff = ManagementMenuView.toHTML({
  machine: 'training', title: "Gestion de l'entraînement", titleIconHtml: '',
  tabs: mgmtTabs('Training', 'trainers', 'Dresseurs', 'trainers'),
  blocks: [{
    kind: 'staff', class: 'management-staff-block',
    staff: {
      activeCount: 1, max: 2, activeLabel: 'Personnel actif :',
      tipLines: ['💡 <b>Frais pour Entraînement :</b> 500₽ par combat auto.', '<i>Montez tout le personnel au niveau 100 (Max) pour réduire les frais à 0₽ ! (Niveaux cumulés : 82/500)</i>'],
      cards: [
        {
          id: 'coach_brock', owned: true, active: true,
          spriteHtml: '<span style="font-size:26px">🧗</span>',
          name: 'Pierre (coach)', location: 'Argenta', desc: 'Accélère l\'entraînement des Pokémon de niveau < 20.',
          xp: { label: 'XP : 1200 / 2400', pct: 50 }, levelLabel: 'Niv. 41',
          toggleCall: 'toggleStaff', toggleArgs: "'coach_brock'",
        },
        {
          id: 'coach_iris', owned: false, active: false,
          spriteHtml: '<span style="font-size:26px">🐉</span>',
          name: 'Iris (dragologue)', location: 'Unys', desc: 'Se débloque plus tard dans l\'aventure.',
          hire: { lockedLabel: '🔒 Se débloque à : Unys' },
        },
        {
          id: 'coach_clemont', owned: false, active: false,
          spriteHtml: '<span style="font-size:26px">🔧</span>',
          name: 'Lem (inventeur)', location: 'Illumis', desc: 'Double les gains d\'EV pendant les combats auto.',
          hire: { label: 'Embaucher (25 000₽)', call: 'buyStaff', args: "'coach_clemont'" },
        },
      ],
    },
  }],
});
const mgmtMine = ManagementMenuView.toHTML({
  machine: 'mine', title: 'Gestion de la mine', titleIconHtml: '',
  tabs: mgmtTabs('Mine', 'upgrades', 'Mineurs', 'miners'),
  blocks: [{
    kind: 'upgrades',
    cards: [
      { title: 'Énergie max', value: '100', state: 'buy', call: 'upgradeMineEnergy', args: '', buyLabel: '5 000₽' },
      { title: 'Automatisation', value: 'Acheter (1 000 000₽)', state: 'buy', call: 'buyMineAutomation', args: '', buyLabel: 'Acheter' },
      { title: 'Pioche', value: 'Possédé', state: 'owned', stateLabel: 'Possédé' },
      { title: 'Foreuse', value: '50 000₽', state: 'buy', call: 'buyMineTool', args: `'drill'`, buyLabel: 'Acheter' },
      { title: 'Dynamite', value: '150 000₽', state: 'buy', call: 'buyMineTool', args: `'dynamite'`, buyLabel: 'Acheter' },
    ],
  }],
});
const mgmtFrame = (innerHtml) => `<div id="poke-modal-inner" class="management-inner" style="height:400px;min-height:0;max-height:none;width:100%">${innerHtml}</div>`;

// Wave 12: the battle-session summary through the REAL SessionSummaryView
// (title/content/footer + inline loot strip) and the opponent trainer
// card through the REAL trainer-card component.
const battleSummary = SessionSummaryView.toHTML({
  title: 'Butin & résumé de session',
  stats: [
    { value: 12, label: 'Combats' }, { value: 7, label: 'Captures' }, { value: 9, label: 'Objets' },
    { value: 2, label: 'K.O. équipe' }, { value: '14m32', label: 'Durée' }, { value: 'Route 5', label: 'Lieu' },
  ],
  damage: {
    title: 'Dégâts de l’équipe',
    rows: [
      { spriteHtml: spr('🔥', 30), name: 'Salamèche', valueText: '1 420', pct: 58, koCount: 3 },
      { spriteHtml: spr('⚡', 30), name: 'Pikachu', valueText: '610', pct: 25, koCount: 1 },
      { spriteHtml: spr('💧', 30), name: 'Carapuce', valueText: '235', pct: 17, koCount: 0 },
    ],
    emptyLabel: 'Aucun dégât enregistré cette session.',
  },
  captures: {
    title: 'Pokémon capturés',
    entries: [
      { spriteHtml: spr('🐛', 40), shiny: false, name: 'Chenipan', subLabel: 'Doublons: 2', count: 3 },
      { spriteHtml: spr('🦊', 40), shiny: true, name: 'Goupix', subLabel: 'Shiny', count: 1 },
    ],
    emptyLabel: 'Aucune capture cette session.',
  },
  items: {
    title: 'Objets trouvés',
    entries: [
      { iconHtml: '<span style="font-size:22px">🧪</span>', name: 'Potion', qty: 4 },
      { iconHtml: '<span style="font-size:22px">🔴</span>', name: 'Poké Ball', qty: 2 },
    ],
    emptyLabel: 'Aucun objet trouvé cette session.',
  },
  loot: {
    chips: [
      { html: spr('🐛', 40), title: 'Chenipan', count: 3 },
      { html: spr('🦊', 40), title: 'Goupix (Shiny)', count: 1 },
      { html: '<span style="font-size:30px">🧪</span>', title: 'Potion', count: 4 },
      { html: '<span style="font-size:30px">🔴</span>', title: 'Poké Ball', count: 2 },
    ],
  },
  restartLabel: 'Relancer le combat immédiatement',
  continueLabel: 'Continuer sur la route',
  closeLabel: 'Fermer',
});
const lootInline = SessionSummaryView.inlineHTML({
  loot: {
    chips: [
      { html: spr('🐛', 40), title: 'Chenipan', count: 3 },
      { html: spr('🦊', 40), title: 'Goupix (Shiny)', count: 1 },
      { html: '<span style="font-size:30px">🧪</span>', title: 'Potion', count: 4 },
      { html: '<span style="font-size:30px">🔴</span>', title: 'Poké Ball', count: 2 },
    ],
  },
});
const trainerCard = trainerCardHTML({
  role: 'atoll',
  spriteHtml: '<span style="font-size:26px">👑</span>',
  name: 'Maîtresse de l’Atoll',
  roleLabel: 'Championne de l’Atoll',
  styleLabels: ['Agressive', 'Polymorphe'],
});

// Wave 9: info panels (move/item/talent shell) + "all learnable moves"
// through the REAL InfoPanelView / LearnableMovesPanelView.
const infoPanel = InfoPanelView.toHTML({
  iconHtml: '<span class="type-badge type-fire pw-type-info">Feu</span>',
  title: 'Déflagration',
  subtitle: 'Spéciale',
  statCards: [
    { label: 'Puissance', value: '110' },
    { label: 'Catégorie', value: 'Spéciale' },
  ],
  sections: [
    { title: 'Description', body: '<div class="pw-text-sm pw-light1">Une puissante rafale de feu qui peut brûler la cible.</div>' },
    { title: 'Effets', body: '<div style="background:rgba(236,222,183,0.06);border:1px solid rgba(236,222,183,0.22);color:var(--light2);padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:bold;margin:6px 0;display:flex;align-items:center;gap:6px">✦ Brûlure (10 %)</div>' },
    { title: 'Apprise par', body: '<div class="dict-chip-line"><b>Montée de niveau</b><span class="dict-chip-list"><span class="dict-chip">#6 Dracaufeu</span><span class="dict-chip">#38 Goupix</span><span class="dict-chip">#59 Arcanin</span></span></div>' },
  ],
  rows: null,
  backLabel: '← Retour : Dictionnaire',
});
const learnablePanel = LearnableMovesPanelView.toHTML({
  title: 'Capacités apprises',
  countLabel: '2/6 apprises',
  sections: [
    {
      label: '★ Montée de niveau', count: 3, emptyMsg: 'Aucune',
      moves: [
        { name: 'Charge', typeCls: 'type-normal', typeName: 'Normal', typeColor: '#A8A77A', meta: '40 · ', stateClass: 'known', pill: { label: '✓ Équipée', class: 'is-known' }, contextArgs: `'tackle',0` },
        { name: 'Flammèche', typeCls: 'type-fire', typeName: 'Feu', typeColor: '#EE8130', meta: '40 · ', stateClass: 'learnable', pill: { label: '✓ Disponible', class: 'is-learnable' }, contextArgs: `'ember',0` },
        { name: 'Griffe Acier', typeCls: 'type-steel', typeName: 'Acier', typeColor: '#B7B7CE', meta: '50 · ', stateClass: 'learnable locked', pill: null, contextArgs: `'metal_claw',0` },
      ],
    },
    {
      label: '◇ CT/CS', count: 2, emptyMsg: 'Aucune',
      moves: [
        { name: 'Déflagration', typeCls: 'type-fire', typeName: 'Feu', typeColor: '#EE8130', meta: '110 · ', stateClass: 'learnable locked', pill: null, contextArgs: `'fire_blast',0` },
        { name: 'Repos', typeCls: 'type-psychic', typeName: 'Psy', typeColor: '#F95587', meta: '0 · ', stateClass: 'learnable locked', pill: null, contextArgs: `'rest',0` },
      ],
    },
    { label: '▽ Dressage', count: 1, emptyMsg: 'Aucune', moves: [
      { name: 'Coup d\'Boule', typeCls: 'type-normal', typeName: 'Normal', typeColor: '#A8A77A', meta: '70 · ', stateClass: 'learnable locked', pill: null, contextArgs: `'headbutt',0` },
    ] },
  ],
  back: { label: '← Retour au Pokémon', call: 'openPokeModal', args: '0' },
  closeLabel: 'Fermer',
});



// ═══ Wave 13: Battle Atoll + map dressing / info lieu via the REAL views ═══
const atollNav = (active) => ['menu', 'tower', 'factory', 'arena', 'dome', 'shop'].map((id, i) => ({
  id, label: ['Accueil', 'Tour', 'Usine', 'Arène', 'Dôme', 'Boutique'][i], active: id === active, call: 'setAtollTab', args: `'${id}'`,
}));
const atollHero = { title: 'Atoll de Combat', desc: 'Affronte des équipes tournantes (rotation 12 h, graine datée identique pour tous) et gagne des jetons à échanger à la boutique.', tokens: 128, tokensLabel: 'jetons', streakLabel: 'Série 3 · record 7' };
const atollTower = AtollPanelView.toHTML({
  hero: atollHero, nav: atollNav('tower'), tab: 'tower',
  groupDesc: { title: 'Tour de Combat', desc: 'Sept tours du rang E à la Tour Libre. Ton équipe affronte la rotation courante — les légendaires bannis changent toutes les 12 h.' },
  rotation: { timerText: 'Rotation dans 07:42:19', cycleText: 'Équipe 3/6 · jour 2/3' },
  modeCards: [
    { rankClass: 'rank-c', badgeLabel: 'Rang C max', badgeCls: 'rank-c', title: 'Tour — Rang C', ruleText: 'Niv. 100 · 5v5 · 18 jetons', previewLabel: 'Équipe adverse (rotation)', previewChips: [{ title: 'Noadkoko', spriteHtml: spr('🌴', 28) }, { title: 'Joliflor', spriteHtml: spr('🌸', 28) }, { title: 'Akwakwak', spriteHtml: spr('🦆', 28) }], banRow: null, freeNote: '', cta: { label: 'Combattre', call: 'startAtollBattle', args: "'tower_c'" } },
    { rankClass: 'rank-s', badgeLabel: 'Rang S max', badgeCls: 'rank-s', title: 'Tour — Rang S', ruleText: 'Niv. 100 · 6v6 · 55 jetons', previewLabel: 'Équipe adverse (rotation)', previewChips: [{ title: 'Dracaufeu', spriteHtml: spr('🔥', 28) }, { title: 'Tortank', spriteHtml: spr('💧', 28) }, { title: 'Florizarre', spriteHtml: spr('🌿', 28) }], banRow: { label: 'Légendaires bannis', chips: [{ title: 'Mewtwo', spriteHtml: spr('🧬', 26) }, { title: 'Lugia', spriteHtml: spr('🌊', 26) }, { title: 'Ho-Oh', spriteHtml: spr('🌈', 26) }, { title: 'Mew', spriteHtml: spr('🐾', 26) }] }, freeNote: '', cta: { label: 'Combattre', call: 'startAtollBattle', args: "'tower_s'" } },
    { rankClass: 'rank-free', badgeLabel: 'Sans limite', badgeCls: 'free', title: 'Tour Libre', ruleText: 'Niv. 100 · 6v6 · 70 jetons', previewLabel: 'Équipe adverse (rotation)', previewChips: [{ title: 'Ronflex', spriteHtml: spr('😴', 28) }, { title: 'Tyranocif', spriteHtml: spr('🦖', 28) }, { title: 'Latios', spriteHtml: spr('🛩️', 28) }], banRow: null, freeNote: 'Aucun bannissement dans ce mode.', cta: { label: 'Combattre', call: 'startAtollBattle', args: "'tower_free'" } },
  ],
});
const atollShop = AtollPanelView.toHTML({
  hero: atollHero, nav: atollNav('shop'), tab: 'shop', shopTitle: 'Boutique de l’Atoll',
  shopCards: [
    { iconHtml: '<span style="font-size:24px">🍬</span>', name: 'Super Bonbon', priceText: '25 jetons', affordable: true, buyLabel: 'Acheter', args: "'rarecandy',25" },
    { iconHtml: '<span style="font-size:24px">🧀</span>', name: 'Restes', priceText: '120 jetons', affordable: true, buyLabel: 'Acheter', args: "'leftovers',120" },
    { iconHtml: '<span style="font-size:24px">🪨</span>', name: 'Évoluroc', priceText: '200 jetons', affordable: false, missingText: 'Jetons insuffisants' },
    { iconHtml: '<span style="font-size:24px">🔮</span>', name: 'Orbe Vie', priceText: '360 jetons', affordable: false, missingText: 'Jetons insuffisants' },
  ],
});
const locInfo = LocationInfoView.toHTML({
  overview: { title: 'Route 2', metas: ['Kanto', 'route', '7 rencontres', '0 NPC'] },
  lore: { speaker: 'Guide', text: 'Les roucools abondent ici — reviens avec un Pokémon type Électrik !' },
  actions: [
    { kind: 'button', iconHtml: '🧭', label: 'Explorer', call: 'exploreArea', callArgs: '' },
    { kind: 'button', iconHtml: '🧩', label: 'Explorations à énigmes (1/3)', call: 'openPuzzleListForLocation', callArgs: "'route2'" },
  ],
  unlockTip: { text: '3 / 5 combats — pour débloquer Route 3', pct: 60 },
  timerChips: [{ labelHtml: '<b>Légendaire errant</b> — Raikou peut apparaître ici', timerKind: 'roam', timerText: 'Rotation dans 05:12:44' }],
  wild: {
    meta: { label: 'Pokémon sauvages', progress: '2/7', shinyTag: 'Shiny : 1/7' },
    entries: [
      { owned: true, seen: true, shinyOwned: false, name: 'Roucool', spriteHtml: spr('🐦', 56), levelText: 'Nv.3-5', rarityText: 'Commun' },
      { owned: false, seen: true, shinyOwned: false, name: 'Rattata', spriteHtml: spr('🐀', 56), levelText: 'Nv.2-4', rarityText: 'Commun' },
      { owned: false, seen: false, shinyOwned: false, name: 'Chenipan', spriteHtml: spr('🐛', 56), levelText: 'Nv.3-5', rarityText: 'Peu commun' },
      { owned: false, seen: true, shinyOwned: true, name: 'Aspicot', spriteHtml: spr('🐝', 56), levelText: 'Nv.3-5', rarityText: 'Peu commun' },
    ],
  },
  drops: { title: 'Objets trouvables', chips: [{ iconHtml: '🧪', name: 'Potion' }, { iconHtml: '🍃', name: 'Antidote' }] },
});
const mapHelp = MapOverlaysView.helpHTML({
  title: 'Aide — Couleurs de la carte', closeLabel: 'Fermer',
  rows: [
    { swatchCls: 'is-green', label: 'Quête active sur ce lieu' },
    { swatchCls: 'is-purple', label: 'Légendaire errant repéré' },
    { swatchCls: 'is-blue', label: 'Captures incomplètes' },
    { swatchCls: 'is-yellow', label: 'Shiny encore à trouver' },
    { swatchCls: 'is-gray', label: 'Lieu verrouillé' },
    { swatchCls: 'is-transparent', label: 'Lieu terminé' },
  ],
});
// ── Wave 14 fixtures: guide home/detail, tutorial card, window chrome ──
const guideHome = GuidePanelView.panelHTML({ mode: 'home',
  title: 'Guide', sub: 'Choisis une rubrique pour tout savoir.',
  actions: [
    { label: 'Activer tutos', call: 'tutorialEnable', callArgs: '' },
    { label: 'Désactiver tutos', call: 'tutorialDisable', callArgs: '' },
  ],
  cards: [
    { id: 'map', iconHtml: '\uD83D\uDDFA\uFE0F', title: 'Carte & progression', meta: '5 pages' },
    { id: 'combat', iconHtml: '\u2694\uFE0F', title: 'Combat', meta: '8 pages' },
    { id: 'pokemon', iconHtml: '\uD83D\uDD34', title: 'Pokémon', meta: '8 pages' },
    { id: 'bag', iconHtml: '\uD83C\uDF92', title: 'Sac', meta: '5 pages' },
    { id: 'dictionary', iconHtml: '\uD83D\uDCDA', title: 'Dictionnaire', meta: '4 pages' },
  ] });
const guideDetail = GuidePanelView.panelHTML({ mode: 'detail',
  iconHtml: '\u2694\uFE0F', title: 'Combat', sub: 'Guide détaillé', backLabel: '← Retour',
  pages: [
    { title: 'Principe général', text: 'Les combats sont automatiques et en temps réel. La stratégie se prépare avant : équipe, objets, talents, ordre.' },
    { title: 'Barres d’attaque', text: 'Chaque Pokémon charge automatiquement sa prochaine attaque. Vitesse, statuts et talents modifient le rythme.' },
    { title: 'Efficacité', text: 'Les indicateurs ×2, ×4, ×½, ×¼ et ×0 montrent l’efficacité d’un type contre la cible actuelle.' },
  ] });
const tutCard = TutorialCardView.cardHTML({
  badge: 'Étape 2/5', title: 'Lire une fiche Pokémon',
  desc: 'Ouvre une fiche Pokémon pour lire ses stats, IV, EV, talents et attaques.',
  howLabel: 'Comment ?', how: 'PC : clique ou clic droit sur un Pokémon dans la fenêtre Équipe Active. L’onglet Équipe liste tes Pokémon.',
  pct: 40,
  actions: [
    { label: 'Ouvrir l’Équipe', call: 'showTab', callArgs: "'team'", primary: true },
    { label: 'Guide', call: 'openFullscreenPanel', callArgs: "'guide'" },
    { label: 'Désactiver', call: 'tutorialDisable', callArgs: '' },
  ] });
const winTitle = DashboardChromeView.titleHTML({
  iconHtml: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  labelId: 'map-win-title', labelKey: 'map_title_name', labelText: 'Carte Kanto' });
const winChromeDemo = `
    <div class="dash-win" style="max-width:420px">
      <div class="pw-win-hdr">${winTitle}
        <span style="display:flex;gap:6px;flex:none"><button class="pw-win-tool-btn" title="Aide">?</button><button class="hbtn" style="padding:2px 10px">↻</button></span>
      </div>
      <div class="win-body" style="font-size:12px;line-height:1.45">En-tête DS estampillé au démarrage : <b>une seule</b> poignée à 6 points, icône reprise, libellé avec ses crochets i18n, outils « en direct » (sélecteur de région, bouton ?) jamais réinitialisés.</div>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:12px">
      <div class="dash-win insert-above" style="flex:1;min-width:180px"><div class="win-body" style="font-size:12px">insert-above : liseré bleu plein pendant le glisser</div></div>
      <div class="dash-col col-hovered" style="flex:1;min-width:180px;padding:10px"><div style="font-size:12px">col-hovered : contour pointillé de la colonne cible (avant : aucun style !)</div></div>
      <div class="pw-drag-ghost pw-drag-ghost-win" style="position:static"><span>🗔</span><span class="pw-drag-ghost-txt">Carte Kanto<small>Déplacer la fenêtre</small></span></div>
    </div>`;

// ── Wave 15 fixtures (user-screenshot feedback) ──────────────────────────
const mapHelp15 = MapOverlaysView.helpHTML({
  title: 'Aide — Couleurs de la carte', closeLabel: '✕',
  rows: [
    { swatchCls: 'is-green', title: 'Vert', desc: 'Une quête (principale ou secondaire) est à faire ici.' },
    { swatchCls: 'is-purple', title: 'Violet', desc: 'Un légendaire errant est présent (non capturé).' },
    { swatchCls: 'is-yellow', title: 'Jaune', desc: 'Au moins un Pokémon shiny reste à découvrir ici.' },
  ],
});
const chargeDemo = `<div class="poke-card" style="max-width:250px;margin:0 auto;padding:6px 8px">
  <div class="poke-moves" style="display:flex;flex-direction:column;gap:6px;margin-top:6px">
    <div class="poke-move type-electric charging pw-charge-move" style="--charge-pct:70%"><span class="move-name">Éclair</span><span class="move-type type-electric">Électrik</span></div>
    <div class="poke-move type-fire charging pw-charge-move" style="--charge-pct:45%"><span class="move-name">Flammèche</span><span class="move-type type-fire">Feu</span></div>
    <div class="poke-move type-dragon charging pw-charge-move ready" style="--charge-pct:100%"><span class="move-name">Draco-Rage</span><span class="move-type type-dragon">Dragon</span></div>
  </div></div>`;
const autoMoveDemo = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">
    <div class="auto-move type-grass"><div class="am-top"><span>1. Fouet Lianes ×1</span><span class="am-type type-grass">Plante</span></div><div class="am-bar-bg"><div class="am-bar-fill" style="width:65%"></div></div></div>
    <div class="auto-move type-ice next-up"><div class="am-top"><span>2. Laser Glace ×2</span><span class="am-type type-ice">Glace</span></div><div class="am-bar-bg"><div class="am-bar-fill" style="width:92%"></div></div></div>
  </div>`;
const usmGrid15 = `<div id="usm-grid" class="usm-modern-grid" style="max-height:280px;overflow:hidden">${[
  pokeCardHTML({ title: 'Cliquer pour sélectionner', ...poke('Pikachu', 25, '⚡', false), levelLabel: 'N.25', select: { call: 'selectUnifiedCard', callArgs: "'box','a'" } }),
  pokeCardHTML({ title: 'Cliquer pour sélectionner', ...poke('Bulbizarre', 12, '🌱', false), levelLabel: 'N.12', select: { call: 'selectUnifiedCard', callArgs: "'box','b'" } }),
  pokeCardHTML({ title: 'Cliquer pour sélectionner', ...poke('Salamèche', 8, '🔥', true), shinyTitle: 'Shiny', levelLabel: 'N.8', select: { call: 'selectUnifiedCard', callArgs: "'box','c'" } }),
].join('')}</div>`;
const moneyRowDemo = `<div style="display:flex;justify-content:flex-end;padding:8px;background:var(--dark1);border-radius:8px">${moneyRowHTML({ label: 'Argent', amount: '12 345' })}</div>`;
const langDemo = `<div id="settings-inner" style="max-width:100%;border:none;padding:10px"><div class="pw-settings-choices" style="display:flex;gap:8px">
  <button class="hbtn lang-btn pw-settings-choice active">Français</button>
  <button class="hbtn lang-btn pw-settings-choice">English</button></div></div>`;
const saveCtxDemo = `<div style="display:flex;flex-direction:column;gap:2px;max-width:230px;background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;padding:6px">
  <button class="save-context-item dl-item">⬇ Télécharger</button>
  <button class="save-context-item imp-item">⬆ Importer (écraser)</button>
  <button class="save-context-item danger">🗑 Supprimer</button></div>`;
const headerDemo = `<div id="header" style="position:static;border-radius:8px">
  <h1><span>PokéWorld</span></h1>
  <div class="hinfo pw-static-002"> <span id="h-money">12 345</span>₽ &nbsp;|&nbsp; <span data-i18n="badges_lbl">Badges</span>&nbsp;: <span id="h-badges">12</span>/<span id="h-badges-total">16</span></div>
  </div>`;
const mobileBarsDemo = `<div>
  <div class="mobile-nav-bar" style="display:flex;position:static">
    <button class="mob-btn active">Aventure</button><button class="mob-btn">Combat</button><button class="mob-btn">Équipe</button><button class="mob-btn">Raccourcis</button><button class="mob-btn">Gestion</button>
  </div>
  <div class="mobile-subnav-bar" style="display:flex;position:static;margin-top:6px">
    <button class="mob-sub-btn">Pension</button><button class="mob-sub-btn">Entraînement</button><button class="mob-sub-btn">Grand Souterrain</button><button class="mob-sub-btn">Base</button>
  </div></div>`;


// ── Wave 16 fixtures — shops/market rebuild + save extras ────────────────
const shopDemo = `<div style="padding:8px;background:var(--dark1);border-radius:8px;display:flex;flex-direction:column;gap:8px">
  <div style="display:flex;justify-content:flex-end">${moneyRowHTML({ label: 'Argent', amount: '9 000' })}</div>
  ${ShopView.toHTML({ state: 'ok', items: [
    { key: 'potion', name: 'Potion', desc: 'Restaure 20 PV d\u2019un Pokémon.', stockLabel: 'Stock: 3', maxLabel: null, priceLabel: '200₽', spriteHtml: '<span class="pw-choice-icon" style="display:inline-flex;width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#E85D75,#8A4FB0)"></span>' },
    { key: 'max_repel', name: 'Max Repousse', desc: 'Éloigne les Pokémon sauvages pendant 250 pas.', stockLabel: 'Stock: 12', maxLabel: null, priceLabel: '700₽', spriteHtml: '<span class="pw-choice-icon" style="display:inline-flex;width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#E85D75,#8A4FB0)"></span>' },
    { key: 'x_attack', name: 'Attaque +', desc: 'Monte l\u2019Attaque en combat.', stockLabel: 'Stock: 25/25', maxLabel: 'MAX', priceLabel: '500₽', spriteHtml: '<span class="pw-choice-icon" style="display:inline-flex;width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#E85D75,#8A4FB0)"></span>' },
  ] })}</div>`;
const marketDemo = `<div style="padding:8px;background:var(--dark1);border-radius:8px">${MarketView.toHTML({ emptyLabel: 'Empty', categories: [
  { key: 'starter', label: 'Starters', cards: [{ id: 1, name: 'Bulbizarre', numLabel: '#1', typesHtml: '<span class="type-badge type-grass">Plante</span> <span class="type-badge type-poison">Poison</span>', bstLabel: 'BST 318', priceLabel: '25 000₽', ownedLabel: 'Acheté', spriteHtml: '' }] },
  { key: 'rare', label: 'Rares', cards: [{ id: 132, name: '???', numLabel: '#132', typesHtml: '<span class="type-badge type-normal">Normal</span>', bstLabel: 'BST 288', priceLabel: '120 000₽', ownedLabel: null, spriteHtml: '' }] },
] })}</div>`;
const saveExtrasDemo = `<div style="display:grid;grid-template-columns:220px 1fr;gap:12px;align-items:start">
  <div style="background:var(--dark2);border:1px solid var(--dark3);border-radius:10px;padding:6px;display:flex;flex-direction:column">${saveContextMenuHTML({ items: [
    { icon: '\u2B07', label: 'Télécharger', intent: 'dl', call: 'downloadSaveById', callArgs: "'PW-DEMO'" },
    { icon: '\u2B06', label: 'Importer (écraser)', intent: 'imp', call: 'importOverwriteSaveById', callArgs: "'PW-DEMO'" },
    { icon: '🗑', label: 'Supprimer', intent: 'danger', call: 'deleteSaveById', callArgs: "'PW-DEMO'" },
  ] })}</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;gap:8px;align-items:center;padding:8px;background:var(--dark2);border-radius:10px">${saveProfileCurrentIconHTML({ id: 25, name: 'Pikachu', iconHtml: '', noIdLabel: 'Aucun' })}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${saveIconGridHTML({ choices: [
      { key: 'b1', id: 25, name: 'Pikachu', level: 50, shiny: true, active: true, levelLabel: 'N.', iconHtml: '' },
      { key: 'b2', id: 6, name: 'Dracaufeu', level: 64, shiny: false, active: false, levelLabel: 'N.', iconHtml: '' },
      { key: 'b3', id: 150, name: 'Mewtwo', level: 70, shiny: false, active: false, levelLabel: 'N.', iconHtml: '' },
    ] })}</div>
  </div></div>`;

// ── Wave 17 demos (section 18) ────────────────────────────────────────────
const _w17card = (name, lv) => `<div class="box-card pw-poke-card" title=""><div class="ab-icon"><span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span class="pw-poke-circle-emoji" style="z-index:2;font-size:34px">⚡</span></span></div><div class="pw-bold pw-text-sm">${name}</div><div class="pw-text-sm pw-light1">${lv}</div></div>`;
const boxFixDemo = `<p class="pv-note">L&rsquo;&lt;img&gt; du cercle n&rsquo;avait <b>ni .sprite-img ni règle de taille</b> : elle s\u2019affichait à sa
  taille PNG naturelle (96px+) et inondait la grille ; la marge legacy + le partage égal des lignes finissaient
  de vider les cartes (pilules sombres du screenshot). Désormais : image bornée à 100 % du cercle, lignes <code>max-content</code>, carte étirée — nom + niveau lisibles, sprites uniformes (72 px).</p>
  <div class="usm-modern-grid" style="display:grid;grid-template-columns:repeat(3,minmax(150px,1fr));gap:12px;padding:14px;background:var(--dark1);border-radius:10px;margin-top:8px">
  ${_w17card('Bulbizarre', 'Nv.5') + _w17card('Salamèche', 'Nv.12') + _w17card('Carapuce', 'Nv.8')}</div>`;
const dragDemo = `<p class="pv-note">Le liseré du haut était une ombre <i>inset</i> peinte <b>sous l\u2019en-tête opaque</b> :
  invisible depuis toujours. Les marqueurs sont maintenant de vraies barres <code>::after</code> au-dessus du
  contenu — dessus, dessous, toutes colonnes, et <b>double marquage</b> entre deux fenêtres.</p>
  <div style="display:flex;gap:14px;margin-top:8px">
    <div class="dash-win insert-above" style="flex:1;min-height:64px;background:var(--dark2);border:1px solid var(--dark3);border-radius:10px"><div style="padding:8px 10px;font-size:12px;color:var(--light1)">Fenêtre du dessous · insert-above</div></div>
    <div class="dash-win insert-below" style="flex:1;min-height:64px;background:var(--dark2);border:1px solid var(--dark3);border-radius:10px"><div style="padding:8px 10px;font-size:12px;color:var(--light1)">Fenêtre du dessus · insert-below</div></div></div>`;
const battleChromeDemo = `<p class="pv-note">« Résumé » + « Quitter le combat » ne s\u2019affichent que si la scène est
  <code>.is-live</code> — sinon la ligne entière est masquée (plus de chrome fantôme au démarrage). En
  entraînement : le panneau live passe <b>en haut</b> de la scène, le chrome est masqué et « Abandonner » est
  du rouge cramoisi de la famille danger (le couvre-boutons générique l\u2019écrasait).</p>
  <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
    <button class="hbtn" style="opacity:.45" disabled>Résumé</button>
    <button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="cancelTrainingSlot" data-call-args="0">Abandonner</button></div>
    <div class="pw-text-sm pw-light1" style="margin-top:2px">← état entraînement : chrome masqué, abandon cramoisi</div>`;
const activeDemo = `<p class="pv-note">La langue active est ré-affirmée avec la portée id (le couvre-boutons des
  réglages l\u2019aplatissait) ; les paires actifs sont des <b>jetons par thème</b> (AA ≥ 6 partout) au lieu du
  crème figé, illisible en thème clair. La pastille de thème garde sa couleur de preview ; la sélection est un
  anneau <i>inset</i> — le halo extérieur était rogné par le cadre.</p>
  <div id="settings-inner" style="max-width:100%;border:none;padding:10px;display:flex;flex-direction:column;gap:10px;background:transparent">
    <div class="pw-settings-choices" style="display:flex;gap:8px">
      <button type="button" class="hbtn lang-btn pw-settings-choice" data-action="set-language" data-lang="fr">Français</button>
      <button type="button" class="hbtn lang-btn pw-settings-choice active" data-action="set-language" data-lang="en">English</button></div>
    <div style="display:flex;gap:8px">
      <button type="button" class="theme-swatch active" style="background:#12151c;color:#fff">Dark</button>
      <button type="button" class="theme-swatch" style="background:#d64566;color:#fff">Light</button></div></div>`;


// ── Wave 18 demos (section 19) ────────────────────────────────────────────
const _w18card = (name, lv, shiny) => pokeCardHTML({ imgSrc: '', emoji: shiny ? '🦆' : '⚡', name, levelLabel: lv, shiny, size: 'standard' });
const boxDexDemo = `<p class="pv-note">La boîte PC reprend <b>le langage exact du Pokédex</b> : médaillon rond transparent,
  pastille <b>sous</b> le sprite (même shape que le n° dex, en bas comme demandé), ★ en haut à droite,
  densité de grille identique. Structure réelle du composant unique <code>poke-card</code> ci-dessous :</p>
  <div id="pv-usm" style="background:var(--dark1);border-radius:10px;padding:14px;margin-top:8px">
  <div class="usm-modern-grid" style="display:grid;grid-template-columns:repeat(4,minmax(min(108px,100%),1fr));gap:14px">
  ${_w18card('Bulbizarre', 'Nv.5', false) + _w18card('Salamèche', 'Nv.12', false) + _w18card('Carapuce', 'Nv.8', true) + _w18card('Pikachu', 'Nv.42', false)}</div></div>`;
const doubleRondDemo = `<p class=\"pv-note\">Le lieu (et le panneau de formes) emballaient la sortie de <code>spriteImg</code> —
  qui porte DÉJÀ son disque — dans un <b>second cercle</b> : deux disques décalés recouvraient le sprite,
  jusqu'à le rendre invisible selon le thème. Corrigé dans le markup + garde-fou CSS : un disque imbriqué ne
  peut plus jamais se peindre.</p>
  <div style="display:flex;gap:24px;align-items:center;margin-top:8px;flex-wrap:wrap">
    <div style="text-align:center"><span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span class="pw-poke-circle-emoji" style="font-size:34px">🐦</span></span></span><div class="pw-text-sm pw-light1" style="margin-top:6px">avant : 2 disques (le garde-fou les rend maintenant impossibles même en markup imbriqué)</div></div>
    <div style="font-size:22px;color:var(--light1)">→</div>
    <div style="text-align:center"><span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span class="pw-poke-circle-emoji" style="font-size:34px">🐦</span></span><div class="pw-text-sm pw-light1" style="margin-top:6px">après : 1 seul disque</div></div></div>`;
const selectThemeDemo = `<p class="pv-note">3ᵉ signalement, vraie cause racine trouvée : une règle <b>couvre-écran</b>
  <code>select, option { background: #0c0a09 !important }</code> forçait TOUS les filtres/menus en noir figé,
  quel que soit le thème (mes captures précédentes confirmaient — le diagnostic jsdom, lui, ne voyait rien).
  Jeton de thème désormais : <b>rgb(36,34,30)</b> en sombre, <b>rgb(245,239,235)</b> en clair (mesuré en navigateur).</p>
  <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
    <select class="pw-filter-select"><option>Type — Tous</option><option>Feu</option></select>
    <select class="pw-filter-select"><option>Région — Toutes</option><option>Kanto</option></select>
    <span class="pw-text-sm pw-light1">← fond = <code>var(--pw-bg-surface)</code> (suit le thème)</span></div>`;
const chargeShinyDemo = `<p class="pv-note">Barre de charge des attaques : piste = <b>couleur du type atténuée</b>
  (attaque « vide » lisible), remplissage = couleur exacte du type. Étoiles shiny : <b>une seule couleur</b>,
  celle du Pokédex (<code>var(--shiny)</code>, thémée) pour équipe, PC, panneau d'info et lieu — il y en avait 4.</p>
  <div style="display:flex;gap:14px;align-items:center;margin-top:8px;flex-wrap:wrap">
    <div class="auto-move type-fire" style="width:190px"><div class="am-top"><span>1. Flamèche</span><span class="am-type type-fire">Feu</span></div><div class="am-bar-bg"><div class="am-bar-fill" style="width:55%"></div></div></div>
    <span>★ équipe <span class="shiny-tag">★</span> · ★ PC <span class="pw-shiny-star">★</span> · ★ info <span class="pw-shiny-star">★</span> · ★ dex <span class="pw-shiny-star">★</span></span></div>`;
const misc18Demo = `<p class="pv-note">Résumé de combat : sprite contenu (72 px, centré) et compteur
  <b>×N devant</b> (z-index, il passait derrière le disque). Panneaux d'info objet/attaque/talent
  élargis <b>360 → 560 px</b>. « Abandonner »/« Retirer » et le « Ramasser » de la base secrète : rouge
  cramoisi <code>#D3425F</code> <b>identique à tous les boutons rouges</b> (le mix assombri de la vague 17
  les distinguait). Icône de sauvegarde contenue (70 px) et centrée. Glisser-déposer : les limites ignorent
  les fenêtres masquées — une dernière fenêtre cachée avalait le liseré du bas de colonne.</p>
  <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
    <div class="battle-summary-entry is-normal" style="display:flex;align-items:center;gap:10px;background:var(--dark3);border-radius:6px;padding:8px"><div class="pw-summary-sprite"><span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span class="pw-poke-circle-emoji" style="font-size:34px">⚡</span></span></div><div class="pw-flex-1"><div class="pw-summary-name">★ Pikachu</div><div class="pw-text-sm pw-light1">Shiny</div></div><div class="pw-summary-count">×1</div></div>
    <button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="cancelTrainingSlot" data-call-args="0">Abandonner</button>
    <button class="hbtn pw-btn-danger" data-action="base-ed-pickup">Ramasser</button></div>`;

// ── Wave 19 demos (section 20) ────────────────────────────────────────────
// Rendered with the REAL DexDetailView (same code as the game).
const _w19disc = `<span class="pw-poke-circle-wrap" style="width:104px;height:104px"><span class="pw-poke-circle-bg"></span><span class="pw-poke-circle-emoji" style="font-size:52px">🔥</span></span>`;
const dexDetailDemoHtml = DexDetailView.toHTML({
  id: 4, name: 'Salamèche', shiny: true,
  spriteHtml: _w19disc,
  typesHtml: '<span class="type-badge type-fire">Feu</span>',
  flavorLabel: 'Description', flavor: 'La flamme au bout de sa queue brille depuis sa naissance.',
  evolutionsHtml: '<div class="pw-panel pw-info-section"><div class="pw-section-title">Méthodes d’évolution</div><div class="pw-info-section-body">Niveau 16 → Reptincel</div></div>',
  sourcesLabel: 'Où le trouver', sources: ['Route 24', 'Œuf'],
  movesLabel: 'Capacités', moves: [{ key: 'ember', label: 'Flammèche' }, { key: 'tackle', label: 'Charge' }],
  noMovesLabel: 'Aucune capacité listée.',
  talentsLabel: 'Talents', talents: [{ key: 'blaze', label: 'Brasier' }],
  noTalentsLabel: 'Aucun talent listé.',
  statsLabel: 'Stats de base',
  stats: [{ label: 'PV', value: 39 }, { label: 'ATK', value: 52 }, { label: 'DEF', value: 43 }, { label: 'ASP', value: 60 }, { label: 'DSP', value: 50 }, { label: 'VIT', value: 65 }],
});
const dexDetailDemo = `<p class="pv-note">La fiche de détail du Pokédex (clic sur une case) était le DERNIER
  panneau bâti en HTML brut : orbe en <b>dégradé radial</b> 144 px, boîtes rgba, mini-stats sur 4 colonnes.
  Elle est désormais rendue par <code>DexDetailView</code> (ECS), avec <b>exactement le langage du panneau
  d'info</b> déjà validé : en-tête canonique, médaillon plat + badges de type, sections encadrées, 6 cartes
  de stats partagées. Mesuré en Chromium : 1 disque, 5 sections, 6 cartes, 0 résidu, pas de débordement.</p>
  <div id="poke-modal-inner" class="poke-detail-inner" style="max-width:560px;margin:10px auto 0;background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${dexDetailDemoHtml}</div>`;
const toastDemo = `<p class="pv-note">Notifications : fini le <b>fond vert dur inline</b> pour tous les messages.
  Le toast est une surface plate thémée (lisible sur tout thème) avec un <b>liseré de type</b> à gauche — la
  couleur suit le langage des boutons : cramoisi danger / vert succès / accent info / neutre. L'argument
  historique <code>notify(msg, couleur)</code> est mappé (<code>pwToastKind</code>) ; couleur inconnue =
  neutre. Mesuré : fond <b>rgb(36,34,30)</b> sombre / <b>rgb(245,239,235)</b> clair, liseré <b>#D3425F</b> en danger.</p>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;max-width:330px">
    <div id="notif" class="pw-toast pw-toast--success is-visible" style="display:block;position:static">Pokémon capturé !</div>
    <div id="notif2" class="pw-toast pw-toast--danger is-visible" style="display:block;position:static">Impossible ici.</div>
    <div id="notif3" class="pw-toast pw-toast--info is-visible" style="display:block;position:static">Nouvelle quête disponible.</div>
  </div>`;
const starReDemo = `<p class="pv-note"><b>Découverte Chromium (vague 19)</b> : une règle héritée
  <code>#poke-modal-inner * { color: var(--light2) }</code> (spécificité 1,0,0 — un sélecteur d'id + joker)
  re-coloriait en crème TOUTE ★ affichée dans une modale. L'unification de la vague 18 ne tenait donc pas
  dans les panneaux d'info ni la fiche dex. La règle unifiée des ★ est passée en <code>!important</code> :
  une étoile shiny est désormais TOUJOURS de la couleur shiny, partout, mesuré rgb(255,68,68) en sombre
  dans la fiche dex ci-contre.</p>`;

// ── Wave 20 demos (section 21) ────────────────────────────────────────────
// Rendered with the REAL wave-20 views (same code as the game adapters).
const _w20disc = (emoji) => `<span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span style="position:relative;z-index:2;font-size:44px;line-height:72px;display:block;text-align:center">${emoji}</span></span>`;
const afkResultDemoHtml = AfkRecapView.toHTML({
  mode: 'result',
  title: '⏱ Retour AFK',
  statusText: 'Progression simulée avec succès.',
  statusKind: 'success',
  stats: [
    { value: '30m 00s', label: 'Durée' }, { value: '7', label: 'Combats' },
    { value: '+2 450₽', label: 'Argent' }, { value: '1', label: 'Pokémon K.O.' },
    { value: '3', label: 'Captures' }, { value: '+60', label: 'Énergie mine' },
    { value: '2', label: 'Entraînements' }, { value: '1', label: 'Minages auto' },
  ],
  capturesTitle: 'Pokémon capturés :',
  captures: [
    { spriteHtml: _w20disc('🐀'), name: 'Rattata', subLabel: '', count: 1, shiny: true },
    { spriteHtml: _w20disc('🐦'), name: 'Roucool', subLabel: '1 doublon', count: 2, shiny: false },
  ],
  itemsTitle: 'Objets trouvés :',
  items: [
    { iconHtml: '<span style="font-size:32px">🟡</span>', name: 'Pépite', qty: 1 },
    { iconHtml: '<span style="font-size:32px">🍬</span>', name: 'Super Bonbon', qty: 2 },
  ],
  emptyLabel: 'Rien à signaler.',
  noteText: 'Rapport généré après 30 minutes hors-ligne.',
  closeLabel: 'Fermer',
});
const afkProgressDemoHtml = AfkRecapView.toHTML({
  mode: 'progress', title: '⏱ Calcul de la progression…', statusText: 'Avance rapide… 42 %', pct: 42, stageText: 'Combats sauvages',
});
const afkDemo = `<p class="pv-note">Le panneau hors-ligne (avance rapide + récapitulatif « gains en
  votre absence ») était bâti en HTML brut avec ses propres tuiles <code>afk-loot-card</code> (dégradé sur la
  barre, teintes hex hors thème). Il est rendu par <code>AfkRecapView</code> (ECS) : barre de progression
  <b>plate verte</b>, et le récap réutilise <b>les MÊMES composants que le bilan de session de combat</b>
  (grille de stats, rangées captures/objets) — un seul langage visuel. Mesuré en Chromium : statut teinté
  vert bordé, sprites 72 px canoniques, 0 tuile héritée, 2 contrôles de fermeture.</p>
  <div class="pv-cols" style="margin-top:10px">
    <div id="afk-result-modal" class="open" style="display:block;position:static;max-width:560px">${afkResultDemoHtml}</div>
    <div style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${afkProgressDemoHtml}</div>
  </div>`;
const storyDemoHtml = StoryWindowView.toHTML({
  blocks: [
    { type: 'section', tone: 'story', iconHtml: '📖', label: 'Quêtes principales (Kanto — 5/60)' },
    { type: 'card', card: {
      title: '5. Premier duel : Blue', desc: 'Votre rival vous nargue Route 22.',
      kind: 'trainer', trainerText: 'Adversaire : Blue', trainerHint: 'Combat de quête : le combat en cours s’interrompt si besoin.',
      rewardText: 'Victoire : 1 000₽',
      action: { cls: 'is-challenge', call: 'startQuestTrainerBattle', callArgs: "'5','main'", label: 'Défier !' },
    } },
    { type: 'card', card: {
      title: '2. Premiers pas', desc: 'Vaincre 10 Pokémon sauvages.',
      kind: 'progress', progressLabel: 'Progression', progressValue: '4 / 10', pct: 40, done: false,
      rewardText: '600₽', infoText: 'En cours…',
    } },
    { type: 'section', tone: 'blue', iconHtml: '🧍', label: 'Quêtes secondaires (Kanto)' },
    { type: 'card', card: {
      title: 'Le collectionneur de baies', desc: 'Vaincre 10 Pokémon sauvages Route 1.',
      kind: 'progress', progressLabel: 'Progression', progressValue: 'Prêt !', pct: 100, done: true,
      rewardText: '700₽', action: { cls: 'is-done', call: 'claimQuest', callArgs: "'s1','side'", label: 'Réclamer' },
    } },
  ],
  footer: { kind: 'board', iconHtml: '🔁', label: 'Tableau des quêtes répétables' },
});
const npcDemoHtml = NpcDialogView.toHTML({
  npcIconHtml: '🧍', npcName: 'Régis',
  lines: ['Tu veux voir de vraies baies ? Montre-moi d’abord ce que tu vaux.'],
  quest: { state: 'offer', title: 'Le collectionneur de baies', desc: 'Vaincre 10 Pokémon sauvages Route 1.', rewardText: '700₽', actionLabel: 'Accepter', callArgs: "'s1'" },
  closeLabel: 'Fermer',
});
const questDemo = `<p class="pv-note">L’intérieur de la fenêtre « Histoire &amp; Quêtes », les dialogues PNJ et
  le panneau d’amélioration des emplacements répétables abandonnent leurs classes jetables
  (<code>pw-tip-card</code>, <code>pw-card-purple</code>, <code>pw-detail-chip</code>…) au profit des trois vues ECS
  <code>StoryWindowView</code> / <code>NpcDialogView</code> / <code>RepeatableUpgradeView</code> : cartes encadrées,
  barre de progression canonique, pastille de récompense. <b>Règle DS</b> : plus JAMAIS de bouton grisé mort —
  une quête non terminable affiche une ligne informative « En cours… ». Contrats du routeur inchangés
  (arguments quotés <code>'5','main'</code> / non quoté numérique <code>75000</code>, croix unique).</p>
  <div class="pv-cols" style="margin-top:10px">
    <div id="story-panel" style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${storyDemoHtml}</div>
    <div id="quest-body" style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${npcDemoHtml}</div>
  </div>`;
const hammerDemo = `<p class="pv-note"><b>Découverte Chromium (vague 20)</b> — même famille que le bug des
  liserés de toast de la vague 19 : le marteau des contrôles plats
  (<code>.hbtn…, button[data-action] { background: teinte-12% !important }</code>, spécificité 0,3,1)
  repeignait les boutons de quête en crème, écrasant le défi accent et la réclamation verte posés par DS2820.
  Les règles de type portent désormais <code>[data-action] + !important</code> APRÈS le marteau — mesuré dans le
  vrai navigateur : défi <b>rgb(201,188,156)</b> uni (clair : rgb(128,106,78)), réclamation <b>rgb(96,190,88)</b>
  uni, texte thème sombre, zéro dégradé.</p>`;

// ── Wave 21 demos (section 22) ────────────────────────────────────────────
// Rendered with the REAL wave-21 views (same code as the game adapters).
const puzzleListDemoHtml = PuzzleListView.toHTML({
  hint: 'Certains lieux gardent des secrets silencieux. Observez bien.',
  cards: [
    { icon: '📜', name: 'Première tablette', summary: 'Une tablette de pierre porte un court message en relief.', statusKind: 'open', statusText: 'Intact', action: { callArgs: "'sealed_braille_a'", label: 'S’approcher' } },
    { icon: '📜', name: 'Deuxième tablette', summary: 'Plus bas, un second message parle du peuple ancien.', statusKind: 'locked', statusText: 'Scellé', lockText: '🔒 La voie est scellée pour l’instant.' },
    { icon: '🧩', name: 'Cercle des Zarbi', summary: 'Un cercle de symboles anciens attend d’être déchiffré.', statusKind: 'done', statusText: 'Déjà percé', done: true, action: { callArgs: "'alph_unown_circle'", label: 'Revenir' } },
  ],
  closeLabel: 'Fermer',
});
const puzzleSheetDemoHtml = PuzzleExplorationView.toHTML({
  icon: '✦', title: 'Murmures sous la roche', summary: 'Quatre stèles veillent dans le noir. Une seule procession apaise la grotte.',
  clue: 'Les anciens montraient la falaise avant le ruisseau, et le tonnerre avant le silence des cryptes.',
  clueLabel: 'Sur place', kind: 'sequence',
  seqOptions: [{ key: 'rock', label: 'Montagne' }, { key: 'lake', label: 'Source' }, { key: 'bolt', label: 'Orage' }, { key: 'shade', label: 'Nuit' }],
  confirmCallArgs: "'cerulean_sigil_a'", cancelLabel: 'S’éloigner', confirmLabel: 'Confirmer',
  beenBeforeText: '✓ Vous êtes déjà passé par ici.',
});
const _w21spr = (emoji) => `<span class="pw-poke-circle-wrap" style="width:72px;height:72px"><span class="pw-poke-circle-bg"></span><span style="position:relative;z-index:2;font-size:44px;line-height:72px;display:block;text-align:center">${emoji}</span></span>`;
const formsDemoHtml = SpecialFormsView.toHTML({
  title: '🌤️ Labo Météo — Formes de Morphéo',
  rows: [
    { spriteHtml: _w21spr('☀️'), nameLabel: '☀️ Morphéo Solaire', owned: false, descText: 'Forme stabilisée, livrée directement dans la Boîte PC.', sideText: '20 000₽', callArgs: '387,20000' },
    { spriteHtml: _w21spr('🌧️'), nameLabel: '🌧️ Morphéo Eau de Pluie', owned: true, ownedText: 'Acheté — forme déjà obtenue, elle vous attend dans la Boîte PC.', sideText: '✓' },
    { spriteHtml: _w21spr('❄️'), nameLabel: '❄️ Morphéo Blizzard', owned: false, descText: 'Forme stabilisée, livrée directement dans la Boîte PC.', sideText: '20 000₽', callArgs: '389,20000' },
  ],
});
const formsLockedDemoHtml = SpecialFormsView.toHTML({
  title: '☄️ Météorites Cosmiques — Formes de Deoxys',
  emptyLabel: 'Deoxys doit être dans votre Boîte PC (pas dans l’équipe active) pour accéder à ses formes.',
});
const puzzleDemo = `<p class="pv-note">La liste des explorations secrètes et les fiches d’énigmes étaient
  bâties en HTML brut : styles inline partout, et surtout un <b>bouton cadenas grisé-mort</b> sur les lieux
  scellés (infraction directe à votre règle « jamais de bouton inutile non rendu »). Désormais
  <code>PuzzleListView</code> / <code>PuzzleExplorationView</code> (ECS) : statuts en classes de teinte,
  <b>ligne informative « La voie est scellée »</b> à la place du bouton mort, zéro style inline, surfaces
  tokenisées (lisibles thème clair — mesuré), titre dé-dégradé. Contrats intact : boutons de séquence
  <code>data-seq-key</code>, ids cachés, guillemets des arguments, croix unique + annuler neutre.</p>
  <div class="pv-cols" style="margin-top:10px">
    <div id="fs-panel-content" style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${puzzleListDemoHtml}</div>
    <div id="poke-modal-inner" style="max-width:520px;margin:0 auto;background:var(--dark2,#1F1C18);border:1px solid var(--pw-border-color,#4A3E31);border-radius:14px;overflow:hidden">${puzzleSheetDemoHtml}</div>
  </div>`;
const formsDemo = `<p class="pv-note">Le panneau des formes spéciales (Morphéo/Deoxys) rejoint le design
  system via <code>SpecialFormsView</code> : l’état verrouillé (espèce absente de la Boîte PC) reste une ligne
  explicative, les cartes achetables gardent le contrat numérique non quoté exact
  (<code>data-call-args=\"387,20000\"</code>) et la forme possédée n’est plus actionnable (badge ✓ vert).
  <b>Ménage documenté</b> : la barre d’attente des énigmes « patience » était un code-mort de peinture
  (les éléments <code>#puzzle-wait-fill</code> n’ont JAMAIS été rendus — le dégradé CSS qui allait avec est
  supprimé, le ticker adaptateur aussi ; la règle de jeu reste l’attente réelle mesurée à la validation).</p>
  <div class="pv-cols" style="margin-top:10px">
    <div style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${formsDemoHtml}</div>
    <div style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">${formsLockedDemoHtml}</div>
  </div>`;

/* ── Wave 22 demos (real views, French labels) ─────────────────────────── */
const _w22trainer = (n, _px) => `../src/assets/images/trainers/profil/trainer-${n}.png`;
const basePcGuestDemoHtml = BasePcDialogView.toHTML({
  title: 'PC de la base', subText: 'Base visitée', closeLabel: 'Fermer',
  stats: { visitsLabel: 'Visites', visits: 9, winsLabel: 'Victoires PNJ', wins: 3, lossesLabel: 'PNJ battus', losses: 1 },
  flag: {
    rankId: 'gold', rankLabel: 'Drapeau Or', countLabel: 'Total :', count: 8, flagsWord: 'drapeaux',
    uniqueBases: 3, basesWord: 'bases', ownBadge: null, pct: 80,
    next: { kind: 'next', label: 'Prochain rang à', req: 10, countText: '(8/10)' },
    bonusesTitle: 'Bonus actifs', bonusLines: ['• Argent +20 %', '• XP combat +15 %', '• Aucun bonus shiny (préserve la chasse long terme)'],
    collect: { label: '🚩 Prendre le drapeau de la base (+1)', callArgs: "'red_route113'" }, cooldownText: null,
  },
  pc: { kind: 'view', title: 'Message du propriétaire', text: 'Bienvenue dans ma base ! Bonne visite !' },
});
const basePcCooldownDemoHtml = BasePcDialogView.toHTML({
  title: 'PC de la base', subText: 'Base visitée', closeLabel: 'Fermer',
  flag: {
    rankId: 'bronze', rankLabel: 'Drapeau Bronze', countLabel: 'Total :', count: 12, flagsWord: 'drapeaux',
    uniqueBases: 5, basesWord: 'bases', ownBadge: null, pct: 100,
    next: { kind: 'supreme', text: 'Rang Suprême ORAS atteint !' },
    bonusesTitle: 'Bonus actifs', bonusLines: ['• Argent +25 %', '• Butin de route +10 %'],
    collect: null, cooldownText: 'Drapeau déjà capturé aujourd’hui. Revenez dans 7 h.',
  },
  pc: null,
});
const baseNpcDialogDemoHtml = BaseNpcDialogView.toHTML({
  titleIconUrl: _w22trainer(3, 28), name: 'Léo la Sentinelle', subText: 'Dresseur de la base', subKind: 'light1',
  portraitUrl: _w22trainer(3, 96), speech: 'Bienvenue, challenger ! Tu veux te mesurer à ma base secrète ?',
  teamChipsHtml: [
    '<span class="preset-chip" title="Salamèche Nv.14">🔥</span>',
    '<span class="preset-chip" title="Carapuce Nv.14">💧</span>',
    '<span class="preset-chip" title="Bulbizarre Nv.14">🌿</span>',
  ],
  primary: { label: 'Relever le défi', call: 'baseDialogNpcFight', callArgs: '' },
  secondaryLabel: 'Décliner',
});
const npcEditorDemoHtml = BaseNpcEditorView.toHTML({
  titleIconUrl: _w22trainer(3, 28), title: 'Éditeur de PNJ', hint: 'Nom, apparence, répliques et équipe du PNJ gardien.',
  portraitUrl: _w22trainer(3, 64), portraitHint: 'Changer apparence',
  nameValue: 'Léo la Sentinelle', namePlaceholder: 'Nom du PNJ',
  spriteMetaLine: 'Apparence · 101 dispo · Clique image',
  teamLabel: 'Équipe du PNJ (3)', levelAutoText: 'Niveau hérité du Pokémon choisi', presetBtnLabel: 'Depuis preset (voir teams)',
  cardsHtml: '<div class="pw-drop-zone preset-slot-empty"><div class="pw-text-lg">+</div><div class="pw-text-sm pw-light2 pw-bold">Ajouter un Pokémon</div></div>',
  quotesLabel: 'Répliques',
  quotes: [{ key: 'pre', label: 'Avant', value: 'Bienvenue, challenger !' }, { key: 'win', label: 'Victoire', value: 'Ma base est imprenable.' }, { key: 'lose', label: 'Défaite', value: 'Bien joué…' }],
  saveLabel: 'Enregistrer', deleteLabel: 'Supprimer', backLabel: 'Retour',
});
const factoryPrepDemoHtml = AtollFactoryPrepView.toHTML({
  title: 'Usine de Combat — préparation', streakText: 'Série : 2 · mode Usine — Normal',
  hintText: 'Réorganisez l’équipe de location par glisser-déposer avant le prochain combat.',
  cardsHtml: '<div class="pw-drop-zone" style="border:none">… cartes Pokémon unifiées (generatePokeCardHTML, déjà migrées) …</div>',
  continueLabel: 'Continuer la série', abandonLabel: 'Abandonner la série', noteText: 'L’ordre des Pokémon et des capacités est remanié après chaque victoire.',
});
const baseDialogDemo = `<p class="pv-note">La carte Drapeau du PC de base alignait <b>14 styles inline</b> :
  surfaces noires rgba insensibles au thème, texte <code>#c9bc8a</code> codé en dur, barre de rang EN DÉGRADÉ
  et bouton « Prendre le drapeau » <b>rouge-dégradé inline !important</b> qui se battait contre la peinture
  plate universelle. Désormais <code>BasePcDialogView</code> (ECS) : teinte de rang = classes
  <code>is-rank-*</code> (libellé 15px 900 ≥ 3:1, calculé ; titre des bonus sur --accent ≥ 4:5), remplissage
  PLAT, collecte = kind danger plat (rgb(211,66,95) mesuré). Et le bouton anti-24h <b>grisé-mort</b> est
  devenu une ligne d’information — même règle que les cartes de quêtes.</p>
  <div class="pv-cols" style="margin-top:10px">
    <div id="poke-modal-inner" style="max-width:520px;margin:0 auto;background:var(--dark2,#1F1C18);border:1px solid var(--pw-border-color,#4A3E31);border-radius:14px;padding:14px">${basePcGuestDemoHtml}</div>
    <div style="max-width:520px;margin:0 auto;background:var(--dark2,#1F1C18);border:1px solid var(--pw-border-color,#4A3E31);border-radius:14px;padding:14px">${basePcCooldownDemoHtml}</div>
  </div>`;
const baseEditorDemo = `<p class="pv-note">Le dialogue d’affrontement PNJ et l’éditeur de PNJ (formulaire +
  4 sélecteurs) étaient tout en HTML brut — <b>103 images aux styles inline</b> dans la grille des
  apparences à elle seule. Désormais <code>BaseNpcDialogView</code> / <code>BaseNpcEditorView</code> /
  sélecteurs <code>BaseNpc*View</code> (ECS) : portraits dimensionnés par classes, zones de défilement et
  barre d’actions collante tokenisées, câblage <code>data-change-call</code> du nom et des répliques
  préservé au caractère près, filtre des apparences qui re-rend juste la grille (focus conservé).</p>
  <div class="pv-cols" style="margin-top:10px">
    <div style="max-width:520px;margin:0 auto;background:var(--dark2,#1F1C18);border:1px solid var(--pw-border-color,#4A3E31);border-radius:14px;padding:14px">${baseNpcDialogDemoHtml}</div>
    <div style="max-width:520px;margin:0 auto;background:var(--dark2,#1F1C18);border:1px solid var(--pw-border-color,#4A3E31);border-radius:14px;padding:14px">${npcEditorDemoHtml}</div>
  </div>`;
const factoryPrepDemo = `<p class="pv-note">Dernier reliquat de l’Atoll : la coque de la modale de
  préparation d’Usine (titre, astuces, barre d’actions) passait par concaténation de chaînes. Désormais
  <code>AtollFactoryPrepView</code> (ECS) — les cartes Pokémon étaient déjà unifiées, la cible de
  glisser-déposer <code>#atoll-prep-body.team-view</code> est re-instrumentée par l’adaptateur juste
  APRÈS l’injection du HTML (contrat mesuré : attributs dans le même ordre).</p>
  <div class="pv-grid" style="margin-top:10px">
    <div style="background:var(--dark2,#1F1C18);border:1px solid var(--pw-border-color,#4A3E31);border-radius:14px;padding:14px">${factoryPrepDemoHtml}</div>
  </div>`;


/* ── Wave 23 demos (static shells + scene boot — real markup/classes) ── */
const confirmBenignDemo = `<p class="pv-note">La boîte de confirmation unifiée se peignait en
  <b>gris indifférencié</b> (bénin) et cachait un <b>dégradé rouge mort</b> sur les actions destructrices
  (mesuré : l'aplatissement universel l'écrasait déjà). Désormais les deux variantes sont <b>plates et
  franches</b> : action principale = accent, danger = <code>var(--red)</code>, sans ombre ni dégradé —
  la couleur vit dans la feuille de style (plus aucune peinture inline dans <code>pwConfirm</code>).</p>
  <div class="pv-cols" style="margin-top:10px">
    <div style="background:rgba(0,0,0,0.55);border-radius:14px;padding:22px;display:flex;justify-content:center">
      <div id="confirm-inner" style="position:relative">
        <div id="confirm-text"><div class="pw-confirm-title">Base secrète</div><div class="pw-confirm-msg">Déplacer cette décoration ici ?</div></div>
        <div class="pw-confirm-actions"><button class="hbtn" id="confirm-yes">Confirmer</button><button class="hbtn">Annuler</button></div>
      </div>
    </div>
    <div style="background:rgba(0,0,0,0.55);border-radius:14px;padding:22px;display:flex;justify-content:center">
      <div id="confirm-inner" style="position:relative">
        <div id="confirm-text"><div class="pw-confirm-title">🗑️ Léo</div><div class="pw-confirm-msg">Supprimer « Léo » définitivement ?</div></div>
        <div class="pw-confirm-actions"><button class="hbtn pw-confirm-danger" id="confirm-yes">Confirmer</button><button class="hbtn">Annuler</button></div>
      </div>
    </div>
  </div>`;

const paletteDemo = `<p class="pv-note">La palette des statiques d'<code>index.html</code> est unifiée :
  <b>13 classes mortes supprimées</b> (pw-static-005/006/007/008/011/013/083/084/104/105/106/109/124 —
  zéro usage mesuré nulle part), les survivantes passent aux tokens (bordure du sélecteur de région,
  surface de carte <code>--pw-map-surface</code> nouveau token par thème, ligne de butin en light2-mix,
  bouton « Quitter le combat » rouge <b>plat</b> protégé du marteau d'aplatissement, bandeau debug_tokenisé),
  et la couche d'unification perd ses derniers dégradés aveugles : <code>--pw-surface</code> aplati
  (le gradient était déjà écrasé en cascade), en-tête universel des panneaux sur
  <code>--pw-bg-header</code> (par thème), bordures <code>--pw-border(-strong)</code> en color-mix
  (avant : même crème rgba sur TOUS les thèmes, y compris clair).</p>
  <div style="margin-top:10px;border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;overflow:hidden">
    <div id="header" style="position:static"><h1><span class="brand-mark">◓</span><span>PokéWorld</span></h1>
      <div class="hinfo pw-static-002"> <span id="h-money">12 345</span>₽ &nbsp;|&nbsp; Badges&nbsp;: <span id="h-badges">8</span>/<span id="h-badges-total">16</span></div>
      <button class="hbtn icon-btn" id="settings-btn" type="button">⚙</button>
    </div>
  </div>`;

const scenesDemo = `<p class="pv-note">Le boot mentait : la synchronisation des scènes cherchait un
  <code>#save-menu-modal</code> <b>qui n'a jamais existé</b> (le vrai écran est
  <code>#save-menu-screen.is-open</code>) et écoutait 4 événements <b>jamais émis</b> : la scène active au
  démarrage était « GameScene »… par-dessus le menu de sauvegardes affiché. Désormais la vérité de session
  pilote : <code>menuOpen = starterOuvert || (!sessionDémarrée && menuSauvegardeOuvert)</code>, avec des
  crochets explicites dans <code>save.js</code>/<code>starter.js</code>. Et l'aller-retour menu ⇄ jeu ne
  jette plus d'erreur : <code>SceneManager.replace()</code> permute SANS détruire les singletons
  (<code>switchTo</code> les disposait — la suppression d'une sauvegarde en session aurait planté le
  retour au menu). Mesuré : <b>MainMenuScene</b> au boot (menuVisible:true), bascule GameScene au
  démarrage de session, retour MainMenuScene sans erreur — en modules ET via le bundle file://.</p>
  <div class="pv-cols" style="margin-top:10px">
    <div style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">
      <div style="color:var(--light2);font-weight:800;margin-bottom:6px">Avant (mesuré)</div>
      <div style="color:var(--light1);font-size:12px;line-height:1.6">
        • boot : <code>current:"GameScene"</code> alors que le menu recouvre tout<br>
        • <code>menuVisible:null</code> (id fantôme)<br>
        • listeners <code>starter:chosen</code>/<code>save:loaded</code>… : 0 émetteur<br>
        • <code>switchTo</code> disposait les scènes → 2ᵉ retour au menu = exception</div>
    </div>
    <div style="background:var(--pw-bg-surface,#24221E);border:1px solid var(--pw-border-color,#4A3E31);border-radius:12px;padding:14px">
      <div style="color:var(--green);font-weight:800;margin-bottom:6px">Après (mesuré Chromium + bundle)</div>
      <div style="color:var(--light1);font-size:12px;line-height:1.6">
        • boot : <code>current:"MainMenuScene"</code> + <code>menuVisible:true</code><br>
        • hooks réels : renderSaveMenu / activateCurrentSave / starter show·pick<br>
        • aller-retour menu ⇄ jeu OK — singletons vivants (<code>replace</code>)<br>
        • bonus : menu des répétables rouvert — <code>_repeatableRoll</code> possédé par son consommateur (ReferenceError navigateur corrigée)</div>
    </div>
  </div>`;

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>PokéWorld — Aperçu de la nouvelle interface (vague correctrice 2026-08-04)</title>
<style>${css}</style>
<style>
  body { background: #221F1B; padding: 24px; font-family: system-ui, sans-serif; }
  .pv-wrap { max-width: 1060px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
  .pv-h1 { color: var(--light2); font-size: 22px; font-weight: 900; margin: 0; }
  .pv-h2 { color: var(--light2); font-size: 15px; font-weight: 800; margin: 0 0 8px; }
  .pv-note { color: var(--light1); font-size: 12px; margin: 4px 0 0; line-height: 1.5; }
  .pv-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
  .pv-ok { color: #8BD17C; font-weight: 800; }
  .pv-badge { display: inline-block; background: #2E4A2A; color: #B8E6A8; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: 800; margin-left: 8px; }
  kbd { background: var(--dark3); border-radius: 4px; padding: 1px 5px; font-size: 11px; }
  @media (max-width: 900px) { .pv-cols { grid-template-columns: 1fr; } }
</style></head>
<body><div class="pv-wrap">

  <div>
    <h1 class="pv-h1">PokéWorld — l'interface RÉELLEMENT refaite, preuve à l'appui</h1>
    <p class="pv-note">Cette page est générée par <code>tools/build-ui-preview.mjs</code> avec <b>vos vrais composants</b>
    (BagView, BoxView, PokedexView, PokeCard) et <b>votre vraie feuille de style</b> — ce que vous voyez ici est
    exactement ce que le jeu affiche après cette correction.</p>
  </div>

  <section>
    <h2 class="pv-h2">1. Filtres &amp; tris du Sac et de la Boîte PC — enfin la MÊME famille <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">Même conteneur (<code>pw-filterbar</code>), mêmes champs, mêmes libellés, mêmes menus déroulants,
    même bouton « Réinitialiser ». Avant : la boîte affichait un tableau de 9 listes déroulantes brutes avec un titre « Filtres ».</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🎒 Sac — barre de filtres', `<div>${bag.filters}</div>`)}</div>
      <div>${frame('💾 Boîte PC — barre de filtres', `<div>${boxFiltersHtml}</div>`)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">2. UN SEUL affichage de Pokémon <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">La carte de l'onglet Boîte et celle du sélecteur plein écran sont désormais issues du
    <b>même composant</b> (<code>PokeCard</code>) : même <b>disque foncé uni</b> derrière le sprite
    (<code>--pw-bg-sprite</code>, sans dégradé — DS2807, visible sur n'importe quel fond), même sprite
    (2 tailles globales), nom, niveau, étoile shiny au même endroit. Avant : le sélecteur n'affichait qu'un
    rond sans nom, et le fond du sprite variait d'un écran à l'autre (halo clair en combat, invisible à la pension).</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('💾 Onglet Boîte PC', `<div class="pw-modal-body" style="max-height:340px">${box.full}</div>`)}</div>
      <div>${frame('⛶ Sélecteur plein écran (même pokémon)', `<div class="pw-modal-body" style="max-height:340px"><div class="pw-layout-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:14px;padding:18px 14px;background:var(--dark2)">${selectorCard}</div></div>`)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">3. Pokédex — première ligne visible + barre de filtres/tri unifiée <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">Cause racine : le moteur écrivait <code>padding:0</code> en style inline sur la grille,
    écrasant le <code>padding:14px</code> du thème — les badges <code>#001…</code> (top:-10px) de la première
    ligne étaient coupés par le défilement. Corrigé dans le moteur + marge de sécurité CSS.</p>
    <div style="margin-top:10px">${frame('📖 Pokédex — Kanto', `<div class="pw-modal-search-bar" style="display:flex">${dex.filters}</div><div class="pw-modal-body" style="max-height:420px">${dex.content}</div>`)}</div>
  </section>

  <section>
    <h2 class="pv-h2">3b. Carte Équipe / Combat — UN SEUL composant complet <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">La carte de la fenêtre Équipe, la rangée de combat, le panneau Atoll, les presets et
    l'éditeur de PNJ de la base passent tous par <code>PokeFullCard</code>. Les ancres mutées 60×/s
    (barres d'attaques <code>--charge-pct</code>, <code>data-pct</code>) sont préservées — le tick de combat
    est validé par les scénarios navigateur (14/14).</p>
    <p class="pv-note"><b class="pv-ok">Fond du sprite unifié :</b> la carte empilait DEUX halos clairs
    (le conteneur + le composant sprite) — c'était le « rond fond clair » signalé. Désormais UN SEUL
    <b>disque foncé uni</b>, strictement identique à la boîte PC / au Pokédex, ici comme à la pension.</p>
    <div style="margin-top:10px;max-width:340px">${fullCard}</div>
  </section>

  <section>
    <h2 class="pv-h2">4. Textes lisibles — badges de type en contraste strict ≥ 4,5 <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">Texte blanc sur badges clairs = 1,4:1 (illISIBLE) avant. Désormais encre foncée sur badges
    clairs (7:1 à 11,5:1), fond assombri là où ni blanc ni encre ne passaient. Audit automatique :
    <code>node tools/contrast-audit.mjs</code>.</p>
    <div class="pw-modal-container" style="height:auto;width:100%;max-width:none;margin-top:10px"><div class="pw-modal-body" style="display:flex;flex-wrap:wrap;gap:8px">${typeBadges}</div></div>
    <p class="pv-note" style="margin-top:8px">Textes rouges « danger » éclaircis (#E28497, 4,73:1) ; étoiles shiny lisibles (#FF8F8F, 4,65:1).</p>
  </section>

  <section>
    <h2 class="pv-h2">5. Cliquer à côté = fermer, partout <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">Un gestionnaire universel ferme toute fenêtre modale quand on clique sur le fond sombre
    (Pokédex, Sac, Boîte, quêtes, réglages, sélecteur, fiches Pokémon, boutiques…). Exceptions volontaires :
    choix du starter, menu des sauvegardes et boîtes de confirmation. Un modale peut refuser via
    <code>data-no-outside-close="true"</code>.</p>
  </section>

  <section>
    <h2 class="pv-h2">6. Fenêtres jumelles Entraînement / Pouponnière / Mine — UN SEUL composant paramétré (vague 4) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">Les trois « machines » du jeu passent par le même rendu design-system
    (<code>MachineWindow</code> / <code>MineWindowView</code>) : cartes d'emplacements à état,
    couleurs de mode en <b>classes thème</b> (plus aucun <code>data-style</code> ni hex en JS),
    contrôles inutilisables <b>non rendus</b> (les modes verrouillés deviennent de simples lignes d'info),
    contrats de tick préservés (barre d'énergie <code>stat-fill[data-pct]</code>, progression
    <code>hatchery-progress[data-pct]</code>). Tris&nbsp;: le sac et le pokédex proposent désormais
    <b>chaque tri dans les deux sens</b> (A→Z / Z→A, 9→0 / 0→9, 1→9 / 9→1, rang S→E / E→S) — visibles dans les
    barres ci-dessus — et le sélecteur inverse le sens quand on reclique le même critère (▲/▼).</p>
    <p class="pv-note" style="margin-top:8px">Langage couleur unifié : <b>rouge cramoisi</b> = supprimer/stop/annuler
    (les boutons Annuler/Retirer de l'entraînement suivent désormais la famille <code>pw-btn-danger</code>),
    <b>vert</b> = actions positives (éclore, acheter, réclamer), <b>toggle</b> = vert plein ON / pointillés OFF —
    identique partout (entraînement, pension, automatisations).</p>
    <div style="margin-top:10px">${frame('🏋️ Entraînement', `<div class="pw-modal-body" style="max-height:520px">${training}</div>`)}</div>
    <p class="pv-note" style="margin-top:8px"><b class="pv-ok">Pension — le rond est de retour :</b> les sprites
    de la pouponnière/garderie passent par le même rendu que partout ailleurs — le
    <b>disque foncé uni</b> (DS2807) est maintenant bien présent derrière chaque Pokémon, y compris
    au-dessus de la carte du jeu.</p>
    <div style="margin-top:14px">${frame('🐣 Pouponnière', `<div class="pw-modal-body" style="max-height:380px">${hatchery}</div>`)}</div>
    <div style="margin-top:14px">${frame('⛏️ Mine', `<div class="pw-modal-body" style="max-height:560px">${mine}</div>`)}</div>
  </section>

  <section>
    <h2 class="pv-h2">7. Réglages — modale reconstruite + couleurs restaurées (vague 4b) <span class="pv-badge">corrigé</span></h2>
    <p class="pv-note">Le corps de la modale de réglages (langue, thème, profil de sauvegarde, sauvegarde)
    n'est plus du HTML statique : il est rendu de zéro par <code>SettingsModalView</code> à chaque ouverture —
    les libellés suivent la langue courante immédiatement (changer de langue re-rend la modale ouverte).
    La zone « profil » garde ses ids pour le remplissage dynamique existant.</p>
    <p class="pv-note"><b class="pv-ok">Couleurs :</b> les tuiles de thème gardent leur teinte propre et le
    bouton « Supprimer la sauvegarde » est <b>rouge danger</b> (règles id-scopées <code>#settings-inner …</code>
    — l'aperçu reproduit ci-dessous la coquille exacte du jeu <code>#settings-inner &gt; #settings-body</code>
    pour que la cascade soit identique à 100 %).</p>
    <div style="margin-top:10px;max-width:520px">${frame('⚙️ Réglages', `<div id="settings-inner" style="max-width:100%;max-height:none;border:none"><div id="settings-body" class="pw-settings-body pw-modal-body" style="max-height:520px">${settings}</div></div>`)}</div>
  </section>

  <section>
    <h2 class="pv-h2">8. Menu des sauvegardes — face reconstruite de zéro (vague 5) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">Le menu principal (écran de démarrage) n'est plus du HTML statique : il est rendu de zéro
    par <code>SaveMenuView</code> et chaque carte de sauvegarde par le composant unique <code>SaveCard</code>
    (icône sur le disque foncé unifié DS2807, teinte de carte <code>save-bg-*</code>, stats badges / pokédex /
    temps de jeu, clic = jouer, clic droit = gérer). Les libellés suivent la langue courante (changer de langue
    re-rend le menu immédiatement) et les contrats de la couche de jeu sont conservés (ids,
    <code>scrollSaveList</code>, <code>createNewSaveFromMenu</code>, import <code>.json</code>).</p>
    <div style="margin-top:10px">${frame('💾 Menu des sauvegardes — deux parties', `<div style="min-height:480px;display:flex;align-items:center;justify-content:center;background:var(--dark1)">${saveMenu}</div>`)}</div>
    <p class="pv-note" style="margin-top:8px">État « aucune sauvegarde » :</p>
    <div style="margin-top:6px">${frame('💾 Menu des sauvegardes — vide', `<div style="min-height:300px;display:flex;align-items:center;justify-content:center;background:var(--dark1)">${saveMenuEmpty}</div>`)}</div>
  </section>

  <section>
    <h2 class="pv-h2">9. Modale du starter — contenu rendu de zéro (vague 6) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">L'écran de choix du starter (Kanto / Johto / Hoenn) est rendu par <code>StarterModalView</code> :
    un seul composant pour les 3 régions, sprites sur le disque foncé unifié, délégation de clic
    (<code>pickStarter</code>) et interdiction de fermeture extérieure conservées à l'identique.</p>
    <div style="margin-top:10px;max-width:520px">${frame('🌱 Choix du starter — Kanto', `<div id="starter-modal-inner" style="max-height:none">${starterModal}</div>`)}</div>
  </section>

  <section>
    <h2 class="pv-h2">10. Fiche Pokémon détaillée — 100 % design system (vague 10) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">La fiche (ouverte depuis l'équipe, la boîte ou un combat) est assemblée par
    <code>PokeDetailView</code> : barre de titre, héros (sprite sur le disque foncé, types, shiny, protections),
    onglets stats Base/IV/EV, sections Talents/Rang/Évolutions, bloc capacités. Depuis la vague 10, <b>chaque bloc
    est un composant DS piloté par un modèle structuré</b> — lignes de stats (<code>statRowVNode</code>), panneau de
    rang, bloc talents (<code>&lt;select&gt;</code> ou puces en lecture seule), méthodes d'évolution
    (<code>getEvolutionMethodsModel</code>, aussi utilisé par le détail Pokédex), lignes de capacités
    (<code>moveRowVNode</code>), bascules shiny/protection. L'adaptateur ne fait plus que façonner des données ;
    les contrats sont conservés (<code>data-pct</code>, <code>switchPokemonStatTab</code>, <code>changePokeTalent</code>,
    remplacement de capacité, clic droit). Les boutons
    Favori/Shiny/Verrou affichent leur état en COULEUR : Favori/Verrou = vert plein activé, sombre pointillé
    désactivé (DS2809) ; <b>Shiny = doré uni</b> activé (#F5C242, 9.88:1 — rappel du côté brillant, DS2810). Le panneau
    se fait défiler depuis N'IMPORTE quel point de l'écran (relais molette + marge automatique — DS2810).</p>
    <div style="margin-top:10px;max-width:760px"><div class="pw-modal-container" style="height:auto;max-height:none;margin:0;width:100%;max-width:none"><div class="pw-modal-body" style="max-height:640px"><div id="poke-modal-inner" class="poke-detail-inner" style="max-height:none">${pokeDetail}</div></div></div></div>
  </section>

  <section>
    <h2 class="pv-h2">11. Gestion des machines — 100 % design system : coquille, slots d'automatisation, personnel (vagues 8 + 11) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">Les trois écrans de gestion (<code>openTrainingManagementMenu</code>, <code>openHatcheryManagementMenu</code>,
    <code>openMineManagementMenu</code>) sont rendus par <code>ManagementMenuView</code> : même barre de titre,
    mêmes 3 onglets, même grille de cartes d'amélioration, mêmes cartes à bascule d'automatisation
    (vert uni = activé, sombre pointillé = désactivé, ligne informative = non débloqué — jamais de bouton inutilisable).
    Le squelette <code>.management-shell</code> persistant conserve la position de défilement entre deux actions —
    sauf changement d'onglet, qui repart volontairement en haut.</p>
    <p class="pv-note" style="margin-top:8px"><b class="pv-ok">Vague 11 : internes aussi.</b> Les cartes de slot
    d'automatisation (entraînement ET pension : sélecteurs de mode/priorité, grilles de règles, panneaux de file) et
    la liste du personnel sont rendus de zéro par <code>hatcherySlotCardVNode</code> / <code>automationSlotCardVNode</code> /
    <code>staffListVNode</code> — <b>zéro <code>data-style</code>, zéro fragment hérité</b> dans ces écrans. Les bascules
    garderie/incubation et Pokémon/fossile sont désormais des <b>couleurs PLAINES</b> contrastées (DS2811 : plus aucun
    dégradé sur des contrôles colorés), et un personnel non déblocable se contente d'une <b>ligne informative</b>
    (jamais de bouton grisé).</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('⚔️ Entraînement — onglet Améliorations', mgmtFrame(mgmtTraining))}</div>
      <div>${frame('🥚 Pension — onglet Automatisation (slot incubation)', mgmtFrame(mgmtHatchery))}</div>
      <div>${frame('⛏️ Mine — onglet Améliorations', mgmtFrame(mgmtMine))}</div>
      <div>${frame('⚔️ Entraînement — onglet Automatisation (slot auto)', mgmtFrame(mgmtTrainingAuto))}</div>
      <div>${frame('🧑‍🤝‍🧑 Personnel — Dresseurs (actif / à débloquer / à embaucher)', mgmtFrame(mgmtStaff))}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">12. Panneaux d'info (capacité/objet/talent) + toutes les capacités apprises (vague 9) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">Le panneau d'information partagé (<code>pwBuildInfoPanel</code> → <code>InfoPanelView</code>) et le
    panneau « toutes les capacités apprises » (<code>LearnableMovesPanelView</code> + composant <code>move-row</code>
    partagé) sont rendus de zéro : en-tête canonique, cartes de stats, sections encadrées, badges d'état
    (équipée/disponible/verrouillée), retour contextuel. Un <b>seul défilement</b> par panneau — l'ancien bloc
    à 70vh avec ascenseur interne a disparu (la souris n'a plus à viser un endroit précis).</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('ℹ️ Info capacité — Déflagration', mgmtFrame(infoPanel))}</div>
      <div>${frame('📋 Toutes les capacités apprises — Salamèche', mgmtFrame(learnablePanel))}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">13. Résumé de combat (100 % DS) + carte dresseur adverse (vague 12) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">La fenêtre « Butin & résumé de session » (ouverte après un combat sauvage) est rendue de zéro
    par <code>SessionSummaryView</code> : titre, grille de 6 statistiques, lignes de dégâts de l'équipe
    (barres <b>auto-suffisantes</b> : la largeur est rendue inline par le composant — le contrat <code>data-pct</code> est conservé pour le peintre temps réel), captures regroupées avec variante shiny, objets trouvés
    et les deux actions de pied (relancer = vert positif sur le jeu réel / continuer). La bandelette de butin sous la
    fenêtre de combat passe par la même vue (<code>inlineHTML</code> — puces <code>.loot-item</code> ×N). En combat
    d'arène/champion : <b>un seul message informatif</b>, aucune section vide ni contrôle inutile. La carte du dresseur
    adverse au-dessus de la rangée de combat est rendue par <code>trainerCardVNode</code> (teinte par rôle, déjà dans
    le thème) — la rangée garde le composant <code>PokeFullCard</code> pour les Pokémon.</p>
    <div style="margin-top:10px;max-width:760px">
      <div class="pw-modal-container" style="height:auto;max-height:none;margin:0;width:100%;max-width:none">
        <div class="pw-modal-header"><div class="pw-modal-title">🎒 Résumé de session — après combat</div><span class="pw-modal-close">✕</span></div>
        <div id="battle-summary-inner" style="max-height:520px">${battleSummary}</div>
      </div>
    </div>
    <p class="pv-note" style="margin-top:8px">Bandelette de butin (sous la fenêtre de combat) + carte dresseur adverse :</p>
    <div style="margin-top:6px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;background:var(--dark2);border:1px solid var(--dark3);border-radius:12px;padding:10px 12px">
      ${lootInline}
      <div style="flex:0 0 auto">${trainerCard}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">14. Atoll de Combat + habillage de la carte & info lieu (vague 13) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">L'Atoll de Combat est rendu de zéro par <code>AtollPanelView</code> : héros (titre + boîte
    jetons/série), barre d'onglets <b>uniforme</b> (le même composant que les machines), accueil en 4 cartes,
    cartes de modes (badge de rang à couleur pleine, règles, aperçu de l'équipe en rotation, bannis
    légendaires, <b>un seul bouton</b> par carte) et la boutique à jetons — une entrée trop chère affiche une
    <b>pastille d'information</b> au lieu d'un bouton inutilisable. Panneau « info lieu » via
    <code>LocationInfoView</code> : carte de présentation, citation locale, grille d'actions (arène verrouillée =
    ligne d'information, jamais de bouton mort), barre de déblocage <b>auto-suffisante</b>, puce minuteur
    (contrat <code>data-rotation-timer</code>), rencontres sauvages sur <b>disque canonique 56 px</b> (badge ✓/?),
    objets trouvables. Aide « ? » via <code>MapOverlaysView</code> (clic dehors = fermer) — la SEULE légende du jeu (le panneau « légende » visité/accessible/verrouillé, inutile, a été supprimé à la vague 14).</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🏟️ Atoll — Tour de Combat', mgmtFrame(atollTower))}</div>
      <div>${frame('🛒 Atoll — Boutique à jetons', mgmtFrame(atollShop))}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🗺️ Info lieu — Route 2', mgmtFrame(locInfo))}</div>
      <div>
        <div style="max-width:340px">${mapHelp}</div>
      </div>
    </div>
  </section>


  <section>
    <h2 class="pv-h2">15. Guide & tuto + chrome du tableau de bord (vague 14) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">Le <b>Guide</b> (accueil en rubriques + pages détaillées) et la <b>carte de quête tutoriel</b>
    de la fenêtre Histoire sont rendus de zéro par <code>GuidePanelView</code> / <code>TutorialCardView</code> :
    barre de progression <b>auto-suffisante</b> (largeur inline), actions routées, rubriques verrouillées jamais
    affichées. Le <b>chrome des fenêtres du tableau de bord</b> est estampillé une fois au démarrage par
    <code>DashboardChromeView</code> : une seule poignée, aplats aux tokens, et — nouveau — des <b>indicateurs
    de glisser-déposer enfin visibles</b> (liseré d'insertion + contour de colonne : ils n'avaient aucun style
    dans l'ancien fichier). Fantôme de déplacement = classes uniquement (position/z-index hors de l'inline).</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('📖 Guide — accueil', mgmtFrame(guideHome))}</div>
      <div>${frame('⚔️ Guide — section Combat', mgmtFrame(guideDetail))}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('💡 Quête tutoriel — fenêtre Histoire', mgmtFrame(tutCard))}</div>
      <div>${frame('🪟 Chrome des fenêtres & glisser-déposer', winChromeDemo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">16. Correctifs du retour utilisateur (vague 15) <span class="pv-badge">nouveau</span></h2>
    <p class="pv-note">Chaque correctif répond à un point remonté après test réel du jeu :
    légende de la carte en <b>vrai gras</b> (plus de <code>&lt;b&gt;</code> échappé) et alcôves sans emoji ;
    <b>liseré de chargement = couleur EXACTE du type</b> (plus d'alpha à 40&nbsp;%, plus de palette canonique
    divergente — la CSS porte tout) ; pastilles de type à <b>texte par type</b> (contraste ≥ 4,5 mesuré, blanc
    illisible sur jaune/glace/plante supprimé) ; <b>textes des cartes équipe/combat</b> repassés en foncé sur
    fond clair ; grille de la <b>Boîte PC</b> réparée (classe moderne ré-injectée, TRI legacy supprimé, onglet
    <b>Fossiles</b> cliquable via le setter du module) ; <b>compteurs du sac</b> réels (variable masquée qui
    figeait tout à 0) ; <b>ligne d'argent identique</b> boutique et marché (composant unique <code>MoneyRow</code>) ;
    menu de sauvegarde aux <b>couleurs distinctes</b> ; réglages avec <b>langue active visible</b>, pastille de
    thème non rognée et <b>focus non coupés</b> ; starter/presets/usine à la largeur des menus ; glisser-déposer
    réparé (re-déposer à sa place = sans effet, liseré au-dessus ET en-dessous, toutes colonnes) ; mobile qui
    <b>défile</b> avec barres <b>épinglées</b>, Quêtes rangées sous Aventure, Raccourcis au premier niveau,
    Grand Souterrain raccourci, fenêtres fantômes bannies ; barre de titre <b>fixe</b> avec libellé
    <b>« Badges : »</b> explicite ; colonnes latérales qui <b>grandissent au-delà du 16/9</b> jusqu'à égaler le
    centre (marges 16/9 conservées) ; sprites hors équipe agrandis (64/104px).</p>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🗺️ Légende de la carte — vrai gras', `<div style="max-width:340px">${mapHelp15}</div>`)}</div>
      <div>${frame('⚔️ Cooldown = couleur EXACTE du type (+ textes lisibles)', chargeDemo)}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🔘 Boutons d\'attaques auto — pastilles par type', autoMoveDemo)}</div>
      <div>${frame('💾 Boîte PC — grille moderne 198px (nom + niveau)', usmGrid15)}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('₽ Argent — même ligne en boutique et marché', moneyRowDemo)}</div>
      <div>${frame('⚙️ Réglages — langue active enfin visible', langDemo)}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('💾 Menu sauvegarde — 3 couleurs d\'actions', saveCtxDemo)}</div>
      <div>${frame('📱 Barres mobiles — Raccourcis au 1er niveau, Quêtes dans Aventure', mobileBarsDemo)}</div>
    </div>
    <div style="margin-top:10px">${frame('🖥️ Barre de titre — « Badges : 12/16 » explicite + barre fixe', headerDemo)}</div>
  </section>

  <section>
    <h2 class="pv-h2">17. Vague 16 — boutiques/marché + extras de sauvegarde <span>rebuilt from zero (ShopView · MarketView · save-extras)</span></h2>
    <div class="pv-grid">
      <div>${frame('🏪 Boutique (ShopView)', shopDemo, 'MoneyRow partagée + 3 états (ok / vide / verrou Indigo) — lignes shop-item + contrat d\u2019achat')}</div>
      <div>${frame('🐣 Marché (MarketView)', marketDemo, 'Catégories, ??? pour les espèces jamais vues, ligne « Acheté » seulement si déjà possédé')}</div>
      <div>${frame('💾 Extras de sauvegarde (save-extras)', saveExtrasDemo, 'Menu contextuel (3 couleurs), icône courante, grille d\u2019icônes avec état actif + ★ shiny')}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">18. Vague 17 — retours du jeu réel, 2ᵉ salve <span>vérifié en Chromium headless, capture par capture</span></h2>
    <p class="pv-note" style="margin:0 0 8px"><b class="pv-ok">Méthode durcie.</b> Ces bugs n'étaient pas visibles en jsdom (aucune
      cascade CSS réelle) : diagnostic et validation faits dans un <b>vrai navigateur headless</b> — géométrie
      des cartes mesurée au pixel, captures avant/après à l'appui.</p>
    <div class="pv-grid">
      <div>${frame('📦 Boîte PC — les pilules vides sont mortes', boxFixDemo)}</div>
      <div>${frame('🎯 Marqueurs d\u2019insertion — dessus ET dessous', dragDemo)}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('⚔️ Chrome de combat — uniquement en combat', battleChromeDemo)}</div>
      <div>${frame('🎨 États actifs par thème — plus de crème en dur', activeDemo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">19. Vague 18 — retours du jeu réel, 3ᵉ salve <span>chaque point mesuré en Chromium headless</span></h2>
    <p class="pv-note" style="margin:0 0 8px">Boîte = Pokédex, fins des doubles ronds, filtres enfin thémés
      (cause racine <i>enfin</i> trouvée sur ce 3ᵉ signalement), sprites centrés, ×N devant, barre d'attaque
      visible, panneaux élargis, ★ unique, rouges unifiés, liseré robuste.</p>
    <div class="pv-grid">
      <div>${frame('📦 Boîte PC = Pokédex (même médaillon, niveau en bas)', boxDexDemo)}</div>
      <div>${frame('🐦 Fin des doubles ronds', doubleRondDemo)}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🎛️ Filtres & menus — couleurs DE THÈME (3ᵉ signalement)', selectThemeDemo)}</div>
      <div>${frame('⚡ Barre d’attaque typée + ★ shiny unique', chargeShinyDemo)}</div>
    </div>
    <div class="pv-grid" style="margin-top:10px">
      <div>${frame('🧾 Résumé, rouges unifiés, divers', misc18Demo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">20. Vague 19 — migration des affichages restants : détail Pokédex + notifications <span>mesuré en Chromium, chemin bundle inclus</span></h2>
    <p class="pv-note" style="margin:0 0 8px">La fiche de détail du dex rejoint le design system (vue ECS
      <code>DexDetailView</code>, zéro HTML brut) et les toasts sont unifiés (surface plate thémée + liseré
      de type). Bonus : la couleur des ★ shiny tient désormais AUSSI dans les modales (marteau universel
      découvert et neutralisé — vrai « partout » cette fois).</p>
    <div class="pv-grid">
      <div>${frame('🔥 Détail Pokédex — même langage que les panneaux d’info', dexDetailDemo)}</div>
    </div>
    <div class="pv-cols" style="margin-top:10px">
      <div>${frame('🔔 Toasts — succès / danger / info', toastDemo)}</div>
      <div>${frame('★ ★ shiny — verrouillées partout (modales comprises)', starReDemo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">21. Vague 20 — migration des affichages restants : panneau hors-ligne AFK + intérieur de la fenêtre Quêtes <span>mesuré en Chromium, chemin bundle inclus</span></h2>
    <p class="pv-note" style="margin:0 0 8px">Le rapport « pendant votre absence » rejoint le design system
      (vue ECS <code>AfkRecapView</code>, composants du bilan de combat réutilisés) et la fenêtre des quêtes
      (histoire, dialogues PNJ, amélioration des répétables) aussi — 28 règles CSS jetables supprimées,
      contrats du routeur préservés au caractère près.</p>
    <div class="pv-grid">
      <div>${frame('⏱ Panneau AFK — barre plate + récap = MÊMES composants que le bilan de combat', afkDemo)}</div>
      <div>${frame('📖 Fenêtre Quêtes + dialogue PNJ — cartes DS, aucun bouton mort', questDemo)}</div>
    </div>
    <div class="pv-grid" style="margin-top:10px">
      <div>${frame('🎨 Boutons de quête — le marteau des contrôles neutralisé', hammerDemo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">22. Vague 21 — migration des affichages restants : explorations à énigmes + formes spéciales <span>mesuré en Chromium, chemin bundle inclus</span></h2>
    <p class="pv-note" style="margin:0 0 8px">Les énigmes secrètes (liste + fiches séquence/braille/attente/équipe)
      et le panneau Morphéo/Deoxys sont désormais rendus de zéro par trois vues ECS. Fin du bouton cadenas
      grisé-mort, fin des styles inline, fin du dégradé d’attente mort — contrats du routeur préservés,
      preuves de bout en bout (séquence cliquée puis validée, achat de forme puis badge ✓).</p>
    <div class="pv-grid">
      <div>${frame('🧩 Explorations secrètes — liste + fiche séquence, aucun bouton mort', puzzleDemo)}</div>
      <div>${frame('🌦️ Formes spéciales — contrat d’achat inchangé, état verrouillé informatif', formsDemo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">23. Vague 22 — migration des affichages restants : base secrète (dialogues + éditeur PNJ) + reliquat Usine <span>mesuré en Chromium, chemin bundle inclus</span></h2>
    <p class="pv-note" style="margin:0 0 8px">Les dialogues de la base secrète (PC Drapeau ORAS, affrontement
      et résultat PNJ), l’éditeur de PNJ et ses 4 sélecteurs, ainsi que la coque de préparation d’Usine sont
      rendus de zéro par huit vues ECS. Fin des ~130 styles inline mesurés, fin du dégradé de rang et du
      bouton rouge-dégradé, fin du bouton anti-24h grisé-mort — contrats du routeur et de câblage préservés,
      preuves de bout en bout (collecte réelle → re-rendu anti-24h ; sauvegarde PNJ réelle persistée).</p>
    <div class="pv-grid">
      <div>${frame('🚩 PC de base — carte Drapeau PLATE, collecte danger plate, anti-24h informatif', baseDialogDemo)}</div>
      <div>${frame('✏️ Éditeur PNJ — ~103 images inline tokenisées, câblage inchangé', baseEditorDemo)}</div>
    </div>
    <div class="pv-grid" style="margin-top:10px">
      <div>${frame('🏭 Usine — coque ECS, cible de glisser-déposer re-instrumentée', factoryPrepDemo)}</div>
    </div>
  </section>

  <section>
    <h2 class="pv-h2">24. Vague 23 — coquilles statiques (confirmation) + palette d’en-tête/pw-static + scène du menu au boot <span>mesuré en Chromium, chemin bundle inclus</span></h2>
    <p class="pv-note" style="margin:0 0 8px">Trois chantiers : la boîte de confirmation unifiée est plate
      et franche dans ses deux variantes (bénin = accent, danger = rouge — fin du dégradé mort et de la
      peinture inline), la palette des statiques d’index.html est tokenisée (13 classes mortes supprimées,
      derniers dégradés « aveugles » de la couche d’unification aplatis), et la vérité de session pilote
      enfin les DEUX scènes du jeu : MainMenuScene au démarrage (l’ancien code lisa un id fantôme et des
      événements jamais émis), bascule/retour sans destruction grâce à SceneManager.replace(). En bonus,
      le menu des quêtes répétables se rouvre dans le VRAI navigateur (ReferenceError _repeatableRoll).</p>
    <div class="pv-grid">
      <div>${frame('✅ Boîte de confirmation — bénin = accent plat, danger = rouge plat', confirmBenignDemo)}</div>
      <div>${frame('🎨 En-tête + palette — tokens par thème, dégradés morts aplatis', paletteDemo)}</div>
    </div>
    <div class="pv-grid" style="margin-top:10px">
      <div>${frame('🎬 Scène du menu — la vérité de session pilote le boot', scenesDemo)}</div>
    </div>
  </section>

  <section id="s25">
    <h2 class="pv-h2">25. Vague 24 — unification globale du CSS <span>une seule feuille canonique, une vérité par règle, zéro pixel déplacé</span></h2>
    <p class="pv-note">Les 7 fichiers sources historiques (cleaned-components, extracted-index/templates/bridges,
      mobile-accessibility, pw-unified, pw-static — 243 Ko, déjà tous fusionnés et devenus obsolètes) sont supprimés :
      <b>design-system.css</b> est désormais la seule feuille du projet. Les fonds des cartes de sauvegarde avaient
      <b>4 blocs de définition concurrents</b> (un doublon, un voile sombre et un redesign alternatif — tous écrasés et
      invisibles) : un seul bloc canonique demeure, le design réellement peint, prouvé <b>pixel-identique avant/après</b>
      en Chromium (computed styles + capture octet par octet). 111 fallbacks morts sur tokens universels retirés,
      <code>var(--card)</code> (token jamais défini) corrigé, et — bug hérité de la vague 23 attrapé par le prouveur
      avant/après — la règle <code>.pw-win-tabs{display:none}</code>, affirmée existante mais absente, est réellement
      écrite : la bande d'onglet « Lieu » redevient invisible.</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>🎴 Fonds d'époque — le bloc canonique unique (7 <code>.save-slot.save-bg-*</code>)</h3>
        <div class="pv-body" style="display:flex;gap:10px;flex-wrap:wrap;background:#141210;padding:10px;border-radius:10px">
          <div class="save-slot save-bg-classic" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">classic</span></div>
          <div class="save-slot save-bg-goldsilver" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">goldsilver</span></div>
          <div class="save-slot save-bg-emerald" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">emerald</span></div>
          <div class="save-slot save-bg-diamondpearl" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">diamondpearl</span></div>
          <div class="save-slot save-bg-blackwhite" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">blackwhite</span></div>
          <div class="save-slot save-bg-xy" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">xy</span></div>
          <div class="save-slot save-bg-forest" style="min-height:110px;flex:1 1 150px"><span style="padding:8px;display:inline-block">forest</span></div>
        </div>
      </div>
    </div>
  </section>

  <section id="s26">
    <h2 class="pv-h2">26. Vague 26 — 13 retours visuels de l’utilisateur <span>mesurés avant/après en Chromium headless, preuve pixel pour le sprite</span></h2>
    <p class="pv-note">Chaque point a d’abord été <b>mesuré dans le jeu réel</b> (computed styles + captures), puis corrigé,
      puis re-prouvé (<code>harness/visual-wave26.mjs</code>, 22 assertions Chromium, dont un <b>échantillonnage de pixel</b>
      du sprite d’entraînement via canvas). Les verrous DOM-free vivent dans <code>tests/passe53-wave26-fixes.test.js</code> (11 tests) :
      filtres désormais sur <code>var(--pw-*)</code> des 4 thèmes (4ᵉ signalement — littéraux sombres supprimés),
      shiny de boîte PC sans anneau rouge ni animation (l’★ suffit), disque lieu 72px centré, icônes d’objets rendues à leurs
      attributs (le marteau <code>100%</code> est scopé au disque réel), <code>#move-buttons</code> restauré (barre d’attaques
      visible, remplissage <code>var(--type-color)</code>), plaques de carte arrondies 11px sur carte 12px+bordure,
      headers des feuilles modales en <b>bande pleine largeur</b> (résumé, gestion, éditeurs PC/PNJ) avec écart retrouvé
      sous le bandeau du résumé, éditeur PNJ restructuré (scroller dédié + footer épinglé, champs de citations accessibles),
      paddings canoniques 14px dans les contenus de gestion, icône de sauvegarde centrée. Cas le plus subtil : le sprite
      d’entraînement — le span imbriqué recevait <code>opacity:0.82</code> (règle de lisibilité des cartes), devenait son
      propre contexte d’empilement et passait SOUS le disque z-1 ; le composant <code>machine-window.js</code> ne re-wrappe
      plus un disque déjà complet (le disque unique de l’assistant s’étire à 100%).</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>⚔️ Barre d’attaques — hôte <code>#move-buttons</code> restauré entre la ligne d’équipe et le butin</h3>
        <div class="pv-body" style="background:#141210;padding:10px;border-radius:10px">
          <div id="move-buttons">
            <button class="auto-move type-electric"><span class="am-name">1. Éclair ×2</span><span class="am-type type-electric">Électrik</span><span class="am-bar-bg"><span class="am-bar-fill" style="width:62%"></span></span></button>
            <button class="auto-move type-electric"><span class="am-name">2. Tonnerre ×2</span><span class="am-type type-electric">Électrik</span><span class="am-bar-bg"><span class="am-bar-fill" style="width:25%"></span></span></button>
            <button class="auto-move type-normal"><span class="am-name">3. Charge ×1</span><span class="am-type type-normal">Normal</span><span class="am-bar-bg"><span class="am-bar-fill" style="width:0%"></span></span></button>
          </div>
        </div>
      </div>
      <div class="pv-frame"><h3>🧱 Bandeaux pleine largeur — résumé (écart 16px) ≡ gestion (14px de padding contenu)</h3>
        <div class="pv-body" style="display:flex;gap:12px;flex-wrap:wrap;background:#141210;padding:10px;border-radius:10px">
          <div style="flex:1 1 240px;background:var(--dark2);border:1px solid var(--dark3);border-radius:12px;padding:0 0 20px;overflow:hidden">
            <div class="modal-title" style="margin:0 0 16px;border-radius:11px 11px 0 0"><div class="modal-title-text">Butin &amp; résumé de session</div><span class="modal-close">✕</span></div>
            <div style="margin:0 20px;padding:12px;border:1px solid var(--dark3);border-radius:10px;background:rgba(0,0,0,0.18);color:var(--light2);font-size:12px">Le premier cadre respire sous le bandeau.</div>
          </div>
          <div style="flex:1 1 240px;background:var(--dark2);border:1px solid var(--dark3);border-radius:12px;padding:0;overflow:hidden">
            <div class="modal-title" style="margin:0;border-radius:11px 11px 0 0"><div class="modal-title-text">Gestion — mine</div><span class="modal-close">✕</span></div>
            <div style="padding:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div style="padding:10px;border:1px solid var(--dark3);border-radius:10px;background:rgba(0,0,0,0.18);color:var(--light2);font-size:12px">Amélioration</div>
              <div style="padding:10px;border:1px solid var(--dark3);border-radius:10px;background:rgba(0,0,0,0.18);color:var(--light2);font-size:12px">Entraîneur</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="s27">
    <h2 class="pv-h2">27. Vague 27 — audit visuel autonome (toutes fenêtres × 4 thèmes) <span>5 défauts trouvés, mesurés et corrigés dans le navigateur réel</span></h2>
    <p class="pv-note">Tournée complète de 27 vues en Chromium (<code>harness/sweep2-wave27.mjs</code>) avec mesures automatiques
      (débordements, contenus clippés, couleurs chrome calculées) + relecture humaine des captures. Les 5 défauts réels trouvés
      ont été diagnostiqués à la racine, corrigés, puis prouvés (<code>harness/visual-wave27.mjs</code>, 20 assertions Chromium) :
      <b>menu sauvegarde écrasé à 44px</b> (la règle utilitaire <code>.is-hidden{display:none!important}</code> éjectait les boutons
      ‹ › de la grille du shell — la liste restante basculait dans la piste bouton de 44px ; <code>is-invisible</code> dédiée),
      <b>pastille de niveau illisible</b> (la couverture de lisibilité vague 17 atteint (0,7,1) via sa chaîne de 6 <code>:not()</code> —
      la pastille sombre est désormais <i>exclue à la source</i> et garde sa paire <code>dark2/light2</code>, valide dans les 4 thèmes),
      <b>cellules d'attaques vides grises</b> en combat (invisibles, ancres DOM conservées pour le ticker 60fps),
      <b>titre « Carte {region} » brut</b> (le passage data-i18n peignait le gabarit non interpolé — attribut retiré, écrivains unifiés
      sur « Carte : {region} »), <b>démarrage français natif</b> (les 3 fabriques d'état initial + <code>currentLang()</code> semaient
      'en' — écran de sauvegarde/starter/barre d'équipe anglais dès la 1ʳᵉ visite). Verrous : <code>tests/passe54-wave27-fixes.test.js</code> (12 tests) ;
      adaptation documentée : passe28 compte 9 libellés i18n (le titre carte est l'exception voulue).</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>💾 Menu sauvegarde — liste pleine largeur (870px mesurés, était 44px)</h3>
        <div class="pv-body" style="background:#141210;padding:12px;border-radius:10px">
          <div class="save-menu-list-shell" style="min-height:0">
            <button class="hbtn save-menu-scroll-btn is-invisible" type="button">‹</button>
            <div id="save-menu-list" class="save-menu-list" style="min-height:0">
              <div class="save-menu-empty" style="min-height:150px">
                <div class="save-menu-empty-icon">◇</div>
                <h2 style="color:var(--light2);margin:0">Aucune sauvegarde trouvée</h2>
                <p>Crée une nouvelle sauvegarde ou importe un fichier pour l'ajouter à la liste.</p>
              </div>
            </div>
            <button class="hbtn save-menu-scroll-btn is-invisible" type="button">›</button>
          </div>
        </div>
      </div>
      <div class="pv-frame"><h3>🏷️ Pastille Niveau — encre <code>--light2</code> lisible dans les 4 thèmes</h3>
        <div class="pv-body" style="background:#141210;padding:12px;border-radius:10px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <span class="pw-poke-circle-wrap" style="width:44px;height:44px"><span class="pw-poke-circle-bg" style="display:grid;place-items:center;font-size:24px">⚡</span></span>
          <span style="color:var(--dark1);font-weight:700;background:var(--light1);padding:6px 10px;border-radius:8px">Pikachu</span>
          <span class="poke-level">Nv.34</span>
          <span style="color:var(--light2);font-size:12px;opacity:.8">— « Nv.34 » en parchemin sur puce sombre (avant : sombre-sur-sombre, 52/65 de luminance).</span>
        </div>
      </div>
    </div>
  </section>

  <section id="s28">
    <h2 class="pv-h2">28. Vague 28 — 15 retours visuels/UX de l'utilisateur <span>chaque cause racine mesurée dans le navigateur réel, chaque correctif prouvé avant/après (29 assertions Chromium)</span></h2>
    <p class="pv-note">Trois de ces points étaient des <b>récidives mal traitées aux vagues 26/27</b> — reconnues et corrigées à la racine cette fois
      (détail complet dans <code>MIGRATION_STATUS.md</code>, verrous dans <code>tests/passe55-wave28-fixes.test.js</code>, 13 tests,
      preuves <code>harness/visual-wave28.mjs</code> sur desktop 1360 / grand écran 2560 / mobile 390×844) :
      <b>objets trouvables du lieu</b> rendus en cartes identiques aux Pokémon sauvages (disque 56px, nom dessous — fini les puces 30px) ;
      <b>icône de la save</b> : la zone sprite+nom en double est retirée des réglages (l'icône se voit déjà sur la carte de sauvegarde, le bouton reste) ;
      <b>bandeaux des panneaux</b> (gestion, éditeurs PC/PNJ, résumé) enfin pleine largeur — le marteau <code>#poke-modal-inner * { max-width:100% }</code>
      les plafonnait à la largeur du contenu (trou de 32px, 946→978px mesurés) : les 7 bandeaux sont exclus par <code>max-width:none !important</code> ;
      <b>éditeur PNJ</b> : la page entière défile (scroller imbriqué de l'équipe supprimé), sprite et nom côte à côte ;
      <b>recherche du dictionnaire</b> ramenée de 140px à 32px (la base flex 140px de la toolbar en ligne devenait une HAUTEUR dans la toolbar verticale) ;
      <b>barre d'attaques</b> : la barre ajoutée en bas est supprimée du DOM, les puces redeviennent neutres et se remplissent directement de la
      couleur du type (<code>--charge-color: var(--type-color)</code>) comme avant la vague 26 ;
      <b>grilles canoniques</b> (recette <code>repeat(auto-fill, minmax(min(Npx,100%),1fr))</code>) étendues au guide, à la gestion des équipes,
      à toutes les sections des panneaux de gestion (mine, pension, entraînement), au tableau des quêtes répétables et à l'éditeur PNJ ;
      <b>éditeur PC</b> : bouton Fermer redondant retiré (✕ et Échap suffisent) ;
      <b>Échap / bouton retour mobile</b> ferment le panneau du dessus (scanner de z-index + History API dans <code>bootstrap.js</code> — modales de démarrage protégées) ;
      <b>grands écrans</b> : paliers 1600/2200px (plein écran 1820px mesurés à 2560px de large, contre 960 avant — réglages 1200 vs 560, gestion 1760 vs 980) ;
      <b>Explorer en mobile</b> bascule directement sur la vue combat ;
      <b>panneaux mobiles ancrés en haut</b> (les marges automatiques haut/bas des coques les centraient — y=6 au lieu de 68) ;
      <b>croix de fermeture toujours atteignable</b> et <b>barre titre repassée derrière</b> (hiérarchie z corrigée : plein écran 1100, réglages/quêtes/fiche/résumé 1200,
      confirmations 50000 intactes).</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>🗺️ Fenêtre lieu — objets trouvables = mêmes cartes que les Pokémon sauvages (disque 56px, nom dessous)</h3>
        <div class="pv-body" style="background:#141210;padding:12px;border-radius:10px;display:grid;gap:10px">
          <div class="pw-loc-section-title">Pokémon sauvages</div>
          <div class="pw-loc-wild-grid">
            <div class="pw-loc-wild-card is-owned is-seen">
              <div class="loc-caught-badge is-owned">✓</div>
              <div class="pw-loc-wild-disc"><span class="pw-poke-circle-wrap" style="width:56px;height:56px"><span class="pw-poke-circle-bg"></span><span style="position:relative;z-index:1;display:grid;place-items:center;font-size:28px">⚡</span></span></div>
              <div class="pw-bold pw-text-sm">Pikachu</div>
              <div class="pw-text-sm pw-light1">Nv. 3-6</div>
              <div class="pw-text-sm pw-light1">Commun</div>
            </div>
          </div>
          <div class="pw-loc-section-title">Objets trouvables</div>
          <div class="pw-loc-wild-grid pw-loc-drop-grid">
            <div class="pw-loc-wild-card pw-loc-drop-card">
              <div class="pw-loc-wild-disc"><span class="pw-poke-circle-wrap" style="width:56px;height:56px"><span class="pw-poke-circle-bg"></span><span style="position:relative;z-index:1;display:grid;place-items:center;font-size:28px">🔴</span></span></div>
              <div class="pw-bold pw-text-sm">Poké Ball</div>
            </div>
            <div class="pw-loc-wild-card pw-loc-drop-card">
              <div class="pw-loc-wild-disc"><span class="pw-poke-circle-wrap" style="width:56px;height:56px"><span class="pw-poke-circle-bg"></span><span style="position:relative;z-index:1;display:grid;place-items:center;font-size:28px">🧪</span></span></div>
              <div class="pw-bold pw-text-sm">Potion</div>
            </div>
          </div>
        </div>
      </div>
      <div class="pv-frame"><h3>⚔️ Attaques — puce neutre, la couleur du type REMPLIT la puce (rien d'ajouté en bas)</h3>
        <div class="pv-body" style="background:var(--dark2);padding:12px;border-radius:10px;display:grid;gap:8px;max-width:340px">
          <div class="poke-move type-electric charging" style="--charge-pct:65%"><span class="move-name">Éclair</span><span class="move-type type-electric">Électrik</span></div>
          <div class="poke-move type-fire charging" style="--charge-pct:30%"><span class="move-name">Flammèche</span><span class="move-type type-fire">Feu</span></div>
          <div class="poke-move type-normal"><span class="move-name">Charge</span><span class="move-type type-normal">Normal</span></div>
          <span style="color:var(--light2);font-size:11px;opacity:.8">Base parchemin <code>--light1</code> (avant : dalle entière peinte couleur type) — <code>#move-buttons</code> supprimé du DOM.</span>
        </div>
      </div>
      <div class="pv-frame"><h3>👤 Éditeur PNJ — sprite et nom côte à côte, la page entière défile</h3>
        <div class="pv-body" style="background:#141210;padding:12px;border-radius:10px;display:grid;gap:10px">
          <div class="pw-base-npced-id">
            <button type="button" class="base-npc-portrait-btn pw-base-npced-id-portrait" style="font-size:30px;display:grid;place-items:center">🧑‍🚀</button>
            <div class="pw-base-npced-id-name"><input class="preset-name-input" value="Pierre" readonly></div>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8">Avant : la pastille 22px passait PAR-DESSUS le portrait, et seul le bloc équipe défilait (« illisible »). Le scroller imbriqué est supprimé, la coque entière défile, la barre d'actions reste épinglée en bas.</span>
        </div>
      </div>
    </div>
  </section>

  <section id="s29">
    <h2 class="pv-h2">29. Vague 29 — 4 retours utilisateur <span>causes racines mesurées, correctifs prouvés en Chromium (14 assertions), verrous tests/passe56 (8 tests)</span></h2>
    <p class="pv-note">Un point était une <b>récidive signalée pour la 2ᵉ fois</b> (panneaux tactiles « au milieu de l'écran ») — cette fois la vraie
      fuite a été localisée : la combinaison <b>pointeur tactile + écran plus large que 850px</b> (tablettes) activait le mode mobile JS sans chrome
      mobile, laissant les fenêtres dans une colonne invisible ; la requête média suit désormais exactement la porte du mode mobile, et chaque
      bascule de vue revient en haut de page. Détail complet dans <code>MIGRATION_STATUS.md</code> (vague 29) :
      <b>en-tête éditeur PNJ épinglé</b> (il partait à −256px au scroll, il reste à +21px) ;
      <b>en-têtes unifiées</b> pour les panneaux info (objet, attaque, talent) et les éditeurs PC/PNJ — la « bande invisible » (zone transparente,
      texte à 5px du bord) laisse place à la pastille canonique des autres menus (fond opaque, arrondi complet, détachée du bord) ;
      <b>combat</b> : les cartes sans attaques gardent l'arrondi du bas ;
      <b>crash réel corrigé</b> en recon : le panneau d'info d'attaque plantait en mode strict dès qu'une attaque avait un badge d'effet
      (<code>effContent</code> non déclaré) ; et une <b>classe d'état collante</b> (<code>management-inner</code>) rétrécissait les éditeurs après
      certains parcours, corrigée aux ouvertures.</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>📌 Éditeur PNJ — pastille canonique ÉPINGLÉE pendant le défilement (comme les réglages)</h3>
        <div class="pv-body" style="background:#141210;padding:14px;border-radius:10px;display:grid;gap:10px">
          <div style="background:var(--pw-bg-header, #211f1c);border:1px solid var(--pw-border, #4a3e31);border-radius:12px 12px 10px 10px;display:flex;align-items:center;gap:8px;min-height:48px;padding:0 8px 0 14px;color:var(--light2);font-weight:bold">
            <span style="width:26px;height:26px;border-radius:50%;background:var(--dark2);display:grid;place-items:center;font-size:14px">👤</span>
            Éditeur de PNJ — Pierre
            <span style="margin-left:auto;border:1px solid var(--pw-border);border-radius:8px;width:26px;height:26px;display:grid;place-items:center">×</span>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8">Avant : bandeau statique et zone supérieure transparente, perdu au scroll (−256px mesurés). Après : position:sticky; top:0; fond opaque, arrondi complet — la page entière défile dessous, la barre d'actions reste épinglée en bas.</span>
        </div>
      </div>
      <div class="pv-frame"><h3>⚔️ Combat — carte SANS attaques : arrondi complet du bas (cartes avec attaques inchangées)</h3>
        <div class="pv-body" style="background:var(--dark2);padding:12px;border-radius:10px;display:grid;gap:12px;grid-template-columns:1fr 1fr">
          <div class="poke-card pw-poke-card" style="margin:0">
            <div class="poke-card-top" style="border-radius:11px"><div class="pw-relative"><div class="poke-sprite-container"><div class="poke-sprite">🔥</div></div></div><div class="poke-info"><div class="poke-name"><span>Inactif</span><span class="poke-level">Nv.22</span></div><div class="hp-bar-container"><div class="hp-bar"><div class="hp-fill high" style="width:80%"></div></div></div><div class="xp-bar-container"><div class="xp-bar"><div class="xp-fill" style="width:40%"></div></div></div></div></div>
          </div>
          <div class="poke-card pw-poke-card active" style="margin:0">
            <div class="poke-card-top"><div class="pw-relative"><div class="poke-sprite-container"><div class="poke-sprite">⚡</div></div></div><div class="poke-info"><div class="poke-name"><span>Actif</span><span class="poke-level">Nv.34</span></div><div class="hp-bar-container"><div class="hp-bar"><div class="hp-fill high" style="width:90%"></div></div></div><div class="xp-bar-container"><div class="xp-bar"><div class="xp-fill" style="width:55%"></div></div></div></div></div>
            <div class="poke-moves"><div class="poke-move type-electric charging" style="--charge-pct:65%"><span class="move-name">Éclair</span><span class="move-type type-electric">Électrik</span></div></div>
          </div>
          <span style="grid-column:1/-1;color:var(--light2);font-size:11px;opacity:.8">Gauche : arrondi partout (le cadre clair se termine nettement). Droite : joint carré volontaire — les attaques continuent dessous.</span>
        </div>
      </div>
      <div class="pv-frame"><h3>📱 Tactile large (tablette) — chrome mobile COMPLET, fenêtres ancrées en haut</h3>
        <div class="pv-body" style="background:#26201a;padding:0;border-radius:10px;display:grid;gap:0;overflow:hidden">
          <div style="display:flex;gap:6px;padding:8px;background:linear-gradient(180deg,rgba(38,37,33,.98),rgba(31,30,27,.98));border-bottom:1px solid rgba(236,222,183,.14)">
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Aventure</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Combat</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center;background:var(--light2)">Raccourcis</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Gestion</span>
          </div>
          <div style="padding:10px;display:grid;gap:8px">
            <div style="border:1px solid var(--dark3);background:var(--panel,#2a2825);border-radius:8px;overflow:hidden">
              <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dark3);color:var(--light2);font-weight:bold">🔗 Raccourcis</div>
              <div style="padding:8px;display:grid;gap:6px">
                <div class="shortcut-action-btn" style="display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--light2)">🎒 Sac</div>
                <div class="shortcut-action-btn" style="display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--light2)">🛒 Marché</div>
              </div>
            </div>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8;padding:0 10px 10px">Avant : mobile-mode actif mais chrome desktop — colonne de fenêtres invisible (0×0px, inatteignables). Après : nav + fenêtres pleine largeur en haut (y=122/173 mesurés), retour en haut à chaque bascule.</span>
        </div>
      </div>
    </div>
  </section>
  <section id="s30">
    <h2 class="pv-h2">30. Vague 30 — UN gabarit de fenêtre partagé + preuve de version <span>corrections structurelles (24 assertions, 24/24), verrous tests/passe57 (10 tests)</span></h2>
    <p class="pv-note">Deux récidives re-signaleées, deux causes racines traitées : (1) les panneaux infos/PC/PNJ collaient encore des en-têtes/pieds
      <i>maison</i> sur la coque partagée — ils tournent désormais le <b>même gabarit de fenêtre</b> que le panneau de quêtes
      (<code>pwApplyWindowChrome</code>) : <b>tête plate opaque</b> clouée au cadre, <b>corps seul scrollant</b>, <b>pied opaque</b> —
      le contenu ne peut plus jamais passer au-dessus du titre ni sous le pied, à aucune profondeur de scroll ;
      (2) la fenêtre mobile « au milieu de l'écran » (4ᵉ signalement) : le build livré ancre correctement en haut — la capture utilisateur
      venait d'une <b>copie locale périmée</b> (lancement <code>file://</code> → <code>pw-bundle.js</code>). Un <b>tampon de build</b>
      est affiché en bas des Réglages (<code>window.PW_BUILD</code>) pour prouver la version réellement ouverte sur chaque capture.</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>🪟 Gabarit unique — éditeur PNJ : tête opaque épinglée, corps scrollant, pied opaque (mesuré)</h3>
        <div class="pv-body" style="background:#1a1713;padding:12px;border-radius:12px;display:grid;place-items:center">
          <div style="width:min(96%,560px);background:var(--dark2);border:1px solid var(--dark3);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;height:280px">
            <div class="modal-title" style="display:flex;justify-content:space-between;align-items:center;border-radius:0"><span style="display:flex;gap:8px;align-items:center">🥷 <b>Éditeur de PNJ</b></span><button type="button" class="modal-close" style="border:1px solid var(--dark3);border-radius:10px;background:var(--dark3);width:27px;height:27px">✕</button></div>
            <div style="flex:1 1 auto;overflow-y:auto;padding:12px 16px;display:grid;gap:8px;color:var(--light2);font-size:11px">
              <div style="border:1px solid var(--dark3);border-radius:8px;padding:8px">Identité (sprite + nom)</div>
              <div style="border:1px solid var(--dark3);border-radius:8px;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px"><span style="background:var(--light2);color:var(--dark1);border-radius:8px;padding:10px;font-weight:bold">Onix · Nv.30 (+ 4 attaques)</span><span style="border:1.5px dashed var(--light1);border-radius:8px;padding:10px;text-align:center">+ Ajouter un Pokémon</span></div>
              <div style="border:1px solid var(--dark3);border-radius:8px;padding:8px">Répliques (3 champs)</div>
              <div style="border:1px solid var(--dark3);border-radius:8px;padding:8px;opacity:.6">…le scroll reste ICI…</div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;background:var(--pw-bg-header,#0a0908);border-top:1px solid var(--pw-border-color)"><span class="hbtn" style="padding:6px 12px">Enregistrer</span><span class="hbtn pw-btn-danger" style="padding:6px 12px">Supprimer ce PNJ</span><span class="hbtn" style="padding:6px 12px">Retour</span></div>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8;margin-top:8px">Même tête (fond, ligne 1px), même croix « chip » et même pied sur : objet · attaque · talent · Modifier PC · templates — <b>identiques par construction</b>, mesurés égaux au pixel.</span>
        </div>
      </div>
      <div class="pv-frame"><h3>🖥️ Desktop pointeur fin 657×1255 (contexte exact de la capture) — fenêtre ancrée en haut, pas au milieu</h3>
        <div class="pv-body" style="background:#26201a;padding:0;border-radius:10px;display:grid;gap:0;overflow:hidden">
          <div style="display:flex;gap:6px;padding:8px;background:linear-gradient(180deg,rgba(38,37,33,.98),rgba(31,30,27,.98));border-bottom:1px solid rgba(236,222,183,.14)">
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Aventure</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Combat</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Équipe</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center;background:var(--light2)">Raccourcis</span>
            <span class="mob-btn" style="flex:1;min-height:32px;display:grid;place-items:center">Gestion</span>
          </div>
          <div style="padding:10px 10px 14px;display:grid;gap:8px">
            <div style="border:1px solid var(--dark3);background:var(--panel,#2a2825);border-radius:8px;overflow:hidden">
              <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--dark3);color:var(--light2);font-weight:bold">🔗 Raccourcis</div>
              <div style="padding:8px;display:grid;gap:6px">
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--light2);border:1px solid var(--dark3);border-radius:8px">💻 Boîte PC</div>
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--light2);border:1px solid var(--dark3);border-radius:8px">🎒 Sac</div>
                <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;color:var(--light2);border:1px solid var(--dark3);border-radius:8px">🛒 Marché</div>
              </div>
            </div>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8;padding:0 10px 10px">Mesuré : sommet fenêtre = bas de la nav (top 122px, ±0px) — jamais au milieu. Si vous voyez encore la fenêtre au centre,
            c'est une <b>ancienne copie</b> qui tourne : ré-extrayez le dernier zip dans un dossier NEUF et ouvrez SON index.html — puis vérifiez
            le pied des Réglages : « PokéWorld — build w30 · 2026-08-07 » doit s'y afficher (<code>window.PW_BUILD</code>).</span>
        </div>
      </div>
    </div>
  </section>

  <section id="s31">
    <h2 class="pv-h2">31. Vague 31 — fenêtre « au milieu de l'écran » : reproduite, cause racine trouvée, corrigée <span>harness/visual-wave31 (17 assertions, 17/17), verrous tests/passe58 (7 tests)</span></h2>
    <p class="pv-note">Le défaut existait <b>vraiment</b> dans le build livré (mon hypothèse « copie périmée » de la vague 30 était insuffisante) :
      la restauration de la disposition bureau écrit <code>display:flex</code> <b>en ligne</b> sur chaque colonne du tableau de bord, ce qui
      battait la règle mobile <code>display:contents</code> — les colonnes <b>vides</b> gonflaient et poussaient la fenêtre visible au milieu.
      Mes sondes précédentes ne le voyaient pas : elles amorçaient le jeu sans jamais restaurer la disposition sauvegardée.
      Correctif : <code>display: contents !important</code> (battre le style en ligne EST le correctif). La preuve passe désormais par le
      <b>vrai chemin</b> : vraie sauvegarde → boot file:// → <code>startSaveById()</code> → clics réels.</p>
    <div class="pv-grid">
      <div class="pv-frame"><h3>❌ Avant — mesuré sur le vrai chemin (reproduction identique à votre capture)</h3>
        <div class="pv-body" style="background:#141210;padding:12px;border-radius:12px;display:grid;place-items:center">
          <div style="width:min(88%,230px);background:var(--dark1);border:1px solid var(--dark3);border-radius:12px;overflow:hidden">
            <div style="display:flex;gap:4px;padding:8px">
              <span class="mob-btn" style="flex:1;min-height:26px;display:grid;place-items:center;font-size:10px">Aventure</span>
              <span class="mob-btn" style="flex:1;min-height:26px;display:grid;place-items:center;background:var(--light2);font-size:10px">Raccourcis</span>
              <span class="mob-btn" style="flex:1;min-height:26px;display:grid;place-items:center;font-size:10px">Gestion</span>
            </div>
            <div style="height:170px;margin:0 8px;border:1px dashed var(--red);border-radius:8px;display:grid;place-items:center;color:var(--red);font-size:10px;text-align:center;padding:6px">COLONNE VIDE ~537px<br><span style="color:var(--light2)">col-2 : display:flex EN LIGNE<br>+ flex:2 → gonfle à vide</span></div>
            <div style="margin:8px;border:1px solid var(--dark3);background:var(--panel,#2a2825);border-radius:8px;padding:8px;color:var(--light2);font-size:10px">🔗 Raccourcis — top <b style="color:var(--red)">659px</b></div>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8;margin-top:8px">elementFromPoint dans le vide : <b>#col-2</b> — le « motif de tuiles » de la capture = le fond de page à travers la colonne vide, PAS la carte.</span>
        </div>
      </div>
      <div class="pv-frame"><h3>✅ Après — <code>display:contents !important</code> : la colonne ne génère plus de boîte</h3>
        <div class="pv-body" style="background:#1a1713;padding:12px;border-radius:12px;display:grid;place-items:center">
          <div style="width:min(88%,230px);background:var(--dark1);border:1px solid var(--dark3);border-radius:12px;overflow:hidden">
            <div style="display:flex;gap:4px;padding:8px">
              <span class="mob-btn" style="flex:1;min-height:26px;display:grid;place-items:center;font-size:10px">Aventure</span>
              <span class="mob-btn" style="flex:1;min-height:26px;display:grid;place-items:center;background:var(--light2);font-size:10px">Raccourcis</span>
              <span class="mob-btn" style="flex:1;min-height:26px;display:grid;place-items:center;font-size:10px">Gestion</span>
            </div>
            <div style="margin:0 8px 8px;border:1px solid var(--dark3);background:var(--panel,#2a2825);border-radius:8px;padding:8px;color:var(--light2);font-size:10px">🔗 Raccourcis — top <b style="color:var(--green)">122px = bas de la nav</b><br>Boîte PC · Sac · Marché · Pokédex…</div>
          </div>
          <span style="color:var(--light2);font-size:11px;opacity:.8;margin-top:8px">Mesuré via le VRAI chemin (sauvegarde → file:// → clics) : Raccourcis/Entraînement/Mine/Base/Pension top = ancre ±0px,
            col-2 calcule <b>contents</b>, une seule fenêtre visible, Aventure intacte (carte 55dvh), bureau 1280 intact (colonnes flex, 8 fenêtres).
            Tampon Réglages : « build w31 · 2026-08-07 ».</span>
        </div>
      </div>
    </div>
  </section>
</div></body></html>`;

fs.mkdirSync(new URL('../previews', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../previews/apercu-ui.html', import.meta.url), html);
console.log('previews/apercu-ui.html written,', html.length, 'bytes');

