/**
 * PokéWorld UI — QuestView (repeatable quests board, rebuilt from zero)
 *
 * The board finally lives INSIDE the canonical window shell (quest-body /
 * quest-footer) as a coherent design-system scene:
 *   - a head panel (slots counter + upgrades shortcut),
 *   - offer cards (accept action per card),
 *   - the action row pinned in the window footer.
 *
 * STRICT button rule applied:
 *   - the "accept" action is NOT rendered when it cannot be used
 *     (slots full) — previously displayed as a dead disabled button,
 *   - the reroll action is hidden (display:none) while on cooldown; the
 *     live countdown stays visible in the head panel and the per-second
 *     timer flips the button back visible when ready.
 *
 * Model (shaped by the classic adapter):
 * {
 *   head: { slotsLabel, activeCount, max, timerText, upgradesLabel, upgradesIconHtml },
 *   introText,
 *   offers: [{ index, iconHtml, title, desc, reward, active, canAccept,
 *              acceptLabel, activeLabel }],
 *   footer: { rerollIconHtml, rerollLabel, rerollCooldown, closeLabel }
 * }
 *
 * @module ui/views/QuestView
 */
import { UIView } from './UIView.js';
import { createPanel, createFooter } from '../components/containers.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from '../components/component-utils.js';

export class QuestView extends UIView {
  constructor(model) {
    super({ name: 'QuestView', model: model || {} });
  }

  onLoad() {
    const model = this.model;
    const head = model.head || {};

    // Head panel entity (slots counter + upgrades shortcut button).
    this.headEntity = createPanel(this, { className: 'quest-board-head' });
    this.headEntity.get(UIRenderComponent).template = () => h('div', { class: 'pw-ui-panel quest-board-head' },
      h('div', null,
        h.raw(`<b>${head.slotsLabel || ''}</b> ${head.activeCount ?? 0}/${head.max ?? 1}`),
        h('br'),
        h('span', null, head.timerText || '')),
      h('button', {
        type: 'button',
        class: 'pw-ui-btn hbtn',
        dataset: { action: 'legacy-call', call: 'openRepeatableUpgradeMenu', callArgs: '' },
      }, head.upgradesIconHtml ? h.raw(`${head.upgradesIconHtml} `) : null, head.upgradesLabel || ''));

    // Offer card entities.
    this.offerEntities = (model.offers || []).map((offer) => {
      const card = this.spawn('ui:quest-offer', []);
      card.addComponent(new UIRenderComponent({
        template: () => h('div', { class: 'pw-ui-panel upgrade-card pw-panel' },
          h('div', { class: 'pw-evo-title' }, offer.iconHtml ? h.raw(`${offer.iconHtml} `) : null, offer.title),
          h('div', { class: 'pw-detail-text' }, offer.desc),
          h('div', { class: 'pw-detail-hint' }, offer.reward),
          offer.active
            ? h('div', { class: 'pw-green-text' }, offer.activeLabel)
            : QuestView.acceptVNode(offer)),
      }));
      return card;
    });

    // Pinned footer entity.
    const footer = model.footer || {};
    this.footerEntity = createFooter(this, {});
    this.footerEntity.get(UIRenderComponent).template = () => h('div', { class: 'pw-actions' },
      h('button', {
        type: 'button',
        // Hidden while unusable (cooldown): the per-second timer flips it back.
        class: cx('pw-ui-btn hbtn extracted-bridge-style-052', footer.rerollCooldown && 'is-hidden'),
        disabled: !!footer.rerollCooldown,
        dataset: { action: 'legacy-call', call: 'rollRepeatables', callArgs: 'false' },
      }, footer.rerollIconHtml ? h.raw(`${footer.rerollIconHtml} `) : null, footer.rerollLabel || ''),
      h('button', {
        type: 'button',
        class: 'pw-ui-btn hbtn extracted-bridge-style-044',
        dataset: { action: 'legacy-call', call: 'closeQuestModal', callArgs: '' },
      }, footer.closeLabel || ''));
  }

  /**
   * Accept cell of an offer. STRICT RULE: nothing is rendered when the
   * action cannot be used right now (slots full) — no dead disabled button.
   * @param {Object} offer
   * @returns {*|null}
   */
  static acceptVNode(offer) {
    if (!offer.canAccept) return null;
    return h('button', {
      type: 'button',
      class: 'pw-ui-btn hbtn extracted-bridge-style-051',
      dataset: { action: 'legacy-call', call: 'acceptRepeatable', callArgs: String(offer.index) },
    }, offer.acceptLabel);
  }

  /** @returns {*} Body vnode (head + intro + offer cards). */
  bodyVNode() {
    return h('div', { class: 'pw-scene quest-board', dataset: { scene: this.name } },
      this.headEntity.get(UIRenderComponent).renderTemplate(),
      h('div', { class: 'pw-detail-body' }, this.model.introText || ''),
      // Wave 28 (user): offers flow in the canonical content grid (same
      // recipe as the validated panel layouts), not a stack of full-width
      // cards.
      h('div', { class: 'pw-quest-offer-grid' },
        this.offerEntities.map((e) => e.get(UIRenderComponent).renderTemplate())));
  }

  /** @returns {*} Footer vnode (pinned actions). */
  footerVNode() {
    return this.footerEntity.get(UIRenderComponent).renderTemplate();
  }

  buildView() {
    return h('div', null, this.bodyVNode(), this.footerVNode());
  }

  /**
   * DOM-free serialization for classic adapters and tests.
   * @param {Object} model
   * @returns {{body: string, footer: string}}
   */
  static toHTML(model) {
    const scene = new QuestView(model);
    scene.enter();
    return {
      body: toHTMLString(scene.bodyVNode()),
      footer: toHTMLString(scene.footerVNode()),
    };
  }
}
