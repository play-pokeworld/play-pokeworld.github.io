// V7-R3d (7.5.3) — Retours joueurs :
// 1. Boutons et curseurs de son soignés (interrupteur Activé / Coupé lisible,
//    curseur à piste remplie, plus d'aspect "cheap").
// 2. Musiques adaptées aux lieux (Tour Pokémon lugubre, sanctuaires, grottes de
//    cristal, volcan, glace, désert, ciel légendaire, routes alternées, etc.).
// 3. Compte à rebours de relance automatique visible DANS le menu de butin
//    (combat sauvage et donjon) avec bouton d'arrêt immédiat et retour clair.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { harnessBundleSource } from '../tools/harness-bundle.mjs';

function readSrc(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

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
// 1) RÉGLAGES SON : INTERRUPTEUR LISIBLE & CURSEUR AVEC REMPLISSAGE
// ════════════════════════════════════════════════════════════════════════════
test('R3d-01 · Réglages Son : cartes de bus, interrupteur pw-switch (Activé/Coupé), curseur rempli', async () => {
  const { SettingsModalView } = await import('../src/ui/views/SettingsModalView.js');
  const model = {
    sound: {
      heading: 'Son',
      volumeLabel: 'Volume',
      onLabel: 'Activé',
      offLabel: 'Coupé',
      buses: [
        {
          id: 'music',
          label: 'Musique',
          on: false,
          vol: 40,
          iconHtml: '<svg class="ico-m"></svg>',
        },
        { id: 'sfx', label: 'Effets', on: true, vol: 80, iconHtml: '<svg class="ico-s"></svg>' },
        { id: 'cries', label: 'Cris', on: true, vol: 60, iconHtml: '<svg class="ico-c"></svg>' },
      ],
    },
  };
  const html = SettingsModalView.toHTML(model);
  assert.match(html, /class="settings-sound-card is-off" id="audio-music-card"/);
  assert.match(html, /class="settings-sound-card is-on" id="audio-sfx-card"/);
  // Interrupteur avec état écrit
  assert.match(
    html,
    /class="pw-switch"[^>]*id="audio-music-toggle"[^>]*role="switch"[^>]*aria-checked="false"/
  );
  assert.match(html, /class="pw-switch-state">Coupé<\/span>/);
  assert.match(
    html,
    /class="pw-switch is-on"[^>]*id="audio-sfx-toggle"[^>]*role="switch"[^>]*aria-checked="true"/
  );
  assert.match(html, /class="pw-switch-state">Activé<\/span>/);
  // Curseur avec style --pw-fill
  assert.match(html, /id="audio-music-volume"[^>]*style="--pw-fill:40%"/);
  assert.match(html, /id="audio-sfx-volume"[^>]*style="--pw-fill:80%"/);
});

// ════════════════════════════════════════════════════════════════════════════
// 2) AMBIANCE DES LIEUX : 42 PISTES CC0, CONTEXTES PRÉCIS (TOUR POKÉMON...)
// ════════════════════════════════════════════════════════════════════════════
test('R3d-02 · Ambiance des lieux : Tour Pokémon sur dungeon_haunted, lieux thématiques, 42 pistes CC0', async () => {
  const { audioMusicChain, AUDIO_MUSIC_TRACKS } = await import('../src/core/audio.js');
  assert.equal(Object.keys(AUDIO_MUSIC_TRACKS).length, 42, '42 pistes livrées');

  // Tour Pokémon : jamais de thème joyeux !
  const towerChain = audioMusicChain('map:kanto:pokemontower:place:haunted');
  assert.deepEqual(towerChain.slice(0, 4), [
    'loc_pokemontower',
    'dungeon_pokemontower',
    'dungeon_haunted',
    'dungeon',
  ]);
  assert.equal(towerChain[2], 'dungeon_haunted');

  // Autres lieux thématiques
  assert.ok(audioMusicChain('map:hoenn:route111:route:desert').includes('dungeon_desert'));
  assert.ok(audioMusicChain('map:hoenn:mt_chimney:place:fire').includes('dungeon_fire'));
  assert.ok(audioMusicChain('map:johto:icepath:place:ice').includes('dungeon_ice'));
  assert.ok(audioMusicChain('map:johto:sprouttower:place:shrine').includes('dungeon_shrine'));
  assert.ok(audioMusicChain('map:hoenn:sky_pillar:place:sky').includes('dungeon_sky'));
  assert.ok(audioMusicChain('map:kanto:route2:alt').includes('map_b'));
  assert.ok(audioMusicChain('battle:wild:johto').includes('battle_wild_johto'));

  // Manifeste + budget
  const manifest = JSON.parse(readSrc('src/assets/audio/manifest.json'));
  assert.equal(Object.keys(manifest.music).length, 42);
  const credits = readSrc('docs/CREDITS.md');
  assert.match(credits, /CC0 1\.0 Universal/);
  for (const k of Object.keys(manifest.music)) {
    assert.ok(credits.includes('`' + k + '.mp3`'), `piste ${k} créditée dans docs/CREDITS.md`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 3) COMPTE À REBOURS DE RELANCE DANS LE MENU DE BUTIN
// ════════════════════════════════════════════════════════════════════════════
test('R3d-03 · Relance visible dans le butin : combat sauvage et expédition avec bouton d’arrêt', async () => {
  const { SessionSummaryView } = await import('../src/ui/views/SessionSummaryView.js');
  const viewHtml = SessionSummaryView.toHTML({
    title: 'Butin',
    items: { title: 'Objets', entries: [] },
    captures: { title: 'Captures', entries: [] },
  });
  assert.match(viewHtml, /id="summary-auto-relaunch"/);
  assert.match(viewHtml, /id="summary-relaunch-wild"/);
  assert.match(viewHtml, /id="summary-relaunch-dungeon"/);

  // Simulation dans le DOM
  const stubs = {
    G: {
      team: [{ id: 1, currentHP: 20 }],
      location: 'route1',
      automationUpgrades: { autoRelaunch: true, autoDungeonRelaunch: true },
      automation: { autoRelaunch: true, autoDungeonRelaunch: true },
      unlockedLocs: { route1: true, mtmoon: true },
      dungeonTokens: 1000,
      badges: ['brock'],
    },
    getLocObj: (id) =>
      id === 'mtmoon' ? { type: 'dungeon', badgeReq: 1 } : { type: 'route', wild: [[1]] },
    dungeonToll: () => 20,
    ensureWallet: () => ({ dungeonTokens: 1000 }),
    isAutomationPurchased: () => true,
    _pwSetHtmlSafe: (el, html) => {
      el.innerHTML = html;
    },
    t: (k) =>
      k === 'auto_relaunch_cancel_btn'
        ? 'Arrêter la relance'
        : k === 'auto_relaunch_cancelled'
          ? 'Relance automatique annulée'
          : k === 'auto_dg_relaunch_cancelled'
            ? 'Prochaine expédition annulée'
            : k,
    tr: (k, p) =>
      k === 'auto_dg_relaunch_countdown'
        ? 'Nouvelle expédition ' + p.s + 's'
        : k + ':' + JSON.stringify(p),
  };
  const domHtml = `
    <div id="battle-auto-relaunch"></div>
    <div id="dungeon-auto-relaunch"></div>
    <div id="summary-relaunch-wild"></div>
    <div id="summary-relaunch-dungeon"></div>
  `;
  const { sandbox } = makeDomSandbox(domHtml, stubs);
  vm.runInContext(
    harnessBundleSource([
      'src/application/automation/auto-relaunch.js',
      'src/application/automation/auto-dungeon-relaunch.js',
    ]),
    sandbox
  );

  // Armement relance sauvage
  sandbox.scheduleAutoRelaunch();
  const wildHost = sandbox.document.getElementById('summary-relaunch-wild');
  assert.match(wildHost.innerHTML, /class="pw-summary-relaunch is-armed"/);
  assert.match(wildHost.innerHTML, /class="pw-summary-relaunch-fill"/);
  assert.match(wildHost.innerHTML, /data-call="cancelAutoRelaunch"/);
  assert.match(wildHost.innerHTML, /Arrêter la relance/);

  // Annulation par le bouton
  sandbox.cancelAutoRelaunch(false);
  assert.match(wildHost.innerHTML, /class="pw-summary-relaunch is-cancelled"/);
  assert.match(wildHost.innerHTML, /Relance automatique annulée/);

  // Armement relance donjon
  sandbox.G.location = 'mtmoon';
  sandbox.scheduleAutoDungeonRelaunch({ loc: 'mtmoon', mode: 'farm' });
  const dgHost = sandbox.document.getElementById('summary-relaunch-dungeon');
  assert.match(dgHost.innerHTML, /class="pw-summary-relaunch is-armed"/);
  assert.match(dgHost.innerHTML, /data-call="cancelAutoDungeonRelaunch"/);
  assert.match(dgHost.innerHTML, /Nouvelle expédition/);

  // Annulation donjon
  sandbox.cancelAutoDungeonRelaunch(false);
  assert.match(dgHost.innerHTML, /class="pw-summary-relaunch is-cancelled"/);
  assert.match(dgHost.innerHTML, /Prochaine expédition annulée/);
});
