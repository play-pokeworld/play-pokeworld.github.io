import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('preset editor card carries data-action presetEditorPick on root card element', () => {
  const src = fs.readFileSync('src/ui/game/preset-manager.js', 'utf8');
  assert.ok(
    src.includes("call: 'presetEditorPick'") && src.includes("presetSlot: String(i)"),
    'presetEditorCardHtml must attach presetEditorPick legacy action to the poke-card dataset'
  );
  assert.ok(
    src.includes('function removeFromPreset(slot)'),
    'preset-manager must define removeFromPreset(slot)'
  );
});

test('swap footer supports custom remove/cancel calls and labels', () => {
  const src = fs.readFileSync('src/ui/components/swap-footer.js', 'utf8');
  assert.ok(
    src.includes('m.cancelCall || \'cancelTeamSwap\''),
    'swapFooterVNode must allow custom cancelCall'
  );
  assert.ok(
    src.includes('m.removeCall || \'removeFromTeam\''),
    'swapFooterVNode must allow custom removeCall'
  );
  assert.ok(
    src.includes('if (m.removeLabel)'),
    'swapFooterVNode must only render remove button when removeLabel is truthy'
  );
});

test('box selector renders swap footer for preset_slot_ with Retirer and Annuler', () => {
  const src = fs.readFileSync('src/ui/game/box-selector.js', 'utf8');
  assert.ok(
    src.includes("String(_usmAction).startsWith('preset_slot_')"),
    'box-selector must handle preset_slot_ actions in renderUnifiedSwapFooter'
  );
  assert.ok(
    src.includes("removeCall: 'removeFromPreset'"),
    'box-selector must wire removeFromPreset to the swap footer'
  );
  assert.ok(
    src.includes("cancelCall: 'cancelTeamSwap'"),
    'box-selector must wire cancelTeamSwap to the swap footer'
  );
});

test('poke-full-card component forwards cardDataset onto root element', () => {
  const src = fs.readFileSync('src/ui/components/poke-full-card.js', 'utf8');
  assert.ok(
    src.includes('model.cardDataset'),
    'poke-full-card must merge model.cardDataset into card dataset'
  );
});

test('preset list chips row can be clicked to open the preset editor', () => {
  const src = fs.readFileSync('src/ui/game/preset-manager.js', 'utf8');
  assert.ok(
    src.includes('data-call="openPresetEditor"'),
    'preset-row-chips should allow opening preset editor directly on click'
  );
});
