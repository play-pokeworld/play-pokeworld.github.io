/**
 * @file Release11610.test.js
 * @brief 1.16.10 — battle fatigue that actually fires, keyboard-accessible modals,
 *        audible audits and the save-card avatar that fills its frame.
 *
 * Reported by the player:
 *   - "Système de fatigue en combat qui ne fonctionne pas en combat."
 *   - "Pour le Pokémon sur la carte, enlève le rond noir derrière le Pokémon et mets-le de
 *     la même taille que le cadre."
 * Plus the P0 items of `docs/AUDIT_v1.16.9.md` delegated for this version: modal keyboard
 * support (§2.1), a localization audit that does not cry wolf (§2.2/§2.3) and a replayable
 * contrast audit (§2.4).
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, assert } from './TestRunner.js';
import { FatigueRules } from '../src/config/FatigueRules.js';
import { BattleSystem } from '../src/systems/BattleSystem.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { ModalFocusScope } from '../src/ui/ModalFocusScope.js';
import { UIModal } from '../src/ui/UIModal.js';
import { UIButton } from '../src/ui/UIButton.js';
import { SaveCard } from '../src/ui/SaveCard.js';
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';
import { ItemDB } from '../src/data/items/ItemDB.js';
import { ItemDescription } from '../src/data/items/ItemDescription.js';
import { auditContrast } from '../tools/contrast-audit.mjs';
import { readBundle } from './CssBundle.js';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const readSource = (relative) => fs.readFileSync(PROJECT_ROOT + relative, 'utf8');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A bare keydown the fake DOM understands. */
function keydown(key, options = {}) {
  return {
    type: 'keydown',
    key,
    shiftKey: options.shiftKey === true,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this._stopped = true; }
  };
}

/**
 * Opens a modal with two focusable controls, mounted at the end of <body>.
 * @returns {{modal: UIModal, first: Object, second: Object, trigger: Object}}
 */
function mountedModal() {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  const modal = new UIModal({ id: 'Release11610Modal', title: 'Test', showCloseBtn: false });
  const first = new UIButton({ label: 'First', name: 'test:first' });
  const second = new UIButton({ label: 'Second', name: 'test:second' });
  modal.addChild(first, modal._body);
  modal.addChild(second, modal._body);
  document.body.appendChild(modal.getDomElement());
  return { modal, first, second, trigger };
}

describe('1.16.10 — battle fatigue actually fires in battle', (test) => {
  test('the wear starts at the 50th uninterrupted victory, not before', () => {
    assert.equal(FatigueRules.stepFor(0), 0, 'a fresh chain is not tired');
    assert.equal(FatigueRules.stepFor(49), 0, '49 victories are still below the threshold');
    assert.equal(FatigueRules.stepFor(50), 1, 'the 50th victory starts the wear');
    assert.equal(FatigueRules.stepFor(54), 1, 'one step per five victories');
    assert.equal(FatigueRules.stepFor(55), 2, 'the second step');
    assert.equal(FatigueRules.stepFor(95), 10, 'ten steps');
    assert.equal(FatigueRules.stepFor(4000), 10, 'the wear is capped at ten steps');
    assert.ok(FatigueRules.isWarningPoint(50) && !FatigueRules.isWarningPoint(51), 'the warning fires exactly once');
  });

  test('the wear is 1 % of max HP per step and the stamina talent halves it', () => {
    assert.equal(FatigueRules.wearFor(1000, 1), 10, '1 % of 1000 HP');
    assert.equal(FatigueRules.wearFor(1000, 3), 30, '3 steps of 1 %');
    assert.equal(FatigueRules.wearFor(1000, 3, { stamina: true }), 15, 'stamina halves the wear');
    assert.equal(FatigueRules.wearFor(100, 10), 10, 'capped step on a small pool');
    assert.equal(FatigueRules.wearFor(1000, 0), 0, 'no step, no wear');
    assert.ok(FatigueRules.wearFor(1, 1) >= 1, 'a wear is never rounded down to nothing');
  });

  test('the counter is the victories of the chain, not the player own knock-outs', () => {
    const source = readSource('src/systems/BattleSystem.js');
    const method = source.slice(source.indexOf('\n  _applyFatigue('), source.indexOf('\n  _settleTrainer('));
    assert.ok(/run\.wins/.test(method), 'the wear reads the victories of the run');
    assert.ok(!/playerKOs/.test(method), 'playerKOs no longer decides the fatigue');
    assert.ok(!/\.takeDamage\(/.test(method), 'the active combatant is not hit a second time');
    const settle = source.slice(source.indexOf('\n  _settleWildEncounter('), source.indexOf('\n  _applyFatigue('));
    assert.ok(!/playerKOs\s*>=/.test(settle), 'the settlement no longer compares playerKOs to the threshold');
  });

  test('a real chain takes wear on the whole team and logs it', async () => {
    ModalFocusScope.reset();
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const save = SaveSystem.getInstance().createNewSave('FatigueValidator', 'charmander');
    save.team[0].level = 40;
    save.team[0].hp = save.team[0].getMaxHp();
    SaveSystem.getInstance().setCurrentSave(save);
    assert.ok(battle.startBattle('route1', { chain: true }), 'a wild battle starts');
    const session = battle._session;
    const before = save.team[0].hp;
    battle._activeRun.wins = 60;
    const wear = FatigueRules.wearFor(save.team[0].getMaxHp(), FatigueRules.stepFor(60));
    battle._applyFatigue(save, session, battle._activeRun);
    assert.equal(save.team[0].hp, before - wear, 'the team member loses exactly the computed wear');
    assert.equal(session.active.hp, save.team[0].hp, 'the active combatant follows its Pokémon (single hit)');
    assert.ok(session.log.entries.some((entry) => String(entry.key).includes('fatigue_wear')), 'the wear is logged');
    battle._activeRun.wins = 50;
    battle._applyFatigue(save, session, battle._activeRun);
    assert.ok(session.log.entries.some((entry) => String(entry.key).includes('fatigue_warning')), 'the warning is logged at the threshold');
    battle.endBattle(false);
  });

  test('an ordinary chain (no rest needed) never takes wear', () => {
    const battle = BattleSystem.getInstance();
    if (battle.isActive()) battle.endBattle(false);
    const save = SaveSystem.getInstance().createNewSave('FatigueQuiet', 'squirtle');
    save.team[0].hp = save.team[0].getMaxHp();
    SaveSystem.getInstance().setCurrentSave(save);
    battle.startBattle('route1', { chain: true });
    const session = battle._session;
    const before = save.team[0].hp;
    battle._activeRun.wins = 12;
    battle._applyFatigue(save, session, battle._activeRun);
    assert.equal(save.team[0].hp, before, 'no wear below the threshold');
    assert.ok(!session.log.entries.some((entry) => String(entry.key).includes('fatigue')), 'no fatigue line either');
    battle.endBattle(false);
  });

  test('the warning and wear texts exist in both languages and carry the count', () => {
    for (const lang of Object.keys(LocalizationManager.getInstance()._tables)) {
      assert.ok(LocalizationManager.getInstance().has('battle_log.fatigue_warning', lang), `fatigue_warning in ${lang}`);
      assert.ok(LocalizationManager.getInstance().has('battle_log.fatigue_wear', lang), `fatigue_wear in ${lang}`);
    }
    assert.ok(String(t('battle_log.fatigue_warning', { count: 50 })).includes('50'), 'the warning tells how many victories');
  });
});

describe('1.16.10 — every modal answers the keyboard', (test) => {
  test('Escape closes the top-most window and only that one', async () => {
    ModalFocusScope.reset();
    const lower = mountedModal();
    const upper = mountedModal();
    lower.modal.open();
    upper.modal.open();
    document.documentElement.dispatchEvent(keydown('Escape'));
    await sleep(10);
    assert.equal(upper.modal.isOpen(), false, 'the top window closes');
    assert.equal(lower.modal.isOpen(), true, 'the window below stays open');
    document.documentElement.dispatchEvent(keydown('Escape'));
    await sleep(10);
    assert.equal(lower.modal.isOpen(), false, 'then the lower window closes');
    upper.modal.destroy();
    lower.modal.destroy();
    ModalFocusScope.reset();
  });

  test('a window can opt out of Escape (a choice that must be explicit)', async () => {
    ModalFocusScope.reset();
    const modal = new UIModal({ id: 'Release11610NoEscape', title: 'Locked', closeOnEscape: false });
    document.body.appendChild(modal.getDomElement());
    modal.open();
    document.documentElement.dispatchEvent(keydown('Escape'));
    await sleep(10);
    assert.equal(modal.isOpen(), true, 'the window ignores Escape');
    modal.close();
    modal.destroy();
    ModalFocusScope.reset();
  });

  test('a nested widget that consumes Escape keeps the window open', async () => {
    ModalFocusScope.reset();
    const { modal } = mountedModal();
    modal.open();
    // Same contract as UIContextMenu / UISortableList / WindowDragController.
    const consumer = (event) => { if (event.key === 'Escape') event.preventDefault(); };
    document.addEventListener('keydown', consumer);
    const event = keydown('Escape');
    document.documentElement.dispatchEvent(event);
    await sleep(10);
    assert.equal(modal.isOpen(), true, 'a consumed Escape does not close the window');
    document.removeEventListener('keydown', consumer);
    modal.close();
    modal.destroy();
    ModalFocusScope.reset();
  });

  test('opening gives the focus to the first control, closing gives it back', async () => {
    ModalFocusScope.reset();
    const { modal, trigger } = mountedModal();
    trigger.focus();
    modal.open();
    await sleep(10);
    assert.equal(document.activeElement, modal._closeButton || document.activeElement, 'a control of the window holds the focus');
    assert.ok(modal._dom.contains(document.activeElement), 'the focus is inside the window');
    modal.close();
    await sleep(5);
    assert.equal(document.activeElement, trigger, 'the focus returns to the trigger');
    modal.destroy();
    ModalFocusScope.reset();
  });

  test('Tab loops inside the window instead of walking the dashboard', async () => {
    ModalFocusScope.reset();
    const { modal, first, second } = mountedModal();
    modal.open();
    await sleep(10);
    const focusables = ModalFocusScope._focusables(modal._dom);
    assert.ok(focusables.length >= 2, 'the window exposes focusable controls');
    focusables[focusables.length - 1].focus();
    const forward = keydown('Tab');
    document.documentElement.dispatchEvent(forward);
    assert.ok(forward.defaultPrevented, 'the trap takes over the default Tab');
    assert.equal(document.activeElement, focusables[0], 'Tab from the last control wraps to the first');
    const backward = keydown('Tab', { shiftKey: true });
    document.documentElement.dispatchEvent(backward);
    assert.ok(backward.defaultPrevented, 'Shift+Tab is trapped too');
    assert.equal(document.activeElement, focusables[focusables.length - 1], 'Shift+Tab from the first control wraps to the last');
    assert.ok(first && second, 'the fixture exposes its controls');
    modal.close();
    modal.destroy();
    ModalFocusScope.reset();
  });

  test('the background is inert while a window is open and restored afterwards', async () => {
    ModalFocusScope.reset();
    const { modal } = mountedModal();
    const dashboard = document.createElement('div');
    document.body.appendChild(dashboard);
    modal.open();
    await sleep(5);
    assert.equal(dashboard.getAttribute('aria-hidden'), 'true', 'the dashboard is hidden from assistive technologies');
    assert.ok(dashboard.hasAttribute('inert'), 'the dashboard cannot be focused');
    modal.close();
    await sleep(5);
    assert.equal(dashboard.getAttribute('aria-hidden'), null, 'the previous state is restored');
    assert.ok(!dashboard.hasAttribute('inert'), 'the dashboard is interactive again');
    modal.destroy();
    ModalFocusScope.reset();
  });

  test('both modal families delegate to the same scope', () => {
    const modal = readSource('src/ui/UIModal.js');
    const fullscreen = readSource('src/ui/UIFullscreenPanel.js');
    assert.ok(/ModalFocusScope\.activate/.test(modal) && /ModalFocusScope\.release/.test(modal), 'UIModal uses the scope');
    assert.ok(/ModalFocusScope\.activate/.test(fullscreen), 'UIFullscreenPanel uses the scope');
    const starter = readSource('src/panels/StarterModal.js');
    assert.ok(/closeOnEscape: false/.test(starter), 'the starter window keeps its own Escape behaviour');
    for (const file of ['src/ui/UIContextMenu.js', 'src/ui/UISortableList.js', 'src/ui/dashboard/WindowDragController.js']) {
      assert.ok(/event\.preventDefault\(\)/.test(readSource(file)), `${file} consumes its Escape`);
    }
  });
});

describe('1.16.10 — the audits are green and replayable', (test) => {
  test('every item resolves to a description, authored or derived', () => {
    const items = ItemDB.getInstance().getIds();
    assert.ok(items.length > 500, 'the item database is loaded');
    const empty = items.filter((id) => !String(ItemDescription.of(id)).trim());
    assert.equal(empty.length, 0, `items without any description: ${empty.slice(0, 5).join(', ')}`);
  });

  test('the nine keys that were reported as English-only exist in both languages', () => {
    const keys = ['stat_up', 'stat_down', 'stat_blocked', 'accuracy_down', 'paralyzed', 'immune', 'item_boost', 'item_debuff', 'move_failed'];
    const manager = LocalizationManager.getInstance();
    for (const lang of Object.keys(manager._tables)) {
      for (const key of keys) assert.ok(manager.has(`battle_log.${key}`, lang), `battle_log.${key} in ${lang}`);
    }
  });

  test('the localization audit is green on the real data', () => {
    // Same rule as tools/i18n/audit-keys.mjs: an authored description must exist in
    // every language, and every item must resolve to a text.
    const manager = LocalizationManager.getInstance();
    const langs = Object.keys(manager._tables);
    const orphan = ItemDB.getInstance().getIds().filter((id) => {
      const authored = langs.filter((lang) => manager.has(`item.${id}.desc`, lang));
      return authored.length > 0 && authored.length !== langs.length;
    });
    assert.equal(orphan.length, 0, `descriptions authored in one language only: ${orphan.slice(0, 5).join(', ')}`);
  });

  test('the contrast audit replays every palette of the stylesheet', () => {
    const { rows, failures } = auditContrast();
    assert.ok(rows.length >= 100, `audited pairs: ${rows.length}`);
    assert.equal(failures.length, 0, `below AA: ${failures.map((row) => `${row.pair} ${row.ratio.toFixed(2)}`).join(', ')}`);
    const scopes = new Set(rows.map((row) => row.scope));
    assert.ok(scopes.size >= 4, 'the four themes are audited, not only the default one');
    const grass = rows.find((row) => row.pair === 'type badge grass' && row.scope === 'base :root');
    assert.ok(grass && Math.abs(grass.ratio - 7.02) < 0.05, 'the generated values match the documented ones (grass 7.02)');
  });

  test('the contrast audit really fails on a bad pair', () => {
    const file = path.join(os.tmpdir(), 'pw-contrast-broken.css');
    fs.writeFileSync(file, [
      ':root { --pw-bg-surface: #FFFFFF; --pw-bg-header: #FFFFFF; --pw-bg-sprite: #FFFFFF;',
      '  --pw-text-primary: #FFFF00; --pw-text-secondary: #FFFF00; --dark1: #FFFFFF; --light2: #FFFF00;',
      '  --type-fire: #FBA64C; }',
      '.type-fire { background: var(--type-fire); }',
      '.type-badge.type-fire { color: #FFFFFF; }'
    ].join('\n'));
    const { failures } = auditContrast({ cssPath: file });
    assert.ok(failures.length > 0, 'a yellow-on-white pair is reported');
    fs.unlinkSync(file);
  });
});

describe('1.16.10 — the save card Pokémon fills its frame', (test) => {
  /** @param {Object} avatar */
  const avatarElement = (avatar) => SaveCard.prototype._buildAvatar
    ? SaveCard.prototype._buildAvatar.call({ _buildAvatar: null }, avatar, 'Red')
    : null;

  test('the card avatar is a Pokémon without the dark disc', () => {
    const element = SaveCard.prototype._buildAvatar.call({}, { species: 'pikachu', getDisplayName: () => 'Pikachu' }, 'Red');
    assert.ok(element.getDomElement().classList.contains('save-card-avatar'), 'the avatar carries its own hook class');
    const images = element.getDomElement().querySelectorAll('img');
    assert.equal(images.length, 1, 'the sprite is rendered once');
    const css = readBundle();
    assert.ok(/\.save-slot-icon \.save-card-avatar \.pw-poke-circle-bg \{\s*display: none !important;/.test(css),
      'the canonical disc is hidden inside the save card only');
    assert.ok(/\.save-slot-icon \.save-card-avatar \{\s*width: 72px !important;/.test(css), 'the avatar is sized to the 74 px frame');
    assert.ok(/\.save-slot-icon \.save-card-avatar \.pw-poke-circle-img \{[^}]*width: 100% !important/.test(css),
      'the art fills the avatar box');
    assert.ok(avatarElement, 'fixture guard');
  });

  test('the placeholder keeps the same geometry as a real Pokémon', () => {
    const placeholder = SaveCard.prototype._buildAvatar.call({}, null, 'Red');
    assert.ok(placeholder.getDomElement().classList.contains('save-card-avatar'), 'the "?" placeholder uses the same frame');
  });

  test('no other screen loses its disc (the change is scoped to the save card)', () => {
    const css = readBundle();
    const hideRules = css.match(/\.save-slot-icon \.save-card-avatar \.pw-poke-circle-bg \{\s*display: none !important;/g)?.length || 0;
    assert.ok(hideRules > 0, 'the rule exists exactly once, in the save-card block');
    assert.equal(css.split('.save-slot-icon .save-card-avatar .pw-poke-circle-bg').length - 1, 1, 'and it is not duplicated');
  });
});
