/**
 * @file UiWidgets.test.js
 * @brief UI widgets and panels rendered against the fake DOM (tests/FakeDom.js).
 */

import fs from 'fs';
import path from 'path';
import { describe, assert } from './TestRunner.js';
import { fakeEvent } from './FakeDom.js';
import { UIButton } from '../src/ui/UIButton.js';
import { UIText } from '../src/ui/UIText.js';
import { UIContainer } from '../src/ui/UIContainer.js';
import { UIProgressBar } from '../src/ui/UIProgressBar.js';
import { UISwitch } from '../src/ui/UISwitch.js';
import { UIDropdown } from '../src/ui/UIDropdown.js';
import { UIPanel } from '../src/ui/UIPanel.js';
import { SaveCard } from '../src/ui/SaveCard.js';
import { SaveSystem } from '../src/systems/SaveSystem.js';
import { DashboardColumns } from '../src/config/DashboardLayout.js';

describe('UI widgets', (test) => {
  test('UIButton renders its label and fires onClick unless disabled', () => {
    let clicks = 0;
    const button = new UIButton({ text: 'Go', onClick: () => clicks++ });
    const dom = button.getDomElement();
    assert.equal(dom.tagName, 'BUTTON');
    assert.ok(dom.textContent.includes('Go'));
    dom.click();
    button.setEnabled(false);
    dom.click();
    assert.equal(clicks, 1);
  });

  test('UIText renders rich text as nodes, never as markup', () => {
    const text = new UIText({ text: '' });
    text.setRichText('A <b>{n}</b>', { n: 7 });
    const dom = text.getDomElement();
    assert.equal(dom.textContent, 'A 7');
    assert.ok(!dom.textContent.includes('<b>'));
    assert.ok(dom.querySelectorAll('strong').length + dom.querySelectorAll('b').length + dom.querySelectorAll('.is-bold').length >= 1, 'bold node');
  });

  test('UIContainer manages children', () => {
    const child = new UIText({ text: 'x' });
    const container = new UIContainer({ className: 'box', children: [child] });
    assert.equal(container.getChildren().length, 1);
    container.removeChild(child);
    assert.equal(container.getDomElement().children.length, 0);
  });

  test('UIProgressBar exposes its percentage through a CSS variable only', () => {
    const bar = new UIProgressBar({ value: 25, max: 50 });
    bar.setValue(30, 60);
    assert.equal(bar.getPercent(), 50);
    const dom = bar.getDomElement();
    const vars = [dom, ...dom.querySelectorAll('div'), ...dom.querySelectorAll('span')].map((n) => n.style.getPropertyValue('--pw-progress'));
    assert.ok(vars.includes('50%'), '--pw-progress');
  });

  test('UISwitch toggles and reports its state', () => {
    let last = null;
    const toggle = new UISwitch({ checked: false, onLabel: 'ON', offLabel: 'OFF', onChange: (v) => { last = v; } });
    toggle.getDomElement().click();
    assert.ok(toggle.isChecked() && last === true);
    assert.ok(toggle.getDomElement().classList.contains('is-on'));
  });

  test('UIDropdown changes value', () => {
    const dropdown = new UIDropdown({ options: [{ value: 'fr', label: 'FR' }, { value: 'en', label: 'EN' }], value: 'fr' });
    assert.equal(dropdown.getValue(), 'fr');
    dropdown.setValue('en');
    assert.equal(dropdown.getValue(), 'en');
  });

  test('UIPanel puts children in its body', () => {
    const panel = new UIPanel({ id: 'test-panel', title: 'T', bodyId: 'test-body' });
    panel.addChild(new UIText({ text: 'inside' }));
    const body = panel.getDomElement().querySelector('#test-body');
    assert.ok(body && body.textContent.includes('inside'));
  });

  test('SaveCard renders a save summary', () => {
    const save = SaveSystem.getInstance().createNewSave('Misty', 'squirtle');
    let clicked = false;
    const card = new SaveCard({ save, mode: 'menu', onClick: () => { clicked = true; } });
    assert.ok(card.getDomElement().textContent.includes('Misty'));
    card.getDomElement().dispatchEvent(fakeEvent('click', { bubbles: true }));
    assert.ok(clicked);
  });
});

describe('Panels', (test) => {
  const dir = path.resolve('src/panels');
  const skip = new Set();
  for (const file of fs.readdirSync(dir).filter((f) => (f.endsWith('Panel.js') || f.endsWith('Modal.js')) && !skip.has(f))) {
    test(`${file} builds without errors`, async () => {
      const module = await import(`../src/panels/${file}`);
      const PanelClass = module[file.replace('.js', '')];
      const panel = new PanelClass(DashboardColumns.CENTER);
      const dom = panel.getDomElement();
      const hasId = (node) => !!node.id || node.children.some(hasId);
      assert.ok(hasId(dom), 'panel exposes a stable id for CSS');
      assert.ok(panel.getDomElement().children.length > 0, 'panel has content');
    });
  }
});
