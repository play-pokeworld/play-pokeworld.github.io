// ═════════════════════════════════════════════════
// V7-R1b (hotfix) — REPRISE D'UNE EXPÉDITION DE DONJON APRÈS RECHARGEMENT
// ═════════════════════════════════════════════════
// Retour joueur urgent : « des joueurs sont lock dans les donjons ». Un F5 au
// milieu d'une expédition laissait `G.dungeonRun` intact dans la sauvegarde
// mais ne rebranchait rien : drapeau <html data-dungeon-run> absent (écran
// « Exploration au repos » affiché, bandeau d'expédition masqué), grille non
// dessinée, carte du monde verrouillée (règle PASSE 34) et bouton
// « Combattre au palier N » muet (exploreArea sans case engagée) → verrou.
//
// Exigence : après un rechargement, le joueur CONTINUE son expédition
// (même palier, même carte, même sac) — il n'est ni bloqué ni remis à zéro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

// ── DOM minimal : seul l'attribut sur <html> nous intéresse ici ───────────
function fakeDocument() {
  const attrs = {};
  return {
    documentElement: {
      setAttribute: (k, v) => {
        attrs[k] = String(v);
      },
      removeAttribute: (k) => {
        delete attrs[k];
      },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
    },
    getElementById: () => null,
    addEventListener: () => {},
    _attrs: attrs,
  };
}

function sandbox({ alive = 6, location = 'mtmoon' } = {}) {
  const notes = [];
  globalThis.document = fakeDocument();
  globalThis.G = {
    money: 0,
    location,
    dungeonsExplored: 0,
    dungeonRun: null,
    dungeonClears: {},
    team: [],
  };
  const wallet = { dungeonTokens: 100000 };
  globalThis.ensureWallet = () => wallet;
  globalThis.spendDungeonTokens = (n) => {
    if (wallet.dungeonTokens < n) return false;
    wallet.dungeonTokens -= n;
    return true;
  };
  globalThis.gainDungeonTokens = (n) => {
    wallet.dungeonTokens += n;
  };
  globalThis.getLocObj = (id) => ({ name: id, type: 'dungeon', badgeReq: 0 });
  globalThis.dungeonToll = () => 500;
  globalThis.updateHeader = () => {};
  globalThis.notify = (msg, color) => notes.push({ msg, color });
  globalThis.t = (k) => k;
  globalThis.tr = (k, vars) => k + ':' + JSON.stringify(vars || {});
  globalThis.exploreArea = () => {};
  globalThis.aliveCount = () => alive;
  let maps = 0;
  globalThis.renderMap = () => {
    maps += 1;
  };
  globalThis.battle = { active: false, pendingDungeonBoss: false, dungeonElite: false };
  return { wallet, notes, mapsRendered: () => maps };
}

const RUN = await import('../src/application/world/dungeon-run.js');
const RES = await import('../src/application/world/dungeon-resume.js');

/** Simule le rechargement : on garde le `G.dungeonRun` sauvegardé (JSON) et
 *  on perd TOUT le reste (drapeau <html>, état de combat, position du joueur
 *  éventuellement rejouée par un autre flux). */
function reloadWith(run, over = {}) {
  const env = sandbox(over);
  globalThis.G.dungeonRun = JSON.parse(JSON.stringify(run));
  return env;
}

// ─── 1. Le cas nominal : on reprend là où on en était ─────────────────────
test('R1b-1 — après rechargement, le drapeau <html data-dungeon-run> est reposé et la reprise notifiée', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  assert.equal(globalThis.document.documentElement.getAttribute('data-dungeon-run'), '1');
  const env = reloadWith(started);
  assert.equal(
    globalThis.document.documentElement.getAttribute('data-dungeon-run'),
    null,
    'au boot, rien n’a encore reposé le drapeau (c’était le bug)'
  );
  const out = RES.dungeonResumeAfterLoad();
  assert.equal(out, 'resumed');
  assert.equal(globalThis.document.documentElement.getAttribute('data-dungeon-run'), '1');
  const run = RUN.currentDungeonRun();
  assert.ok(run && run.active, 'l’expédition est toujours active');
  assert.equal(run.floor, started.floor, 'même palier');
  assert.equal(run.pos, started.pos, 'même position');
  assert.deepEqual(run.bag, started.bag, 'même sac');
  assert.equal(
    Object.keys(run.map.tiles).length,
    Object.keys(started.map.tiles).length,
    'même carte (pas de régénération inutile)'
  );
  const note = env.notes.find((n) => String(n.msg).startsWith('dungeon_run_resumed'));
  assert.ok(note, 'le joueur est prévenu que l’expédition reprend');
  assert.ok(String(note.msg).includes('"floor":"1"'), 'avec le palier');
  RUN.dungeonAbandon();
});

test('R1b-2 — idempotente : un second appel ne change rien et ne régénère pas la carte', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  reloadWith(started);
  assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
  const snap = JSON.stringify(globalThis.G.dungeonRun);
  assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
  assert.equal(JSON.stringify(globalThis.G.dungeonRun), snap, 'état identique');
  RUN.dungeonAbandon();
});

// ─── 2. Rechargement en plein combat ──────────────────────────────────────
test('R1b-3 — F5 en plein combat : la case engagée est libérée et reste À BATTRE', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  // on engage un combat sur une case voisine (pendingNode posé, battle actif)
  const here = started.map.tiles[started.pos];
  const target = Object.values(started.map.tiles).find(
    (tl) =>
      (tl.type === 'combat' || tl.type === 'elite') &&
      !tl.done &&
      Math.abs(tl.col - here.col) + Math.abs(tl.row - here.row) <= 2
  );
  // la zone de départ est sans combat : on téléporte sur une case révélée
  // puis on pose l'engagement à la main (ce que fait dungeonMoveTo)
  started.pos = target.id;
  target.revealed = true;
  started.pendingNode = target.id;
  globalThis.battle.active = true;
  globalThis.battle.pendingDungeonBoss = true;
  // rechargement : l'état de combat est perdu, le run (avec pendingNode) sauvegardé
  reloadWith(started);
  assert.equal(globalThis.G.dungeonRun.pendingNode, target.id, 'la sauvegarde porte la case engagée');
  assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
  const run = RUN.currentDungeonRun();
  assert.equal(run.pendingNode, null, 'le combat interrompu ne reste pas « engagé » dans le vide');
  assert.equal(run.map.tiles[target.id].done, false, 'la case n’est PAS soldée : elle reste à battre');
  assert.equal(globalThis.battle.pendingDungeonBoss, false, 'aucun gardien fantôme');
  assert.equal(globalThis.battle.dungeonElite, false);
  // et elle se ré-engage par un clic (comme n'importe quelle case visible)
  RUN.dungeonMoveTo(target.id);
  assert.equal(run.pendingNode, target.id, 'un clic ré-engage la case');
  RUN.dungeonAbandon();
});

test('R1b-4 — si un combat est DÉJÀ actif (rattrapage hors-ligne), la case engagée est conservée', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  const target = Object.values(started.map.tiles).find((tl) => tl.type === 'combat');
  started.pendingNode = target.id;
  reloadWith(started);
  globalThis.battle.active = true; // le rattrapage a relancé la chaîne avant nous
  assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
  assert.equal(RUN.currentDungeonRun().pendingNode, target.id, 'pas de sabotage du combat en cours');
  globalThis.battle.active = false;
  RUN.dungeonAbandon();
});

// ─── 3. Cas dégradés ──────────────────────────────────────────────────────
test('R1b-5 — équipe entièrement K.O. au rechargement : l’expédition est soldée comme une défaite, le joueur est libre', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  started.bag.tokens = 100;
  started.bag.money = 40;
  const env = reloadWith(started, { alive: 0 });
  const before = env.wallet.dungeonTokens;
  assert.equal(RES.dungeonResumeAfterLoad(), 'wiped');
  assert.equal(RUN.currentDungeonRun(), null, 'plus d’expédition : plus de verrou');
  assert.equal(globalThis.document.documentElement.getAttribute('data-dungeon-run'), null);
  // règle du sac (wipeKeepRatio) + remboursement du péage au premier palier
  assert.ok(env.wallet.dungeonTokens > before, 'la part conservée du sac est créditée');
  assert.ok(env.notes.some((n) => String(n.msg).startsWith('dungeon_wipe')), 'notification de défaite');
});

test('R1b-6 — carte absente ou corrompue : le palier est régénéré plutôt que laissé injouable', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  const broken = JSON.parse(JSON.stringify(started));
  broken.map = null;
  broken.pos = 'c9r9';
  reloadWith(broken);
  assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
  const run = RUN.currentDungeonRun();
  assert.ok(run.map && run.map.grid && run.map.tiles[run.pos], 'une grille jouable avec une case courante');
  assert.equal(run.floor, 1, 'le palier atteint est conservé');
  RUN.dungeonAbandon();
});

test('R1b-7 — le lieu courant est réaligné sur le donjon de l’expédition (la carte du monde y est verrouillée)', () => {
  sandbox();
  const started = RUN.startDungeonRun('mtmoon');
  const env = reloadWith(started, { location: 'pallet' });
  assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
  assert.equal(globalThis.G.location, 'mtmoon');
  assert.ok(env.mapsRendered() >= 1, 'la carte est redessinée');
  RUN.dungeonAbandon();
});

test('R1b-8 — sans expédition : aucun effet, sauf retirer un drapeau résiduel (changement de sauvegarde)', () => {
  const env = sandbox();
  globalThis.document.documentElement.setAttribute('data-dungeon-run', '1'); // laissé par une autre partie
  assert.equal(RES.dungeonResumeAfterLoad(), null);
  assert.equal(globalThis.document.documentElement.getAttribute('data-dungeon-run'), null);
  assert.equal(env.notes.length, 0, 'pas de message');
});

test('R1b-9 — pilote automatique : il repart tout seul après le rechargement', async () => {
  sandbox();
  globalThis.G.dungeonClears.mtmoon = 99;
  const started = RUN.startDungeonRun('mtmoon');
  started.auto = 'farm';
  reloadWith(started);
  let steps = 0;
  const real = globalThis._dgAutoStep;
  globalThis._dgAutoStep = () => {
    steps += 1;
  };
  try {
    assert.equal(RES.dungeonResumeAfterLoad(), 'resumed');
    assert.equal(steps, 0, 'pas de pas synchrone (le DOM finit de se poser)');
    await new Promise((r) => setTimeout(r, 1100));
    assert.equal(steps, 1, 'un pas du pilote est relancé');
  } finally {
    globalThis._dgAutoStep = real;
    RUN.dungeonAbandon();
  }
});

// ─── 4. Câblage : boot, bouton du lieu, import, i18n ──────────────────────
test('R1b-10 — initializeGameInterface() rebranche l’expédition au boot (même bloc que les tickers)', () => {
  const src = read('src/application/bootstrap-timers.js');
  const i = src.indexOf('Auto-start active automation tickers');
  assert.ok(i > 0);
  const block = src.slice(i, src.indexOf('}, 200);', i));
  assert.match(block, /dungeonResumeAfterLoad\(\)/, 'appelée dans le setTimeout de boot');
  assert.doesNotMatch(block, /typeof dungeonResumeAfterLoad ===/, 'pas de garde typeof nue (budget DBT-04)');
});

test('R1b-11 — en expédition, « Combattre au palier N » engage via dungeonFight (plus de bouton muet)', () => {
  const src = read('src/ui/game/location-info.js');
  assert.match(src, /call:\s*dgHere\s*\?\s*'dungeonFight'\s*:\s*'exploreArea'/);
});

test('R1b-12 — le module est chargé avec le jeu (chunk gameplay) et expose sa surface globale', () => {
  const main = read('src/main.js');
  assert.match(main, /import '\.\/application\/world\/dungeon-resume\.js';/);
  assert.equal(typeof globalThis.dungeonResumeAfterLoad, 'function');
  const src = read('src/application/world/dungeon-resume.js');
  assert.doesNotMatch(src, /^import /m, 'aucun import statique (DBT-04 : tout passe par la surface globale)');
});

test('R1b-13 — i18n : dungeon_run_resumed existe en FR et en EN avec {floor} et {depth}', () => {
  for (const lang of ['fr', 'en']) {
    const src = read('src/localization/' + lang + '/economy.js');
    const m = src.match(/"dungeon_run_resumed":"([^"]+)"/);
    assert.ok(m, lang + ' : clé présente');
    assert.ok(m[1].includes('{floor}') && m[1].includes('{depth}'), lang + ' : variables');
  }
});
