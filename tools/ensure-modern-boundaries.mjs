import fs from 'node:fs';
import path from 'node:path';

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
};

write('src/domain/game/initial-state.js', `export function createInitialGameState() {
  return {
    location: 'pallet', region: 'kanto', team: [], inventory: {}, money: 2000,
    badges: [], defeatedChamps: {}, pokedex: {}, stepsLeft: 0,
    starter: false, starterKanto: false, starterJohto: false,
    regionStarter: { kanto: false, johto: false },
    collection: {}, evolvedSpecies: [], dupeCatches: {}, lang: 'fr',
    storyIdx: 0, storyProgress: 0, unlockedTalents: {}, activeQuests: [],
    repeatables: [], visitedMaps: {}, completedQuests: {}, wildWinsByLoc: {},
    playTimeMs: 0, saveMeta: {},
  };
}
export const gameState = createInitialGameState();
`);

write('src/domain/battle/battle-state.js', `export function createInitialBattleState() {
  return {
    active: false, enemy: null, enemyPoke: null, playerPokeIdx: 0,
    isChamp: false, champId: null, champPokeIdx: 0,
    turnLocked: false, escaped: false, chill: false,
    playerMods: { atk: 1, def: 1, spe: 1 },
    enemyMods: { atk: 1, def: 1, spe: 1 },
    log: [], sessionCatches: [], sessionItems: {},
    pendingLeave: false, pendingSwitchIdx: null,
  };
}
export const battleState = createInitialBattleState();
`);

write('src/domain/battle/type-system.js', `export const TYPES = Object.freeze(['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']);
export const TYPE_COLORS = Object.freeze({Normal:'#a8a878',Fire:'#f08030',Water:'#6890f0',Grass:'#78c850',Electric:'#f8d030',Ice:'#98d8d8',Fighting:'#c03028',Poison:'#a040a0',Ground:'#e0c068',Flying:'#a890f0',Psychic:'#f85888',Bug:'#a8b820',Rock:'#b8a038',Ghost:'#705898',Dragon:'#7038f8',Dark:'#705848',Steel:'#b8b8d0',Fairy:'#ee99ac'});
export const TYPE_CHART = Object.freeze({Normal:{Rock:.5,Steel:.5,Ghost:0},Fire:{Fire:.5,Water:.5,Rock:.5,Dragon:.5,Grass:2,Ice:2,Bug:2,Steel:2},Water:{Water:.5,Grass:.5,Dragon:.5,Fire:2,Ground:2,Rock:2},Grass:{Fire:.5,Grass:.5,Poison:.5,Flying:.5,Bug:.5,Dragon:.5,Steel:.5,Water:2,Ground:2,Rock:2},Electric:{Grass:.5,Electric:.5,Dragon:.5,Ground:0,Water:2,Flying:2},Ice:{Water:.5,Ice:.5,Fire:2,Fighting:2,Rock:2,Steel:2,Grass:2,Ground:2,Flying:2,Dragon:2},Fighting:{Poison:.5,Bug:.5,Psychic:.5,Flying:.5,Fairy:.5,Ghost:0,Normal:2,Ice:2,Rock:2,Dark:2,Steel:2},Poison:{Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Grass:2,Fairy:2},Ground:{Grass:.5,Bug:.5,Flying:0,Fire:2,Electric:2,Poison:2,Rock:2,Steel:2},Flying:{Electric:.5,Rock:.5,Steel:.5,Grass:2,Fighting:2,Bug:2},Psychic:{Psychic:.5,Steel:.5,Dark:0,Fighting:2,Poison:2},Bug:{Fire:.5,Fighting:.5,Flying:.5,Ghost:.5,Steel:.5,Fairy:.5,Grass:2,Psychic:2,Dark:2},Rock:{Fighting:.5,Ground:.5,Steel:.5,Fire:2,Ice:2,Flying:2,Bug:2},Ghost:{Normal:0,Fighting:0,Ghost:2,Psychic:2},Dragon:{Steel:.5,Fairy:0,Dragon:2},Dark:{Fighting:.5,Dark:.5,Fairy:.5,Psychic:2,Ghost:2},Steel:{Fire:.5,Water:.5,Electric:.5,Steel:.5,Ice:2,Rock:2,Fairy:2},Fairy:{Fire:.5,Poison:.5,Steel:.5,Fighting:2,Dragon:2,Dark:2}});
export function typeEffect(attackType, defendType1, defendType2) { const first = TYPE_CHART[attackType]?.[defendType1] ?? 1; const second = defendType2 ? (TYPE_CHART[attackType]?.[defendType2] ?? 1) : 1; return first * second; }
export function effectivenessText(multiplier, translate = globalThis.t) { const t = typeof translate === 'function' ? translate : (key) => key; if(multiplier===0) return t('eff_immune'); if(multiplier>=4) return t('eff_super_x4'); if(multiplier>=2) return t('eff_super'); if(multiplier<=0.25) return t('eff_very_weak'); if(multiplier<=0.5) return t('eff_weak'); return ''; }
`);

if (fs.existsSync('src/legacy/scripts/core/event-bus.js')) {
  write('src/legacy/scripts/core/event-bus.js', `var EVENTS = window.PokeWorldEventBus.EVENTS;
var EventBus = window.PokeWorldEventBus.eventBus;
`);
}

if (fs.existsSync('src/legacy/scripts/core/state.js')) {
  let source = fs.readFileSync('src/legacy/scripts/core/state.js', 'utf8');
  source = source.replace(/'use strict';\s*\n\s*const safeStorage = \{[\s\S]*?\};/, 'var safeStorage = window.PokeWorldCore.storage;');
  source = source.replace(/var G = \{[\s\S]*?wildWinsByLoc:\{\}\s*\n\};/, 'var G = window.PokeWorldState.gameState;');
  source = source.replace(/const TYPES = \[[\s\S]*?function effText\(mult\)\{[\s\S]*?\n\}/, `var TYPES = window.PokeWorldDomain.typeSystem.TYPES;
var TYPE_COLORS = window.PokeWorldDomain.typeSystem.TYPE_COLORS;
var CHART = window.PokeWorldDomain.typeSystem.TYPE_CHART;
function typeEff(atkType, defType1, defType2){
 return window.PokeWorldDomain.typeSystem.typeEffect(atkType, defType1, defType2);
}
function effText(mult){
 return window.PokeWorldDomain.typeSystem.effectivenessText(mult, (typeof t === 'function') ? t : undefined);
}`);
  source = source.replace(/let battle = \{[\s\S]*?pendingLeave:false, pendingSwitchIdx:null\};/, 'var battle = window.PokeWorldBattleState.battleState;');
  fs.writeFileSync('src/legacy/scripts/core/state.js', source, 'utf8');
}

if (fs.existsSync('src/legacy/scripts/core/util.js')) {
  let source = fs.readFileSync('src/legacy/scripts/core/util.js', 'utf8');
  source = source.replace(/function rand\(min,max\)\{[^\n]*\}\nfunction chance\(pct\)\{[^\n]*\}\nfunction clamp\(v,lo,hi\)\{[^\n]*\}/, `function rand(min,max){return window.PokeWorldCore.randomInt(min,max);}
function chance(pct){return window.PokeWorldCore.chancePercent(pct);}
function clamp(v,lo,hi){return window.PokeWorldCore.clamp(v,lo,hi);}`);
  fs.writeFileSync('src/legacy/scripts/core/util.js', source, 'utf8');
}

if (fs.existsSync('src/assets/styles/extracted-bridges.css')) {
  const source = fs.readFileSync('src/assets/styles/extracted-bridges.css', 'utf8').replace('/* Extracted from static data-css bridge attributes. */\n', '');
  fs.writeFileSync('src/assets/styles/extracted-bridges.css', source, 'utf8');
}

console.log('Modern boundaries ensured.');

if (fs.existsSync('src/assets/css/style.css')) {
  let css = fs.readFileSync('src/assets/css/style.css', 'utf8');
  css = css.replace("src: url('../font/WinkySans.ttf') format('truetype');", "src: url('../font/WinkySans.woff2') format('woff2');");
  css = css.replace("src: url('../font/WinkySans-Regular.ttf') format('truetype');", "src: url('../font/WinkySans.woff2') format('woff2');");
  fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
}
for (const font of ['src/assets/font/WinkySans.ttf', 'src/assets/font/WinkySans-Regular.ttf', 'src/assets/font/Megrim-Regular.ttf']) {
  if (fs.existsSync(font)) fs.rmSync(font, { force: true });
}

for (const file of ['src/ui/input/inline-handler-sanitizer.js', 'src/file-postboot.js']) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace("'[style]',\n    '[data-inline-css]',", "'[data-css]',\n    '[data-inline-css]',");
  source = source.replace("'style',\n      'data-inline-css',", "'data-css',\n      'data-inline-css',");
  source = source.replace("['[style]', '[data-inline-css]']", "['[data-css]', '[data-inline-css]']");
  source = source.replace("['style', 'data-inline-css']", "['data-css', 'data-inline-css']");
  fs.writeFileSync(file, source, 'utf8');
}

if (fs.existsSync('src/legacy/scripts/gameplay/save/settings.js')) {
  let source = fs.readFileSync('src/legacy/scripts/gameplay/save/settings.js', 'utf8');
  source = source.replace("dr.style.display = (dr.style.display === 'none') ? 'flex' : 'none';", "dr.style.display = (getComputedStyle(dr).display === 'none') ? 'flex' : 'none';");
  fs.writeFileSync('src/legacy/scripts/gameplay/save/settings.js', source, 'utf8');
}

if (fs.existsSync('src/assets/styles/mobile-accessibility.css')) {
  let source = fs.readFileSync('src/assets/styles/mobile-accessibility.css', 'utf8');
  if (!source.includes('.modal-close:empty::before')) {
    source += "\n.modal-close:empty::before { content: '✕'; }\n.modal-close { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; }\n";
  }
  fs.writeFileSync('src/assets/styles/mobile-accessibility.css', source, 'utf8');
}



for (const file of ['src/ui/input/global-action-delegation.js', 'src/file-preflight.js', 'src/file-postboot.js']) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace("'toggle-debug-menu': () => callGlobal('toggleDebugMenu'),", "'toggle-debug-menu': () => toggleDebugDrawerDirect(),");
  source = source.replace("'toggle-debug-menu': function () { callGlobal('toggleDebugMenu'); }", "'toggle-debug-menu': function () { toggleDebugDrawerDirect(); }");
  source = source.replace(/callGlobal\('toggleDebugMenu'\);/g, 'toggleDebugDrawerDirect();');
  if (!source.includes('function toggleDebugDrawerDirect')) {
    source = source.replace(/function parseLegacyArgs\(raw, event, element\) \{/, `function toggleDebugDrawerDirect() {
  const drawer = document.getElementById('debug-drawer');
  if (!drawer) return;
  drawer.style.display = getComputedStyle(drawer).display === 'none' ? 'flex' : 'none';
}

function parseLegacyArgs(raw, event, element) {`);
  }
  fs.writeFileSync(file, source, 'utf8');
}


if (fs.existsSync('src/file-postboot.js')) {
  let source = fs.readFileSync('src/file-postboot.js', 'utf8');
  const start = source.indexOf("    var close = target.closest('.modal-close');");
  const end = source.indexOf("\n\n    var teamBody", start);
  if (start !== -1 && end !== -1) {
    const block = `    var close = target.closest('.modal-close');
    if (close) {
      if (close.closest('#settings-modal')) callGlobal('closeSettings');
      else if (close.closest('#unified-selector-modal')) callGlobal('closeUnifiedSelectorModal');
      else if (close.closest('#battle-summary-modal')) callGlobal('closeBattleSummary');
      else if (close.closest('#poke-modal')) { var pm = document.getElementById('poke-modal'); if (pm) pm.classList.remove('open'); }
      else if (close.closest('#confirm-modal')) callGlobal('closeConfirm');
      event.__pokeWorldHandled = true;
      return;
    }`;
    source = source.slice(0, start) + block + source.slice(end);
  }
  source = source.replace("if (target.closest('#debug-toggle-btn')) {\n      toggleDebugDrawerDirect();\n      return;\n    }", "if (target.closest('#debug-toggle-btn')) {\n      toggleDebugDrawerDirect();\n      event.__pokeWorldHandled = true;\n      return;\n    }");
  source = source.replace("if (index >= 0) callGlobal('onTeamCardClick', event, index);", "if (index >= 0) { callGlobal('onTeamCardClick', event, index); event.__pokeWorldHandled = true; }");
  fs.writeFileSync('src/file-postboot.js', source, 'utf8');
}

if (fs.existsSync('src/ui/input/global-action-delegation.js')) {
  let source = fs.readFileSync('src/ui/input/global-action-delegation.js', 'utf8');
  source = source.replace("root.addEventListener('click', (event) => {\n    const actionTarget", "root.addEventListener('click', (event) => {\n    if (event.__pokeWorldHandled) return;\n    const actionTarget");
  source = source.replace("    event.preventDefault();\n    handler(actionTarget, event);", "    handler(actionTarget, event);");
  fs.writeFileSync('src/ui/input/global-action-delegation.js', source, 'utf8');
}


// toggle-debug-menu preflight direct guard
if (fs.existsSync('src/file-preflight.js')) {
  let source = fs.readFileSync('src/file-preflight.js', 'utf8');
  source = source.replace("'sort-unified-grid': ['sortUnifiedGrid', element.dataset.sort], 'close-battle-summary': ['closeBattleSummary'], 'restart-last-battle': ['restartLastBattle'], 'toggle-debug-menu': ['toggleDebugMenu'],", "'sort-unified-grid': ['sortUnifiedGrid', element.dataset.sort], 'close-battle-summary': ['closeBattleSummary'], 'restart-last-battle': ['restartLastBattle'],");
  const guard = "if (target.closest('#debug-toggle-btn') || target.closest('[data-action=\"toggle-debug-menu\"]')) { toggleDebugDrawerDirect(); event.__pokeWorldHandled = true; return; }";
  if (!source.includes(guard)) {
    source = source.replace("const actionElement = target.closest('[data-action]');", `${guard}\n      const actionElement = target.closest('[data-action]');`);
  }
  fs.writeFileSync('src/file-preflight.js', source, 'utf8');
}


if (fs.existsSync('src/file-preflight.js')) {
  let source = fs.readFileSync('src/file-preflight.js', 'utf8');
  if (!source.includes('function installLegacyGlobalsClassic')) {
    const inject = `

  function installLegacyGlobalsClassic() {
    window.safeStorage = window.PokeWorldCore.storage;
    window.G = window.PokeWorldState.gameState;
    window.battle = window.PokeWorldBattleState.battleState;
    window.EVENTS = window.PokeWorldEventBus.EVENTS;
    window.EventBus = window.PokeWorldEventBus.eventBus;
    window.TYPES = window.PokeWorldDomain.typeSystem.TYPES;
    window.TYPE_COLORS = window.PokeWorldDomain.typeSystem.TYPE_COLORS;
    window.CHART = window.PokeWorldDomain.typeSystem.TYPE_CHART;
    window.typeEff = function (attackType, defendType1, defendType2) { return window.PokeWorldDomain.typeSystem.typeEffect(attackType, defendType1, defendType2); };
    window.effText = function (multiplier) { return window.PokeWorldDomain.typeSystem.effectivenessText(multiplier, window.t); };
    window.rand = function (min, max) { return window.PokeWorldCore.randomInt(min, max); };
    window.chance = function (percent) { return window.PokeWorldCore.chancePercent(percent); };
    window.clamp = function (value, min, max) { return window.PokeWorldCore.clamp(value, min, max); };
    window.notify = function (message, color) { const element = document.getElementById('notif'); if (!element) return; element.textContent = message; element.style.background = color || 'var(--green)'; element.style.display = 'block'; clearTimeout(element._t); element._t = setTimeout(function () { element.style.display = 'none'; }, 2500); };
    window.setMsg = function (message) { window.notify(message); };
    window.addBattleLog = function (message) { if (!window.battle.log) window.battle.log = []; window.battle.log.push(message); if (window.battle.log.length > 60) window.battle.log.shift(); const modal = document.getElementById('battle-summary-modal'); if (modal && modal.classList.contains('open') && typeof window.renderBattleSummary === 'function') window.renderBattleSummary(); };
    window.clearBattleLog = function () { window.battle.log = []; };
    window.typeClass = function (type) { return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
    window.typeSpan = function (type) { return '<span class="type-badge ' + window.typeClass(type) + '">' + type + '</span>'; };
    window.hpColor = function (percent) { if (percent > 0.5) return 'var(--green)'; if (percent > 0.25) return 'var(--light2)'; return 'var(--red)'; };
  }
`;
    source = source.replace('\n\n\n  function callGlobal(name) {', `${inject}\n\n  installLegacyGlobalsClassic();\n\n  function callGlobal(name) {`);
  }
  fs.writeFileSync('src/file-preflight.js', source, 'utf8');
}

async function ensureWinkySansFont() {
  const fontPath = 'src/assets/font/WinkySans.woff2';
  fs.mkdirSync(path.dirname(fontPath), { recursive: true });
  if (!fs.existsSync(fontPath)) {
    const https = await import('node:https');
    const url = 'https://fonts.gstatic.com/s/winkysans/v3/ll85K2SDUiG1Hpf2p06bN60okw.woff2';
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(fontPath);
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Font download failed: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
  }
  for (const font of ['src/assets/font/WinkySans.ttf', 'src/assets/font/WinkySans-Regular.ttf', 'src/assets/font/Megrim-Regular.ttf']) {
    if (fs.existsSync(font)) fs.rmSync(font, { force: true });
  }
}
await ensureWinkySansFont();

write('src/domain/battle/damage.js', `export function calculateBaseDamage({ level, power, attack, defense, stab, effectiveness, critical, random, item }) {
  return Math.max(1, Math.floor(((2 * level / 5 + 2) * power * attack / defense / 50 + 2) * stab * effectiveness * critical * random * item));
}
`);

if (fs.existsSync('src/file-preflight.js')) {
  let source = fs.readFileSync('src/file-preflight.js', 'utf8');
  if (!source.includes('calculateBaseDamage')) {
    source = source.replace("window.PokeWorldDomain = { typeSystem: { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText } };", "function calculateBaseDamage(params) { return Math.max(1, Math.floor(((2 * params.level / 5 + 2) * params.power * params.attack / params.defense / 50 + 2) * params.stab * params.effectiveness * params.critical * params.random * params.item)); }\n  window.PokeWorldDomain = { typeSystem: { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText }, damage: { calculateBaseDamage } };");
  }
  fs.writeFileSync('src/file-preflight.js', source, 'utf8');
}

write('src/app/install-legacy-globals.js', `import { EVENTS, eventBus } from '../core/event-bus.js';
import { storage } from '../core/storage.js';
import { randomInt, chancePercent, clamp as clampValue } from '../core/random.js';
import { gameState } from '../domain/game/initial-state.js';
import { battleState } from '../domain/battle/battle-state.js';
import { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText } from '../domain/battle/type-system.js';
import { calculateBaseDamage } from '../domain/battle/damage.js';

export function installLegacyGlobals(target = globalThis) {
  target.safeStorage = storage;
  target.G = gameState;
  target.battle = battleState;
  target.EVENTS = EVENTS;
  target.EventBus = eventBus;
  target.TYPES = TYPES;
  target.TYPE_COLORS = TYPE_COLORS;
  target.CHART = TYPE_CHART;
  target.typeEff = typeEffect;
  target.effText = (multiplier) => effectivenessText(multiplier, target.t);
  target.rand = randomInt;
  target.chance = chancePercent;
  target.clamp = clampValue;
  target.PokeWorldDomain = { ...(target.PokeWorldDomain || {}), damage: { calculateBaseDamage }, typeSystem: { TYPES, TYPE_COLORS, TYPE_CHART, typeEffect, effectivenessText } };
  target.notify = function notify(message, color = 'var(--green)') { const element = document.getElementById('notif'); if (!element) return; element.textContent = message; element.style.background = color; element.style.display = 'block'; clearTimeout(element._t); element._t = setTimeout(() => { element.style.display = 'none'; }, 2500); };
  target.setMsg = function setMsg(message) { target.notify(message); };
  target.addBattleLog = function addBattleLog(message) { if (!target.battle.log) target.battle.log = []; target.battle.log.push(message); if (target.battle.log.length > 60) target.battle.log.shift(); const modal = document.getElementById('battle-summary-modal'); if (modal && modal.classList.contains('open') && typeof target.renderBattleSummary === 'function') target.renderBattleSummary(); };
  target.clearBattleLog = function clearBattleLog() { target.battle.log = []; };
  target.typeClass = function typeClass(type) { return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
  target.typeSpan = function typeSpan(type) { return \`<span class="type-badge \${target.typeClass(type)}">\${type}</span>\`; };
  target.hpColor = function hpColor(percent) { if (percent > 0.5) return 'var(--green)'; if (percent > 0.25) return 'var(--light2)'; return 'var(--red)'; };
}
`);

write('src/domain/economy/market.js', `export const MARKET_STOCK = Object.freeze({
  kanto: Object.freeze([1, 4, 7, 133, 137, 106, 107, 122]),
  johto: Object.freeze([152, 155, 158, 172, 173, 174, 175, 236, 196, 197, 199, 213, 238, 239, 240]),
});

export function getPokemonPrice(id, pokemonData) {
  if (id === 151) return 100000;
  if (id === 150) return 75000;
  if ([144, 145, 146].includes(id)) return 50000;
  const data = pokemonData[id];
  if (!data) return 999999;
  const baseStatTotal = data[3] + data[4] + data[5] + data[6];
  if ([1, 4, 7, 152, 155, 158].includes(id)) return 5000;
  if ([2, 5, 8].includes(id)) return 8000;
  if ([3, 6, 9].includes(id)) return 12000;
  if ([138, 140].includes(id)) return 8000;
  if ([139, 141].includes(id)) return 12000;
  if ([142].includes(id)) return 15000;
  if ([147].includes(id)) return 10000;
  if ([148].includes(id)) return 15000;
  if ([149].includes(id)) return 25000;
  let multiplier = 12;
  if (baseStatTotal >= 350) multiplier = 22;
  else if (baseStatTotal >= 300) multiplier = 18;
  else if (baseStatTotal >= 250) multiplier = 15;
  else if (baseStatTotal >= 200) multiplier = 13;
  return Math.max(1500, Math.floor(baseStatTotal * multiplier));
}
`);

write('src/domain/mine/mine-data.js', `export const MINE_WIDTH = 10;
export const MINE_HEIGHT = 8;
export const MINE_ITEMS = Object.freeze([
  { key: 'firestone', name: 'firestone', shape: [[1,1,1],[1,1,1],[1,1,1]] },
  { key: 'waterstone', name: 'waterstone', shape: [[1,1,1],[1,1,1],[1,1,0]] },
  { key: 'thunderstone', name: 'thunderstone', shape: [[0,1,0],[1,1,1],[0,1,0]] },
  { key: 'leafstone', name: 'leafstone', shape: [[0,1,0],[1,1,1],[1,1,1]] },
  { key: 'moonstone', name: 'moonstone', shape: [[1,1],[1,1]] },
  { key: 'sunstone', name: 'sunstone', shape: [[1,0,1],[0,1,0],[1,0,1]] },
  { key: 'nugget', name: 'nugget', shape: [[1,1,1],[1,1,1]] },
  { key: 'stardust', name: 'stardust', shape: [[1,1],[1,1]] },
  { key: 'helix_fossil', name: 'helix_fossil', shape: [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]] },
  { key: 'dome_fossil', name: 'dome_fossil', shape: [[1,1,1],[1,1,1],[0,1,0]] },
  { key: 'old_amber', name: 'old_amber', shape: [[1,1],[1,1],[1,1]] },
  { key: 'root_fossil', name: 'root_fossil', shape: [[1,1,0],[1,1,1],[0,1,1]] },
  { key: 'claw_fossil', name: 'claw_fossil', shape: [[1,0,1],[1,1,1],[1,0,1]] },
  { key: 'fossil', name: 'fossil', shape: [[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]] },
]);
`);

write('src/domain/breeding/fossils.js', `export const FOSSIL_REVIVE_MAP = Object.freeze({
  fossil: 138,
  ancient_fossil: 138,
  old_fossil: 138,
  fossil_ancien: 138,
  helix_fossil: 138,
  dome_fossil: 140,
  old_amber: 142,
  root_fossil: 138,
  claw_fossil: 140,
});
`);

// Final normalization pass for dynamic style bridge naming and font availability.
for (const base of ['src/legacy/scripts', 'src/localization']) {
  if (!fs.existsSync(base)) continue;
  const stack = [base];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'legacy-classic.js') {
        let source = fs.readFileSync(full, 'utf8').replace(/data-css=/g, 'data-style=');
        fs.writeFileSync(full, source, 'utf8');
      }
    }
  }
}
for (const file of ['src/ui/input/inline-handler-sanitizer.js', 'src/file-postboot.js']) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8').replace(/data-css/g, 'data-style');
  fs.writeFileSync(file, source, 'utf8');
}
if (fs.existsSync('src/assets/css/style.css')) {
  let css = fs.readFileSync('src/assets/css/style.css', 'utf8');
  css = css.replace("src: url('../font/WinkySans.ttf') format('truetype');", "src: url('../font/WinkySans.woff2') format('woff2');");
  fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
}

{
  const localizationImports = [];
  for (const lang of ['fr', 'en']) {
    const dir = `src/localization/${lang}`;
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      if (name.endsWith('.js')) localizationImports.push(`import '../localization/${lang}/${name}';`);
    }
  }
  write('src/app/import-localization.js', `// Side-effect imports for localization dictionaries in Vite/module mode.\n${localizationImports.join('\n')}\n`);
}

if (fs.existsSync('src/legacy/scripts/display/sprite-helpers.js')) {
  let source = fs.readFileSync('src/legacy/scripts/display/sprite-helpers.js', 'utf8');
  source = source.replace(/<span data-style="font-size:\$\{Math\.floor\(size\*0\.[67]\)\}px">\$\{emoji\}<\/span>/g, '<span class="sprite-fallback-emoji">${emoji}</span>');
  source = source.replace('class="sprite-img ${cls} silhouette-img" data-style="width:${size}px;height:${size}px;filter:url(#silhouette-filter);"onerror=', 'class="sprite-img ${cls} silhouette-img silhouette-filtered" width="${size}" height="${size}" onerror=');
  source = source.replace('class="sprite-img ${cls}" data-style="width:${size}px;height:${size}px"onerror=', 'class="sprite-img ${cls}" width="${size}" height="${size}" onerror=');
  source = source.replace('class="sprite-img ${cls}" data-style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;"onerror=', 'class="sprite-img ${cls} sprite-middle" width="${size}" height="${size}" onerror=');
  fs.writeFileSync('src/legacy/scripts/display/sprite-helpers.js', source, 'utf8');
}
if (fs.existsSync('src/legacy/scripts/data/ui-icons.js')) {
  let source = fs.readFileSync('src/legacy/scripts/data/ui-icons.js', 'utf8');
  source = source.replace('return `<span class="ui-icon" data-style="display:inline-flex;width:${size}px;height:${size}px;vertical-align:middle;">${icon}</span>`;', 'return `<span class="ui-icon ui-icon-sized" width="${size}" height="${size}">${icon}</span>`;');
  fs.writeFileSync('src/legacy/scripts/data/ui-icons.js', source, 'utf8');
}

if (fs.existsSync('src/legacy/scripts/core/util.js')) {
  let source = fs.readFileSync('src/legacy/scripts/core/util.js', 'utf8');
  if (!source.includes('function typeClass')) {
    source = source.replace('function typeSpan(type){', "function typeClass(type){return 'type-' + String(type || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');}\nfunction typeSpan(type){");
  }
  source = source.replace("return `<span class=\"type-badge\" data-style=\"background:${TYPE_COLORS[type]||'#888'}\">${type}</span>`;", "return `<span class=\"type-badge ${typeClass(type)}\">${type}</span>`;");
  fs.writeFileSync('src/legacy/scripts/core/util.js', source, 'utf8');
}
for (const file of ['src/legacy/scripts/display/poke-modal.js', 'src/legacy/scripts/display/box-modal.js']) {
  if (!fs.existsSync(file)) continue;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace("<span class=\"type-badge\" data-style=\"background:${TYPE_COLORS[mv?.type]||'#888'}\">${mv?.type||'?'}<\/span>", "<span class=\"type-badge ${typeClass(mv?.type||'?')}\">${mv?.type||'?'}<\/span>");
  source = source.replace("<span class=\"type-badge\" data-style=\"background:${TYPE_COLORS[mv.type]||'#888'}\">${mv.type}<\/span>", "<span class=\"type-badge ${typeClass(mv.type)}\">${mv.type}<\/span>");
  source = source.replace("<span class=\"type-badge\" data-style=\"background:${typeColor};font-size:13px;padding:3px 10px\">${type}<\/span>", "<span class=\"type-badge ${typeClass(type)} pw-type-info\">${type}<\/span>");
  fs.writeFileSync(file, source, 'utf8');
}
if (fs.existsSync('src/assets/styles/mobile-accessibility.css')) {
  let source = fs.readFileSync('src/assets/styles/mobile-accessibility.css', 'utf8');
  if (!source.includes('.pw-type-info')) source += '\n.pw-type-info { font-size: 13px; padding: 3px 10px; }\n';
  fs.writeFileSync('src/assets/styles/mobile-accessibility.css', source, 'utf8');
}
