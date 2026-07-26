import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Passe 10 : bouton reroll des quêtes répétables — label HTML ─────────────
// Bug remonté : pendant le timer, le bouton affichait le texte brut
// « span class="ui-icon…" » car getIcon() (HTML) était affecté via textContent.

const QUEST_UI = fs.readFileSync(new URL('../src/game/quests/quest-ui.js', import.meta.url), 'utf8');

test('le timer du bouton reroll n\'utilise plus textContent avec du HTML', () => {
  assert.ok(!QUEST_UI.includes('rerollBtn.textContent'), 'textContent échappe le HTML de getIcon() -> texte brut affiché');
  assert.ok(QUEST_UI.includes('rerollBtn.innerHTML'), 'innerHTML attendu pour le label du bouton (icône + texte)');
  // Le span du compte à rebours (texte pur) peut rester en textContent.
  assert.ok(QUEST_UI.includes('timerSpan.textContent'), 'le span du timer (texte pur) conserve textContent');
});

test('le label du bouton rend l\'icône en HTML et le temps en texte', () => {
  // Extrait le bloc de mise à jour du bouton et l'exécute avec des stubs.
  const body = QUEST_UI.match(/if \(rerollBtn\) \{[\s\S]*?\n   \}/);
  assert.ok(body, 'extraction du bloc bouton impossible');
  const btn = { disabled: true, innerHTML: '', textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const sandbox = {
    console,
    rerollBtn: btn,
    left2: 75,
    getIcon: () => '<span class="ui-icon" data-icon="rematch"><svg></svg></span>',
    t: (k) => (k === 'm.quest_ui.4' ? 'Reroll' : k),
    formatRepeatableCooldown: (s) => '01:15',
  };
  vm.createContext(sandbox);
  vm.runInContext(body[0], sandbox, { filename: 'quest-ui.js#reroll' });
  assert.equal(btn.textContent, '', 'textContent ne doit pas recevoir de HTML');
  assert.ok(btn.innerHTML.includes('<span class="ui-icon"'), 'icône rendue en HTML (pas en texte)');
  assert.ok(btn.innerHTML.includes('01:15'), 'temps affiché après l\'icône');
  assert.equal(btn.disabled, true, 'bouton désactivé pendant le timer');
  // À l\'expiration : bouton réactivé avec le label Reroll
  btn.innerHTML = ''; btn.textContent = '';
  sandbox.left2 = 0;
  vm.runInContext(body[0], sandbox);
  assert.equal(btn.disabled, false, 'bouton réactivé à la fin du timer');
  assert.ok(btn.innerHTML.includes('Reroll'), 'label Reroll restauré en HTML');
  assert.equal(btn.attrs['data-call'], 'rollRepeatables', 'action reroll restaurée');
});
