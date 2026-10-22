/**
 * @file DungeonLocationAction.test.js
 * @brief Dungeon entry/continue tiles stay inside Rework while matching main's location action cues.
 */
import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { SaveData } from '../src/data/save/SaveData.js';
import { DungeonRunData } from '../src/data/save/DungeonRunData.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { DungeonSystem } from '../src/systems/DungeonSystem.js';
import { LocationDB } from '../src/data/world/LocationDB.js';
import { DungeonRules } from '../src/config/DungeonRules.js';
import { LocationActions } from '../src/panels/components/LocationActions.js';
import { IconRegistry } from '../src/ui/icons/IconRegistry.js';
import { LocalizationManager, t } from '../src/localization/LocalizationManager.js';
import { TextFormatter } from '../src/core/TextFormatter.js';

describe('Dungeon location action parity', (test) => {
  test('entry uses the explore glyph, localized floor toll with the token sprite, and DungeonSystem.enter', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const localization = LocalizationManager.getInstance();
    const previousLanguage = localization.currentLang;
    const save = SaveData.createNew('Dungeon location action', 'charmander');
    const location = LocationDB.getInstance().getById('mtmoon');
    save.player.region = location.region;
    save.player.location = location.id;
    saves.setCurrentSave(save);

    const dungeon = DungeonSystem.getInstance();
    const originalEnter = dungeon.enter;
    const enteredLocations = [];
    dungeon.enter = (locationId) => {
      enteredLocations.push(locationId);
      return true;
    };

    try {
      const toll = dungeon.entryToll(location.id);
      const depth = DungeonRules.depthFor(location.badgesRequired, location.id);
      assert.ok(depth > 1, 'fixture exercises the multi-floor label');
      for (const language of ['fr', 'en']) {
        localization.setLanguage(language);
        const actions = new LocationActions(location, LocationDB.getInstance().getEncounters(location.id).length);
        try {
          const button = [...actions.getDomElement().querySelectorAll('.pw-loc-action-btn')]
            .find((candidate) => candidate.classList.contains('pw-loc-dungeon-btn'));
          assert.ok(button, `${language} entry is a styled dungeon button`);
          const iconBox = button.querySelector('.pw-loc-action-icon');
          assert.equal(iconBox?.querySelector('path')?.getAttribute('d'),
            IconRegistry.get('sparkle').paths[0], 'Rework sparkle matches main explore glyph');

          const label = button.querySelector('.pw-loc-action-label')?.querySelector('.pw-text-sm');
          const entryText = t('dungeon_enter_btn', { depth: String(depth) });
          assert.equal(label?.textContent.replace(/\s+/g, ' ').trim(), `${entryText} — ${TextFormatter.formatNumber(toll)}`,
            `${language} label shows floors, then the entry toll without a redundant currency name`);
          const token = [...button.querySelectorAll('img')]
            .find((image) => (image.src || '').includes('dungeonToken.svg'));
          assert.ok(token, `${language} label includes the dungeon-token sprite`);
          assert.equal(token.alt, '', 'the adjacent toll text supplies the accessible name');
          button.click();
          assert.equal(enteredLocations.at(-1), location.id, 'entry dispatches through DungeonSystem.enter');
        } finally {
          actions.destroy();
        }
      }
      assert.deepEqual(enteredLocations, [location.id, location.id]);
    } finally {
      dungeon.enter = originalEnter;
      localization.setLanguage(previousLanguage);
      saves.setCurrentSave(previousSave);
    }
  });

  test('same-place expedition keeps Rework resume behavior, with no second toll', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Dungeon resume action', 'charmander');
    const location = LocationDB.getInstance().getById('mtmoon');
    save.player.region = location.region;
    save.player.location = location.id;
    save.dungeons.setRun(new DungeonRunData({
      active: true,
      locationId: location.id,
      badgeReq: location.badgesRequired,
      toll: DungeonRules.entryToll(location.badgesRequired),
      depth: DungeonRules.depthFor(location.badgesRequired, location.id),
      floor: 2
    }));
    saves.setCurrentSave(save);

    const dungeon = DungeonSystem.getInstance();
    const originalEnter = dungeon.enter;
    const enteredLocations = [];
    dungeon.enter = (locationId) => {
      enteredLocations.push(locationId);
      return true;
    };
    const actions = new LocationActions(location, LocationDB.getInstance().getEncounters(location.id).length);
    try {
      const button = [...actions.getDomElement().querySelectorAll('.pw-loc-action-btn')]
        .find((candidate) => candidate.classList.contains('pw-loc-dungeon-btn'));
      assert.ok(button);
      assert.equal(button.querySelector('.pw-loc-action-label')?.querySelector('.pw-text-sm')?.textContent, t('dungeon_resume_action'));
      assert.equal(button.querySelectorAll('img').length, 0, 'the toll is not repeated during an expedition');
      button.click();
      assert.deepEqual(enteredLocations, [location.id], 'resume still goes through the Rework dungeon system');
    } finally {
      actions.destroy();
      dungeon.enter = originalEnter;
      saves.setCurrentSave(previousSave);
    }
  });

  test('expedition active at another location remains an informational non-button row', () => {
    const saves = SaveSystem.getInstance();
    const previousSave = saves.getCurrentSave();
    const save = SaveData.createNew('Dungeon elsewhere action', 'charmander');
    const location = LocationDB.getInstance().getById('viridianforest');
    save.player.region = location.region;
    save.player.location = location.id;
    save.dungeons.setRun(new DungeonRunData({ active: true, locationId: 'mtmoon', floor: 1 }));
    saves.setCurrentSave(save);
    const actions = new LocationActions(location, LocationDB.getInstance().getEncounters(location.id).length);
    try {
      const row = [...actions.getDomElement().querySelectorAll('.pw-loc-action-row')]
        .find((candidate) => candidate.textContent === t('dungeon_other_run_action'));
      assert.ok(row, 'existing elsewhere warning remains informational');
      assert.equal(row.classList.contains('pw-loc-dungeon-btn'), false, 'informational state is not skinned as a button');
    } finally {
      actions.destroy();
      saves.setCurrentSave(previousSave);
    }
  });

  test('dungeon action skin matches main generic button colors and hover feedback', () => {
    const css = fs.readFileSync(path.resolve('assets/css/design-system.css'), 'utf8');
    const base = css.match(/\.pw-loc-action-btn\.pw-loc-dungeon-btn\s*\{([^}]*)\}/)?.[1] || '';
    const hover = css.match(/\.pw-loc-action-btn\.pw-loc-dungeon-btn:hover\s*\{([^}]*)\}/)?.[1] || '';
    for (const declaration of [
      'background: color-mix(in srgb, var(--light2) 12%, transparent) !important;',
      'border: 1px solid color-mix(in srgb, var(--light2) 35%, transparent) !important;',
      'color: var(--light2) !important;',
      'font-weight: 800 !important;',
      'text-shadow: none !important;',
      'box-shadow: none !important;'
    ]) assert.ok(base.includes(declaration), `base tile copies main's generic action skin: ${declaration}`);
    for (const declaration of [
      'background: color-mix(in srgb, var(--light2) 24%, transparent) !important;',
      'border-color: var(--light2) !important;',
      'filter: brightness(1.15) !important;'
    ]) assert.ok(hover.includes(declaration), `hover copies main's action feedback: ${declaration}`);
  });
});
