/**
 * PokéWorld UI — secret explorations & special forms (rebuilt from zero on
 * the ECS DS): PuzzleListView (the "Explorations secrètes" fullscreen
 * panel), PuzzleExplorationView (one puzzle sheet in #poke-modal) and
 * SpecialFormsView (Morphéo/Deoxys forms panel).
 *
 * Before, puzzle-explorations.js and renderSpecialFormsPanel grew raw HTML
 * strings: inline styles on every status line, a GREYED-OUT DEAD lock
 * button (DS violation — informative line instead, same rule as the quest
 * cards), and theme-blind rgba surfaces (tokenized in DS2821).
 *
 * Kept contracts (router + sequence wiring):
 *  - list: data-call="openPuzzleExploration" data-call-args="'pid'"
 *    (quoted), data-call="closeFullscreenPanel",
 *  - modal: ONE cross `.modal-close[data-call="closePuzzleExploration"]`,
 *    cancel `.pw-btn-cancel`, confirm data-call="submitPuzzleAnswer"
 *    data-call-args="'pid'" (quoted),
 *  - sequence: `#puzzle-seq-progress`, `#puzzle-answer-input` (hidden),
 *    `.puzzle-seq-btn[data-seq-key]`,
 *  - forms: `data-call="buySpecialFormPokemon" data-call-args="id,price"`
 *    (UNQUOTED numbers), `.pw-owned` badge state, `.pw-empty-state-lg`
 *    locked state, canonical 72px sprites.
 *
 * The vdom serializer escapes text — adapters pass RAW (unescaped,
 * already localized) strings.
 *
 * @module ui/views/PuzzleViews
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { panelHeaderVNode } from '../components/panel-header.js';

/* ─── Secret explorations list (fullscreen panel content) ─────────────── */

export class PuzzleListView extends UIView {
  constructor(model) {
    super({ name: 'PuzzleListView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const nodes = [h('div', { class: 'pw-puzzle-list-hint' }, m.hint || '')];
    for (const c of m.cards || []) {
      nodes.push(h('div', { class: 'pw-puzzle-card' },
        h('div', { class: 'pw-puzzle-card-row' },
          h('div', null,
            h('div', { class: 'pw-puzzle-card-title' },
              (c.icon || '✦') + ' ', c.name || '',
              c.done ? h('span', { class: 'pw-green' }, ' ✓') : null),
            h('div', { class: 'pw-puzzle-card-sum' }, c.summary || ''),
            h('div', { class: `pw-text-sm pw-puzzle-status is-${c.statusKind || 'open'}` }, c.statusText || '')),
          c.action
            ? h('button', {
                class: 'hbtn',
                dataset: { action: 'legacy-call', call: 'openPuzzleExploration', callArgs: c.action.callArgs },
              }, c.action.label || '')
            : h('div', { class: 'pw-puzzle-lock-line' }, c.lockText || ''))));
    }
    nodes.push(h('div', { class: 'pw-btn-center' },
      h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'closeFullscreenPanel', callArgs: '' } },
        m.closeLabel || '')));
    return nodes;
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:puzzle-list', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (puzzle-explorations.js). */
  static toHTML(model) {
    const view = new PuzzleListView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

/* ─── One puzzle sheet (#poke-modal-inner) ────────────────────────────── */

export class PuzzleExplorationView extends UIView {
  constructor(model) {
    super({ name: 'PuzzleExplorationView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const body = [];

    if (m.beenBeforeText) {
      body.push(h('div', { class: 'pw-text-sm pw-green pw-puzzle-been-before' }, m.beenBeforeText));
    }
    body.push(h('div', { class: 'pw-puzzle-summary' }, m.summary || ''));
    if (m.clue) {
      body.push(h('div', { class: 'pw-puzzle-inscribe' },
        h('div', { class: 'pw-puzzle-inscribe-label' }, m.clueLabel || ''),
        m.clue));
    }

    if (m.kind === 'sequence') {
      body.push(h('div', { id: 'puzzle-seq-progress', class: 'pw-puzzle-progress' }));
      body.push(h('div', { class: 'pw-puzzle-seq-btns' },
        ...(m.seqOptions || []).map((o) =>
          h('button', { type: 'button', class: 'hbtn puzzle-seq-btn', dataset: { seqKey: o.key } }, o.label || ''))));
      body.push(h('input', { id: 'puzzle-answer-input', type: 'hidden', value: '' }));
    } else if (m.kind === 'wait') {
      body.push(h('div', { class: 'pw-text-sm pw-light1 pw-puzzle-side-note' }, m.waitHint || ''));
      body.push(h('label', { class: 'pw-text-sm', for: 'puzzle-answer-input' }, m.inputLabel || ''));
      body.push(h('input', {
        id: 'puzzle-answer-input', class: 'pw-puzzle-input', type: 'text',
        maxlength: '48', autocomplete: 'off', spellcheck: 'false', placeholder: '…',
      }));
    } else if (m.kind === 'party') {
      body.push(h('div', { class: 'pw-text-sm pw-light1 pw-puzzle-side-note' }, m.partyHint || ''));
      body.push(h('input', { id: 'puzzle-answer-input', type: 'hidden', value: 'PARTY' }));
    } else {
      if (m.brailleText) body.push(h('div', { class: 'pw-puzzle-braille' }, m.brailleText));
      body.push(h('label', { class: 'pw-text-sm', for: 'puzzle-answer-input' }, m.inputLabel || ''));
      body.push(h('input', {
        id: 'puzzle-answer-input', class: 'pw-puzzle-input', type: 'text',
        maxlength: '48', autocomplete: 'off', spellcheck: 'false', placeholder: '…',
      }));
    }

    return [h('div', { class: 'pw-puzzle-shell' },
      panelHeaderVNode({
        icon: m.icon || '✦',
        title: m.title || '',
        close: { call: 'closePuzzleExploration', glyph: '✕' },
      }),
      h('div', { class: 'pw-puzzle-body' }, body),
      h('div', { class: 'pw-puzzle-actions' },
        h('button', { class: 'hbtn pw-btn-cancel', dataset: { action: 'legacy-call', call: 'closePuzzleExploration', callArgs: '' } },
          m.cancelLabel || ''),
        h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'submitPuzzleAnswer', callArgs: m.confirmCallArgs || '' } },
          m.confirmLabel || '')))];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:puzzle-exploration', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (puzzle-explorations.js). */
  static toHTML(model) {
    const view = new PuzzleExplorationView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

/* ─── Special forms panel (Morphéo/Deoxys — fullscreen panel content) ─── */

export class SpecialFormsView extends UIView {
  constructor(model) {
    super({ name: 'SpecialFormsView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const nodes = [h('div', { class: 'pw-manage-title' }, m.title || '')];
    if (m.emptyLabel) {
      nodes.push(h('div', { class: 'pw-empty-state-lg' }, m.emptyLabel));
      return nodes;
    }
    for (const r of m.rows || []) {
      nodes.push(h('div', {
        class: `shop-item pw-manage-card pw-ui-panel${r.owned ? ' pw-owned' : ''}`,
        dataset: r.owned ? {} : { action: 'legacy-call', call: 'buySpecialFormPokemon', callArgs: r.callArgs },
      },
        h('div', { class: 'pw-manage-sprite' }, h.raw(r.spriteHtml || '')),
        h('div', { class: 'pw-flex-1' },
          h('div', { class: 'pw-manage-name' }, r.nameLabel || ''),
          r.owned
            ? h('div', { class: 'pw-text-sm pw-green' }, r.ownedText || '')
            : h('div', { class: 'pw-manage-desc pw-text-sm' }, h.raw(r.descText || ''))),
        h('div', { class: 'pw-manage-level' }, r.sideText || '')));
    }
    return nodes;
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:special-forms', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (location-info.js). */
  static toHTML(model) {
    const view = new SpecialFormsView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

