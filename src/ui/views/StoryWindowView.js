/**
 * PokéWorld UI — quest-window internals (rebuilt from zero on the ECS DS):
 * StoryWindowView (the "Histoire & Quêtes" map window content), NpcDialogView
 * (NPC dialog body in #quest-modal) and RepeatableUpgradeView (repeatable
 * slots upgrade panel in #poke-modal).
 *
 * The classic quest-ui.js used to grow raw HTML strings with one-off
 * classes (pw-tip-card, pw-card-purple, pw-detail-chip, pw-tag-pill…).
 * Everything is now the shared DS language: framed .pw-panel cards, the
 * canonical progress bar (inline width, data-pct contract kept), buttons
 * following the colour language (claim = solid green, challenge = solid
 * accent — no gradient, no greyed-out DEAD button: while a quest is not
 * claimable the card shows an informative line instead).
 *
 * Kept contracts (router + tests):
 *  - quest buttons: data-action="legacy-call" with data-call
 *    startQuestTrainerBattle / claimQuest ('qid','cat' quoted args),
 *    acceptSideQuest ('qid'), rollRepeatables, openRepeatableMenu,
 *    closeQuestModal, upgradeRepeatableSlots (UNQUOTED numeric arg),
 *  - .quest-progress-bar[data-pct] (+ inline width/--pct, .is-done),
 *    .pw-progress-bar-sm.quest-progress-container track,
 *  - .quest-claim-btn.is-done / .is-challenge, .quest-trainer-target,
 *  - .modal-close[data-action="close-poke-modal"] on the upgrade panel,
 *  - empty state keeps .pw-empty-center.
 *
 * @module ui/views/StoryWindowView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { panelHeaderVNode } from '../components/panel-header.js';

/* ─── Quest card (main / side / repeatable lines of the story window) ─── */

function questCardVNode(c) {
  let body = null;
  if (c.kind === 'trainer') {
    body = h('div', { class: 'quest-trainer-target' },
      h('b', null, c.trainerText || ''),
      h('small', null, c.trainerHint || ''));
  } else if (c.kind === 'progress') {
    const pct = Math.max(0, Math.min(100, Math.round(Number(c.pct) || 0)));
    body = [
      h('div', { class: 'pw-progress-label' },
        h('span', null, c.progressLabel || ''),
        h('span', null, c.progressValue || '')),
      h('div', { class: 'pw-progress-bar-sm quest-progress-container' },
        h('div', {
          class: `quest-progress-bar${c.done ? ' is-done' : ''}`,
          dataset: { pct: String(pct) },
          style: { width: `${pct}%`, '--pct': `${pct}%` },
        }))];
  } else if (c.bodyText) {
    body = h('div', null, c.bodyText);
  }

  return h('div', { class: 'pw-panel pw-quest-card' },
    h('div', { class: 'pw-quest-card-title' }, h.raw(c.title || '')),
    c.desc ? h('div', { class: 'pw-text-sm pw-light1 pw-quest-card-desc' }, h.raw(c.desc || '')) : null,
    body,
    c.rewardText ? h('div', { class: 'pw-quest-reward' }, h.raw(c.rewardText)) : null,
    c.action
      ? h('button', {
          class: `hbtn quest-claim-btn ${c.action.cls || ''}`.trim(),
          dataset: { action: 'legacy-call', call: c.action.call, callArgs: c.action.callArgs },
        }, c.action.label || '')
      : (c.infoText ? h('div', { class: 'pw-text-sm pw-light1 pw-quest-info-line' }, c.infoText) : null));
}

export class StoryWindowView extends UIView {
  constructor(model) {
    super({ name: 'StoryWindowView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const nodes = [];
    if (m.tutorialHtml) nodes.push(h.raw(m.tutorialHtml));

    if (m.emptyState) {
      nodes.push(h('div', { class: 'pw-empty-center' },
        m.emptyState.iconHtml ? h.raw(m.emptyState.iconHtml + ' ') : null,
        // Wave 43 — label: trusted localized markup (m.quest_ui.27: <br> ×2).
        m.emptyState.label ? h.raw(m.emptyState.label) : ''));
      nodes.push(h('div', { class: 'pw-margin-top-sm' },
        h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'openRepeatableMenu', callArgs: '' } },
          h.raw(m.emptyState.boardIconHtml ? m.emptyState.boardIconHtml + ' ' : ''),
          m.emptyState.boardLabel || '')));
      return nodes;
    }

    for (const b of m.blocks || []) {
      if (b.type === 'section') {
        nodes.push(h('div', { class: `pw-quest-section is-${b.tone || 'story'}` },
          b.iconHtml ? h.raw(b.iconHtml + ' ') : null,
          b.label || ''));
      } else if (b.type === 'card') {
        nodes.push(questCardVNode(b.card || {}));
      }
    }

    if (m.footer) {
      if (m.footer.kind === 'board') {
        nodes.push(h('div', { class: 'pw-margin-top-sm' },
          h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'openRepeatableMenu', callArgs: '' } },
            h.raw(m.footer.iconHtml ? m.footer.iconHtml + ' ' : ''),
            m.footer.label || '')));
      } else if (m.footer.kind === 'hint') {
        nodes.push(h('div', { class: 'pw-margin-top-sm pw-quest-hint' }, m.footer.text || ''));
      }
    }
    return nodes;
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:story-window', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (quest-ui.js). */
  static toHTML(model) {
    const view = new StoryWindowView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

/* ─── NPC dialog body (#quest-body) ────────────────────────────────────── */

export class NpcDialogView extends UIView {
  constructor(model) {
    super({ name: 'NpcDialogView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    const nodes = [];

    nodes.push(h('div', { class: 'pw-panel pw-npc-card' },
      h('div', { class: 'pw-quest-card-title' },
        m.npcIconHtml ? h.raw(m.npcIconHtml + ' ') : null,
        m.npcName || ''),
      ...(m.lines || []).map((l) => h('div', { class: 'pw-npc-line pw-text-sm' }, `« ${l} »`))));

    const q = m.quest;
    if (q) {
      if (q.state === 'active') {
        nodes.push(h('div', { class: 'pw-text-sm pw-light2' },
          q.iconHtml ? h.raw(q.iconHtml + ' ') : null, q.text || ''));
      } else if (q.state === 'done') {
        nodes.push(h('div', { class: 'pw-text-sm pw-green' }, q.text || ''));
      } else if (q.state === 'doneReplay' || q.state === 'offer') {
        nodes.push(h('div', { class: 'pw-panel pw-quest-card' },
          h('div', { class: 'pw-quest-card-title' },
            h.raw(q.title || ''),
            q.state === 'doneReplay' && q.doneSuffix
              ? h('span', { class: 'pw-text-sm pw-green' }, ` (${q.doneSuffix})`) : null),
          q.desc ? h('div', { class: 'pw-text-sm pw-light1 pw-quest-card-desc' }, h.raw(q.desc)) : null,
          q.rewardText ? h('div', { class: 'pw-quest-reward' }, h.raw(q.rewardText)) : null,
          h('button', {
            class: 'hbtn quest-claim-btn is-done',
            dataset: { action: 'legacy-call', call: 'acceptSideQuest', callArgs: q.callArgs || '' },
          }, q.actionLabel || '')));
      }
    }

    if (m.board) {
      nodes.push(h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'openRepeatableMenu', callArgs: '' } },
        h.raw(m.board.iconHtml ? m.board.iconHtml + ' ' : ''),
        m.board.label || ''));
    }

    nodes.push(h('div', { class: 'pw-detail-right' },
      h('button', { class: 'hbtn', dataset: { action: 'legacy-call', call: 'closeQuestModal', callArgs: '' } },
        m.closeLabel || '')));

    if (m.talkedMainText) {
      nodes.push(h('div', { class: 'pw-text-sm pw-light2' },
        m.storyIconHtml ? h.raw(m.storyIconHtml + ' ') : null,
        m.talkedMainText));
    }
    return nodes;
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:npc-dialog', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (quest-ui.js). */
  static toHTML(model) {
    const view = new NpcDialogView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

/* ─── Repeatable-slots upgrade panel (#poke-modal-inner) ───────────────── */

export class RepeatableUpgradeView extends UIView {
  constructor(model) {
    super({ name: 'RepeatableUpgradeView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    return [panelHeaderVNode({
      titleHtml: m.titleHtml || '',
      close: { action: 'close-poke-modal' },
    }),
    h('div', { class: 'pw-panel pw-info-section' },
      h('b', null, m.currentTitle || ''),
      h('div', { class: 'pw-text-sm pw-light1' }, m.currentText || '')),
    h('div', { class: 'pw-panel pw-info-section' },
      m.buy
        ? h('button', {
            class: 'hbtn',
            dataset: { action: 'legacy-call', call: 'upgradeRepeatableSlots', callArgs: String(m.buy.cost) },
          }, h.raw(m.buy.label || ''))
        : h('span', { class: 'pw-text-sm pw-light1' }, m.maxText || '')),
    h('div', { class: 'pw-panel pw-info-section' },
      h('div', { class: 'pw-text-sm pw-light1' }, h.raw(m.descText || '')))];
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:repeatable-upgrade', []);
    this.windowEntity.addComponent(new UIRenderComponent({ template: () => this.windowVNode() }));
  }

  /** DOM-free serialization for the classic adapter (quest-ui.js). */
  static toHTML(model) {
    const view = new RepeatableUpgradeView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}

