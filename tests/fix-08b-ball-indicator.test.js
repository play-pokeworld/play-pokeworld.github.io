import test from 'node:test';
import assert from 'node:assert/strict';
import { toHTMLString } from '../src/engine/render/vdom.js';
import { locWildCardVNode } from '../src/ui/components/map-dressing.js';

// Indicateur de capture à la PokéClicker (balle vide / normale / dorée) :
// la fenêtre Lieu remplace le « ✓ » vert par une image de Poké Ball.
test('fenêtre lieu : balle vide pour un Pokémon non capturé', () => {
  const html = toHTMLString(locWildCardVNode({
    owned: false, shinyOwned: false, seen: false, roaming: false,
    name: 'X', spriteHtml: '<img src="s">', levelText: 'Nv.1', rarityText: 'commun',
  }));
  assert.ok(html.includes('pw-caught-ball'), 'indicateur de balle présent');
  assert.ok(html.includes('None.svg'), 'balle vide (non capturé)');
  assert.ok(!html.includes('>✓<'), 'plus de « ✓ » vert');
});

test('fenêtre lieu : balle normale pour un Pokémon capturé (non shiny)', () => {
  const html = toHTMLString(locWildCardVNode({
    owned: true, shinyOwned: false, seen: true, roaming: false,
    name: 'X', spriteHtml: '<img src="s">', levelText: 'Nv.1', rarityText: 'commun',
  }));
  assert.ok(html.includes('Pokeball.svg'), 'balle normale');
  assert.ok(!html.includes('Pokeball-shiny.svg'), 'pas dorée');
});

test('fenêtre lieu : balle dorée pour un Pokémon capturé en shiny', () => {
  const html = toHTMLString(locWildCardVNode({
    owned: true, shinyOwned: true, seen: true, roaming: false,
    name: 'X', spriteHtml: '<img src="s">', levelText: 'Nv.1', rarityText: 'commun',
  }));
  assert.ok(html.includes('Pokeball-shiny.svg'), 'balle dorée');
});

