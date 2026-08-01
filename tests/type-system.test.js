import test from 'node:test';
import assert from 'node:assert/strict';
import { typeEffect, effectivenessText } from '../src/domain/battle/type-system.js';

test('typeEffect handles dual typings', () => {
  assert.equal(typeEffect('Electric', 'Water', 'Flying'), 4);
  assert.equal(typeEffect('Ground', 'Flying', null), 0);
  assert.equal(typeEffect('Fire', 'Grass', 'Steel'), 4);
  assert.equal(typeEffect('Grass', 'Fire', 'Dragon'), 0.25);
});

test('effectivenessText maps multipliers to localization keys', () => {
  const translate = (key) => key;
  assert.equal(effectivenessText(0, translate), 'eff_immune');
  assert.equal(effectivenessText(4, translate), 'eff_super_x4');
  assert.equal(effectivenessText(2, translate), 'eff_super');
  assert.equal(effectivenessText(0.25, translate), 'eff_very_weak');
  assert.equal(effectivenessText(0.5, translate), 'eff_weak');
  assert.equal(effectivenessText(1, translate), '');
});


