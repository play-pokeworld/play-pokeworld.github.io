/**
 * PokéWorld UI — MachineWindow (parametrized "machine" window)
 *
 * ONE component for the game's "machine" windows — the screens that own a
 * row of STATEFUL SLOT CARDS over the GameScene:
 *   - Training (training-slot-grid of training-slot-card),
 *   - Hatchery (next wave),
 *   - Mine (next wave).
 *
 * Every machine window shares the SAME skeleton (design-system contract):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [header actions…]                                            │
 *   │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
 *   │ │ slot card   │ │ slot card   │ │ slot card   │ …            │
 *   │ └─────────────┘ └─────────────┘ └─────────────┘              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * ALL visual decisions live HERE; the classic adapters only supply DATA.
 * Class names come from the model so each window keeps its own themed
 * anchors (`training-slot-card`, …) while sharing the pw-machine-* hooks.
 *
 * Model:
 * {
 *   entityId?, className?,
 *   header?: { classes?, actions: action[] },        // window-level row
 *   gridClass,                                        // slot grid container
 *   slots: slotModel[],
 *   gridFooterHtml?: string,                          // raw (locked-slot hint)
 * }
 *
 * slotModel:
 * {
 *   cardClass, classes?,                  // card + state flags
 *   headClass?, title?, statusLabel?,
 *   emptyClass?, empty?: { label, action?: action },
 *   pokemonClass?, spriteClass?,          // occupant block. The sprite goes
 *   pokemon?: {                           // through the SINGLE sprite helper
 *     spriteHtml,                         // (canonical disc embedded, DS2807);
 *     contextCall?, contextArgs?,         // the component adds the disc node
 *     name, levelLabel?, metaHtml?,       // itself only for bare sprites.
 *   },
 *   noticesHtml?: string[],               // adapter-built info notices
 *   actionsRowClass?, actions?: action[], // bottom row
 *   modesGridClass?, modeRowClass?, modeTitleClass?,
 *   modes?: [{ classes?, title, descHtml?, clickable, call?, callArgs? }],
 *
 *   // Hatchery flavor (variant blocks — a slot uses ONE of them):
 *   offerClass?, offer?: {                // the whole card IS one big
 *     label, rightHtml?, call, callArgs,  // actionable offer (empty slot)
 *   },
 *   mainClass?, mediaClass?, infoClass?, nameClass?, statusClass?,
 *   progressWrapClass?,
 *   main?: {                              // clickable occupant row
 *     action?: { call, callArgs },        // (media + name + status + bar)
 *     mediaHtml, nameHtml, statusText,
 *     progress?: { pct, barClass },       // data-pct painter contract
 *   },
 * }
 * action = { label, iconHtml?, call, callArgs?, classes? }
 *
 * DESIGN-SYSTEM RULE: a control the player cannot use is NOT RENDERED as a
 * control. Locked/disabled modes degrade to INFORMATIONAL rows (no
 * data-action): they explain the unlock path, they are not fake buttons.
 *
 * Two usage modes:
 *   - machineWindowVNode(model) → virtual node (ECS views),
 *   - machineWindowHTML(model)  → HTML string (classic adapters through
 *                                 window.PokeUI.components.machineWindowHTML).
 *
 * @module ui/components/machine-window
 */
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from './component-utils.js';

/** Shared machine-window button atom (icon + label, legacy dispatch). */
function actionButtonVNode(action) {
  return h('button', {
    type: 'button',
    class: cx('hbtn', action.classes),
    dataset: {
      action: 'legacy-call',
      call: action.call,
      callArgs: action.callArgs != null ? String(action.callArgs) : '',
    },
  }, action.iconHtml ? h.raw(action.iconHtml + ' ') : null, action.label);
}

/** One slot card of the machine window. */
function machineSlotVNode(slot) {
  // Variant 1 (hatchery empty slot): the whole card is ONE big offer button.
  // Optional modeToggle sits beside it so the player can switch daycare /
  // incubation without opening the management menu.
  if (slot.offer) {
    const offerBtn = h('button', {
      type: 'button',
      class: cx('hbtn', slot.offerClass, 'pw-machine-offer'),
      dataset: { action: 'legacy-call', call: slot.offer.call, callArgs: slot.offer.callArgs != null ? String(slot.offer.callArgs) : '' },
    },
      h('span', null, slot.offer.label),
      slot.offer.rightHtml ? h.raw(slot.offer.rightHtml) : null);
    if (slot.modeToggle) {
      return h('div', { class: cx('pw-machine-card', 'pw-hatchery-empty-slot', slot.cardClass, slot.classes) },
        h('div', { class: 'pw-hatchery-empty-tools' }, actionButtonVNode(slot.modeToggle)),
        offerBtn);
    }
    if (slot.modeLock) {
      return h('div', { class: cx('pw-machine-card', 'pw-hatchery-empty-slot', slot.cardClass, slot.classes) },
        h('div', { class: 'pw-hatchery-empty-tools' },
          h('div', { class: 'pw-hatchery-mode-lock' }, slot.modeLock)),
        offerBtn);
    }
    return offerBtn;
  }
  const isEmpty = !!slot.empty;
  return h('div', { class: cx('pw-machine-card', slot.cardClass, slot.classes) },
    slot.title != null || slot.statusLabel != null
      ? h('div', { class: cx(slot.headClass, 'pw-machine-card-head') },
          slot.title != null ? h('b', null, slot.title) : null,
          slot.statusLabel != null ? h('span', null, slot.statusLabel) : null)
      : null,
    isEmpty
      ? h('div', { class: cx(slot.emptyClass, 'pw-machine-card-empty') }, slot.empty.label)
      : null,
    isEmpty && slot.empty.action ? actionButtonVNode(slot.empty.action) : null,
    !isEmpty && slot.main
      ? h('div', {
          class: cx(slot.mainClass, 'pw-machine-card-main'),
          dataset: slot.main.action
            ? { action: 'legacy-call', call: slot.main.action.call, callArgs: slot.main.action.callArgs != null ? String(slot.main.action.callArgs) : '' }
            : undefined,
        },
          h('div', { class: cx(slot.mediaClass, 'pw-machine-card-media') }, h.raw(slot.main.mediaHtml || '')),
          h('div', { class: cx(slot.infoClass, 'pw-machine-card-info') },
            slot.main.nameHtml != null ? h('div', { class: cx(slot.nameClass, 'pw-machine-card-name') }, h.raw(slot.main.nameHtml)) : null,
            slot.main.statusText != null ? h('div', { class: cx(slot.statusClass, 'pw-machine-card-status') }, slot.main.statusText) : null,
            slot.main.progress
              ? h('div', { class: cx(slot.progressWrapClass, 'pw-machine-card-progress') },
                  // Wave 13: inline width (self-contained bar), data-pct contract kept.
                  h('div', {
                    class: slot.main.progress.barClass,
                    dataset: { pct: String(Math.max(0, Math.min(100, Math.round(Number(slot.main.progress.pct) || 0)))) },
                    style: { width: `${Math.max(0, Math.min(100, Math.round(Number(slot.main.progress.pct) || 0)))}%` },
                  }))
              : null))
      : null,
    !isEmpty && slot.pokemon
      ? h('div', { class: cx(slot.pokemonClass, 'pw-machine-card-pokemon') },
          h('div', {
            // Wave 26 (user, training disc): the adapter's spriteHtml already
            // embeds the canonical disc — do NOT nest a second
            // .pw-poke-circle-wrap around it. The card readability hammer
            // (…-card span { opacity: 0.82 }) turns the nested span into its
            // OWN stacking context: an outer disc (z-index 1) would then be
            // painted OVER the whole span (z-auto) and swallow the sprite —
            // the exact "disc OK, Pokémon gone" measured in the slot. A plain
            // hook div instead; DS2826 stretches the single helper disc.
            class: cx(slot.spriteClass, slot.pokemon.spriteHtml && slot.pokemon.spriteHtml.includes('pw-poke-circle-bg')
              ? 'pw-machine-card-sprite'
              : 'pw-machine-card-sprite pw-poke-circle-wrap'),
            dataset: slot.pokemon.contextCall
              ? { contextCall: slot.pokemon.contextCall, contextArgs: slot.pokemon.contextArgs != null ? String(slot.pokemon.contextArgs) : '' }
              : undefined,
          },
            // DS2807: bare sprites (no embedded disc) still get the canonical
            // disc node owned by this wrap — exactly ONE circle either way.
            slot.pokemon.spriteHtml && slot.pokemon.spriteHtml.includes('pw-poke-circle-bg')
              ? null
              : h('div', { class: 'pw-poke-circle-bg' }),
            h.raw(slot.pokemon.spriteHtml || '')),
          h('div', null,
            h('b', null, slot.pokemon.name),
            slot.pokemon.levelLabel ? h.raw(' <span>' + slot.pokemon.levelLabel + '</span>') : null,
            slot.pokemon.metaHtml ? h('br') : null,
            slot.pokemon.metaHtml ? h.raw(slot.pokemon.metaHtml) : null))
      : null,
    ...(slot.noticesHtml || []).map((raw) => h.raw(raw)),
    slot.actions && slot.actions.length
      ? h('div', { class: cx(slot.actionsRowClass, 'pw-machine-card-actions') },
          ...slot.actions.map((a) => actionButtonVNode(a)))
      : null,
    slot.modes && slot.modes.length
      ? h('div', { class: cx(slot.modesGridClass, 'pw-machine-modes') },
          ...slot.modes.map((mode) => h('div', {
            class: cx('pokechill-row', slot.modeRowClass, mode.classes, mode.clickable ? null : 'is-disabled'),
            dataset: mode.clickable
              ? { action: 'legacy-call', call: mode.call, callArgs: mode.callArgs != null ? String(mode.callArgs) : '' }
              : undefined,
          },
            h('div', { class: cx(slot.modeTitleClass, 'pw-machine-mode-title') }, mode.title),
            mode.descHtml != null ? h('div', { class: 'pw-text-sm pw-light1' }, h.raw(mode.descHtml)) : null)))
      : null);
}

/**
 * @param {Object} model
 * @returns {*} virtual node of the parametrized machine window
 */
export function machineWindowVNode(model = {}) {
  const slots = Array.isArray(model.slots) ? model.slots.filter(Boolean) : [];
  const headerActions = (model.header && Array.isArray(model.header.actions)) ? model.header.actions.filter(Boolean) : [];
  const dataset = {};
  if (model.entityId != null) dataset.pwEid = String(model.entityId);

  return h('div', { class: cx('pw-machine-window', model.className), dataset },
    headerActions.length
      ? h('div', { class: cx(model.header.classes, 'pw-machine-header') },
          ...headerActions.map((a) => actionButtonVNode(a)))
      : null,
    h('div', { class: cx(model.gridClass, 'pw-machine-grid') },
      ...slots.map((slot) => machineSlotVNode(slot)),
      model.gridFooterHtml ? h.raw(model.gridFooterHtml) : null));
}

/**
 * HTML string of the parametrized machine window (classic adapters).
 * @param {Object} model
 * @returns {string}
 */
export function machineWindowHTML(model = {}) {
  return toHTMLString(machineWindowVNode(model));
}

