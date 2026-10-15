import { pwLateLink } from '../../core/late-link.js';
// V7 · DBT-04 — dépendances explicites (ex-gardes typeof).
import { levelUp } from './progression.js';
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// FIX (2026-08) — mine energy per won battle / capture (was hardcoded 15).
// Read defensively: game-config.js publishes MINE_ENERGY_PER_BATTLE on the
// global surface before this module loads, but VM harnesses may not.
function _mineEnergyPerBattle() {
  try {
    if (typeof MINE_ENERGY_PER_BATTLE === 'number') return MINE_ENERGY_PER_BATTLE;
  } catch (_) {}
  try {
    if (
      typeof GAME !== 'undefined' &&
      GAME &&
      GAME.MINE &&
      typeof GAME.MINE.ENERGY_PER_BATTLE === 'number'
    )
      return GAME.MINE.ENERGY_PER_BATTLE;
  } catch (_) {}
  return 5;
}

function rollWeightedTalentForSpecies(speciesId) {
  const tals = pwLateLink('getSpeciesTalents') ? getSpeciesTalents(speciesId) : [];
  const recOf = pwLateLink('getTalentRecord')
    ? getTalentRecord
    : (x) => (typeof TALENTS_FULL !== 'undefined' ? TALENTS_FULL[x] : null);
  const available = tals.filter((tal) => !!recOf(tal));
  if (!available.length) return null;
  const weighted = [];
  available.forEach((tal) => {
    const rarity = recOf(tal).rarity || 1;
    const weight = rarity === 1 ? 60 : rarity === 2 ? 30 : 12;
    for (let i = 0; i < weight; i++) weighted.push(tal);
  });
  return weighted[rand(0, weighted.length - 1)] || available[0];
}
function unlockCapturedTalent(speciesId, talent) {
  const recOf = pwLateLink('getTalentRecord')
    ? getTalentRecord
    : (x) => (typeof TALENTS_FULL !== 'undefined' ? TALENTS_FULL[x] : null);
  if (!talent || !recOf(talent)) return false;
  if (!G.unlockedTalents) G.unlockedTalents = {};
  if (!G.unlockedTalents[speciesId]) G.unlockedTalents[speciesId] = [];
  const already = G.unlockedTalents[speciesId].includes(talent);
  const rarity = recOf(talent).rarity || 1;
  const chancePct = rarity === 1 ? 100 : rarity === 2 ? 55 : 30;
  if (!already && chance(chancePct)) {
    G.unlockedTalents[speciesId].push(talent);
    return true;
  }
  if (!already && G.unlockedTalents[speciesId].length === 0) {
    G.unlockedTalents[speciesId].push(talent);
    return true;
  }
  return false;
}
// V7-R1 · #7 — chance d'IV à la capture et plafond : UNE source
// (data/game-config.js → GAME.CAPTURE), citée telle quelle par le guide.
// Lecture défensive (identifiants libres publiés par game-config.js ; les
// harnais VM peuvent ne pas les fournir).
function _captureIvChancePct() {
  try {
    if (typeof CAPTURE_IV_CHANCE_PCT === 'number') return CAPTURE_IV_CHANCE_PCT;
  } catch (_) {}
  return 10;
}
function _captureIvCap() {
  try {
    if (typeof CAPTURE_IV_CAP === 'number') return CAPTURE_IV_CAP;
  } catch (_) {}
  return 12;
}
function rollCaptureIv(caughtMon) {
  if (!caughtMon) return null;
  if (!caughtMon.ivs) caughtMon.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (!chance(_captureIvChancePct())) return null;
  const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const cap = _captureIvCap();
  const avail = keys.filter((k) => (caughtMon.ivs[k] || 0) < cap);
  if (!avail.length) return null;
  const picked = avail[rand(0, avail.length - 1)];
  caughtMon.ivs[picked] = (caughtMon.ivs[picked] || 0) + 1;
  try {
    recalcPokeStats(caughtMon);
  } catch (_) {}
  return picked;
}

// P0 — propriété réelle d'une espèce (sans consulter le dex : anti doublon fantôme).
function isSpeciesOwnedReal(e) {
  if (!e || !G) return false;
  // V7 · FORM-01 — même espèce ET même forme (une forme est un Pokémon à part).
  const same = (p) =>
    !!(p && Number(p.id) === Number(e.id) && (Number(p.form) || 0) === (Number(e.form) || 0));
  if (Array.isArray(G.team) && G.team.some(same)) return true;
  if (G.collection) {
    for (const k in G.collection) {
      if (same(G.collection[k])) return true;
    }
  }
  if (Array.isArray(G.hatchery)) {
    for (const s of G.hatchery) {
      if (s && same(s.poke)) return true;
    }
  }
  if (Array.isArray(G.training)) {
    for (const s of G.training) {
      if (s && same(s.poke)) return true;
    }
  }
  return false;
}

function attemptAutoCatch(e) {
  // Hoenn fix: check real ownership before touching the dex
  // (before, we set pokedex=true then speciesOwned() which included the
  // dex => ghost duplicate and empty box)
  const wasShiny = !!(e && (e.shinyActive || e.shiny || e._forceShiny));
  const isRoaming = !!(
    e &&
    (e._isRoaming ||
      [144, 145, 146, 151, 243, 244, 245, 251, 380, 381, 385, 386].includes(Number(e.id)))
  );

  // P0 — capture par Poké Ball : filtre PokéClicker + ball consommée.
  if (pwLateLink('ensurePokeballs')) ensurePokeballs();
  const ballKey = pwLateLink('ballForEnemy') ? ballForEnemy(e) : null;
  if (!ballKey) {
    addBattleLog(tr('ball_no_target', { p0: e.name }));
    return false;
  }
  const ballDefNow = pwLateLink('ballDef') ? ballDef(ballKey) : null;
  let ballRate = pwLateLink('ballEffectiveRate')
    ? ballEffectiveRate(ballKey, e)
    : (ballDefNow && ballDefNow.rate) || 10;
  // V7 · LEG-01 (D13) — rencontre de fin de quête légendaire : taux × 2 (plafond
  // 100 %), jamais garanti. Pokémon offert par une quête (questGift) : garanti.
  if (typeof battle !== 'undefined' && battle) {
    if (battle.legendaryQuest) {
      const mult = typeof LEGENDARY_QUEST_CATCH_MULT === 'number' ? LEGENDARY_QUEST_CATCH_MULT : 2;
      ballRate = Math.min(100, ballRate * mult);
    } else if (battle.questGift) {
      ballRate = 100;
    }
  }
  if (G && G.pokeballs) G.pokeballs[ballKey] = Math.max(0, (G.pokeballs[ballKey] || 0) - 1); // ball consommée (réussite ou échec)
  if (globalThis.pwEmit) globalThis.pwEmit('catch:throw', { ball: ballKey, shiny: wasShiny }); // V7-R2 · SND-02
  // P1 / FIX-06 : les roamers ne contournent plus le jet — même taux que tout le monde.
  // TUTO : la toute première capture (aucun Pokémon attrapé hors starter) est
  // garantie à 100 % pour ne jamais bloquer la quête « Capturer ton premier ».
  const isFirstCatch =
    !G._firstCatchDone &&
    Object.keys(G.collection || {}).length === 0 &&
    (G.team || []).length <= 1;
  const success = ballRate >= 100 || isFirstCatch || chance(ballRate);
  if (!success) {
    addBattleLog(
      tr('ball_broke', {
        ball: ballDefNow && pwLateLink('t') ? t(ballDefNow.labelKey) : ballKey,
        p0: e.name,
      })
    );
    if (globalThis.pwEmit) globalThis.pwEmit('catch:fail', { ball: ballKey, shiny: wasShiny }); // V7-R2 · SND-02
    try {
      if (pwLateLink('playCaptureAnimation'))
        playCaptureAnimation(
          ballKey,
          false,
          pwLateLink('t') ? t('ball_catch_fail') : 'Échec…',
          ballRate
        );
    } catch (_) {}
    try {
      updateHeader();
    } catch (_) {}
    try {
      saveGame();
    } catch (_) {}
    return false;
  }
  G._firstCatchDone = true;
  // DORM-06 — Luxe Ball : le Pokémon capturé gagne +1 niveau.
  if (ballKey === 'luxuryball') {
    try {
      levelUp(e);
      addBattleLog(`${e.name} gagne un niveau (Luxe Ball) !`);
    } catch (_) {}
  }
  try {
    if (pwLateLink('playCaptureAnimation'))
      playCaptureAnimation(
        ballKey,
        true,
        pwLateLink('t') ? t('ball_catch_success') : 'Capturé !',
        ballRate
      );
  } catch (_) {}
  // P3 · ANI-01 — éclat de 600 ms sur la rangée du sauvage capturé.
  try {
    if (pwLateLink('flashCapture') && typeof document !== 'undefined') {
      // PASSE 31 — l'éclat doit frapper le Pokémon SAUVAGE, pas le nôtre :
      // `.poke-card` tout court renvoyait la première carte de la rangée, donc
      // notre combattant. La carte adverse porte désormais `.pw-enemy-card`.
      const row = document.getElementById('battle-team-row');
      const wild = row && (row.querySelector('.pw-enemy-card') || row.querySelector('.poke-card'));
      if (wild) flashCapture(wild);
    }
  } catch (_) {}
  addBattleLog(tr('m.catch.6', { p0: e.name }));
  // PASSE 30 (P3) — la population du fond suit les captures : on la recalcule
  // ici pour que la progression se voie immédiatement (différé d'un tick pour
  // laisser la capture s'inscrire dans G.pokedex / G.collection plus bas).
  try {
    if (pwLateLink('setTimeout'))
      setTimeout(() => {
        try {
          if (pwLateLink('renderBgPokemon')) renderBgPokemon();
        } catch (_) {}
      }, 0);
  } catch (_) {}

  // 1) already owned? without looking at the dex (espèce ET forme, V7 · FORM-01)
  const sKey = pwLateLink('speciesKey') ? speciesKey(e) : String(e.id);
  const isDuplicate = isSpeciesOwnedReal(e);

  // 2) now open the dex
  if (pwLateLink('markDexCaught')) markDexCaught(e, false);
  else G.pokedex[e.id] = { ...(G.pokedex[e.id] || {}), seen: true, caught: true };
  try {
    if (pwLateLink('recordDexCapture')) recordDexCapture(sKey, wasShiny);
    if (pwLateLink('recordLocStat') && G.location) recordLocStat(G.location, 'captured', 1);
  } catch (_) {}

  if (wasShiny) unlockShinyForSpecies(sKey);
  const caughtMon = createPoke(e.id, 1, wasShiny || isSpeciesShiny(sKey), { form: e.form || 0 });
  if (caughtMon) {
    const rolledTalent = rollWeightedTalentForSpecies(e.id);
    if (rolledTalent) caughtMon.talent = rolledTalent;
    const talentUnlocked = unlockCapturedTalent(e.id, caughtMon.talent);
    const ivKey = rollCaptureIv(caughtMon);
    caughtMon.shinyActive = wasShiny || isSpeciesShiny(sKey);
    caughtMon.shiny = caughtMon.shinyActive;
    caughtMon.shinyUnlocked = caughtMon.shinyActive || caughtMon.shinyUnlocked;
    caughtMon.heldItem = null;
    if (talentUnlocked) {
      const talentInfo = getTalentByKey(caughtMon.talent);
      if (talentInfo && pwLateLink('notify'))
        notify(
          tr('m.talent_unlocked', {
            name: getPokeName(e),
            talent: talentInfo.name,
            hidden: talentInfo.isHidden ? (pwLateLink('t') ? t('m.talent_hidden') : '') : '',
            rarity: getRarityLabel(talentInfo.rarity),
          }),
          'var(--accent)'
        );
      addBattleLog(tr('battle_talent_discovered_log', { talent: getTalentName(caughtMon.talent) }));
    }
    if (ivKey) addBattleLog(`⭐ IV gagné sur ${caughtMon.name} : ${ivKey.toUpperCase()} +1 !`);
  }
  if (!battle.sessionCatches) battle.sessionCatches = [];
  battle.sessionCatches.push({
    id: e.id,
    form: e.form || 0,
    name: e.name,
    emoji: e.emoji || PD[e.id]?.[12] || '❓',
    shiny: wasShiny,
    dupe: isDuplicate,
  });

  try {
    if (pwLateLink('renderBattleLoot')) renderBattleLoot();
  } catch (_) {}
  try {
    if (pwLateLink('renderBattleSummary')) {
      const m = document.getElementById('battle-summary-modal');
      if (m && m.classList.contains('open')) renderBattleSummary();
    }
  } catch (_) {}

  if (isDuplicate) {
    let existing = null;
    if (G.team)
      existing = G.team.find(
        (x) => x && Number(x.id) === Number(e.id) && (Number(x.form) || 0) === (Number(e.form) || 0)
      );
    if (!existing) {
      for (const k in G.collection || {}) {
        const cand = G.collection[k];
        if (
          cand &&
          Number(cand.id) === Number(e.id) &&
          (Number(cand.form) || 0) === (Number(e.form) || 0)
        ) {
          existing = cand;
          break;
        }
      }
    }
    if (existing && pwLateLink('chance') && chance(_captureIvChancePct())) {
      if (!existing.ivs) existing.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
      const _cap = _captureIvCap();
      const avail = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].filter(
        (k) => (existing.ivs[k] || 0) < _cap
      );
      if (avail.length) {
        const pick = avail[Math.floor(Math.random() * avail.length)];
        existing.ivs[pick] = (existing.ivs[pick] || 0) + 1;
        try {
          if (pwLateLink('recalcPokeStats')) recalcPokeStats(existing);
        } catch (_) {}
        addBattleLog(`⭐ IV +1 ${pick.toUpperCase()} sur ${existing.name} (doublon évité)`);
        if (pwLateLink('notify'))
          notify(`${existing.name} : +1 IV ${pick.toUpperCase()} (doublon)`, 'var(--green)');
      }
    }
    if (!G.dupeCatches) G.dupeCatches = {};
    G.dupeCatches[e.id] = (G.dupeCatches[e.id] || 0) + 1;
    if (wasShiny) addBattleLog(tr('m.catch.5', { p0: e.name }));
    addBattleLog(tr('capture_duplicate_no_money', { name: e.name }));
  } else if (caughtMon) {
    if (G.team.length < 6) {
      G.team.push(caughtMon);
      addBattleLog(tr('m.catch.2', { p0: e.name }));
    } else {
      let boxId = pwLateLink('generateUniqueBoxId')
        ? generateUniqueBoxId(sKey)
        : 'box_' + sKey + '_' + Date.now();
      while (G.collection[boxId])
        boxId = 'box_' + e.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      G.collection[boxId] = caughtMon;
      addBattleLog(tr('m.catch.1', { p0: e.name }));
    }
  }

  // FIX (2026-08): mine energy granted per capture rebalanced 15 -> 5.
  if (G.mine)
    G.mine.energy = Math.min(
      G.mine.maxEnergy || 100,
      (G.mine.energy || 0) + _mineEnergyPerBattle()
    );
  // P0 — chaque capture rapporte des jetons de donjon (doublons compris).
  if (pwLateLink('gainDungeonTokens') && pwLateLink('tokensPerCatchForLocation')) {
    const jd = tokensPerCatchForLocation();
    gainDungeonTokens(jd);
    try {
      addBattleLog(tr('jd_gained_log', { n: jd }));
    } catch (_) {}
  }
  try {
    // V7-R2 · SND-02 — `shiny` dans la charge utile : fanfare dédiée (décision joueur).
    EventBus.emit(EVENTS.POKEMON_CAUGHT, {
      loc: G.location,
      id: e.id,
      shiny: wasShiny,
      roaming: isRoaming,
    });
  } catch (_) {}
  try {
    if (pwLateLink('syncShinyCharmProgress')) syncShinyCharmProgress();
  } catch (_) {}
  updateHeader();
  try {
    if (pwLateLink('refreshMapAndLoc')) refreshMapAndLoc();
  } catch (_) {}
  try {
    const el =
      document.getElementById('location-info-panel') || document.getElementById('tab-content');
    if (el && pwLateLink('renderLocInfo')) renderLocInfo(el);
  } catch (_) {}
  try {
    renderBattleTeamRow();
  } catch (_) {}
  try {
    if (typeof _activeTab !== 'undefined' && _activeTab === 'team') showTab('team');
  } catch (_) {}
  try {
    if (typeof _activeTab !== 'undefined' && _activeTab === 'box') showTab('box');
  } catch (_) {}
  saveGame();
  return true;
}

// --- Migrated to ES module, globals exposed ---
if (typeof isSpeciesOwnedReal !== 'undefined') {
  if (typeof window !== 'undefined') window.isSpeciesOwnedReal = isSpeciesOwnedReal;
  if (typeof globalThis !== 'undefined') globalThis.isSpeciesOwnedReal = isSpeciesOwnedReal;
}
if (typeof rollWeightedTalentForSpecies !== 'undefined') {
  if (typeof window !== 'undefined')
    window.rollWeightedTalentForSpecies = rollWeightedTalentForSpecies;
  if (typeof globalThis !== 'undefined')
    globalThis.rollWeightedTalentForSpecies = rollWeightedTalentForSpecies;
}
if (typeof unlockCapturedTalent !== 'undefined') {
  if (typeof window !== 'undefined') window.unlockCapturedTalent = unlockCapturedTalent;
  if (typeof globalThis !== 'undefined') globalThis.unlockCapturedTalent = unlockCapturedTalent;
}
if (typeof rollCaptureIv !== 'undefined') {
  if (typeof window !== 'undefined') window.rollCaptureIv = rollCaptureIv;
  if (typeof globalThis !== 'undefined') globalThis.rollCaptureIv = rollCaptureIv;
}
if (typeof attemptAutoCatch !== 'undefined') {
  if (typeof window !== 'undefined') window.attemptAutoCatch = attemptAutoCatch;
  if (typeof globalThis !== 'undefined') globalThis.attemptAutoCatch = attemptAutoCatch;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  isSpeciesOwnedReal,
  rollWeightedTalentForSpecies,
  unlockCapturedTalent,
  rollCaptureIv,
  attemptAutoCatch,
};
