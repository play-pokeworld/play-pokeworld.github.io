/**
 * PokéWorld UI Views — UnifiedPokemonSelectorModal (ECS view)
 *
 * Wave 42: convergence of the templates layer. This file IS
 * the former `src/ui/templates/UnifiedPokemonSelectorModal.js` converted into a
 * REAL ECS view (entity tree → virtual tree → live materialization),
 * public API strictly unchanged:
 *
 *   new UnifiedPokemonSelectorModal(options).open()  → DS Window instance
 *   UnifiedPokemonSelectorModal.open(options)        → idem (raccourci statique)
 *   .close()
 *
 * options = { mode, title, pokemonList, filterFn, onSelect, onClose }
 *
 * ECS composition (view doctrine):
 * - toolbar entity (UIRender): sort bar + search field,
 * - sort-button entities (UIRender + UIInteractive, delegated routing
 * via UIView's [data-pw-eid] — no more per-button DS listeners),
 * - search-field entity (UIRender; native vdom onInput) —
 * mounted ONCE on open: grid refresh never touches it
 * (focus and typing preserved, behavior inherited from WriteBox),
 * - grid entity + card entities per Pokémon (re-spawned on each
 * refresh: state is the entity, rendering follows state),
 * - unchanged shell: the DS Window (id, title, overlay, onClose), whose
 * content/footer slots are materialized by regions (same rendering
 * template as the other views' toHTML() {filters, content}).
 *
 * Measured fidelity: markup classes copied verbatim from the classes
 * emitted by the historical DS Button/WriteBox (pw-ui-btn, pw-ui-writebox…),
 * grille aux styles inline identiques, ordre tri/filtre identique,
 * 'input:select' eventBus emission kept. Owned micro-fix:
 * sort buttons now reflect state (a single .active at a time —
 * the old code accumulated .active on clicked buttons without ever
 * removing it). The display:contents wrappers (tagged .pw-usm-*) are
 * layout-transparent (.usm-sort-btn stays selected by class).
 *
 * @module ui/views/UnifiedPokemonSelectorView
 */
import { UIView } from './UIView.js';
import { Window } from '../Window.js';
import { PokemonCardTemplate } from '../components/pokemon-card-element.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { renderChildren, entityDataset } from '../components/component-utils.js';
import { h, toHTMLString, renderInto } from '../../engine/render/vdom.js';
import { eventBus } from '../../core/event-bus.js';

const SORT_CRITERIA = [
  { id: 'name', label: 'Nom' },
  { id: 'level', label: 'Niveau' },
  { id: 'type', label: 'Type' },
  { id: 'id', label: 'Numéro' },
];

export class UnifiedPokemonSelectorModal extends UIView {
  /**
   * @param {Object} options - { mode, title, pokemonList, filterFn, onSelect, onClose }
   */
  constructor(options = {}) {
    super({ name: 'UnifiedPokemonSelectorModal' });
    this.mode = options.mode || 'pc_box';
    this.title = options.title || 'Boîte PC';
    this.pokemonList = Array.isArray(options.pokemonList) ? options.pokemonList : [];
    this.filterFn = typeof options.filterFn === 'function' ? options.filterFn : () => true;
    this.onSelect = typeof options.onSelect === 'function' ? options.onSelect : null;
    this.onCloseCallback = typeof options.onClose === 'function' ? options.onClose : null;
    this.sortBy = 'name';
    this.searchQuery = '';
    this.windowInstance = null;
    this.gridContainer = null;
    this._sortBtnsHost = null;
  }

  // ─── Entity tree (built once per open) ──────────────────────────────────

  onLoad() {
    // Sort buttons: one entity per criterion (state-driven active class).
    this.sortButtonEntities = SORT_CRITERIA.map((crit) => {
      const entity = this.spawn(`ui:selector-sort-${crit.id}`, []);
      entity.addComponent(new UIInteractiveComponent({
        onClick: () => {
          this.sortBy = crit.id;
          this._renderSortButtons(); // état → rendu (classe active unique)
          this._refreshGrid();
        },
      }));
      entity.addComponent(new UIRenderComponent({
        // Markup copied verbatim from the historical DS Button
        // (pw-ui-btn pw-ui-btn--secondary [is-active active] usm-sort-btn,
        //  label en span.pw-ui-btn-text).
        template: (e) => h('button', {
          class: this.sortBy === crit.id
            ? 'pw-ui-btn pw-ui-btn--secondary is-active active usm-sort-btn'
            : 'pw-ui-btn pw-ui-btn--secondary usm-sort-btn',
          dataset: entityDataset(e),
        }, h('span', { class: 'pw-ui-btn-text' }, crit.label)),
      }));
      return entity;
    });

    // Toolbar region: sort bar + search field (DS WriteBox markup).
    this.toolbarEntity = this.spawn('ui:selector-toolbar', []);
    this.toolbarEntity.addComponent(new UIRenderComponent({
      template: () => h('div', { class: 'box-filter-panel ui-control-toolbar' },
        h('div', { class: 'usm-sort-bar' },
          h('span', { class: 'sort-label' }, 'Trier par :'),
          h('span', { class: 'pw-usm-sort-btns', style: { display: 'contents' } },
            ...this.sortButtonEntities.map((e) => e.get(UIRenderComponent).renderTemplate()))),
        h('div', { class: 'pw-ui-writebox' },
          h('input', {
            type: 'text',
            class: 'pw-ui-writebox-input',
            placeholder: 'Rechercher...',
            onInput: (e) => {
              this.searchQuery = String((e && e.target && e.target.value) || '').toLowerCase();
              this._refreshGrid();
            },
          }))),
    }));

    // Grid region: card entities are its children (re-spawned by _syncCards).
    this.gridEntity = this.spawn('ui:selector-grid', []);
    this.gridEntity.addComponent(new UIRenderComponent({
      template: (e) => h('div', {
        class: 'pw-ui-layout pw-ui-layout--grid',
        style: { display: 'grid', 'grid-template-columns': 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' },
      }, h('span', { class: 'pw-usm-grid-cells', style: { display: 'contents' } }, ...renderChildren(e))),
    }));

    // Footer region: the single close button entity.
    this.closeButtonEntity = this.spawn('ui:selector-close', []);
    this.closeButtonEntity.addComponent(new UIInteractiveComponent({
      onClick: () => this.close(),
    }));
    this.closeButtonEntity.addComponent(new UIRenderComponent({
      template: (e) => h('button', {
        class: 'pw-ui-btn pw-ui-btn--secondary',
        dataset: entityDataset(e),
      }, h('span', { class: 'pw-ui-btn-text' }, 'Fermer')),
    }));
  }

  /** @returns {*} vnode of the grid cells fragment (raw canonical cards). */
  _cellsFragmentVNode() {
    return h('span', { class: 'pw-usm-grid-cells', style: { display: 'contents' } },
      ...renderChildren(this.gridEntity));
  }

  /** Re-spawn one card entity per currently visible Pokémon (state → entities). */
  _syncCards() {
    for (const child of [...this.gridEntity.children]) {
      this.world.destroyRecursive(child.id);
    }

    let filtered = this.pokemonList.filter(this.filterFn);
    if (this.searchQuery) {
      filtered = filtered.filter((p) => {
        const n = String(p.name || '').toLowerCase();
        const id = String(p.id || '').toLowerCase();
        return n.includes(this.searchQuery) || id.includes(this.searchQuery);
      });
    }

    filtered.sort((a, b) => {
      if (this.sortBy === 'level') return (b.level || 1) - (a.level || 1);
      if (this.sortBy === 'id') return (a.id || 1) - (b.id || 1);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    for (const poke of filtered) {
      const cell = this.spawn('ui:selector-card', [], this.gridEntity);
      cell.addComponent(new UIInteractiveComponent({
        onClick: () => {
          eventBus.emit('input:select', { mode: this.mode, pokemon: poke });
          if (this.onSelect) this.onSelect(poke);
        },
      }));
      cell.addComponent(new UIRenderComponent({
        // Trusted internal markup: canonical card generator / DS fallback.
        template: (e) => h('div', { style: { display: 'contents' }, dataset: entityDataset(e) },
          h.raw(new PokemonCardTemplate(poke, {
            size: 64,
            showHP: this.mode === 'team_select' || this.mode === 'item_target',
          }).html())),
      }));
    }
  }

  /** Live re-render of the sort buttons span (active class follows state). */
  _renderSortButtons() {
    if (!this._sortBtnsHost) return;
    renderInto(
      h('span', { style: { display: 'contents' } },
        ...this.sortButtonEntities.map((e) => e.get(UIRenderComponent).renderTemplate())),
      this._sortBtnsHost
    );
  }

  /** Live re-render of the grid only (search field/focus never touched). */
  _refreshGrid() {
    this._syncCards();
    if (!this.gridContainer) return;
    renderInto(this._cellsFragmentVNode(), this.gridContainer);
  }

  /** Monolithic virtual tree (doctrine: ONE tree — adapters/tests string mode). */
  buildView() {
    return h('div', { dataset: { view: this.name } },
      this.toolbarEntity.get(UIRenderComponent).renderTemplate(),
      this.gridEntity.get(UIRenderComponent).renderTemplate(),
      h('div', { class: 'pw-actions' },
        this.closeButtonEntity.get(UIRenderComponent).renderTemplate()));
  }

  /**
   * Open the modal: materialize the entity regions into the DS Window slots.
   * Wave 42 — named _openLive: on a UIView, 'open' is the lifecycle
   * state boolean (enter/exit); the historical public entry point is
   * the static open(options), strictly unchanged (no historical
   * instance .open() caller — the static returns the DS Window).
   * @returns {Window} the DS window instance (historical return contract).
   */
  _openLive() {
    this.enter();
    this._syncCards();

    // Content regions (same static shell as the historical template).
    const contentDiv = document.createElement('div');
    const toolbarWrap = document.createElement('div');
    contentDiv.appendChild(toolbarWrap);

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'pw-ui-layout pw-ui-layout--grid';
    this.gridContainer.style.display = 'grid';
    this.gridContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    this.gridContainer.style.gap = '12px';
    contentDiv.appendChild(this.gridContainer);

    const footerLayout = document.createElement('div');
    footerLayout.className = 'pw-actions';

    // ECS materialization + ONE delegated click routing on the whole content.
    this._bindDelegation(contentDiv);
    this._bindDelegation(footerLayout);
    renderInto(this.toolbarEntity.get(UIRenderComponent).renderTemplate(), toolbarWrap);
    this._sortBtnsHost = toolbarWrap.querySelector('.pw-usm-sort-btns');
    renderInto(this._cellsFragmentVNode(), this.gridContainer);
    renderInto(this.closeButtonEntity.get(UIRenderComponent).renderTemplate(), footerLayout);
    this.hostElement = contentDiv;

    this.windowInstance = new Window({
      id: 'unified-selector-modal-ecs',
      title: this.title,
      content: contentDiv,
      footer: footerLayout,
      closable: true,
      overlay: true,
      onClose: () => {
        if (this.onCloseCallback) this.onCloseCallback();
        this.dispose(); // l'arbre d'entités meurt avec la fenêtre (quel que soit le chemin de fermeture)
      },
    });

    this.windowInstance.open();
    return this.windowInstance;
  }

  close() {
    if (this.windowInstance) {
      const win = this.windowInstance;
      this.windowInstance = null;
      win.close(); // déclenche onClose → dispose()
    }
    this.dispose(); // idempotent : couvre aussi le chemin sans fenêtre
  }

  static open(options) {
    const modal = new UnifiedPokemonSelectorModal(options);
    return modal._openLive();
  }

  /**
   * DOM-free serialization (adapters/tests) — same doctrine as other views.
   * Requires the canonical card generator or a DOM (card .html() fallback),
   * exactly like the historical template.
   * @param {Object} [options]
   * @returns {string}
   */
  static toHTML(options = {}) {
    const view = new UnifiedPokemonSelectorModal(options);
    view.enter();
    view._syncCards();
    const out = toHTMLString(view.buildView());
    view.dispose();
    return out;
  }
}

