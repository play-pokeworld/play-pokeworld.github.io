// V7-R3c · retours joueurs post-7.5.1 (son, réglages, mine, coûts auto, guide,
// filtre chromatique). Chaque test cite le retour qu'il verrouille.
//   1. Réglages : trois curseurs 0–100 (musique / effets / cris) qui FONCTIONNENT
//      (plus d'attribut oninput tué par l'assainisseur) ; plus de fourre-tout.
//   2. Musique : variété par lieu (ville natale / grande ville / côte, mer, nuit,
//      donjons Johto/Hoenn) — 26 pistes CC0 créditées.
//   3. Mine : plus d'emoji, outil courant = bascule standard (sans halo), visée
//      hors couleur d'accent, bouton Auto dans le panneau.
//   4. Coûts : chaque bouton de mode auto affiche le prix du module non acheté.
//   5. Guide : IV/EV, filtres, chromatiques, son, « où acheter ».
//   6. Poké Balls : « Nouveau chromatique » vise les shinies non possédés même si
//      l'espèce est capturée en normal ; migration des anciennes sauvegardes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

const ROOT = new URL('../', import.meta.url);
const R = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
const FR = R('src/localization/fr/ui.js');
const EN = R('src/localization/en/ui.js');
const hasKey = (src, key) => new RegExp(`^"${key}":`, 'm').test(src);
const keyText = (src, key) => {
  const m = src.match(new RegExp(`^"${key}":"((?:[^"\\\\]|\\\\.)*)"`, 'm'));
  return m ? m[1] : null;
};

function makeDomSandbox(html, stubs) {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  const sandbox = {
    console,
    window: w,
    document: w.document,
    localStorage: w.localStorage,
    navigator: { language: 'fr' },
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval() {},
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
  };
  Object.assign(sandbox, stubs);
  sandbox.globalThis = sandbox;
  for (const k of Object.keys(stubs)) w[k] = stubs[k];
  vm.createContext(sandbox);
  return { sandbox, dom };
}

// ════════════════════════════════════════════════════════════════════════════
// 1) RÉGLAGES — trois bus, curseurs 0–100 branchés via data-input-call
// ════════════════════════════════════════════════════════════════════════════
test('R3c-01 · audio : bus « cris » séparé, audioSetVolume accepte un pourcentage 0–100 explicite', () => {
  const { sandbox } = makeDomSandbox('', {});
  vm.runInContext(harnessBundleSource(['src/core/audio.js']), sandbox, { filename: 'audio.js' });
  const prefs = () => JSON.parse(vm.runInContext('JSON.stringify(audioPrefs())', sandbox));
  assert.equal(prefs().criesOn, true);
  assert.equal(prefs().criesVol, 0.6);
  vm.runInContext("audioSetVolume('cries', 35, { percent: true })", sandbox);
  assert.equal(prefs().criesVol, 0.35);
  vm.runInContext("audioSetVolume('music', 100, { percent: true })", sandbox);
  assert.equal(prefs().musicVol, 1);
  vm.runInContext("audioSetVolume('sfx', 0, { percent: true })", sandbox);
  assert.equal(prefs().sfxVol, 0);
  // 1 sans option = 100 % (plus d'heuristique « > 1 ⇒ pourcentage »)
  vm.runInContext("audioSetVolume('sfx', 1)", sandbox);
  assert.equal(prefs().sfxVol, 1);
  vm.runInContext("audioSetVolume('sfx', 0.01, { percent: false })", sandbox);
  assert.equal(prefs().sfxVol, 0.01);
  vm.runInContext("audioToggle('cries')", sandbox);
  assert.equal(prefs().criesOn, false);
});

test('R3c-02 · Réglages : 3 lignes son (musique / effets / cris) avec curseur 0–100 piloté par data-input-call ; plus de paragraphe son, de tableau des coûts ni de phrase debug', () => {
  const calls = [];
  const stubs = {
    G: { lang: 'fr', settings: {} },
    t: (k) => k,
    tr: (k, v) => k + (v ? ' ' + JSON.stringify(v) : ''),
    formatNumber: (n) => String(n),
    captureAnimationsOn: () => true,
    uiAnimationsOn: () => true,
    isDebugUnlocked: () => false,
    DISCORD_URL: 'https://discord.gg/x',
    audioPrefs: () => ({
      sfxOn: true,
      musicOn: false,
      criesOn: true,
      sfxVol: 0.8,
      musicVol: 0.4,
      criesVol: 0.6,
    }),
    audioSetVolume: (bus, v, o) => calls.push(['set', bus, v, o]),
    audioToggle: (bus) => calls.push(['toggle', bus]),
    audioPlayCry: (id) => calls.push(['cry', id]),
    safeStorage: { get: () => null, set() {}, remove() {} },
  };
  const { sandbox } = makeDomSandbox('<div id="settings-body"></div>', stubs);
  vm.runInContext(harnessBundleSource(['src/application/save/settings.js']), sandbox, {
    filename: 'settings.js',
  });
  const m = JSON.parse(vm.runInContext('JSON.stringify(window.buildSettingsModel())', sandbox));
  assert.ok(m.sound && Array.isArray(m.sound.buses), 'modèle son = liste de bus');
  assert.deepEqual(
    m.sound.buses.map((b) => b.id),
    ['music', 'sfx', 'cries']
  );
  const byId = Object.fromEntries(m.sound.buses.map((b) => [b.id, b]));
  assert.equal(byId.music.on, false);
  assert.equal(byId.music.vol, 40, 'volume exposé en pourcentage entier');
  assert.equal(byId.cries.vol, 60);
  assert.equal(byId.cries.label, 'settings_cries');
  assert.equal(m.automation, undefined, 'plus de bloc « Automatisation — coûts »');
  assert.ok(!m.sound.hint, 'plus de paragraphe explicatif son');
  assert.ok(!(m.advanced && m.advanced.hint), 'plus de phrase « mode debug réservé… »');
  // setAudioVolume : borne 0–100, passe {percent:true} ; le bus « cris » joue un cri témoin
  const lastSet = () => calls.filter((c) => c[0] === 'set').pop();
  vm.runInContext("setAudioVolume('cries', '250')", sandbox);
  assert.deepEqual(lastSet().slice(0, 3), ['set', 'cries', 100]);
  assert.ok(
    calls.some((c) => c[0] === 'cry'),
    'aperçu du cri au réglage du bus cris'
  );
  vm.runInContext("setAudioVolume('music', '-5')", sandbox);
  assert.deepEqual(lastSet().slice(0, 3), ['set', 'music', 0]);
  vm.runInContext("setAudioVolume('sfx', '33')", sandbox);
  const last = lastSet();
  assert.deepEqual(last.slice(0, 3), ['set', 'sfx', 33]);
  assert.deepEqual(JSON.parse(JSON.stringify(last[3])), { percent: true }); // objet d’un autre royaume VM
  // Vue : trois <input type=range min=0 max=100> branchés en data-input-call (plus d'oninput)
  const view = R('src/ui/views/SettingsModalView.js');
  assert.doesNotMatch(view, /\s(oninput|onchange)[=:]/);
  assert.match(view, /data-input-call|inputCall: 'setAudioVolume'|'data-input-call'/);
  assert.match(view, /max: ?'?100'?|max="100"/);
  assert.doesNotMatch(view, /settings-auto-table|settings_debug_code_hint|settings_sound_hint/);
  for (const k of [
    'settings_sound_hint',
    'settings_automation_title',
    'settings_debug_code_hint',
  ]) {
    assert.ok(!hasKey(FR, k) && !hasKey(EN, k), `${k} supprimée`);
  }
  assert.ok(hasKey(FR, 'settings_cries') && hasKey(EN, 'settings_cries'));
});

test('R3c-03 · dispatcher : canal data-input-call / data-change-call (this.value) remplace les attributs inline interdits', () => {
  const src = R('src/engine/input/action-dispatcher.js');
  assert.match(src, /data-input-call/);
  assert.match(src, /data-change-call/);
  assert.match(src, /_runLegacyDataCall\(/);
  // Plus aucun gestionnaire inline dans l'UI (tué par l'assainisseur → curseurs morts)
  const dirs = ['src/ui/views', 'src/ui/game', 'src/ui/components'];
  for (const d of dirs) {
    for (const f of fs.readdirSync(new URL(d + '/', ROOT))) {
      if (!f.endsWith('.js')) continue;
      const s = R(`${d}/${f}`);
      assert.doesNotMatch(s, /\s(oninput|onchange)=/, `${d}/${f} : gestionnaire inline`);
    }
  }
  for (const f of ['src/ui/game/shop-panel.js', 'src/ui/game/market-panel.js']) {
    assert.match(R(f), /data-input-call="(shopSetQty|marketSetQty)"/, `${f} branché`);
  }
  assert.match(R('src/ui/game/pokeball-window.js'), /data-change-call="setBallFilterValueOption"/);
});

// ════════════════════════════════════════════════════════════════════════════
// 2) MUSIQUE — variété par lieu
// ════════════════════════════════════════════════════════════════════════════
test('R3c-04 · SND-06 : 26 pistes CC0 (thèmes de ville, mer, nuit, donjons) créditées ; chaînes de repli par contexte', () => {
  const manifest = JSON.parse(R('src/assets/audio/manifest.json'));
  const expected = [
    'town_home',
    'town_city',
    'town_coast',
    'town_johto',
    'sea',
    'map_night',
    'loc_ecruteak',
    'dungeon_tower',
    'dungeon_forest',
    'dungeon_plant',
    'dungeon_lair',
  ];
  for (const k of expected) assert.ok(manifest.music[k], `piste ${k} livrée`);
  assert.equal(Object.keys(manifest.music).length, 42); // V7-R3d · SND-07 : +16 pistes
  const credits = R('docs/CREDITS.md');
  for (const k of expected) assert.ok(credits.includes('`' + k + '.mp3`'), `crédit ${k}`);
  const { sandbox } = makeDomSandbox('', {});
  vm.runInContext(harnessBundleSource(['src/core/audio.js']), sandbox, { filename: 'audio.js' });
  const chain = (ctx) =>
    JSON.parse(vm.runInContext(`JSON.stringify(audioMusicChain(${JSON.stringify(ctx)}))`, sandbox));
  assert.deepEqual(chain('map:kanto:pallet:town:home'), [
    'loc_pallet',
    'town_home',
    'town_kanto',
    'town',
    'map_kanto',
    'map_hoenn',
  ]);
  assert.deepEqual(chain('map:johto:jecruteak:town'), [
    'loc_jecruteak',
    'town_johto',
    'town',
    'map_johto',
    'map_hoenn',
  ]);
  assert.deepEqual(chain('map:hoenn:route105:sea'), [
    'loc_route105',
    'sea_hoenn',
    'sea',
    'map_hoenn',
  ]);
  assert.deepEqual(chain('map:kanto:route1:night'), [
    'loc_route1',
    'map_kanto_night',
    'map_night',
    'map_kanto',
    'map_hoenn',
  ]);
  assert.deepEqual(chain('dungeon:mtmoon:cave'), ['dungeon_mtmoon', 'dungeon_cave', 'dungeon']);
  // Les clés livrées sont toutes connues du moteur (sinon jamais jouées)
  const keys = JSON.parse(
    vm.runInContext('JSON.stringify(Object.keys(AUDIO_MUSIC_TRACKS))', sandbox)
  );
  for (const k of Object.keys(manifest.music))
    assert.ok(keys.includes(k), `AUDIO_MUSIC_TRACKS.${k}`);
});

test('R3c-05 · audioCurrentContext : thème de ville (natale / grande ville / côte), mer, nuit, donjons Johto/Hoenn', () => {
  const src = R('src/application/audio-bindings.js');
  assert.match(src, /AUDIO_TOWN_THEME/);
  assert.match(src, /_audioIsNight\(/);
  assert.match(src, /:sea/);
  assert.match(src, /:night/);
  for (const loc of ['pallet', 'newbark', 'littleroot'])
    assert.match(src, new RegExp(`${loc}: 'home'`), `${loc} = ville natale`);
  for (const loc of ['saffron', 'goldenrod', 'lilycove'])
    assert.match(src, new RegExp(`${loc}: 'city'`), `${loc} = grande ville`);
  for (const loc of ['vermilion', 'olivine', 'sootopolis'])
    assert.match(src, new RegExp(`${loc}: 'coast'`), `${loc} = côte`);
  for (const d of [
    'tintower',
    'burnedtower',
    'ilexforest',
    'sky_pillar',
    'cave_of_origin',
    'aqua_hideout',
  ])
    assert.match(src, new RegExp(d + ": '"), `donjon ${d} thématisé`);
});

// ════════════════════════════════════════════════════════════════════════════
// 3) MINE — plus d'emoji, bascule standard, bouton Auto dans le panneau
// ════════════════════════════════════════════════════════════════════════════
test('R3c-06 · Mine : aucun emoji (⚡/💎) dans la fenêtre, les effets, les textes ; icône SVG « energy »', () => {
  for (const f of [
    'src/ui/views/MineWindowView.js',
    'src/ui/game/mine-ui.js',
    'src/application/economy/mine.js',
  ]) {
    assert.doesNotMatch(R(f), /[⚡💎🔒⛏️]/u, `${f} sans emoji`);
  }
  assert.match(R('src/data/ui-icons.js'), /\n energy: '<svg/);
  assert.match(R('src/ui/views/MineWindowView.js'), /getIcon\('energy'/);
  assert.match(R('src/ui/game/mine-ui.js'), /getIcon\('energy'/);
  for (const k of [
    'mine_tool_hint',
    'mine_energy_unit',
    'mine_auto_toggle',
    'afk_roamer_note',
    'guide_key_mine_desc',
  ]) {
    assert.ok(hasKey(FR, k) && hasKey(EN, k), k);
    assert.doesNotMatch(keyText(FR, k), /[⚡💎]/u, `FR ${k}`);
    assert.doesNotMatch(keyText(EN, k), /[⚡💎]/u, `EN ${k}`);
  }
  const eco = R('src/localization/fr/economy.js');
  for (const k of [
    'mine_auto_need_diamonds',
    'mine_tool_need_diamonds',
    'mine_energy_need_diamonds',
    'mine_auto_no_diamonds',
    'automation_upgrade_bought_diamonds',
  ]) {
    assert.doesNotMatch(keyText(eco, k) || '', /💎/u, `FR ${k} sans emoji`);
  }
});

test('R3c-07 · Mine : outil courant = bascule standard (fond clair / texte sombre, sans halo) ; visée hors couleur d’accent', () => {
  const css = R('src/assets/styles/design-system.css');
  assert.match(css, /\.mine-tool-btn\.active \{ box-shadow: none; \}/);
  assert.doesNotMatch(css, /\.mine-tool-btn\.active \{ box-shadow: 0 0 0 2px var\(--accent\)/);
  assert.match(css, /\.mine-tile\.is-aim \{ outline: 2px solid var\(--light2\)/);
  assert.doesNotMatch(css, /\.mine-tile\.is-aim \{ outline: 2px solid var\(--accent\)/);
  // La règle générique « .mine-tool-btn.active » (fond --light2 / texte --dark1) reste la seule apparence
  assert.match(
    css,
    /\.save-icon-choice\.active, \.mine-tool-btn\.active,[\s\S]{0,200}background: var\(--light2\) !important/
  );
});

test('R3c-08 · Mine : bouton Auto directement dans l’en-tête du panneau (bascule si acheté, sinon achat avec le prix)', async () => {
  const ui = R('src/ui/game/mine-ui.js');
  assert.match(ui, /function mineAutoHeaderAction\(/);
  assert.match(ui, /mineAutoHeaderAction\(\), \/\/ V7-R3c/);
  assert.match(ui, /call: 'toggleMineAutomation'/);
  assert.match(ui, /call: 'buyMineAutomation'/);
  assert.match(ui, /_mineAutoCostLabel\(\)/);
  const { MineWindowView } = await import('../src/ui/views/MineWindowView.js');
  const html = MineWindowView.toHTML({
    header: {
      actions: [
        {
          label: 'Mine auto : activée',
          call: 'toggleMineAutomation',
          callArgs: '',
          active: true,
          pressed: true,
        },
        { label: 'Gestion', call: 'openMineManagementMenu', callArgs: "'upgrades'" },
      ],
    },
    title: 'Mine',
    grid: { cols: 1, tiles: [] },
    items: [],
    actions: [],
  });
  assert.match(
    html,
    /class="hbtn is-on active" aria-pressed="true"[^>]*data-call="toggleMineAutomation"/
  );
  assert.match(html, /class="hbtn"[^>]*data-call="openMineManagementMenu"/);
  assert.doesNotMatch(
    html,
    /aria-pressed="[^"]*"[^>]*data-call="openMineManagementMenu"/,
    'pas d’aria-pressed sur un bouton non bascule'
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4) COÛTS — chaque bouton de mode auto annonce le prix du module non acheté
// ════════════════════════════════════════════════════════════════════════════
test('R3c-09 · automationUnlockModel(key) : prix lu dans AUTOMATION_UPGRADE_COSTS + bouton Acheter ; cartes pension / mine / entraînement', async () => {
  const src = R('src/application/automation/automation.js');
  assert.match(src, /function automationCostLabel\(key\)/);
  assert.match(src, /function automationUnlockModel\(key\)/);
  assert.match(
    src,
    /buy: \{ call: 'buyAutomationUpgrade', args: `'\$\{key\}'`, label: t\('buy_btn'\) \}/
  );
  assert.match(R('src/ui/game/hatchery-ui.js'), /globalThis\.automationUnlockModel/);
  assert.match(
    R('src/ui/game/mine-ui.js'),
    /buy: \{ call: 'buyMineAutomation', args: '', label: t\('buy_btn'\) \}/
  );
  assert.match(
    R('src/application/combat/training.js'),
    /buy: \{ call: 'buyTrainingAutomationSlot', args: String\(i\), label: t\('buy_btn'\) \}/
  );
  assert.match(
    R('src/application/combat/training.js'),
    /lockedLabel: `\$\{formatNumber\(TRAINING_AUTOMATION_SLOT_COST\)\} \$\{t\('currency_quest_points'\)\}`/
  );
  // Rendu : carte verrouillée = libellé + prix + bouton d'achat (jamais une bascule muette)
  globalThis.t = (k) => k;
  const { automationToggleCardVNode, automationSlotCardVNode } =
    await import('../src/ui/components/management.js');
  const { toHTMLString } = await import('../src/engine/render/vdom.js');
  const card = toHTMLString(
    automationToggleCardVNode({
      label: 'automation_autoHatch',
      purchased: false,
      lockedLabel: '500 currency_quest_points',
      buy: { call: 'buyAutomationUpgrade', args: "'autoHatch'", label: 'buy_btn' },
    })
  );
  assert.match(card, /automation-locked-card has-buy/);
  assert.match(card, /automation-cost">500 currency_quest_points</);
  assert.match(
    card,
    /class="hbtn automation-buy-btn"[^>]*data-call="buyAutomationUpgrade"[^>]*data-call-args="'autoHatch'"/
  );
  assert.doesNotMatch(card, /automation-toggle-btn/);
  const slot = toHTMLString(
    automationSlotCardVNode({
      title: 'Emplacement 2',
      state: 'unpurchased',
      lockedLabel: '1000 currency_quest_points',
      buy: { call: 'buyTrainingAutomationSlot', args: '1', label: 'buy_btn' },
    })
  );
  assert.match(slot, /automation-cost">1000 currency_quest_points</);
  assert.match(slot, /data-call="buyTrainingAutomationSlot"[^>]*data-call-args="1"/);
});

test('R3c-10 · bandeaux Combat / Donjon : module non acheté ⇒ prix + bouton Acheter (achat sur place), au lieu d’un bandeau caché', () => {
  const ar = R('src/application/automation/auto-relaunch.js');
  assert.match(ar, /function buyAutoRelaunchUpgrade\(\)/);
  assert.match(ar, /auto_relaunch_locked/);
  assert.match(ar, /buyAutoRelaunchUpgrade/);
  const dg = R('src/application/automation/auto-dungeon-relaunch.js');
  assert.match(dg, /function buyAutoDungeonRelaunchUpgrade\(\)/);
  assert.match(dg, /auto_dg_relaunch_locked/);
  assert.match(dg, /buyAutoDungeonRelaunchUpgrade/);
  for (const k of ['auto_relaunch_locked', 'auto_dg_relaunch_locked']) {
    assert.ok(hasKey(FR, k) && hasKey(EN, k), k);
    assert.match(keyText(FR, k), /\{price\}/);
  }
  // Rendu réel du bandeau combat : non acheté + zone sauvage ⇒ prix + achat
  const stubs = {
    G: { location: 'route1', team: [{ id: 16 }], automationUpgrades: {} },
    t: (k) => k,
    tr: (k, v) => k + ' ' + JSON.stringify(v),
    getLocObj: () => ({ type: 'route', wild: [16] }),
    automationCostLabel: (k) => (k === 'autoRelaunch' ? '2500 PQ' : '?'),
    isAutomationPurchased: () => false,
    _pwSetHtmlSafe(el, html) {
      el.innerHTML = html;
    },
  };
  const { sandbox } = makeDomSandbox('<div id="battle-auto-relaunch" hidden></div>', stubs);
  vm.runInContext(harnessBundleSource(['src/application/automation/auto-relaunch.js']), sandbox, {
    filename: 'auto-relaunch.js',
  });
  vm.runInContext('renderAutoRelaunchBar()', sandbox);
  const host = sandbox.document.getElementById('battle-auto-relaunch');
  assert.equal(host.hidden, false);
  assert.match(host.innerHTML, /auto_relaunch_locked \{"price":"2500 PQ"\}/);
  assert.match(host.innerHTML, /data-call="buyAutoRelaunchUpgrade"/);
});

// ════════════════════════════════════════════════════════════════════════════
// 5) GUIDE — rubriques IV/EV, filtres, chromatiques, son, « où acheter »
// ════════════════════════════════════════════════════════════════════════════
test('R3c-11 · guide : rubriques « Stats, IV & EV », « Poké Balls & filtres », « Chromatiques », « Son & musique » insérées dans l’ordre, chiffres lus dans le code', async () => {
  globalThis.G = { lang: 'fr' };
  globalThis.t = (k) => k;
  globalThis.tr = (k, v) => k + ' ' + JSON.stringify(v);
  globalThis.formatNumber = (n) => String(n);
  globalThis.GAME = {
    STATS: { IV_STEP_PCT: 5, EV_STEP_PCT: 5, SHINY_BONUS_PCT: 20, EV_CAP: 18, EV_TOTAL_CAP: 36 },
    CAPTURE: { IV_CHANCE_PCT: 10, IV_CAP: 12 },
  };
  globalThis.ITEMS = {
    bottle_cap: { price: 50000 },
    golden_bottle_cap: { price: 200000 },
    hp_up: { price: 30000 },
    ability_capsule: { price: 50000 },
    ability_patch: { price: 200000 },
  };
  globalThis.SHOPS = {
    celadon: { items: ['bottle_cap', 'hp_up', 'ability_capsule'] },
    indigo: { items: ['golden_bottle_cap', 'ability_patch'] },
  };
  globalThis.getShopName = (id) => 'S_' + id;
  globalThis.getItemName = (k) => 'I_' + k;
  globalThis.PRESET_FILTERS = [
    { labelKey: 'ball_filter_roaming' },
    { labelKey: 'ball_filter_new_shiny' },
  ];
  globalThis.BALL_DEFS = { diveball: { condition: 'water' }, pokeball: {} };
  globalThis.getItemDesc = (k) => 'D_' + k;
  globalThis.SHINY_BASE_RATE = 1 / 4096;
  globalThis.AUDIO_MUSIC_TRACKS = { a: 1, b: 1, c: 1 };
  const {
    guideSections,
    statsGuideValues,
    shinyGuideValues,
    ballGuideValues,
    soundGuideValues,
  } = await import('../src/ui/game/guide-sections.js');
  const s = guideSections();
  const ids = Object.keys(s);
  assert.ok(!ids.includes('sound'), 'sound section is removed per player feedback');
  assert.ok(ids.includes('stats'), 'stats section is restored per player feedback');
  assert.ok(ids.includes('combat'), 'combat section is present');
  assert.ok(
    !ids.includes('capture'),
    'capture section is removed per player feedback (merged into combat)'
  );

  const iv = statsGuideValues();
  assert.equal(iv.ivCap, '12');
  assert.equal(iv.capturePct, '10');
  assert.equal(iv.ivMaxBonus, 60);
  assert.equal(iv.evMaxBonus, 90);
  assert.equal(iv.bottleCap, '50000');
  assert.equal(iv.capShops, 'S_celadon');
  assert.equal(iv.goldenCapShops, 'S_indigo');
  assert.equal(iv.vitaminShops, 'S_celadon');
  assert.match(iv.vitaminNames, /I_hp_up, I_protein/);
  const balls = ballGuideValues();
  assert.equal(balls.presets, 'ball_filter_roaming → ball_filter_new_shiny');
  assert.equal(balls.condBalls, 'ball_diveball — D_diveball');
  const sh = shinyGuideValues();
  assert.equal(sh.shiny, '4096');
  assert.equal(sh.shinyCharm, '2048');
  assert.equal(soundGuideValues().cries, 'settings_cries');
  assert.equal(soundGuideValues().tracks, '3');
  // Toutes les clés FR/EN existent et ne portent aucun chiffre en dur (TXT-01)
  const keys = [
    'guide_stats_title',
    'guide_stats_formula_desc',
    'guide_stats_iv_gain_desc',
    'guide_stats_iv_items_desc',
    'guide_stats_ev_gain_desc',
    'guide_stats_abilities_desc',
    'guide_balls_title',
    'guide_balls_filters_desc',
    'guide_balls_shiny_case_desc',
    'guide_balls_custom_desc',
    'guide_balls_special_desc',
    'guide_shiny_title',
    'guide_shiny_odds_desc',
    'guide_shiny_bonus_desc',
    'guide_shiny_dupes_desc',
    'guide_shiny_farm_desc',
    'guide_sound_title',
    'guide_sound_settings_desc',
    'guide_sound_places_desc',
    'guide_sound_official_desc',
    'guide_automation_buy',
    'guide_automation_buy_desc',
  ];
  for (const k of keys) {
    assert.ok(hasKey(FR, k), `FR ${k}`);
    assert.ok(hasKey(EN, k), `EN ${k}`);
    if (
      k.endsWith('_desc') &&
      !/official|sound_settings|shiny_farm|shiny_dupes|balls_custom|balls_shiny_case|automation_buy/.test(
        k
      )
    ) {
      assert.doesNotMatch(keyText(FR, k), /\b\d{2,}\b/, `FR ${k} : pas de chiffre en dur`);
    }
  }
  // Les plafonds d'EV et le bonus chromatique viennent de GAME.STATS (plus de 18 / 36 / 1.2 en dur)
  assert.match(R('src/data/game-config.js'), /STATS: \{/);
  assert.match(R('src/data/game-helpers.js'), /GAME\.STATS/);
  assert.match(R('src/application/combat/training.js'), /globalThis\.STAT_EV_CAP/);
  assert.match(R('src/application/save/save-extras.js'), /globalThis\.STAT_EV_TOTAL_CAP/);
  delete globalThis.G;
});

test('R3c-12 · vitamines / capsules / patchs ont enfin une boutique (Céladopole, Doublonville, Nénucrique, Ligue / Atalanopolis)', () => {
  const sandbox = { console, window: {}, globalThis: {} };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(
    harnessBundleSource(['src/data/shops-data.js', 'src/data/shops-hoenn.js']),
    sandbox,
    { filename: 'shops [iife]' }
  );
  const items = (id) => sandbox.SHOPS[id].items;
  for (const id of ['celadon', 'jgoldenrod', 'lilycove_dept_store']) {
    for (const k of [
      'hp_up',
      'protein',
      'iron',
      'calcium',
      'carbos',
      'bottle_cap',
      'ability_capsule',
    ])
      assert.ok(items(id).includes(k), `${id} vend ${k}`);
  }
  assert.ok(items('jgoldenrod').includes('zinc') && items('lilycove_dept_store').includes('zinc'));
  for (const id of ['indigo', 'evergrande']) {
    for (const k of ['bottle_cap', 'golden_bottle_cap', 'ability_patch'])
      assert.ok(items(id).includes(k), `${id} vend ${k}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 6) POKÉ BALLS — « Nouveau chromatique » et espèce déjà capturée en normal
// ════════════════════════════════════════════════════════════════════════════
function bootBalls(opts) {
  const owned = new Set(opts.owned || []);
  const shinyOwned = new Set(opts.shinyOwned || []);
  const stubs = {
    G: { pokeballs: opts.pokeballs || null, location: 'route1' },
    isSpeciesOwnedReal: (e) => owned.has(Number(e.id)),
    isSpeciesShiny: (id) => shinyOwned.has(Number(id)),
    getLocObj: () => ({ type: 'route' }),
    PD: {
      7: ['Carapuce', 'Water', ''],
      25: ['Pikachu', 'Electric', ''],
      999: ['X', 'Normal', ''],
      144: ['Artikodin', 'Ice', 'Flying'],
    },
    saveGame() {},
    renderBallFilterEditor() {},
    t: (k) => k,
    tr: (k) => k,
  };
  const { sandbox } = makeDomSandbox('', stubs);
  vm.runInContext(harnessBundleSource(['src/application/economy/pokeballs.js']), sandbox, {
    filename: 'pokeballs.js',
  });
  return sandbox;
}

test('R3c-13 · un shiny d’une espèce capturée en normal correspond à « Nouveau chromatique » (et plus à « Nouveau ») ; un normal ne passe jamais pour un shiny', () => {
  const sb = bootBalls({ owned: [25], shinyOwned: [] });
  const matches = (fid, enemy) =>
    vm.runInContext(
      `filterMatches(ensurePokeballs().filters.find((f) => f.id === '${fid}'), ${JSON.stringify(enemy)})`,
      sb
    );
  const shinyPika = { id: 25, shinyActive: true };
  const pika = { id: 25, shinyActive: false };
  const shinyNew = { id: 999, shinyActive: true };
  assert.equal(
    matches('new_shiny', shinyPika),
    true,
    'shiny d’une espèce déjà capturée en normal ⇒ Nouveau chromatique'
  );
  assert.equal(matches('new', shinyPika), false);
  assert.equal(matches('caught_shiny', shinyPika), false);
  assert.equal(matches('caught', shinyPika), true);
  assert.equal(matches('new_shiny', pika), false, 'un normal n’est pas un shiny');
  assert.equal(matches('caught_shiny', pika), false);
  assert.equal(matches('new_shiny', shinyNew), true);
  assert.equal(matches('new', shinyNew), true);
  // Espèce déjà possédée en shiny : le shiny rencontré est un « Chromatique déjà capturé »
  const sb2 = bootBalls({ owned: [25], shinyOwned: [25] });
  const m2 = (fid, enemy) =>
    vm.runInContext(
      `filterMatches(ensurePokeballs().filters.find((f) => f.id === '${fid}'), ${JSON.stringify(enemy)})`,
      sb2
    );
  assert.equal(m2('new_shiny', shinyPika), false);
  assert.equal(m2('caught_shiny', shinyPika), true);
  assert.equal(
    m2('caught_shiny', pika),
    false,
    'un Pikachu normal n’est pas un « chromatique déjà capturé »'
  );
});

test('R3c-14 · ballForEnemy : la ball posée sur « Nouveau chromatique » est lancée ; un filtre de base sur « Aucune » passe la main, un filtre personnalisé non', () => {
  const sb = bootBalls({ owned: [25] });
  vm.runInContext(
    `(() => { const b = ensurePokeballs(); b.ultraball = 3; b.pokeball = 5;
      b.filters.find((f) => f.id === 'new_shiny').ball = 'ultraball';
      b.filters.find((f) => f.id === 'new').ball = 'pokeball'; })()`,
    sb
  );
  const ball = (enemy) => vm.runInContext(`ballForEnemy(${JSON.stringify(enemy)})`, sb);
  assert.equal(
    ball({ id: 25, shinyActive: true }),
    'ultraball',
    'shiny d’une espèce capturée en normal ⇒ Hyper Ball'
  );
  assert.equal(
    ball({ id: 25, shinyActive: false }),
    null,
    'doublon normal : « Déjà capturé » sur Aucune ⇒ rien'
  );
  assert.equal(ball({ id: 999, shinyActive: false }), 'pokeball');
  // Errant (filtre de base, Aucune) ⇒ passe la main ⇒ « Nouveau » lance sa Poké Ball
  assert.equal(ball({ id: 144, _isRoaming: true }), 'pokeball');
  // Un filtre personnalisé sur Aucune en tête bloque bien
  vm.runInContext(
    `ensurePokeballs().filters.unshift({ id: 'custom1', options: { type: 'water' }, ball: 'none', enabled: true, locked: false })`,
    sb
  );
  assert.equal(
    ball({ id: 7, shinyActive: false }),
    null,
    'filtre personnalisé « ne pas capturer » (Carapuce = Eau)'
  );
  assert.equal(
    ball({ id: 999, shinyActive: false }),
    'pokeball',
    'les autres espèces suivent les filtres suivants'
  );
});

test('R3c-15 · migration des anciennes sauvegardes : options des filtres de base relues, ordre de priorité remis, balls et filtres personnalisés conservés', () => {
  const legacy = {
    pokeball: 10,
    filters: [
      { id: 'new', options: { caught: false }, ball: 'pokeball', enabled: true, locked: true },
      {
        id: 'new_shiny',
        options: { caught: false, shiny: true },
        ball: 'ultraball',
        enabled: true,
        locked: true,
      },
      { id: 'mine', options: { type: 'bug' }, ball: 'greatball', enabled: true },
      {
        id: 'caught_shiny',
        options: { caughtShiny: true },
        ball: 'none',
        enabled: true,
        locked: true,
      },
      { id: 'caught', options: { caught: true }, ball: 'none', enabled: false, locked: true },
      {
        id: 'roaming',
        options: { encounter: 'roaming' },
        ball: 'masterball',
        enabled: true,
        locked: true,
      },
    ],
  };
  const sb = bootBalls({ owned: [25], pokeballs: legacy });
  const b = JSON.parse(vm.runInContext('JSON.stringify(ensurePokeballs())', sb));
  assert.equal(b.presetVersion, 2);
  assert.deepEqual(
    b.filters.map((f) => f.id),
    ['roaming', 'new_shiny', 'mine', 'caught_shiny', 'new', 'caught'],
    'presets réordonnés dans leurs emplacements, filtre personnalisé à sa place'
  );
  const by = Object.fromEntries(b.filters.map((f) => [f.id, f]));
  assert.deepEqual(by.new_shiny.options, { shiny: true, caughtShiny: false });
  assert.deepEqual(by.caught_shiny.options, { shiny: true, caughtShiny: true });
  assert.equal(by.new_shiny.ball, 'ultraball', 'ball conservée');
  assert.equal(by.roaming.ball, 'masterball');
  assert.equal(by.caught.enabled, false, 'état conservé');
  assert.deepEqual(by.mine.options, { type: 'bug' });
  // Idempotent
  vm.runInContext('ensurePokeballs().filters.reverse()', sb);
  const again = JSON.parse(
    vm.runInContext('JSON.stringify(ensurePokeballs().filters.map((f) => f.id))', sb)
  );
  assert.deepEqual(
    again,
    ['caught', 'new', 'caught_shiny', 'mine', 'new_shiny', 'roaming'],
    'plus de réordonnancement après migration'
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 7) LIVRAISON
// ════════════════════════════════════════════════════════════════════════════
test('R3c-16 · version 7.5.2, ChangeLog, roadmap, note de livraison, lanceurs copiant les assets', () => {
  assert.match(JSON.parse(R('package.json')).version, /^7\.(5\.[23]|6\.[0-9]+)$/);
  assert.match(R(fs.existsSync(new URL('docs/ChangeLog.md', ROOT)) ? 'docs/ChangeLog.md' : 'ChangeLog.md'), /## Complément V7-R3c[^\n]*7\.5\.2/);
  assert.ok(fs.existsSync(new URL(fs.existsSync(new URL('docs/LIVRAISON-V7-R3c.md', ROOT)) ? 'docs/LIVRAISON-V7-R3c.md' : 'LIVRAISON-V7-R3c.md', ROOT)));
  assert.match(R('docs/ROAD_MAP_V7.md'), /R3c/);
  assert.match(R('launch_local_server.bat'), /robocopy "src\\assets" "dist\\src\\assets"/);
  assert.match(R('launch_local_server.sh'), /src\/assets/);
});

// ════════════════════════════════════════════════════════════════════════════
// 8) Compléments de la passe de captures (bascules visibles, pas de modale)
// ════════════════════════════════════════════════════════════════════════════
test('R3c-17 · la face par défaut des .hbtn exclut .active : outils de la mine, onglets de gestion et du dictionnaire ont une bascule visible', () => {
  const css = R('src/assets/styles/design-system.css');
  const faces = css.match(/^\.hbtn:not\(\.quest-claim-btn\)[^\n{]*,?$/gm) || [];
  assert.ok(faces.length >= 2, 'deux faces par défaut (historique + thèmes)');
  for (const f of faces) assert.match(f, /:not\(\.active\):not\(\.is-active\)/, f.slice(0, 60));
  // plus de halo / contour dédié sur l'outil courant ; la visée reste dans la palette
  assert.match(css, /\.mine-tool-btn\.active \{ box-shadow: none; \}/);
  assert.match(css, /\.mine-tile\.is-aim \{ outline: 2px solid var\(--light2\)/);
  // le bouton « Mine auto » de l'en-tête porte la classe standard .active quand il est activé
  assert.match(R('src/ui/views/MineWindowView.js'), /a\.active && 'is-on active'/);
});

test("R3c-18 · acheter / basculer « Mine auto » depuis le panneau ne fait plus surgir le menu de gestion (re-rendu seulement s'il est ouvert) et le module démarre à l'achat", () => {
  const mine = R('src/application/economy/mine.js');
  const buy = mine.slice(
    mine.indexOf('function buyMineAutomation'),
    mine.indexOf('function toggleMineAutomation')
  );
  const toggle = mine.slice(
    mine.indexOf('function toggleMineAutomation'),
    mine.indexOf('function getMineEnergyUpgradeCost')
  );
  assert.doesNotMatch(buy, /openMineManagementMenu\(/);
  assert.doesNotMatch(toggle, /openMineManagementMenu\(/);
  assert.match(buy, /G\.mine\.automation\.enabled = true/);
  assert.match(buy, /startMineAutomationTicker\(\)/);
  assert.match(buy, /_mineAutoUiRefresh\(\)/);
  assert.match(toggle, /_mineAutoUiRefresh\(\)/);
  const ui = R('src/ui/game/mine-ui.js');
  assert.match(ui, /function refreshMineAutomationUi\(\)/);
  assert.match(ui, /modal\.classList\.contains\('open'\)/);
  assert.match(ui, /refreshMineAutomationUi \}\)/, 'exposé en global');
});

test('R3c-19 · pension : libellés des filtres traduits (plus de clés brutes filter_*) et plus d’emoji dans la file d’attente', () => {
  const ui = R('src/ui/game/hatchery-ui.js');
  assert.doesNotMatch(ui, /t\('filter_(fav|region|rank|type)'\)/);
  assert.doesNotMatch(ui, /⭐|📋/);
  for (const lang of ['fr', 'en']) {
    const dict = R(`src/localization/${lang}/ui.js`);
    for (const k of [
      'box_filter_favorite',
      'box_filter_favorite_only',
      'box_filter_not_favorite',
      'box_filter_region',
      'box_filter_rank',
      'box_filter_type',
      'hatchery_filter_rank_s_plus',
      'hatchery_filter_rank_a_minus',
    ])
      assert.match(dict, new RegExp(`"${k}":"`), `${lang}:${k}`);
    const m = dict.match(/"hatchery_queue_title":"([^"]*)"/);
    assert.ok(m && !/📋/.test(m[1]), `${lang}: hatchery_queue_title sans emoji`);
  }
});
