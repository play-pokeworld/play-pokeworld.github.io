/**
 * PokéWorld UI Views — UnifiedTeamEditorModal (ECS view)
 *
 * Wave 42: convergence of the templates layer. This file IS
 * the former `src/ui/templates/UnifiedTeamEditorModal.js` converted into a
 * REAL ECS view, public API strictly unchanged:
 *
 *   new UnifiedTeamEditorModal(options).open()  → DS Window instance
 *   UnifiedTeamEditorModal.open(options)        → idem (raccourci statique)
 *   .close()
 *
 * options = { title, teamData, availablePokemon, onSave, onClose }
 *
 * ECS composition: 6 slot entities (the teamData[i] model drives each
 * slot's template — canonical card + Remove button, or empty state + Add
 * button), 3 footer-button entities (Save/Clear/Cancel) under one footer
 * entity, click routing via UIView's multi-host [data-pw-eid] delegation
 * (Wave 42: DS Window content + footer regions).
 * The selector opened by “Add” is the UnifiedPokemonSelectorModal view
 * (imported module — no more window resolution).
 *
 * Measured fidelity: identical markup classes (pw-ui-panel slot-card,
 * is-empty, slot-empty-text, pw-actions, pw-ui-btn…), grille 3 colonnes aux
 * identical inline styles, identical onSave/onClose chain, DS Window
 * shell unchanged (id unified-team-editor-modal-ecs).
 *
 * @module ui/views/UnifiedTeamEditorView
 */
import { UIView } from './UIView.js';
import { Window } from '../Window.js';
import { PokemonCardTemplate } from '../components/pokemon-card-element.js';
import { UnifiedPokemonSelectorModal } from './UnifiedPokemonSelectorView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { UIInteractiveComponent } from '../../engine/components/UIInteractiveComponent.js';
import { entityDataset } from '../components/component-utils.js';
import { h, toHTMLString, renderInto } from '../../engine/render/vdom.js';

const SLOT_COUNT = 6;

export class UnifiedTeamEditorModal extends UIView {
  /**
   * @param {Object} options - { title, teamData, availablePokemon, onSave, onClose }
   */
  constructor(options = {}) {
    super({ name: 'UnifiedTeamEditorModal' });
    this.title = options.title || "Éditeur d'équipe";
    this.teamData = Array.isArray(options.teamData) ? [...options.teamData] : [];
    this.availablePokemon = Array.isArray(options.availablePokemon) ? options.availablePokemon : [];
    this.onSaveCallback = typeof options.onSave === 'function' ? options.onSave : null;
    this.onCloseCallback = typeof options.onClose === 'function' ? options.onClose : null;
    this.windowInstance = null;
    this.gridContainer = null;
  }

  // ─── Entity tree ────────────────────────────────────────────────────────

  onLoad() {
    // Slot entities: their template derives from this.teamData[i] (state →
    // render), so a re-render of the grid region is enough on any mutation.
    this.slotEntities = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.slotEntities.push(this._buildSlotEntity(i));
    }

    // Footer entities: save / clear / cancel (DS button markup preserved).
    this.footerEntities = [
      this._buildFooterButton('Sauvegarder', 'primary', () => {
        if (this.onSaveCallback) this.onSaveCallback(this.teamData);
        this.close();
      }),
      this._buildFooterButton('Vider', 'danger', () => {
        this.teamData = [];
        this._refreshSlots();
      }),
      this._buildFooterButton('Annuler', 'secondary', () => this.close()),
    ];
  }

  _buildFooterButton(label, variant, onClick) {
    const entity = this.spawn(`ui:team-editor-${label.toLowerCase()}`, []);
    entity.addComponent(new UIInteractiveComponent({ onClick }));
    entity.addComponent(new UIRenderComponent({
      template: (e) => h('button', {
        class: `pw-ui-btn pw-ui-btn--${variant}`,
        dataset: entityDataset(e),
      }, h('span', { class: 'pw-ui-btn-text' }, label)),
    }));
    return entity;
  }

  _buildSlotEntity(index) {
    const slot = this.spawn(`ui:team-editor-slot-${index + 1}`, []);
    slot.addComponent(new UIRenderComponent({
      template: () => {
        const poke = this.teamData[index];
        if (poke) {
          return h('div', { class: 'pw-ui-panel slot-card' },
            // Trusted internal markup: canonical card generator / DS fallback.
            h('span', { style: { display: 'contents' } },
              h.raw(new PokemonCardTemplate(poke, { size: 64, showHP: true }).html())),
            this._slotButtonVNode(slot, 'Retirer', 'danger', () => {
              this.teamData.splice(index, 1);
              this._refreshSlots();
            }));
        }
        return h('div', { class: 'pw-ui-panel slot-card is-empty' },
          h('div', { class: 'slot-empty-text' }, `Emplacement ${index + 1} vide`),
          this._slotButtonVNode(slot, '+ Ajouter', 'secondary', () => {
            UnifiedPokemonSelectorModal.open({
              mode: 'team_select',
              title: `Ajouter au slot ${index + 1}`,
              pokemonList: this.availablePokemon,
              onSelect: (selectedPoke) => {
                this.teamData[index] = selectedPoke;
                this._refreshSlots();
              },
            });
          }));
      },
    }));
    return slot;
  }

  /**
   * Slot action button: a child entity per (slot, kind) so the delegated
   * routing stays ECS-truthful ([data-pw-eid] → UIInteractiveComponent).
   * Child entities are memoized on the slot entity (one remove + one add).
   */
  _slotButtonVNode(slotEntity, label, variant, onClick) {
    slotEntity._pwButtons = slotEntity._pwButtons || {};
    const key = `${label}`;
    if (!slotEntity._pwButtons[key]) {
      const btn = this.spawn(`ui:team-editor-slot-btn-${label}`, [], slotEntity);
      btn.addComponent(new UIInteractiveComponent({ onClick }));
      btn.addComponent(new UIRenderComponent({
        template: (e) => h('button', {
          class: `pw-ui-btn pw-ui-btn--${variant}`,
          dataset: entityDataset(e),
        }, h('span', { class: 'pw-ui-btn-text' }, label)),
      }));
      slotEntity._pwButtons[key] = btn;
    }
    return slotEntity._pwButtons[key].get(UIRenderComponent).renderTemplate();
  }

  /** @returns {*} vnode of the slot cells fragment. */
  _slotsFragmentVNode() {
    return h('span', { class: 'pw-team-editor-cells', style: { display: 'contents' } },
      ...this.slotEntities.map((e) => e.get(UIRenderComponent).renderTemplate()));
  }

  /** Live re-render of the 6 slots (footer/search never touched). */
  _refreshSlots() {
    if (!this.gridContainer) return;
    renderInto(this._slotsFragmentVNode(), this.gridContainer);
  }

  /** Monolithic virtual tree (doctrine: ONE tree — adapters/tests string mode). */
  buildView() {
    return h('div', { dataset: { view: this.name } },
      h('div', {
        class: 'pw-ui-layout pw-ui-layout--grid',
        style: { display: 'grid', 'grid-template-columns': 'repeat(3, minmax(200px, 1fr))', gap: '12px' },
      }, this._slotsFragmentVNode()),
      h('div', { class: 'pw-actions' },
        ...this.footerEntities.map((e) => e.get(UIRenderComponent).renderTemplate())));
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

    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'pw-ui-layout pw-ui-layout--grid';
    this.gridContainer.style.display = 'grid';
    this.gridContainer.style.gridTemplateColumns = 'repeat(3, minmax(200px, 1fr))';
    this.gridContainer.style.gap = '12px';

    const footerLayout = document.createElement('div');
    footerLayout.className = 'pw-actions';

    // ECS materialization + delegated routing on both Window regions.
    this._bindDelegation(this.gridContainer);
    this._bindDelegation(footerLayout);
    renderInto(this._slotsFragmentVNode(), this.gridContainer);
    renderInto(
      h('span', { style: { display: 'contents' } },
        ...this.footerEntities.map((e) => e.get(UIRenderComponent).renderTemplate())),
      footerLayout
    );
    this.hostElement = this.gridContainer;

    this.windowInstance = new Window({
      id: 'unified-team-editor-modal-ecs',
      title: this.title,
      content: this.gridContainer,
      footer: footerLayout,
      closable: true,
      overlay: true,
      onClose: () => {
        if (this.onCloseCallback) this.onCloseCallback();
        this.dispose(); // the entity tree dies with the window
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
    const modal = new UnifiedTeamEditorModal(options);
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
    const view = new UnifiedTeamEditorModal(options);
    view.enter();
    const out = toHTMLString(view.buildView());
    view.dispose();
    return out;
  }
}
