// V7-R3 — retours joueurs (7.5.0) : sons/musiques officiels « drop-in »
// (SND-04), téléphone (MOB-01/02/03), retour visuel de l'outil de mine
// (R3-01), coûts des automatisations (R3-02), guides « Chiffres clés »
// (R3-05), gardien de donjon aléatoire + rares obtenables (D29), relance auto
// des expéditions (D30), boutique sans module déjà acheté (R3-06), parité AFK /
// immunités affichées (R3-08).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

const ROOT = new URL('../', import.meta.url);
const R = (p) => fs.readFileSync(new URL(p, ROOT), 'utf8');
const FR = R('src/localization/fr/ui.js');
const EN = R('src/localization/en/ui.js');
const J = (x) => JSON.parse(JSON.stringify(x)); // vm : objets d'un autre royaume
const hasKey = (src, key) => new RegExp(`^"${key}":`, 'm').test(src);
const keyText = (src, key) => {
  const m = src.match(new RegExp(`^"${key}":"((?:[^"\\\\]|\\\\.)*)"`, 'm'));
  return m ? m[1] : null;
};

// ─── Harnais jsdom générique (même recette que r2) ───────────────────────────
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
// 1) AUDIO « DROP-IN » — sons / musiques des jeux officiels, cris PokeAPI
// ════════════════════════════════════════════════════════════════════════════
function bootAudio(opts = {}) {
  const made = [];
  const fetched = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.volume = 1;
      this.loop = false;
      this.paused = true;
      this.plays = 0;
      made.push(this);
    }
    play() {
      this.paused = false;
      this.plays++;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    addEventListener() {}
  }
  const node = () => ({
    connect() {},
    start() {},
    stop() {},
    gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
    frequency: { value: 440, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
    playbackRate: { value: 1 },
    Q: { value: 1 },
    type: 'sine',
    buffer: null,
    onended: null,
  });
  const sources = [];
  class FakeAudioContext {
    constructor() {
      this.currentTime = 0;
      this.sampleRate = 8000;
      this.state = 'running';
      this.destination = {};
    }
    createGain() {
      return node();
    }
    createOscillator() {
      return node();
    }
    createBiquadFilter() {
      return node();
    }
    createBufferSource() {
      const n = node();
      sources.push(n);
      return n;
    }
    createBuffer(ch, len) {
      return { getChannelData: () => new Float32Array(len) };
    }
    decodeAudioData(ab) {
      return Promise.resolve({ duration: 1, byteLength: ab.byteLength });
    }
    resume() {
      return Promise.resolve();
    }
  }
  const manifest = opts.manifest === undefined ? null : opts.manifest;
  const fetchStub = (url) => {
    fetched.push(String(url));
    if (/manifest\.json$/.test(url)) {
      return Promise.resolve({
        ok: manifest !== null,
        json: () => Promise.resolve(manifest),
      });
    }
    return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)) });
  };
  const stubs = Object.assign({ Audio: FakeAudio, AudioContext: FakeAudioContext, fetch: fetchStub }, opts.stubs || {});
  const { sandbox, dom } = makeDomSandbox('<div></div>', stubs);
  sandbox.setInterval = setInterval;
  sandbox.clearInterval = clearInterval;
  vm.runInContext(harnessBundleSource(['src/core/audio.js']), sandbox, { filename: 'audio-bundle.js' });
  return { sandbox, dom, made, fetched, sources };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

test('R3-SND-04a · chaîne de repli des contextes composés (lieu → région ; champion → arène → dresseur ; ligue/légendaire/errant → boss ; donjon précis → donjon)', () => {
  const { sandbox } = bootAudio();
  const chain = (c) => J(sandbox.audioMusicChain(c));
  assert.deepEqual(chain('map:kanto:route1'), ['loc_route1', 'map_kanto', 'map_hoenn']);
  assert.deepEqual(chain('map:sinnoh'), ['map_sinnoh', 'map_hoenn']);
  assert.deepEqual(chain('battle:gym:brock'), ['trainer_brock', 'battle_gym', 'battle_trainer']);
  assert.deepEqual(chain('battle:trainer'), ['battle_trainer']);
  assert.deepEqual(chain('battle:league'), ['battle_league', 'battle_boss']);
  assert.deepEqual(chain('battle:legendary'), ['battle_legendary', 'battle_boss']);
  assert.deepEqual(chain('battle:roaming'), ['battle_roaming', 'battle_legendary', 'battle_boss']);
  assert.deepEqual(chain('battle:boss'), ['battle_boss']);
  assert.deepEqual(chain('battle:wild'), ['battle_wild']);
  assert.deepEqual(chain('dungeon:mtmoon'), ['dungeon_mtmoon', 'dungeon']);
  assert.deepEqual(chain('menu'), ['menu']);
  assert.deepEqual(chain(null), []);
  // Sans manifeste : les pistes livrées répondent (V7-R3b : 20 pistes CC0).
  const f = sandbox.audioMusicTrackFor;
  assert.equal(f('map:kanto:route1'), 'map_kanto');
  assert.equal(f('map:kanto:pallet:town'), 'town');
  assert.equal(f('map:johto:cherrygrove:town'), 'town_johto');
  assert.equal(f('map:kanto:lavender:town'), 'loc_lavender');
  assert.equal(f('battle:gym:brock'), 'battle_gym');
  assert.equal(f('battle:roaming'), 'battle_roaming');
  assert.equal(f('battle:league'), 'battle_league');
  assert.equal(f('battle:legendary'), 'battle_legendary');
  assert.equal(f('dungeon:pokemontower:tower'), 'dungeon_tower');
  assert.equal(f('dungeon:mtmoon'), 'dungeon');
  assert.deepEqual(chain('map:kanto:pallet:town'), ['loc_pallet', 'town_kanto', 'town', 'map_kanto', 'map_hoenn']);
  assert.deepEqual(chain('dungeon:powerplant:plant'), ['dungeon_powerplant', 'dungeon_plant', 'dungeon']);
  assert.equal(f('dungeon:mtmoon'), 'dungeon');
  assert.equal(f('map_kanto'), 'map_kanto', 'clé simple toujours acceptée');
  assert.equal(f('inconnu'), null);
});

test('R3-SND-04b · manifeste lu UNE fois après le geste ; une piste déposée (loc_/trainer_) prend le pas sur la piste générique', async () => {
  const manifest = {
    version: 1,
    music: {
      menu: 'music/menu.mp3',
      map_kanto: 'music/map_kanto.mp3',
      loc_route1: 'music/loc_route1.mp3',
      trainer_brock: 'music/trainer_brock.ogg',
      battle_wild: 'music/battle_wild.mp3',
    },
    sfx: { catch: 'sfx/catch.ogg' },
    cries: { 25: '25.ogg', 150: '150.ogg' },
  };
  const { sandbox, made, fetched } = bootAudio({ manifest });
  assert.equal(sandbox.audioState().manifestState, 'idle', 'aucune lecture réseau avant le geste');
  assert.equal(fetched.length, 0);
  sandbox.audioSetMusicContext('map:kanto:route1');
  assert.equal(sandbox.audioState().pendingKey, 'map:kanto:route1', 'le contexte (pas la clé) attend le geste');
  sandbox.audioUnlock();
  await tick();
  assert.equal(sandbox.audioState().manifestState, 'ready');
  assert.equal(fetched.filter((u) => /manifest\.json/.test(u)).length, 1, 'manifeste lu une seule fois');
  sandbox.audioUnlock();
  await tick();
  assert.equal(fetched.filter((u) => /manifest\.json/.test(u)).length, 1);
  // La piste la plus précise disponible : loc_route1 (déposée par le joueur).
  assert.equal(sandbox.audioMusicTrackFor('map:kanto:route1'), 'loc_route1');
  assert.equal(sandbox.audioMusicTrackFor('map:kanto:route2'), 'map_kanto', 'autre lieu → région');
  assert.equal(sandbox.audioMusicTrackFor('battle:gym:brock'), 'trainer_brock');
  assert.equal(sandbox.audioMusicTrackFor('battle:gym:misty'), null, 'ni arène ni dresseur dans ce manifeste → silence');
  assert.ok(made.some((a) => /music\/loc_route1\.mp3$/.test(a.src)), 'la piste du lieu est chargée depuis le manifeste');
  const st = sandbox.audioState();
  assert.equal(st.cries, 2);
  assert.equal(st.fileSfx, 1);
  assert.equal(st.musicContext, 'map:kanto:route1');
  sandbox.audioStopMusic();
});

test('R3-SND-04c · effets fichier prioritaires sur la recette procédurale ; cris joués par numéro Dex (forme → espèce), K.O. ralenti, anti-rafale', async () => {
  const manifest = { music: {}, sfx: { catch: 'sfx/catch.ogg' }, cries: { 25: '25.ogg' } };
  const { sandbox, fetched, sources } = bootAudio({ manifest });
  assert.equal(sandbox.audioPlayCry(25), false, 'cri ignoré avant le geste');
  sandbox.audioUnlock();
  await tick();
  assert.equal(sandbox.audioPlaySfx('catch'), true);
  await tick();
  assert.ok(fetched.some((u) => /src\/assets\/audio\/sfx\/catch\.ogg$/.test(u)), 'le fichier déposé est joué à la place de la recette');
  assert.equal(sandbox.audioPlaySfx('click'), true, 'effet sans fichier : recette procédurale');
  assert.ok(!fetched.some((u) => /sfx\/click/.test(u)));
  assert.equal(sandbox.audioPlayCry('25-1', { rate: 0.75 }), true, 'forme 25-1 → cri de l’espèce 25');
  assert.equal(sandbox.audioPlayCry(25), false, 'anti-rafale (120 ms) sur le même cri');
  assert.equal(sandbox.audioPlayCry(150), false, 'cri absent du manifeste → rien');
  await tick();
  assert.equal(fetched.filter((u) => /cries\/25\.ogg$/.test(u)).length, 1);
  assert.ok(sources.some((s) => s.playbackRate.value === 0.75), 'vitesse 0,75 (cri de K.O.)');
  assert.equal(sandbox.audioState().buffers >= 1, true, 'tampon décodé mis en cache');
  await tick(130);
  assert.equal(sandbox.audioPlayCry(25), true, 'rejouable après la fenêtre anti-rafale');
  await tick();
  assert.equal(fetched.filter((u) => /cries\/25\.ogg$/.test(u)).length, 1, 'cache : pas de second téléchargement');
});

function bootBindings(state = {}) {
  const handlers = new Map();
  const played = [];
  const cries = [];
  const musicCalls = [];
  const bus = {
    on(name, fn) {
      handlers.set(name, fn);
    },
    emit(name, payload) {
      const h = handlers.get(name);
      if (h) h(payload);
    },
  };
  const stubs = Object.assign(
    {
      EventBus: bus,
      G: { location: 'route1', region: 'kanto' },
      battle: { active: false },
      PokeWorldGameStarted: true,
      PW_FF: false,
      regionOfLoc: () => 'kanto',
      currentDungeonRun: () => null,
      audioPlaySfx: (n) => {
        played.push(n);
        return true;
      },
      audioPlayCry: (id, o) => {
        cries.push([id, o]);
        return true;
      },
      audioSetMusicContext: (c) => {
        musicCalls.push(c);
        return true;
      },
    },
    state
  );
  const { sandbox } = makeDomSandbox('<button id="b">x</button>', stubs);
  vm.runInContext(harnessBundleSource(['src/application/audio-bindings.js']), sandbox, {
    filename: 'audio-bindings-bundle.js',
  });
  return { sandbox, bus, played, cries, musicCalls, handlers };
}

test('R3-SND-04d · cris : apparition (après l’effet brillant), K.O. des deux camps (ralenti), envoi, fiche ; jamais pendant le rattrapage', () => {
  const { sandbox, bus, played, cries, handlers } = bootBindings();
  for (const name of ['battle:enemy', 'combat:enemy-fainted', 'combat:player-fainted', 'combat:player-sent', 'ui:poke-detail'])
    assert.ok(handlers.has(name), `abonnement ${name}`);
  assert.deepEqual(J(Object.keys(sandbox.AUDIO_EVENT_CRY).sort()), [
    'battle:enemy',
    'combat:enemy-fainted',
    'combat:player-fainted',
    'combat:player-sent',
    'ui:poke-detail',
  ]);
  bus.emit('battle:enemy', { id: 25, shiny: true });
  assert.deepEqual(J(played), ['shiny'], 'l’effet brillant d’abord');
  assert.equal(cries.length, 1);
  assert.equal(cries[0][0], 25);
  bus.emit('combat:enemy-fainted', { id: '150-1' });
  assert.equal(cries[1][0], '150-1');
  assert.equal(cries[1][1].rate, 0.75, 'cri de K.O. ralenti');
  bus.emit('combat:player-fainted', { id: 6 });
  assert.equal(cries[2][1].rate, 0.75);
  bus.emit('combat:player-sent', { id: 9 });
  bus.emit('ui:poke-detail', { id: 3 });
  assert.equal(cries.length, 5);
  bus.emit('battle:enemy', {}); // sans identifiant : rien
  assert.equal(cries.length, 5);
  sandbox.PW_FF = true;
  bus.emit('battle:enemy', { id: 1 });
  bus.emit('ui:poke-detail', { id: 1 });
  assert.equal(cries.length, 5, 'rattrapage hors-ligne : aucun cri');
});

test('R3-SND-04e · contrats de source : émetteurs, manifeste généré au build, script de téléchargement + .bat, crédits, gate', () => {
  assert.match(R('src/application/combat/battle-switch.js'), /pwEmit\('combat:player-sent', \{ id: p\.id \}\)/);
  assert.match(R('src/ui/game/poke-modal.js'), /pwEmit\('ui:poke-detail', \{ id: p\.id \}\)/);
  const combatDir = new URL('src/application/combat/', ROOT);
  for (const f of fs.readdirSync(combatDir))
    assert.doesNotMatch(R('src/application/combat/' + f), /audioPlayCry|audioPlaySfx|audioSetMusicContext/, `${f} : 0 audio`);
  const pkg = JSON.parse(R('package.json'));
  assert.match(pkg.scripts.build, /node tools\/audio-manifest\.mjs/, 'manifeste régénéré à chaque build');
  assert.equal(pkg.scripts['download:audio'], 'python3 tools/download_assets.py --audio-only');
  const py = R('tools/download_assets.py');
  assert.match(py, /POKEAPI_CRIES = 'https:\/\/raw\.githubusercontent\.com\/PokeAPI\/cries\/main\/cries\/pokemon'/);
  assert.match(py, /def download_cries\(\)/);
  assert.match(py, /for bucket in \('latest', 'legacy'\)/, 'repli legacy');
  assert.match(py, /def download_audio_sources\(\)/);
  assert.match(py, /AUDIO_SOURCES = ROOT \/ 'tools\/audio-sources\.txt'/);
  assert.match(py, /def write_audio_manifest\(\)/);
  assert.match(py, /'--audio-only' in sys\.argv/);
  assert.match(py, /download_audio\(\)\n/, 'appelé par le téléchargement complet');
  const bat = R('download_assets.bat');
  assert.match(bat, /tools\\download_assets\.py/);
  assert.match(bat, /--audio-only/);
  assert.match(bat, /tools\\audio-manifest\.mjs --list/);
  assert.match(R('tools/sprites/download_sprites.bat'), /download_assets\.bat/, 'ancien stub redirige');
  assert.ok(fs.existsSync(new URL('tools/audio-sources.txt', ROOT)));
  const credits = R('docs/CREDITS.md');
  assert.match(credits, /PokeAPI\/cries/);
  assert.match(credits, /audio-sources\.txt/);
  const gate = R('tools/validate-project.mjs');
  assert.match(gate, /audio-manifest\.mjs/);
  assert.match(gate, /budget cris \+ effets/);
  assert.match(gate, /audioPlayCry/);
  // Manifeste synchronisé avec le disque (cris téléchargés inclus).
  const manifest = JSON.parse(R('src/assets/audio/manifest.json'));
  const criesDir = new URL('src/assets/audio/cries/', ROOT);
  const onDisk = fs.existsSync(criesDir) ? fs.readdirSync(criesDir).filter((f) => /^\d+\.(ogg|mp3|wav)$/.test(f)).length : 0;
  assert.equal(Object.keys(manifest.cries).length, onDisk, 'un cri par fichier présent');
  assert.ok(Object.keys(manifest.music).length >= 26, 'au moins 26 pistes CC0 livrées');
  assert.equal(Object.keys(manifest.sfx).length, 22, '22 effets CC0 livrés (V7-R3b)');
  assert.match(R('src/application/save/settings.js'), /audioPrefs/);
  // V7-R3c — l'explication « sons officiels » a quitté les Réglages pour le Guide.
  assert.ok(!hasKey(FR, 'settings_sound_hint'), 'plus de paragraphe son dans les Réglages');
  assert.match(keyText(FR, 'guide_sound_official_desc') || '', /download_assets\.bat/);
  assert.match(keyText(EN, 'guide_sound_official_desc') || '', /download_assets\.bat/);
});

// ════════════════════════════════════════════════════════════════════════════
// 2) TÉLÉPHONE — starter sous l'en-tête, pop-up Pokéball, écran « Entrer »
// ════════════════════════════════════════════════════════════════════════════
test('R3-MOB · correctifs téléphone présents (CSS mobile + pop-up Pokéball responsive)', () => {
  const css = R('src/assets/styles/design-system.css');
  for (const m of ['MOB-01', 'MOB-02']) assert.match(css, new RegExp(m + ' — '), `bloc ${m}`);
  assert.match(css, /#starter-modal \{ z-index: 1200; \}/, 'MOB-01 : le choix du starter passe devant l’en-tête (950)');
  const idx = css.indexOf('V7-R3 · MOB-01/02/03');
  assert.ok(idx > 0);
  assert.match(css.slice(idx), /@media \(max-width: ?\d+px\)/, 'règles sous media query');
  const picker = R('src/ui/game/pokeball-window.js');
  assert.match(picker, /MOB-03[^@]*@media \(max-width:520px\)\{\.pw-ball-box\{/, 'MOB-03 : pop-up Pokéball : largeur 96vw sur téléphone');
});

// ════════════════════════════════════════════════════════════════════════════
// 3) MINE — retour visuel de l'outil utilisé
// ════════════════════════════════════════════════════════════════════════════
test('R3-01 · la fenêtre Mine marque l’outil courant (chip pressée, icône, coût en énergie, zone) et la grille porte l’outil', async () => {
  const { MineWindowView } = await import('../src/ui/views/MineWindowView.js');
  const model = {
    title: 'Mine',
    energy: { cur: 50, max: 100, pct: 50, hint: 'e' },
    tools: [
      { id: 'chisel', label: 'Burin', cost: 5, selected: false, iconHtml: '<svg data-i="chisel"></svg>', title: 'Burin · 1 case', call: 'setMineTool', callArgs: "'chisel'" },
      { id: 'hammer', label: 'Marteau', cost: 15, selected: true, iconHtml: '<svg data-i="hammer"></svg>', title: 'Marteau · 3×3', call: 'setMineTool', callArgs: "'hammer'" },
    ],
    toolHint: 'Outil : Marteau · 15 énergie par coup · zone 3×3',
    currentTool: 'hammer',
    grid: { cols: 2, tiles: [] },
    items: [],
    actions: [],
  };
  const html = MineWindowView.toHTML(model);
  assert.match(html, /data-tool="hammer"[^>]*>|aria-pressed="true"/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /<svg data-i="hammer"><\/svg>/, 'icône de l’outil rendue telle quelle');
  // V7-R3c — plus d'emoji : coût = icône SVG (quand getIcon existe) + nombre
  assert.match(html, /mine-tool-cost"[^>]*>15</);
  assert.doesNotMatch(html, /⚡/);
  assert.match(html, /title="Marteau · 3×3"/);
  assert.match(html, /mine-tool-hint">Outil : Marteau · 15 énergie par coup · zone 3×3</);
  assert.match(html, /class="mine-grid"[^>]*data-mine-tool="hammer"/);
  const ui = R('src/ui/game/mine-ui.js');
  assert.match(ui, /function mineToolIcon\(/);
  assert.match(ui, /function installMineAimPreview\(/);
  assert.match(ui, /pw-mine-strike/);
  assert.match(R('src/application/economy/mine.js'), /playMineDigFx\([^)]*\{\s*tool/s, 'digMineTile transmet l’outil utilisé à l’effet');
  const css = R('src/assets/styles/design-system.css');
  assert.match(css, /\.mine-tile\.is-aim/);
  assert.match(css, /\.pw-mine-strike/);
  for (const k of ['mine_tool_hint', 'mine_tool_area_single', 'mine_tool_area_square3', 'mine_tool_area_cross', 'mine_tool_area_line5']) {
    assert.ok(hasKey(FR, k), `FR ${k}`);
    assert.ok(hasKey(EN, k), `EN ${k}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 4) AUTOMATISATION — coûts visibles (réglages), boutique sans module acheté
// ════════════════════════════════════════════════════════════════════════════
test('R3-02 (révisé V7-R3c) · les Réglages ne portent plus de tableau des coûts : prix sur les boutons auto + Guide', () => {
  const sm = R('src/ui/views/SettingsModalView.js');
  assert.doesNotMatch(sm, /settings-auto-table/);
  assert.doesNotMatch(R('src/application/save/settings.js'), /settings_automation_title/);
  for (const k of ['settings_automation_title', 'settings_automation_hint', 'settings_sound_hint', 'settings_debug_code_hint']) {
    assert.ok(!hasKey(FR, k), `FR ${k} supprimée`);
    assert.ok(!hasKey(EN, k), `EN ${k} supprimée`);
  }
});

test('R3-06 · boutique : un module d’automatisation déjà acheté n’apparaît plus ; le second (donjons) est vendu 5 000 PQ', () => {
  const costs = { autoRelaunch: 2500, autoDungeonRelaunch: 5000 };
  const owned = new Set();
  const stubs = {
    G: { location: 'pewter', money: 0, inventory: {}, pokeballs: {}, badges: [], wallet: {} },
    t: (k) => k,
    tr: (k) => k,
    formatNumber: (n) => String(n),
    AUTOMATION_UPGRADE_COSTS: costs,
    isAutomationPurchased: (k) => owned.has(k),
    getIcon: (n) => `<i data-icon="${n}"></i>`,
    SHOPS: { pewter: { items: [] } },
    ITEMS: {},
    getItemName: (k) => k,
    getLocObj: () => ({ type: 'town', badgeReq: 0 }),
    escHtml: (s) => String(s),
    _pwSetHtmlSafe(el, html) {
      el.innerHTML = html;
    },
  };
  const { sandbox } = makeDomSandbox('<div id="tab-content"></div>', stubs);
  vm.runInContext(harnessBundleSource(['src/ui/game/shop-panel.js']), sandbox, { filename: 'shop-panel.js' });
  const upgrades = () => vm.runInContext(`JSON.stringify(globalThis.shopItemsModel('pewter', { badgeReq: 0 }))`, sandbox);
  const upgradesOf = () => JSON.parse(upgrades()).filter((i) => i && i.kind === 'upgrade');
  let ups = upgradesOf();
  assert.equal(ups.length, 2, 'les deux améliorations sont en rayon');
  assert.deepEqual(
    ups.map((u) => [u.key, u.currency, u.price]),
    [
      ['autoRelaunch', 'questPoints', 2500],
      ['autoDungeonRelaunch', 'questPoints', 5000],
    ]
  );
  assert.equal(ups[1].stockLabel, 'auto_dg_relaunch_shop_desc');
  owned.add('autoRelaunch');
  ups = upgradesOf();
  assert.deepEqual(ups.map((u) => u.key), ['autoDungeonRelaunch'], 'module acheté retiré du rayon');
  owned.add('autoDungeonRelaunch');
  assert.equal(upgradesOf().length, 0);
  assert.match(R('src/application/automation/automation.js'), /autoDungeonRelaunch: 5000/);
});

// ════════════════════════════════════════════════════════════════════════════
// 5) GUIDES — « Chiffres clés » lus dans le code
// ════════════════════════════════════════════════════════════════════════════
test('R3-05 · guideKeyValues() cite les VRAIES constantes ; chaque rubrique concernée a sa page « Chiffres clés » ; FR/EN alignés sur les paramètres', async () => {
  const g = globalThis;
  const prev = {};
  const set = (k, v) => {
    prev[k] = Object.prototype.hasOwnProperty.call(g, k) ? g[k] : undefined;
    g[k] = v;
  };
  set('BUCKET_ODDS', { rare: 0.04, uncommon: 0.2 });
  set('ROAMING_CHANCE', 0.01);
  set('ROAMING_LEVEL', 75);
  set('SHINY_BASE_RATE', 1 / 4096);
  set('AUTOMATION_UPGRADE_COSTS', { autoHatch: 500, autoSeedHatchery: 1000, autoRelaunch: 2500, autoDungeonRelaunch: 5000 });
  set('AUTO_DG_DELAY_MS', 5000);
  set('DUNGEON_TOLLS', [100, 150, 250]);
  set('DUNGEON_RULES', { depthMax: 3, multStep: 0.5, wipeKeepRatio: 0.5, completionBonus: 2.5, exhaustedRate: 0.4 });
  set('DUNGEON_AUTO_UNLOCK_CLEARS', 3);
  set('DUNGEON_RARE_ON_COMMON_TILE', 0.05);
  set('MINE_TOOL_DEFS', { chisel: { shape: 'single' }, pickaxe: { shape: 'cross', diamondCost: 400 } });
  set('mineToolEnergyCost', (k) => (k === 'pickaxe' ? 20 : 5));
  set('MINE_ENERGY_UPGRADE_COSTS', [100, 250]);
  set('MINE_AUTO_COST', 1000);
  set('HATCHERY_SLOT_UPGRADE_COSTS', [500, 1000, 2500]);
  set('TRAINING_MULTI_SLOT_COST', 2500);
  set('TRAINING_AUTOMATION_SLOT_COST', 1000);
  set('STAFF_LADDERS', { money: [25000, 75000], questPoints: [1000, 2000] });
  set('masterBallPrices', () => ({ money: 10000000, dungeonTokens: 25000, questPoints: 5000, diamonds: 500 }));
  set('LOCATIONS', { route1: {}, route22: {} });
  set('moneyPerKillForLocation', (l) => (l === 'route1' ? 10 : 302));
  set('getLocName', (id) => (id === 'diglettscave' ? 'Grotte Taupiqueur' : id === 'route5' ? 'Route 5' : id));
  set('getChampName', (id) => (id === 'surge' ? 'Major Bob' : id));
  set('OfflineEngine', { MAX_MS: 12 * 3600 * 1000 });
  set('formatNumber', (n) => String(n));
  set('t', (k) => k);
  set('tr', (k, p) => `${k}:${JSON.stringify(p)}`);
  set('getIcon', (n) => `<i data-icon="${n}"></i>`);
  set('G', { lang: 'fr' });
  try {
    const { guideKeyValues, guideSections } = await import('../src/ui/game/guide-sections.js');
    const v = guideKeyValues();
    assert.equal(v.rare, '4');
    assert.equal(v.uncommon, '20');
    assert.equal(v.common, '76');
    assert.equal(v.roam, '1');
    assert.equal(v.roamLvl, '75');
    assert.equal(v.shiny, '4096');
    assert.equal(v.shinyCharm, '2048');
    assert.equal(v.moneyMin, '10');
    assert.equal(v.moneyMax, '302');
    assert.equal(v.relaunch, '2500');
    assert.equal(v.dgRelaunch, '5000');
    assert.equal(v.dgDelay, '5');
    assert.equal(v.dgMode, 'dungeon_auto_mode_farm');
    assert.equal(v.tools, 'mine_tool_chisel 5 mine_energy_unit (mine_tool_area_single) · mine_tool_pickaxe 20 mine_energy_unit (mine_tool_area_cross — 400 currency_diamonds)');
    assert.equal(v.energyUpgrades, '100 / 250');
    assert.equal(v.mineLoc, 'Grotte Taupiqueur');
    assert.equal(v.hatcherySlots, '500 / 1000 / 2500');
    assert.equal(v.hatcheryLoc, 'Route 5');
    assert.equal(v.trainingBadge, 'Major Bob');
    assert.equal(v.staff, 'currency_money 25000 / 75000 · currency_quest_points 1000 / 2000');
    assert.equal(v.mbMoney, '10000000');
    assert.equal(v.afkHours, '12');
    assert.equal(v.tolls, '100 / 150 / 250');
    assert.equal(v.multStep, '50');
    assert.equal(v.wipeKeep, '50');
    assert.equal(v.completion, '2,5');
    assert.equal(v.exhausted, '40');
    assert.equal(v.autoClears, '3');
    assert.equal(v.dgRare, '5');
    const sections = guideSections();
    assert.ok(sections.map, 'map section exists');
    assert.ok(sections.combat, 'combat section exists');
    assert.ok(sections.capture, 'capture section exists');
    assert.ok(sections.automation, 'automation section exists');
    assert.ok(!sections.sound, 'sound section removed per player feedback');
    assert.ok(hasKey(FR, 'guide_map_simple_desc') && hasKey(EN, 'guide_map_simple_desc'));
  } finally {
    for (const k of Object.keys(prev)) {
      if (prev[k] === undefined) delete g[k];
      else g[k] = prev[k];
    }
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 6) DONJONS — gardien aléatoire parmi les rares, rares dans les combats normaux
// ════════════════════════════════════════════════════════════════════════════
test('R3-D29 · _dgBossSpecies : tirage uniforme parmi les rares (puis peu communs, communs) — plus de « meilleur rare » figé', async () => {
  if (!globalThis.window) globalThis.window = globalThis;
  const E = await import('../src/application/encounter-system.js');
  const G = { location: 'safari' };
  const wild = [
    [113, 20, 30, 'rare'], // Leveinard
    [147, 20, 30, 'rare'], // Minidraco
    [128, 20, 30, 'rare'], // Tauros
    [111, 15, 25, 'uncommon'],
    [19, 10, 20, 'common'],
  ];
  const prevLoc = globalThis.getLocObj;
  globalThis.getLocObj = () => ({ type: 'dungeon', wild });
  try {
    const seen = new Set();
    for (let i = 0; i < 60; i++) seen.add(E._dgBossSpecies(G, 1, () => (i % 3) / 3 + 0.01));
    assert.deepEqual([...seen].sort((a, b) => a - b), [113, 128, 147], 'chaque rare peut être le gardien');
    assert.equal(E._dgBossSpecies(G, 1, () => 0.999), 128, 'dernier du seau rare');
    globalThis.getLocObj = () => ({ type: 'dungeon', wild: wild.slice(3) });
    assert.equal(E._dgBossSpecies(G, 1, () => 0), 111, 'sans rare : un peu commun');
    globalThis.getLocObj = () => ({ type: 'dungeon', wild: [] });
    assert.equal(E._dgBossSpecies(G, 7, () => 0), 7, 'table vide : repli');
  } finally {
    if (prevLoc) globalThis.getLocObj = prevLoc;
    else delete globalThis.getLocObj;
  }
  assert.equal(E._dgBossSpecies.length, 3);
  const src = R('src/application/encounter-system.js');
  assert.match(src, /const DUNGEON_RARE_ON_COMMON_TILE = 0\.05;/);
  assert.match(src, /rollShiny\(bossId\)/, 'le gardien peut être brillant');
  const ecs = R('src/application/ecs-gameplay-systems.js');
  assert.match(ecs, /if \(bucketHint === 'common'\) \{\s*const share = Number\(globalThis\.DUNGEON_RARE_ON_COMMON_TILE\) \|\| 0;\s*if \(share > 0 && portRng\(\)\(\) < share\) bucketHint = 'rare';/);
});

// ════════════════════════════════════════════════════════════════════════════
// 7) RELANCE AUTO DES EXPÉDITIONS (D30) — en direct et hors-ligne
// ════════════════════════════════════════════════════════════════════════════
function bootAutoDungeon(opts = {}) {
  const timers = [];
  const calls = { start: [], setAuto: [], notify: [], logs: [] };
  const wallet = { dungeonTokens: opts.tokens == null ? 1000 : opts.tokens };
  const G = {
    location: 'mtmoon',
    team: [{ currentHP: 10, maxHP: 10 }],
    automation: Object.assign({}, opts.automation || {}),
    dungeonRun: null,
  };
  const battle = { active: false };
  const purchased = new Set(opts.owned === false ? [] : ['autoDungeonRelaunch']);
  const stubs = {
    G,
    battle,
    PW_FF: !!opts.ff,
    t: (k) => k,
    tr: (k, p) => k + JSON.stringify(p || {}),
    notify: (m) => calls.notify.push(m),
    addBattleLog: (m) => calls.logs.push(m),
    isAutomationPurchased: (k) => purchased.has(k),
    getLocObj: (id) => (id === 'mtmoon' ? { type: 'dungeon', badgeReq: 1 } : { type: 'route' }),
    dungeonToll: (n) => [100, 150, 250][n] || 250,
    ensureWallet: () => wallet,
    currentDungeonRun: () => (G.dungeonRun && G.dungeonRun.active ? G.dungeonRun : null),
    startDungeonRun: (loc) => {
      calls.start.push(loc);
      wallet.dungeonTokens -= 150;
      G.dungeonRun = { active: true, loc, auto: null };
      return G.dungeonRun;
    },
    dungeonAutoUnlocked: () => opts.autoUnlocked !== false,
    dungeonSetAuto: (m) => {
      calls.setAuto.push(m);
      G.dungeonRun.auto = m;
    },
    formatNumber: (n) => String(n),
    _pwSetHtmlSafe(el, html) {
      el.innerHTML = html;
    },
  };
  const { sandbox, dom } = makeDomSandbox('<div id="dungeon-auto-relaunch"></div>', stubs);
  sandbox.setTimeout = (fn, ms) => {
    timers.push({ fn, ms, cleared: false });
    return timers.length;
  };
  sandbox.clearTimeout = (id) => {
    if (timers[id - 1]) timers[id - 1].cleared = true;
  };
  sandbox.setInterval = () => 99;
  sandbox.clearInterval = () => {};
  vm.runInContext(harnessBundleSource(['src/application/automation/auto-dungeon-relaunch.js']), sandbox, {
    filename: 'auto-dungeon-relaunch.js',
  });
  return { sandbox, dom, timers, calls, wallet, G, battle, purchased };
}

test('R3-D30a · prix 5 000 PQ ; fin d’expédition (gardien ou K.O.) → compte à rebours de 5 s puis startDungeonRun + pilote du mode mémorisé', () => {
  const { sandbox, timers, calls, wallet, G } = bootAutoDungeon();
  assert.equal(sandbox.AUTO_DG_DELAY_MS, 5000);
  assert.equal(sandbox.isAutoDungeonRelaunchEnabled(), true, 'activée par défaut après l’achat');
  assert.equal(sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon', mode: 'chest', outcome: 'cleared' }), true);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].ms, 5000);
  assert.ok(sandbox.autoDungeonRelaunchRemainingMs() > 0);
  const bar = sandbox.document.getElementById('dungeon-auto-relaunch');
  assert.match(bar.innerHTML, /auto_dg_relaunch_countdown/, 'bandeau : compte à rebours visible');
  timers[0].fn(); // le délai s'écoule
  assert.deepEqual(J(calls.start), ['mtmoon']);
  assert.deepEqual(J(calls.setAuto), ['chest'], 'le pilote reprend le mode de l’expédition précédente');
  assert.equal(wallet.dungeonTokens, 850, 'péage prélevé par startDungeonRun, rien d’autre');
  assert.equal(G.automation.autoDungeonMode, 'chest');
  assert.deepEqual(J(calls.logs), ['auto_dg_relaunch_fired']);
  assert.equal(sandbox.autoDungeonRelaunchRemainingMs(), 0);
  // Expédition en cours : pas de second armement.
  assert.equal(sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon', outcome: 'wipe' }), false);
});

test('R3-D30b · jamais : sans achat, interrupteur coupé, sous PW_FF, autre lieu, combat en cours, équipe K.O. ; jetons insuffisants → message + arrêt', () => {
  let b = bootAutoDungeon({ owned: false });
  assert.equal(b.sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon' }), false, 'non achetée');
  assert.equal(b.sandbox.isAutoDungeonRelaunchEnabled(), false);
  b = bootAutoDungeon({ automation: { autoDungeonRelaunch: false } });
  assert.equal(b.sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon' }), false, 'interrupteur coupé');
  b = bootAutoDungeon({ ff: true });
  assert.equal(b.sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon' }), false, 'rattrapage hors-ligne : jamais en direct');
  b = bootAutoDungeon();
  b.G.location = 'route1';
  assert.deepEqual(J(b.sandbox.autoDungeonRelaunchCheck('mtmoon')), { ok: false, reason: 'away' });
  b.G.location = 'mtmoon';
  b.battle.active = true;
  assert.deepEqual(J(b.sandbox.autoDungeonRelaunchCheck('mtmoon')), { ok: false, reason: 'battle' });
  assert.equal(b.sandbox.autoDungeonRelaunchCheck('mtmoon', { arming: true }).ok, true, 'armement : le combat perdu se ferme encore');
  b.battle.active = false;
  b.G.team[0].currentHP = 0;
  assert.deepEqual(J(b.sandbox.autoDungeonRelaunchCheck('mtmoon')), { ok: false, reason: 'ko' });
  b = bootAutoDungeon({ tokens: 20 });
  assert.equal(b.sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon', outcome: 'wipe' }), false);
  assert.equal(b.timers.length, 0, 'aucun compte à rebours');
  assert.deepEqual(J(b.calls.notify), ['auto_dg_relaunch_no_tokens{"need":"150","have":"20"}']);
  // Interrupteur : coupe un compte à rebours armé.
  b = bootAutoDungeon();
  assert.equal(b.sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon' }), true);
  b.sandbox.toggleAutoDungeonRelaunch();
  assert.equal(b.sandbox.isAutoDungeonRelaunchEnabled(), false);
  assert.equal(b.timers[0].cleared, true, 'compte à rebours annulé');
  b.timers[0].fn();
  assert.equal(b.calls.start.length, 0, 'un tir après annulation ne lance rien');
});

test('R3-D30c · câblage : crochets de fin d’expédition, boutique, index.html, étape hors-ligne et récapitulatif AFK', () => {
  const run = R('src/application/world/dungeon-run.js');
  assert.match(run, /function _dgRelaunchHook\(/);
  assert.match(run, /globalThis\.PW_FF !== true\) f\(\{ loc: run\.loc, mode: run\.auto \|\| null, outcome \}\)/);
  assert.ok((run.match(/_dgRelaunchHook\(/g) || []).length >= 3, 'appelé par dungeonOnWipe et dungeonOnBossDefeated');
  assert.match(R('index.html'), /id="dungeon-auto-relaunch"/);
  assert.match(R('src/main.js'), /auto-dungeon-relaunch\.js/);
  const off = R('src/application/save/dungeon-offline.js');
  assert.match(off, /const DUNGEON_OFFLINE_RELAUNCH_MS = 5000;/);
  assert.match(off, /const DUNGEON_OFFLINE_MAX_RUNS = \d+;/);
  assert.match(off, /_dgoRelaunchAllowed\(\) && res\.runs < DUNGEON_OFFLINE_MAX_RUNS/);
  assert.match(off, /startAutoDungeonRun', G\.location, \{ offline: true \}/);
  const eng = R('src/application/save/offline-engine.js');
  assert.match(eng, /afk_panel_dungeon_runs/);
  assert.match(eng, /afk_dungeon_runs_note/);
  for (const k of [
    'automation_autoDungeonRelaunch',
    'automation_autoDungeonRelaunch_desc',
    'auto_dg_relaunch_shop_desc',
    'auto_dg_relaunch_title',
    'auto_dg_relaunch_countdown',
    'auto_dg_relaunch_on',
    'auto_dg_relaunch_off',
    'auto_dg_relaunch_fired',
    'auto_dg_relaunch_need',
    'auto_dg_relaunch_no_tokens',
    'afk_panel_dungeon_runs',
    'afk_dungeon_runs_note',
    'guide_auto_dg_relaunch',
    'guide_auto_dg_relaunch_desc',
  ]) {
    assert.ok(hasKey(FR, k), `FR ${k}`);
    assert.ok(hasKey(EN, k), `EN ${k}`);
  }
});

// Étape hors-ligne : expédition soldée → nouvelle expédition (relance simulée).
function makeRun({ auto = 'farm' } = {}) {
  const tiles = {
    c0r0: { id: 'c0r0', col: 0, row: 0, type: 'empty', revealed: true, done: true },
    c1r0: { id: 'c1r0', col: 1, row: 0, type: 'combat', revealed: true, done: false },
    c2r0: { id: 'c2r0', col: 2, row: 0, type: 'boss', revealed: true, done: false },
  };
  return {
    active: true,
    loc: 'mtmoon',
    floor: 1,
    depth: 1,
    auto,
    pos: 'c0r0',
    pendingNode: null,
    bossTile: 'c2r0',
    wins: 0,
    totalWins: 0,
    bag: { tokens: 0, money: 0 },
    map: { grid: true, tiles },
  };
}

async function bootDungeonOffline(opts = {}) {
  const calls = { starts: 0, ffLoops: 0 };
  const G = { location: 'mtmoon', team: [{ currentHP: 10, maxHP: 10 }], dungeonRun: makeRun(), automation: {} };
  const battle = { active: false, playerPokeIdx: 0 };
  const wallet = { dungeonTokens: opts.tokens == null ? 10000 : opts.tokens };
  const handlers = {};
  const stubs = {
    G,
    battle,
    OfflineEngine: {
      register(name, fn) {
        handlers[name] = fn;
      },
      handler(name) {
        return handlers[name] || null;
      },
    },
    currentDungeonRun: () => (G.dungeonRun && G.dungeonRun.active ? G.dungeonRun : null),
    aliveCount: () => G.team.filter((p) => p.currentHP > 0).length,
    firstAlive: () => 0,
    ensureWallet: () => wallet,
    tr: (k, p) => k + JSON.stringify(p || {}),
    offlineSetStageLabel() {},
    offlineDrainStuckLiveKOs: async () => {},
    offlineStopWildBattleTimer() {},
    refreshDungeonPanel() {},
    isAutoDungeonRelaunchEnabled: () => opts.relaunch !== false,
    autoDungeonRelaunchCheck: () => ({ ok: wallet.dungeonTokens >= 150 && calls.starts < (opts.maxStarts == null ? 99 : opts.maxStarts), reason: null }),
    startAutoDungeonRun: () => {
      if (wallet.dungeonTokens < 150) return false;
      calls.starts++;
      wallet.dungeonTokens -= 150;
      G.dungeonRun = makeRun({ auto: null });
      return true;
    },
    dungeonOnWin() {
      const run = G.dungeonRun;
      run.wins++;
      run.totalWins++;
      run.bag.tokens += 10;
      if (run.pendingNode) {
        run.map.tiles[run.pendingNode].done = true;
        run.pendingNode = null;
      }
      return run;
    },
    dungeonOnBossDefeated() {
      const run = G.dungeonRun;
      wallet.dungeonTokens += run.bag.tokens + 50;
      G.dungeonRun = null;
      return { outcome: 'cleared' };
    },
    dungeonOnWipe() {
      G.dungeonRun = null;
      return { outcome: 'wipe' };
    },
    _dgAutoStep(o) {
      if (!(o && o.offline)) return null;
      const run = G.dungeonRun;
      if (!run || !run.auto || battle.active) return null;
      const next = Object.values(run.map.tiles).find((t) => !t.done && t.type !== 'empty');
      if (!next) return null;
      return stubs.dungeonMoveTo(next.id);
    },
    dungeonMoveTo(id) {
      const run = G.dungeonRun;
      run.pos = id;
      run.pendingNode = id;
      battle.active = true;
      battle.isDungeonBoss = run.map.tiles[id].type === 'boss';
      return run;
    },
  };
  const { sandbox } = makeDomSandbox('', stubs);
  vm.runInContext(harnessBundleSource(['src/application/save/dungeon-offline.js']), sandbox, { filename: 'dungeon-offline.js' });
  const ffLoop = async function (budgetMs) {
    calls.ffLoops++;
    const cost = 30000;
    if (budgetMs < cost) return { simMs: budgetMs, ticks: 1 };
    if (battle.isDungeonBoss) sandbox.dungeonOnBossDefeated();
    else sandbox.dungeonOnWin();
    battle.active = false;
    return { simMs: cost, ticks: 1 };
  };
  sandbox.offlineRunBattleFfLoop = ffLoop;
  sandbox.window.offlineRunBattleFfLoop = ffLoop;
  return { sandbox, calls, G, battle, wallet, handlers };
}

test('R3-D30d · hors-ligne : gardien vaincu → relance simulée (5 s + péage) et nouvelle expédition jouée avec le pilote d’absence ; compteurs runs/clears', async () => {
  const { handlers, calls, G, wallet } = await bootDungeonOffline();
  const res = await handlers.dungeon(20 * 60); // 20 min de budget
  assert.ok(calls.starts >= 2, `au moins deux relances (${calls.starts})`);
  assert.equal(res.runs, calls.starts, 'runs = expéditions relancées');
  assert.ok(res.clears >= calls.starts, 'chaque expédition relancée a été menée au gardien');
  assert.equal(res.mode, 'farm', 'le mode du pilote est conservé');
  assert.ok(wallet.dungeonTokens > 0);
  assert.ok(!G.dungeonRun || G.dungeonRun.active, 'état cohérent en sortie');
  // Sans relance : une seule expédition.
  const b2 = await bootDungeonOffline({ relaunch: false });
  const r2 = await b2.handlers.dungeon(20 * 60);
  assert.equal(b2.calls.starts, 0);
  assert.equal(r2.runs, 0);
  assert.equal(r2.clears, 1);
});

// ════════════════════════════════════════════════════════════════════════════
// 8) IMMUNITÉS — ×0 affiché ; même table pour le moteur ; parité AFK
// ════════════════════════════════════════════════════════════════════════════
test('R3-08a · battleDisplayedEff : Sol vs Lévitation → ×0 (plus ×2), absorptions/flash → ×0, Garde Mystik hors super efficace → ×0,2 ; talent caché compris', async () => {
  const prev = { typeEff: globalThis.typeEff, hidden: globalThis.getPokemonHiddenTalent };
  globalThis.typeEff = (atk, d1, d2) => {
    if (atk === 'Ground' && (d1 === 'Electric' || d2 === 'Electric')) return 2;
    if (atk === 'Electric' && (d1 === 'Water' || d2 === 'Water')) return 2;
    return 1;
  };
  delete globalThis.getPokemonHiddenTalent;
  try {
    const M = await import('../src/application/combat/talent-immunity.js');
    const magnezone = { type1: 'Electric', type2: 'Steel', talent: 'levitate' };
    assert.equal(M.talentImmunityFor(magnezone, 'Ground'), 'levitate');
    assert.equal(M.battleDisplayedEff('Ground', magnezone), 0, 'Sol sur Lévitation : ×0');
    assert.equal(M.battleDisplayedEff('Ground', { type1: 'Electric', talent: 'static' }), 2, 'sans Lévitation : ×2');
    assert.equal(M.battleDisplayedEff('Electric', { type1: 'Water', talent: 'voltabsorb' }), 0, 'Absorb Volt');
    assert.equal(M.battleDisplayedEff('Electric', { type1: 'Water', talent: 'lightningrod' }), 0, 'Paratonnerre');
    assert.equal(M.battleDisplayedEff('Fire', { type1: 'Normal', talent: 'flashfire' }), 0, 'Torche');
    assert.equal(M.battleDisplayedEff('Normal', { type1: 'Bug', talent: 'wonderguard' }), 0.2, 'Garde Mystik');
    assert.equal(M.battleDisplayedEff('Ground', { type1: 'Electric', talent: 'wonderguard' }), 2, 'Garde Mystik laisse passer le super efficace');
    globalThis.getPokemonHiddenTalent = (p) => (p.hidden ? p.hidden : null);
    assert.equal(M.battleDisplayedEff('Ground', { type1: 'Electric', talent: 'static', hidden: 'levitate' }), 0, 'talent caché Lévitation');
    assert.equal(M.battleTalentTypeMult('Ground', null), 1);
    assert.ok(Object.keys(M.TALENT_IMMUNE_TYPE).length >= 20);
  } finally {
    if (prev.typeEff) globalThis.typeEff = prev.typeEff;
    else delete globalThis.typeEff;
    if (prev.hidden) globalThis.getPokemonHiddenTalent = prev.hidden;
    else delete globalThis.getPokemonHiddenTalent;
  }
});

test('R3-08b · UNE table partagée : le moteur (performAttack) et les trois affichages lisent talent-immunity.js ; l’AFK joue le vrai moteur (aucune règle de combat coupée sous PW_FF)', () => {
  const attack = R('src/application/combat/battle-attack.js');
  assert.match(attack, /globalThis\.talentImmunityFor \? talentImmunityFor\(defender, mv\.type\) : null/);
  assert.doesNotMatch(attack, /PW_FF/, 'performAttack ne connaît pas le rattrapage : mêmes types, talents, objets, statuts');
  for (const f of ['src/application/combat/battle-attack.js', 'src/application/combat/battle-status.js', 'src/application/combat/stat-mods.js'])
    assert.doesNotMatch(R(f), /PW_FF/, `${f} : aucune bifurcation hors-ligne`);
  for (const f of ['src/ui/game/battle-ui.js', 'src/ui/game/battle-team-ui.js'])
    assert.match(R(f), /battleDisplayedEff\(/, `${f} : efficacité affichée via la table partagée`);
  assert.match(R('src/main.js'), /combat\/talent-immunity\.js/);
  // Le moteur hors-ligne ne coupe que l'AFFICHAGE : aucune fonction de combat
  // dans la liste des fonctions rendues muettes.
  const eng = R('src/application/save/offline-engine.js');
  const muted = eng.match(/const OFFLINE_MUTED_FNS = \[([\s\S]*?)\];/);
  assert.ok(muted, 'OFFLINE_MUTED_FNS présent');
  for (const fn of ['performAttack', 'typeEff', 'hasTalent', 'talentImmunityFor', 'applyStatusEffect', 'calcDamage', 'triggerEntryTalents', 'enemyAttack'])
    assert.ok(!new RegExp(`'${fn}'`).test(muted[1]), `${fn} n'est pas coupé pendant l'AFK`);
  assert.match(keyText(FR, 'guide_key_afk_desc') || '', /VRAI moteur/);
  assert.match(keyText(EN, 'guide_key_afk_desc') || '', /REAL battle engine/);
});

// ════════════════════════════════════════════════════════════════════════════
// 9) VERSION & DOCUMENTATION
// ════════════════════════════════════════════════════════════════════════════
test('R3-00 · version 7.5.2, ChangeLog, roadmap (D29–D31) et livraison', () => {
  assert.match(JSON.parse(R('package.json')).version, /^7\.(5\.[23]|6\.[0-9]+)$/);
  assert.match(R(fs.existsSync(new URL('docs/ChangeLog.md', ROOT)) ? 'docs/ChangeLog.md' : 'ChangeLog.md'), /7\.5\.2/);
  assert.ok(fs.existsSync(new URL(fs.existsSync(new URL('docs/LIVRAISON-V7-R3c.md', ROOT)) ? 'docs/LIVRAISON-V7-R3c.md' : 'LIVRAISON-V7-R3c.md', ROOT)));
  assert.match(R(fs.existsSync(new URL('docs/ChangeLog.md', ROOT)) ? 'docs/ChangeLog.md' : 'ChangeLog.md'), /7\.5\.0/);
  assert.match(R(fs.existsSync(new URL('docs/ChangeLog.md', ROOT)) ? 'docs/ChangeLog.md' : 'ChangeLog.md'), /7\.5\.1/);
  assert.ok(fs.existsSync(new URL(fs.existsSync(new URL('docs/LIVRAISON-V7-R3b.md', ROOT)) ? 'docs/LIVRAISON-V7-R3b.md' : 'LIVRAISON-V7-R3b.md', ROOT)));
  const road = R('docs/ROAD_MAP_V7.md');
  for (const d of ['D29', 'D30', 'D31']) assert.match(road, new RegExp(`\\*\\*${d}\\b`), `décision ${d}`);
  assert.ok(fs.existsSync(new URL(fs.existsSync(new URL('docs/LIVRAISON-V7-R3.md', ROOT)) ? 'docs/LIVRAISON-V7-R3.md' : 'LIVRAISON-V7-R3.md', ROOT)));
});
