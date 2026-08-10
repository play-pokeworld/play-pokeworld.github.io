import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ── Phase 10: repeatable-quest reroll button — HTML label ───────────────────
// Reported bug: during the timer, the button showed the raw text
// "span class="ui-icon…"" because getIcon() (HTML) was assigned via textContent.

const QUEST_UI = fs.readFileSync(new URL('../src/ui/game/quest-ui.js', import.meta.url), 'utf8');

test('the reroll button timer no longer uses textContent with HTML', () => {
  assert.ok(!QUEST_UI.includes('rerollBtn.textContent'), 'textContent escapes getIcon() HTML -> raw text shown');
  assert.ok(QUEST_UI.includes('_pwSetHtmlSafe(rerollBtn,'), 'HTML write through the canonical sink for the button label (icon + text)');
  // The countdown span (plain text) can stay in textContent.
  assert.ok(QUEST_UI.includes('timerSpan.textContent'), 'the timer span (plain text) keeps textContent');
});

test('the button label renders the icon as HTML and the time as text', () => {
  // Extracts the button-update block and runs it with stubs.
  const body = QUEST_UI.match(/if \(rerollBtn\) \{[\s\S]*?\n   \}/);
  assert.ok(body, 'button block extraction impossible');
  const btn = { disabled: true, innerHTML: '', textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const sandbox = {
    console,
    rerollBtn: btn,
    // Le puits canonique (même écriture observable : innerHTML sous le capot).
    _pwSetHtmlSafe: (el, html) => { el.innerHTML = html; },
    left2: 75,
    getIcon: () => '<span class="ui-icon" data-icon="rematch"><svg></svg></span>',
    t: (k) => (k === 'm.quest_ui.4' ? 'Reroll' : k),
    formatRepeatableCooldown: (s) => '01:15',
  };
  vm.createContext(sandbox);
  vm.runInContext(body[0], sandbox, { filename: 'quest-ui.js#reroll' });
  assert.equal(btn.textContent, '', 'textContent must not receive HTML');
  assert.ok(btn.innerHTML.includes('<span class="ui-icon"'), 'icon rendered as HTML (not as text)');
  assert.ok(btn.innerHTML.includes('01:15'), 'time shown after the icon');
  assert.equal(btn.disabled, true, 'button disabled during the timer');
  // On expiry: button re-enabled with the Reroll label
  btn.innerHTML = ''; btn.textContent = '';
  sandbox.left2 = 0;
  vm.runInContext(body[0], sandbox);
  assert.equal(btn.disabled, false, 'button re-enabled at the end of the timer');
  assert.ok(btn.innerHTML.includes('Reroll'), 'Reroll label restored in HTML');
  assert.equal(btn.attrs['data-call'], 'rollRepeatables', 'reroll action restored');
});

