/**
 * Wave 22 — remaining displays migration (Chromium measures in
 * harness/visual-wave22.mjs, jsdom probe harness/probe-wave22.mjs):
 *
 *  A. Secret Base dialogs rebuilt from zero by the ECS BaseNpcDialogView /
 *     BasePcDialogView: every inline style of the PC flag card removed
 *     (rgba-black surfaces → light2-mix tokens; hardcoded #c9bc8a →
 *     --light1; gradient rank bar → FLAT --pw-rank-color fill with the
 *     canonical data-pct/inline-width contract), the inline red-GRADIENT
 *     collect button is the flat danger kind, and the GREYED-OUT DEAD
 *     cooldown button becomes an informative line (same DS rule as the
 *     quest cards / wave-21 lock line). Contracts kept: close cross,
 *     baseDialogNpcFight, #base-pc-panel, #base-pc-msg-input,
 *     saveBasePcMessage, collectSecretBaseFlag with QUOTED id.
 *  B. NPC editor + 4 pickers rebuilt from zero by the ECS BaseNpc*View:
 *     ~103 inline-styled look <img> class-based, scroll/sticky/team zones
 *     class-based, current-item outline → .is-current. Contracts kept:
 *     #base-npced-team, data-change-call/-args on name & quote inputs,
 *     baseNpcEditorPickChoose / EquipItem + openItemInfo context /
 *     SetSprite (quoted) / ImportPresetFromPicker (quoted), filters
 *     data-action filter-base-npc-picker / filter-base-npc-sprite.
 *  C. Atoll FACTORY prep shell rebuilt from zero by AtollFactoryPrepView
 *     (#atoll-prep-body.team-view drag&drop target re-installed by the
 *     adapter AFTER the html is set).
 *
 * All DOM-free (source contracts + component HTML strings).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BaseNpcDialogView, BasePcDialogView, BaseNpcEditorView,
  BaseNpcPickerView, BaseNpcItemPickerView, BaseNpcSpritePickerView, BaseNpcPresetPickerView,
} from '../src/ui/views/BaseViews.js';
import { AtollFactoryPrepView } from '../src/ui/views/AtollFactoryPrepView.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CSS = R('src/assets/styles/design-system.css');
const DIALOG_JS = R('src/ui/game/base/base-dialog.js');
const NPCED_JS = R('src/ui/game/base/base-npc-editor.js');
const FSP_JS = R('src/ui/game/fullscreen-panel.js');

const NO_VISUAL_INLINE = /style=\"[^\"]*(color:|background|rgba|gradient|margin|padding|justify|align|font|opacity|cursor|#)/;

/* ─── A. Base dialogs ───────────────────────────────────────────────────── */

test('wave22: BaseNpcDialogView — encounter contracts (fight/close, chips)', () => {
  const html = BaseNpcDialogView.toHTML({
    titleIconUrl: 'u/t.png', name: 'Pierre <Roche>', subText: 'Dresseur de base', subKind: 'light1',
    portraitUrl: 'u/t.png', speech: 'Prêt au combat ?',
    teamChipsHtml: ['<span class="preset-chip" title="Pikachu Nv.12">X</span>'],
    primary: { label: 'Combattre', call: 'baseDialogNpcFight', callArgs: '' },
    secondaryLabel: 'Décliner',
  });
  assert.ok(html.includes('pw-view\" data-view=\"BaseNpcDialogView\"'), 'ECS view stamp');
  assert.ok(html.includes('data-call="closeBaseDialog"'), 'close cross contract');
  assert.ok(html.includes('data-action="legacy-call" data-call="baseDialogNpcFight"'), 'fight contract');
  assert.ok(html.includes('class="base-dlg-body"') && html.includes('class="base-dlg-speech"'), 'speech zone classes kept');
  assert.ok(html.includes('<span class="preset-chip"'), 'team chips rendered');
  assert.ok(html.includes('Pierre &lt;Roche&gt;'), 'vdom escapes the name');
  assert.ok(html.includes('pw-base-portrait is-96') && html.includes('pw-base-portrait is-28'), 'class-sized portraits (no inline size)');
  assert.ok(!NO_VISUAL_INLINE.test(html), 'ZERO visual inline style');
});

test('wave22: BasePcDialogView — flat flag card, NO dead cooldown button', () => {
  const htmlCollect = BasePcDialogView.toHTML({
    title: 'PC', subText: 'Base visitée', closeLabel: 'Fermer',
    stats: { visitsLabel: 'Visites', visits: 9, winsLabel: 'V', wins: 3, lossesLabel: 'D', losses: 1 },
    flag: {
      rankId: 'gold', rankLabel: 'Drapeau Or', countLabel: 'Total :', count: 4, flagsWord: 'drapeaux',
      uniqueBases: 2, basesWord: 'bases', ownBadge: null, pct: 40,
      next: { kind: 'next', label: 'Prochain rang à', req: 10, countText: '(4/10)' },
      bonusesTitle: 'Bonus actifs', bonusLines: ['• Argent +10 %', '• Aucun bonus shiny'],
      collect: { label: '🚩 Prendre le drapeau de la base (+1)', callArgs: "'guest_route113'" }, cooldownText: null,
    },
    pc: { kind: 'view', title: 'Message du propriétaire', text: 'Bienvenue <chez moi>' },
  });
  assert.ok(htmlCollect.includes('pw-view\" data-view=\"BasePcDialogView\"'), 'ECS view stamp');
  assert.ok(htmlCollect.includes('id="base-pc-panel"'), '#base-pc-panel kept');
  assert.ok(htmlCollect.includes('pw-base-flag-card is-rank-gold'), 'rank tone is a class (no inline colour)');
  assert.ok(htmlCollect.includes('data-call="collectSecretBaseFlag" data-call-args="\'guest_route113\'"'), 'collect contract (QUOTED id)');
  assert.ok(htmlCollect.includes('pw-btn-danger'), 'collect = flat danger kind (no inline gradient)');
  assert.ok(!/linear-gradient/.test(htmlCollect), 'ZERO gradient in markup');
  assert.ok(!/style=\"[^\"]*(background|color|#|rgba)/.test(htmlCollect.replace(/style=\"width:[^\"]*\"/g, '')), 'ZERO visual inline style besides the canonical bar width');
  assert.ok(htmlCollect.includes('data-pct="40"'), 'bar data-pct contract');
  assert.ok(!/button[^>]*disabled/.test(htmlCollect) && !htmlCollect.includes('hbtn disabled'), 'ZERO greyed-out dead button');
  assert.ok(htmlCollect.includes('“Bienvenue &lt;chez moi&gt;”'), 'owner quote rendered + escaped');

  const htmlCooldown = BasePcDialogView.toHTML({
    title: 'PC', subText: 'Base visitée', closeLabel: 'Fermer',
    flag: {
      rankId: 'normal', rankLabel: 'Drapeau Normal', countLabel: 'Total :', count: 1, flagsWord: 'drapeaux',
      uniqueBases: 0, basesWord: 'bases', ownBadge: null, pct: 10,
      next: { kind: 'next', label: 'Prochain rang à', req: 10, countText: '(1/10)' },
      bonusesTitle: 'Bonus actifs', bonusLines: ['• Aucun bonus actif'],
      collect: null, cooldownText: 'Drapeau déjà capturé aujourd’hui. Revenez dans 7 h.',
    },
    pc: null,
  });
  assert.ok(!htmlCooldown.includes('collectSecretBaseFlag'), 'cooldown → no collect action');
  assert.ok(htmlCooldown.includes('pw-base-flag-cooldown'), 'cooldown = informative line (dead button removed)');
  assert.ok(!/button[^>]*disabled/.test(htmlCooldown), 'ZERO disabled button');

  const htmlOwn = BasePcDialogView.toHTML({
    title: 'PC', subText: 'Votre base', closeLabel: 'Fermer',
    flag: {
      rankId: 'bronze', rankLabel: 'Drapeau Bronze', countLabel: 'Total :', count: 12, flagsWord: 'drapeaux',
      uniqueBases: 0, basesWord: 'bases', ownBadge: 'Ma Base Secrète', pct: 100,
      next: { kind: 'supreme', text: 'Rang Suprême ORAS atteint !' },
      bonusesTitle: 'Bonus actifs', bonusLines: ['• Argent +20 %'], collect: null, cooldownText: null,
    },
    pc: { kind: 'edit', title: 'Message PC pour visiteurs', hint: 'Affiché aux preneurs de drapeau.', placeholder: 'Bienvenue !', value: 'Bienvenue', saveLabel: 'Enregistrer message' },
  });
  assert.ok(htmlOwn.includes('id="base-pc-msg-input"'), 'textarea id kept');
  assert.ok(htmlOwn.includes('maxlength="200"'), 'maxlength kept');
  assert.ok(htmlOwn.includes('data-call="saveBasePcMessage"'), 'save contract kept');
  assert.ok(htmlOwn.includes('pw-base-pc-input'), 'textarea is a token class (inline textarea styles deleted)');
  assert.ok(htmlOwn.includes('pw-badge-gold'), 'own badge kept');
  assert.ok(!/button[^>]*disabled/.test(htmlOwn), 'own → no dead button');
});

/* ─── B. NPC editor + pickers ───────────────────────────────────────────── */

test('wave22: BaseNpcEditorView — change wiring + team zone + sticks', () => {
  const html = BaseNpcEditorView.toHTML({
    titleIconUrl: 'u/t.png', title: 'Éditeur de PNJ', hint: 'Astuce',
    portraitUrl: 'u/t.png', portraitHint: 'Changer apparence',
    nameValue: 'Léo', namePlaceholder: 'Nom du PNJ',
    spriteMetaLine: 'Apparence · 101 dispo · Clique image',
    teamLabel: 'Équipe du PNJ (2)', levelAutoText: 'Niveau auto', presetBtnLabel: 'Depuis preset',
    cardsHtml: '<div class="poke-card">CARD1</div><div class="poke-card">CARD2</div>',
    quotesLabel: 'Répliques',
    quotes: [{ key: 'pre', label: 'Avant', value: 'Allons-y !' }, { key: 'win', label: 'Victoire', value: 'GG <facile>' }],
    saveLabel: 'Enregistrer', deleteLabel: 'Supprimer', backLabel: 'Retour',
  });
  assert.ok(html.includes('pw-view\" data-view=\"BaseNpcEditorView\"'), 'ECS view stamp');
  assert.ok(html.includes('id="base-npced-team" class="team-view pw-base-npced-team"'), 'team zone contract (drag&drop target)');
  assert.ok(html.includes('<div class="poke-card">CARD1</div>'), 'cards rendered as trusted DS html');
  assert.ok(html.includes('data-change-call="baseNpcEditorSetField" data-change-args="\'name\', this.value"'), 'name change wiring kept');
  assert.ok(html.includes('value="Léo"'), 'name value in attribute');
  assert.ok(html.includes('data-change-call="baseNpcEditorSetQuote" data-change-args="\'win\', this.value"'), 'quote change wiring kept (quoted key)');
  assert.ok(html.includes('GG &lt;facile&gt;'), 'quote value escaped');
  assert.ok(html.includes('data-call="baseNpcEditorSave"') && html.includes('data-call="baseNpcEditorDelete"') && html.includes('data-call="closeBaseNpcEditor"'), 'action contracts kept');
  assert.ok(html.includes('pw-base-npced-actions'), 'sticky actions = class (inline sticky deleted)');
  assert.ok(html.includes('data-call="baseNpcEditorOpenSpritePicker"'), 'portrait button contract kept');
  assert.ok(!NO_VISUAL_INLINE.test(html), 'ZERO visual inline style');
});

test('wave22: pickers — rows, context info, looks grid, preset rows', () => {
  const pick = BaseNpcPickerView.toHTML({
    title: 'Choisir', sub: 'Léo · 1/6', searchValue: 'pika', searchPlaceholder: 'Rechercher…',
    rows: [{ spriteHtml: '<i>S</i>', nameText: 'Pikachu', metaText: '#25 · Nv.12', tagText: 'Équipe', inBox: false, callArgs: '0, 3' }],
    emptyLabel: '—', remove: { label: 'Retirer', callArgs: '0' }, backLabel: 'Retour',
  });
  assert.ok(pick.includes('data-action="filter-base-npc-picker"'), 'search filter contract');
  assert.ok(pick.includes('data-call="baseNpcEditorPickChoose" data-call-args="0, 3"'), 'choose contract');
  assert.ok(pick.includes('class="preset-pick-tag'), 'origin tag brick kept');
  assert.ok(pick.includes('data-call="baseNpcEditorRemoveMon"'), 'remove contract');
  assert.ok(!NO_VISUAL_INLINE.test(pick), 'picker: ZERO visual inline style');

  const item = BaseNpcItemPickerView.toHTML({
    titleIconHtml: '<i>I</i>', title: 'Objet de Pikachu', sub: 'Restes',
    rows: [{ spriteHtml: '<i>S</i>', nameText: 'Restes', descText: 'Soigne', isCurrent: true, callArgs: "0, 'leftovers'", contextArgs: "'leftovers'" }],
    emptyLabel: '—', remove: { label: 'Retirer', callArgs: '0' }, backLabel: 'Retour',
  });
  assert.ok(item.includes('data-call="baseNpcEditorEquipItem" data-call-args="0, \'leftovers\'"'), 'equip contract (quoted key)');
  assert.ok(item.includes('data-context-call="openItemInfo" data-context-args="\'leftovers\'"'), 'right-click info contract');
  assert.ok(item.includes('preset-pick-row is-current'), 'current marker = class (inline outline deleted)');
  assert.ok(item.includes('data-call="baseNpcEditorClearItem"'), 'clear contract');

  const looks = BaseNpcSpritePickerView.toHTML(_modelLooks());
  function _modelLooks() {
    return {
      title: 'Apparences (3/3)', hint: null, filterValue: '', filterPlaceholder: 'trainer-42...',
      closeCall: 'baseNpcEditorCloseSpritePicker',
      sprites: [
        { id: 'trainer-0', selected: true, url: 'u/0.png' },
        { id: 'trainer-1', selected: false, url: 'u/1.png' },
        { id: 'trainer-2', selected: false, url: 'u/2.png' },
      ],
      emptyLabel: 'Aucun', backLabel: 'Retour',
    };
  }
  assert.ok(looks.includes('pw-view\" data-view=\"BaseNpcSpritePickerView\"'), 'sprite picker view stamp');
  assert.ok(looks.includes('base-npc-look sel'), 'selected look marker');
  assert.ok(looks.includes('data-call="baseNpcEditorSetSprite" data-call-args="\'trainer-2\'"'), 'set sprite contract (quoted)');
  assert.ok(looks.includes('data-call="baseNpcEditorCloseSpritePicker"'), 'close target override');
  assert.ok(looks.includes('data-action="filter-base-npc-sprite"'), 'sprite filter contract');
  assert.ok(!/style=\"/.test(looks), 'looks grid: ZERO inline style (was ~103)');

  const gridOnly = BaseNpcSpritePickerView.looksHTML([{ id: 'trainer-9', selected: false, url: 'u/9.png' }]);
  assert.ok(gridOnly.includes('base-npc-look') && gridOnly.includes('pw-base-portrait is-48'), 'grid-only re-render shares the same bricks (filter keeps focus)');
  assert.ok(!gridOnly.includes('pw-view'), 'grid fragment has no view root');

  const preset = BaseNpcPresetPickerView.toHTML({
    title: 'Choisir une équipe', hint: 'Clique pour importer',
    rows: [{ name: 'Team Démo', count: 2, spritesHtml: '<span class="preset-pick-sprite">A</span>', callArgs: "'demo'" }],
    emptyLabel: 'Aucune team', backLabel: 'Retour',
  });
  assert.ok(preset.includes('data-call="baseNpcEditorImportPresetFromPicker" data-call-args="\'demo\'"'), 'import contract (quoted key)');
  assert.ok(preset.includes('<span class="preset-pick-sprite">A</span>'), 'preset sprites rendered');
  assert.ok(!NO_VISUAL_INLINE.test(preset), 'preset picker: ZERO visual inline style');
});

/* ─── C. FACTORY prep shell ─────────────────────────────────────────────── */

test('wave22: AtollFactoryPrepView — shell contracts + drag target intact', () => {
  const html = AtollFactoryPrepView.toHTML({
    title: 'Usine de Combat — préparation', streakText: 'Série : 2 · mode Classique',
    hintText: 'Réorganisez.', cardsHtml: '<div class="poke-card">X</div>',
    continueLabel: 'Combattre', abandonLabel: 'Abandonner', noteText: 'L’ordre compte.',
  });
  assert.ok(html.includes('pw-view\" data-view=\"AtollFactoryPrepView\"'), 'ECS view stamp');
  assert.ok(html.includes('id="atoll-prep-body" class="team-view"'), 'drag&drop target contract (attribute order kept)');
  assert.ok(html.includes('class="atoll-prep-hint"') && html.includes('class="atoll-prep-note"'), 'hint bricks kept');
  assert.ok(html.includes('data-call="atollFactoryPrepFight"'), 'fight contract');
  assert.ok(html.includes('data-call="atollFactoryPrepAbandon"'), 'abandon contract');
  assert.ok(html.includes('data-call="closeAtollFactoryPrep"'), 'close cross contract');
  assert.ok(!NO_VISUAL_INLINE.test(html), 'ZERO visual inline style');
});

/* ─── Source locks (adapters + CSS) ─────────────────────────────────────── */

test('wave22: adapters are model-shapers (no raw HTML left)', () => {
  for (const [name, src, view] of [
    ['base-dialog.js', DIALOG_JS, 'BasePcDialogView'],
    ['base-npc-editor.js', NPCED_JS, 'BaseNpcEditorView'],
  ]) {
    assert.ok(!src.includes('data-style='), `${name}: no data-style template left`);
    assert.ok(!/linear-gradient/.test(src), `${name}: no gradient in source`);
    assert.ok(src.includes(`throw new Error('[ui] PokeUI views not loaded (${view})')`), `${name}: throws if views absent`);
  }
  assert.ok(!DIALOG_JS.includes('#c9bc8a'), 'hardcoded #c9bc8a deleted from the dialogs');
  assert.ok(!DIALOG_JS.includes('#e53935'), 'inline red collect deleted from the dialogs');
  assert.ok(!/style=\\"/.test(DIALOG_JS), 'base-dialog.js: zero style= template left');
  assert.ok(!/style=\\"/.test(NPCED_JS), 'base-npc-editor.js: zero style= template left');
  assert.ok(FSP_JS.includes('AtollFactoryPrepView.toHTML'), 'factory prep adapter delegates the shell');
  assert.ok(FSP_JS.indexOf('installAtollPrepDragDrop()') > FSP_JS.indexOf('AtollFactoryPrepView.toHTML'), 'drag&drop re-installed AFTER the html is set');
});

test('wave22: DS2822 tokens — flat fill, rank vars, pw-btn-danger collect', () => {
  assert.ok(CSS.includes('.pw-base-flag-fill'), 'flag fill rule exists');
  const CSS_NC = CSS.replace(/\/\*[\s\S]*?\*\//g, ''); // comments stripped (they narrate the fix)
  const fillRule = CSS_NC.split('.pw-base-flag-fill')[1].split('}')[0];
  assert.ok(fillRule.includes('background: var(--pw-rank-color)'), 'fill = FLAT rank var (gradient deleted)');
  assert.ok(!/\.pw-base-flag-fill[^{]*\{[^}]*gradient/.test(CSS_NC), 'NO gradient declaration in the flag fill rule');
  for (const r of ['normal', 'bronze', 'silver', 'gold', 'platinum']) {
    assert.ok(CSS.includes(`.pw-base-flag-card.is-rank-${r}`), `rank class: ${r}`);
    assert.ok(CSS.includes(`[data-theme="light"] .pw-base-flag-card.is-rank-${r}`), `light-theme label tone: ${r}`);
  }
  assert.ok(CSS.includes('.pw-base-flag-bonuses-title') && CSS.includes('color: var(--accent);'), 'bonuses title on --accent (AA small text)');
  assert.ok(CSS.includes('.pw-base-flag-cooldown'), 'cooldown informative line styled');
  assert.ok(CSS.includes('img.pw-base-portrait.is-96') && CSS.includes('img.pw-base-portrait.is-28'), 'portrait sizes are classes');
  const collectRule = CSS_NC.split('button.hbtn.pw-base-flag-collect')[1].split('}')[0];
  assert.ok(collectRule.includes('width: 100%') && !/background|gradient/.test(collectRule), 'collect rule = layout only, colour inherited from the flat danger kind');
});

