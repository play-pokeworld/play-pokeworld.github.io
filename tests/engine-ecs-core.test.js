// ── Real ECS engine core + ECS-native UI screens (2026-08 rebuild) ──────
// Covers: Component/Entity/World/System/Scene/SceneManager lifecycle,
// typed UI components (Transform/UIRender/UIInteractive/UILayout/UIState),
// the vdom single-source serializer, and the zero-legacy rebuilt screens
// (bag, dictionary, pokédex, repeatable quests) contract.
// Self-contained: no DOM dependency, no node_modules.
import test from 'node:test';
import assert from 'node:assert/strict';

import { Component } from '../src/engine/core/Component.js';
import { World } from '../src/engine/core/World.js';
import { System } from '../src/engine/core/System.js';
import { Scene } from '../src/engine/core/Scene.js';
import { SceneManager } from '../src/engine/core/SceneManager.js';
import { TransformComponent } from '../src/engine/components/TransformComponent.js';
import { UIRenderComponent } from '../src/engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../src/engine/components/UIInteractiveComponent.js';
import { UILayoutComponent } from '../src/engine/components/UILayoutComponent.js';
import { UIStateComponent } from '../src/engine/components/UIStateComponent.js';
import { UIRenderSystem } from '../src/engine/systems/UIRenderSystem.js';
import { h, toHTMLString } from '../src/engine/render/vdom.js';

import { BagView } from '../src/ui/views/BagView.js';
import { DictionaryView } from '../src/ui/views/DictionaryView.js';
import { PokedexView } from '../src/ui/views/PokedexView.js';
import { QuestView } from '../src/ui/views/QuestView.js';
import { contrastRatio, assertContrast, token, spriteSizeFor } from '../src/ui/components/theme.js';

// ─── Component / World lifecycle ───────────────────────────────────────────

class HealthComponent extends Component {
  static get type() { return 'Health'; }
  constructor(hp) { super(); this.hp = hp; this.attached = false; this.disposed = false; }
  onAttach() { this.attached = true; }
  onDispose() { this.disposed = true; }
}

test('Component is abstract; typed components receive lifecycle callbacks', () => {
  assert.throws(() => new Component(), /abstract/);
  const world = new World();
  const entity = world.spawn('fighter', []);
  const health = entity.addComponent(new HealthComponent(120));
  assert.equal(health.attached, true, 'onAttach fired');
  assert.equal(health.entity, entity, 'back-reference set');
  assert.equal(entity.get(HealthComponent), health, 'typed get returns the instance (reference storage)');
  assert.equal(entity.has(HealthComponent), true);
  entity.destroy();
  assert.equal(health.disposed, true, 'onDispose fired on destroy');
  assert.equal(world.entity(entity.id), null, 'handle unregistered');
});

test('World.destroy honors lifecycle for the whole hierarchy', () => {
  const world = new World();
  const parent = world.spawn('parent', [new HealthComponent(10)]);
  const child = world.spawn('child', [new HealthComponent(5)]);
  world.addHierarchy(parent.id, child.id);
  parent.destroy();
  assert.equal(world.entityCount, 0, 'tree destroyed recursively');
});

test('System: signature mode vs global mode', () => {
  const world = new World();
  const a = world.spawn('a', [new HealthComponent(1)]);
  world.spawn('b', []); // no Health → excluded
  let processed = 0;
  let globals = 0;
  class HealthSystem extends System {
    get components() { return [HealthComponent]; }
    process(entity, comps) { processed++; assert.equal(comps[0].entity, entity); }
  }
  class TickSystem extends System {
    globalUpdate() { globals++; }
  }
  const scene = new Scene({ name: 'S' });
  scene.addSystem(new HealthSystem());
  scene.addSystem(new TickSystem());
  scene.enter();
  assert.ok(scene.rootEntity, 'scene creates a root entity');
  // spawn "a"-like entity inside the scene world
  scene.world.spawn('c', [new HealthComponent(2)]);
  scene.update(16);
  assert.equal(processed, 1, 'only entities with the signature are processed');
  assert.equal(globals, 1, 'global systems run once per update');
  assert.ok(a);
});

// ─── Scene / SceneManager lifecycle ────────────────────────────────────────

test('Scene lifecycle: load → enter → update → exit → dispose, events emitted', () => {
  const events = [];
  const bus = { emit: (e, p) => events.push([e, p.name]) };
  class MenuScene extends Scene {
    onLoad() { this.loadedOrder = (this.loadedOrder || []).concat('load'); }
    onEnter() { this.loadedOrder.push('enter'); }
    onExit() { this.loadedOrder.push('exit'); }
    onDispose() { this.loadedOrder.push('dispose'); }
  }
  const menu = new MenuScene({ bus });
  menu.loadedOrder = [];
  menu.enter();
  menu.update(16);
  menu.exit();
  menu.dispose();
  assert.deepEqual(menu.loadedOrder, ['load', 'enter', 'exit', 'dispose'], 'strict lifecycle order');
  assert.deepEqual(events.map((e) => e[0]), ['scene:load', 'scene:enter', 'scene:exit', 'scene:dispose']);
  assert.equal(menu.rootEntity, null, 'root destroyed at dispose');
});

test('Scene.spawn hangs entities under the scene root hierarchy', () => {
  const scene = new Scene({ name: 'S' });
  scene.enter();
  const panel = scene.spawn('panel', []);
  assert.equal(scene.world.getParent(panel.id), scene.rootEntity.id, 'parented to root');
  scene.dispose();
  assert.equal(scene.world.entityCount, 0, 'whole scene tree disposed');
});

test('SceneManager: push/pop/switchTo drive the active scene', () => {
  const manager = new SceneManager();
  const s1 = new Scene({ name: 'world' });
  const s2 = new Scene({ name: 'menu' });
  manager.push(s1);
  assert.equal(manager.current, s1);
  manager.push(s2);
  assert.equal(manager.current, s2);
  assert.equal(s1.active, false, 'covered scene exited');
  manager.pop();
  assert.equal(manager.current, s1);
  assert.equal(s1.active, true, 'exposed scene re-entered');
  manager.switchTo(new Scene({ name: 'battle' }));
  assert.equal(manager.stack.length, 1);
  assert.equal(manager.current.name, 'battle');
  manager.dispose();
  assert.equal(manager.current, null);
});

// ─── Typed UI components ───────────────────────────────────────────────────

test('TransformComponent: math + style mapping', () => {
  const t = new TransformComponent({ x: 10, y: 5, scale: 2, zIndex: 3, width: 96 });
  assert.equal(t.cssTransform, 'translate(10px, 5px) scale(2)');
  const style = t.style();
  assert.equal(style.width, '96px');
  assert.equal(style.zIndex, 3);
});

test('UIInteractiveComponent: unusable ⇒ hidden (strict rule)', () => {
  const btn = new UIInteractiveComponent({ disabled: true });
  assert.equal(btn.interactable, false);
  assert.equal(btn.renderHidden, true, 'disabled with hide policy ⇒ not rendered');
  btn.enable();
  assert.equal(btn.renderHidden, false);
  const sticky = new UIInteractiveComponent({ disabled: true, hideWhenDisabled: false });
  assert.equal(sticky.renderHidden, false, 'opt-out honored for silhouettes');
});

test('UILayoutComponent: grid body style + fixed regions + CSS-driven columns', () => {
  const grid = new UILayoutComponent({ direction: 'grid', cols: 4, gap: 8, fixedRegions: ['top'] });
  const style = grid.bodyStyle();
  assert.equal(style.display, 'grid');
  assert.equal(style['grid-template-columns'], 'repeat(4, minmax(0, 1fr))');
  assert.equal(style['overflow-y'], 'auto', 'body scrolls');
  assert.equal(grid.hasFixedRegions, true, 'fixed toolbar region declared');
  const responsive = new UILayoutComponent({ direction: 'grid', cols: 0 });
  assert.ok(!('grid-template-columns' in responsive.bodyStyle()), 'cols 0 ⇒ CSS-driven columns');
  assert.throws(() => new UILayoutComponent({ direction: 'spiral' }), /Unknown layout/);
});

test('UIStateComponent: setState marks the sibling render dirty', () => {
  const world = new World();
  const render = new UIRenderComponent({ template: () => h('div') });
  const entity = world.spawn('panel', [render, new UIStateComponent({ open: false })]);
  render.dirty = false;
  entity.get(UIStateComponent).setState({ open: true });
  assert.equal(render.dirty, true, 'state change requests re-render');
});

test('UIRenderSystem: hidden-disabled control gets display:none + dirty re-render honored', () => {
  const world = new World();
  const fakeEl = { style: {}, parentNode: null };
  const render = new UIRenderComponent({
    template: () => h('button', null, 'x'),
    renderer: () => ({ style: {}, parentNode: null }),
  });
  render.element = fakeEl;
  const entity = world.spawn('btn', [render, new UIInteractiveComponent({ disabled: true })]);
  const system = new UIRenderSystem();
  system.world = world;
  system._run(16);
  assert.equal(fakeEl.style.display, 'none', 'unusable control hidden by the system');
  render.entity.get(UIInteractiveComponent).enable();
  system._run(16);
  assert.equal(fakeEl.style.display, 'none', 'element swapped only once a parent exists');
});

// ─── vdom single-source serializer ─────────────────────────────────────────

test('vdom: escaping, dataset kebab-case, void tags, raw, listeners skipped', () => {
  const node = h('div', { class: 'a', dataset: { pwEid: '7', contextCall: 'openItemInfo' }, onClick: () => {} },
    'x < y & "z"',
    h('img', { src: 's.png', alt: 'pic' }),
    h.raw('<b>trusted</b>'),
    null, false);
  const html = toHTMLString(node);
  assert.ok(html.includes('class="a"'));
  assert.ok(html.includes('data-pw-eid="7"'));
  assert.ok(html.includes('data-context-call="openItemInfo"'));
  assert.ok(html.includes('x &lt; y &amp; &quot;z&quot;'), 'text escaped');
  assert.ok(html.includes('<img src="s.png" alt="pic">'), 'void tag unclosed');
  assert.ok(html.includes('<b>trusted</b>'), 'raw passthrough');
  assert.ok(!html.includes('onClick'), 'listeners never serialized');
});

// ─── Theme tokens & contrast guard ─────────────────────────────────────────

test('theme: tokens resolve to CSS vars; contrast guard enforces WCAG AA', () => {
  assert.equal(token('btnBg'), 'var(--pw-btn-bg)');
  assert.throws(() => token('nope'), /Unknown theme token/);
  assert.ok(contrastRatio('#ECDEB7', '#306230') >= 4.5, 'gameboy light2 on panel readable');
  assert.ok(contrastRatio('#ffffff', '#C0392B') >= 4.5, 'white on (darkened) danger red readable');
  assert.ok(contrastRatio('#ffffff', '#D3425F') < 4.5, 'guard flags un-darkened danger red (hence the color-mix in the DS)');
  assert.throws(() => assertContrast('#ffffff', '#D3425F', 'legacy danger'), /Contrast/, 'illegible legacy danger rejected');
  assert.throws(() => assertContrast('#94886B', '#36342F', 'muted on dark'), /Contrast/, 'illegible combo rejected');
  // Waves 15+17 (user feedback): canonical sizes bumped 56→64→72 / 96→104.
  assert.equal(spriteSizeFor('team'), 104);
  assert.equal(spriteSizeFor('weird'), 72, 'unknown size clamps to standard');
});

// ─── Rebuilt views (panels over the GameScene): structural contracts (DOM-free) ──────────────────────

function bagModel() {
  return {
    tabs: [{ id: 'held', label: 'Objets tenus', count: 1, active: true }, { id: 'ct_cs', label: 'CT / CS', count: 0, active: false }],
    sorts: [{ id: 'name', label: 'Nom', active: true }, { id: 'qty', label: 'Qté', active: false }],
    sortLabel: 'Tri :', search: { value: '', placeholder: 'Rechercher…' }, resetLabel: 'Réinitialiser',
    items: [{ key: 'babiri_berry', qty: 3, name: 'Baie Babiri', iconHtml: '<span class="icon"></span>', equippedName: null }],
  };
}

test('BagView: fixed toolbar (PC-box identical) + item cells, DOM-free', () => {
  const parts = BagView.toHTML(bagModel());
  assert.ok(parts.filters.includes('box-filter-panel'), 'fixed filters region');
  assert.ok(parts.filters.includes('pw-ui-toolbar'), 'DS toolbar');
  assert.ok(parts.filters.includes('inv-tabs'));
  assert.ok(parts.filters.includes('data-action="filter-bag"'), 'global search');
  assert.ok(parts.filters.includes('data-call="resetInvFilters"'));
  assert.ok(parts.content.includes('inv-item'), 'item cells');
  assert.ok(parts.content.includes('data-context-call="openItemInfo"'), 'right-click info kept');
  assert.ok(!parts.content.includes('box-filter-panel'), 'toolbar NOT inside the scroller');
});

test('BagView: empty and no-result states', () => {
  const empty = BagView.toHTML({ ...bagModel(), items: [], emptyInventory: true, emptyLabel: 'Sac vide' });
  assert.ok(empty.content.includes('pw-empty-state-lg'));
  const nr = BagView.toHTML({ ...bagModel(), items: [], noResultsLabel: 'Aucun résultat' });
  assert.ok(nr.content.includes('pw-empty-state-md'));
});

test('DictionaryView: fixed tabs/search toolbar + themed entry cells', () => {
  const parts = DictionaryView.toHTML({
    tabs: [{ id: 'items', label: 'Objets', active: true }],
    search: { value: '', placeholder: 'Rechercher…' },
    entries: [{ key: 'potion', iconHtml: '<i></i>', title: 'Potion', subtitle: 'Possédé : 2', owned: true, dataset: { action: 'legacy-call', call: 'openItemInfo', callArgs: "'potion'" } }],
  });
  assert.ok(parts.filters.includes('dict-toolbar pw-ui-toolbar'), 'fixed toolbar');
  assert.ok(parts.filters.includes('class="hbtn dict-tab active"'));
  assert.ok(parts.filters.includes('data-action="filter-dictionary"'));
  assert.ok(parts.content.includes('dict-grid'), 'grid in the scroller only');
  assert.ok(parts.content.includes('dict-entry owned'));
  assert.ok(!parts.content.includes('dict-toolbar'), 'toolbar NOT inside the scroller — no header gap');
  const empty = DictionaryView.toHTML({ tabs: [], search: {}, entries: [], emptyLabel: 'Aucun résultat.' });
  assert.ok(empty.content.includes('dict-muted'));
});

test('PokedexView: charm banner exclusive to the fixed bar; sprites clamped; unseen non-actionable', () => {
  const parts = PokedexView.toHTML({
    stats: ['Vus : <b>3</b>'],
    charm: { title: '✨ Charme Chroma', regions: [{ name: 'Kanto', caught: 151, total: 151, pct: 100, done: true }] },
    cells: [
      { id: 25, name: 'Pikachu', seen: true, caught: true, shiny: true, imgSrc: 'pika.png', emoji: '⚡' },
      { id: 26, name: 'Raichu', seen: false, caught: false, shiny: false, imgSrc: 'rai.png', emoji: '⚡' },
    ],
  });
  assert.ok(parts.filters.includes('dex-charm-info'), 'charm in the fixed bar');
  assert.ok(!parts.content.includes('dex-charm'), 'charm NEVER in the grid');
  assert.ok(parts.content.includes('dex-entry caught'), 'caught cell');
  assert.ok(parts.content.includes('dex-entry unknown'), 'unseen cell kept (silhouette)');
  assert.ok(parts.content.includes('data-call="openDexEntry" data-call-args="25"'), 'seen cell actionable');
  assert.ok(!parts.content.includes('data-call-args="26"'), 'unseen cell NOT actionable');
  // Waves 15+17 (user feedback): standard sprite = 72px (was 56px, then 64px).
  const imgCount = (parts.content.match(/width:72px/g) || []).length;
  assert.ok(imgCount >= 2, 'all dex sprites clamped to the standard 72px size');
  assert.ok(!parts.content.includes('64px') && !parts.content.includes('120px'), 'no aberrant sprite size');
});

test('QuestView: canonical shell, footer actions, strict unusable-button hiding', () => {
  const parts = QuestView.toHTML({
    head: { slotsLabel: 'Emplacements', activeCount: 1, max: 1, timerText: 'Relance prête', upgradesLabel: 'Améliorations', upgradesIconHtml: '<i></i>' },
    introText: 'Choisis une quête.',
    offers: [
      { index: 0, iconHtml: '<i></i>', title: 'Défi A', desc: 'Desc', reward: 'Récompense', active: true, canAccept: false, acceptLabel: 'Accepter', activeLabel: 'En cours' },
      { index: 1, iconHtml: '<i></i>', title: 'Défi B', desc: 'Desc', reward: 'Récompense', active: false, canAccept: false, acceptLabel: 'Accepter', activeLabel: 'En cours' },
    ],
    footer: { rerollIconHtml: '<i></i>', rerollLabel: '05:00', rerollCooldown: true, closeLabel: 'Fermer' },
  });
  assert.ok(parts.body.includes('quest-board-head'), 'head panel present');
  assert.ok(parts.body.includes('pw-green-text'), 'active offer flagged');
  assert.ok(!parts.body.includes('data-call="acceptRepeatable"'), 'no accept button rendered when unusable (strict rule)');
  assert.ok(!parts.body.includes('disabled'), 'no dead disabled markup at all');
  assert.ok(parts.footer.includes('is-hidden'), 'reroll hidden while on cooldown');
  assert.ok(parts.footer.includes('data-call="closeQuestModal"'), 'close action pinned in footer');

  const ready = QuestView.toHTML({
    head: { slotsLabel: 'Emplacements', activeCount: 0, max: 2, timerText: 'Prêt', upgradesLabel: 'Améliorations' },
    introText: '', offers: [
      { index: 2, iconHtml: '', title: 'Défi C', desc: '', reward: '', active: false, canAccept: true, acceptLabel: 'Accepter', activeLabel: 'En cours' },
    ],
    footer: { rerollIconHtml: '', rerollLabel: 'Relancer', rerollCooldown: false, closeLabel: 'Fermer' },
  });
  assert.ok(ready.body.includes('data-call-args="2"'), 'accept rendered when usable');
  assert.ok(!ready.footer.includes('is-hidden'), 'reroll visible when ready');
});
