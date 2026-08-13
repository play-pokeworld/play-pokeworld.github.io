// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
export const FOSSIL_REVIVE_MAP = {
  fossil: 138,
  helix_fossil: 138,
  dome_fossil: 140,
  old_amber: 142,
  // Phase 14: cibles canoniques — Lilia (#345) and Anorith (#347) are
  // desormais jouables (cf. descriptions of the items). before : Marcacrin /
  // Embrylex (placeholders faute of the vraies especes in the dex).
  root_fossil: 345,
  claw_fossil: 347,
};
const FOSSIL_DISPLAY_KEY = {};
function getFossilDisplayKey(key) {
  return FOSSIL_DISPLAY_KEY[key] || key;
}
function getFossilReviveId(key) {
  return (
    FOSSIL_REVIVE_MAP[key] ||
    (ITEMS[key] && ITEMS[key].type === 'fossil' ? ITEMS[key].revive : null)
  );
}

const HATCHERY_SLOT_UPGRADE_COSTS = [100000, 300000, 750000];
function getHatcherySlotUpgradeCost() {
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  return HATCHERY_SLOT_UPGRADE_COSTS[maxSlots - 1] || null;
}
function upgradeHatcherySlots(cost) {
  const expected = getHatcherySlotUpgradeCost();
  if (!expected) {
    notify(t('hatchery_slots_max'), 'var(--green)');
    return;
  }
  cost = expected;
  if (G.money < cost) {
    notify(t('n.pas_assez_dargent'), 'var(--red)');
    return;
  }
  G.money -= cost;
  G.hatcheryMaxSlots = (G.hatcheryMaxSlots || 1) + 1;
  updateHeader();
  renderHatcheryWindow();
  if (typeof openHatcheryUpgradeMenu === 'function') openHatcheryUpgradeMenu();
  notify(tr('hatchery_upgraded', { slots: G.hatcheryMaxSlots }), 'var(--green)');
}

const _HATCHERY_AUTO_QUEUE_LIMIT = 24;
const HATCHERY_LEGENDARY_IDS = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251];
function pokemonIvTotal(p) {
  return Object.values((p && p.ivs) || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}
function pokemonEvTotal(p) {
  return Object.values((p && p.evs) || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}
function pokemonBaseStatTotal(id) {
  const d = PD && PD[id];
  if (!d) return 300;
  return (
    Number(d[3] || 0) +
    Number(d[4] || 0) +
    Number(d[5] || 0) +
    Number(d[6] || 0) +
    Number(d[7] || 0) +
    Number(d[8] || 0)
  );
}
// Phase 30 — legacy feature update
// (Beta user decisions) Daycare drops its XP counter: like incubation,
// it progresses on a knocked-out Pokemon counter — 10 K.O. = 1 level.
// Each K.O. (wild, trainer or training) feeds all hatchery slots and
// the slot's MODE decides the outcome:
//   - 'breed' / fossil: incubation counter (hatching at stepsReq K.O.s);
//   - 'exp' (daycare): +1 level every DAYCARE_KOS_PER_LEVEL K.O.s
//     (automation fee per level, rules unchanged — see the breeding:hatch
//     ECS system and src/domain/breeding/hatchery-rules.js, wave 33).
// Bonus fix: previously the step counter also climbed on daycare slots
// hatching level-1 Pokemon after 25–100 K.O.s — the mode routing removed that bug.
const DAYCARE_KOS_PER_LEVEL = 10; // user decision (phase 30)
function getDaycareKosPerLevel(_p) { return DAYCARE_KOS_PER_LEVEL; }
// hatcheryRegisterBattleKills is NOT defined here anymore: the hatchery
// progression rule (incubation + daycare) runs in the `breeding:hatch` ECS
// system on HatcheryProgress components (src/application/hatchery-system.js,
// wave 33 §1.2). The name keeps its exact public surface, re-exposed from
// the application layer. DAYCARE_KOS_PER_LEVEL stays the design constant
// (10 K.O. = 1 daycare level) — see src/domain/breeding/hatchery-rules.js.

function hatcheryStepsForPokemon(pOrId) {
  // Rule: src/domain/breeding/hatchery-rules.js (computeRequiredHatchKos) —
  // strict parity (BST bands 25..100, staff speed bonus). This classic module
  // resolves the domain rule through the global exposed by the application
  // layer (src/application/hatchery-system.js); this accessor only gathers
  // the world knowledge (BST, legendary flag, staff bonus).
  const rule = (typeof globalThis !== 'undefined' && globalThis.computeRequiredHatchKos)
    || (typeof window !== 'undefined' ? window.computeRequiredHatchKos : null);
  if (typeof rule !== 'function') {
    throw new Error('[hatchery] computeRequiredHatchKos port missing — src/application/hatchery-system.js must be loaded');
  }
  const id = Number(typeof pOrId === 'object' ? pOrId.id : pOrId);
  const bonus = typeof getStaffBonus === 'function' ? getStaffBonus('hatchery', 'hatchery_speed') : 0;
  return rule({
    bst: pokemonBaseStatTotal(id),
    isLegendary: HATCHERY_LEGENDARY_IDS.includes(id),
    staffBonus: bonus,
  });
}
function ensurePokemonUid(p) {
  if (p && !p.uid)
    p.uid =
      'p_' +
      Math.random().toString(36).substr(2, 9) +
      '_' +
      Math.random().toString(36).substr(2, 5);
  return p ? p.uid : null;
}
function findBoxKeyByUid(uid) {
  if (!uid) return null;
  for (const k in G.collection || {}) {
    const p = G.collection[k];
    if (p && p.uid === uid) return k;
  }
  return null;
}
function isPokemonInTeamByUid(uid) {
  return !(!G.team || !G.team.find((p) => p && p.uid === uid));
}
function ensureHatcheryAutomation() {
  if (!G.hatcheryAutomation || typeof G.hatcheryAutomation !== 'object') G.hatcheryAutomation = {};
  const a = G.hatcheryAutomation;
  if (!a.filterShiny) a.filterShiny = 'all';
  if (!a.sort) a.sort = 'iv_desc';
  if (!a.filterIv) a.filterIv = 'all';
  if (a.excludeLocked !== false) a.excludeLocked = true;
  if (!Array.isArray(G.hatcheryQueue)) G.hatcheryQueue = [];
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  if (!Array.isArray(G.hatcheryPendingModes)) G.hatcheryPendingModes = [null, null, null, null];
  try { normalizeHatcheryModesForUnlocks(); } catch (_) {}

  if (!a.slots || !Array.isArray(a.slots)) a.slots = [];
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  while (a.slots.length < maxSlots) {
    a.slots.push({
      enabled: false,
      mode: 'exp',
      filterShiny: 'all',
      filterIv: 'all',
      sort: 'iv_desc',
      priority: 'pokemon',
      queue: [],
    });
  }
  // Slots existants (anciennes saves) : priorite by defaut = Pokemon
  for (const s of a.slots) { if (s && !s.priority) s.priority = 'pokemon'; }
  return a;
}

// Pokémon incubation (eggs / IV) unlocks when the Johto eggs quest (#111,
// Route 34 Daycare) is completed. Fossil revival + mode switch unlock when
// Kanto quest #25 (Pewter fossil lab) is the current quest or already done.
const JOHTO_EGGS_QUEST_ID = 111;
const KANTO_FOSSIL_QUEST_ID = 25;
function isStoryQuestReached(questId, region, { completedOnly = false } = {}) {
  if (typeof G === 'undefined' || !G) return false;
  const done = G.completedQuests || {};
  if (done[questId] || done[String(questId)]) return true;
  try {
    if (!completedOnly && Array.isArray(G.activeQuests)
      && G.activeQuests.some((i) => i && i.cat === 'main' && Number(i.qid) === Number(questId))) {
      return true;
    }
  } catch (_) {}
  const story = (typeof STORY_QUESTS !== 'undefined' && Array.isArray(STORY_QUESTS)) ? STORY_QUESTS : null;
  // Isolated unit tests do not load the campaign table — do not break them.
  if (!story || !story.length) return true;
  try {
    if (G.mainStep) {
      const chain = story.filter((q) => q && q.region === region);
      const idx = chain.findIndex((q) => Number(q.id) === Number(questId));
      if (idx < 0) return false;
      const step = Number(G.mainStep[region]);
      if (completedOnly) return step > idx;
      return step >= idx;
    }
  } catch (_) {}
  return false;
}
function isPokemonIncubationUnlocked() {
  return isStoryQuestReached(JOHTO_EGGS_QUEST_ID, 'johto', { completedOnly: true });
}
function isFossilReviveUnlocked() {
  return isStoryQuestReached(KANTO_FOSSIL_QUEST_ID, 'kanto');
}
function isHatcheryModeSwitchUnlocked() {
  return isFossilReviveUnlocked();
}
function normalizeHatcheryModesForUnlocks() {
  if (isHatcheryModeSwitchUnlocked()) return;
  if (!G || !G.hatcheryModes) return;
  for (let i = 0; i < G.hatcheryModes.length; i++) {
    if (G.hatcheryModes[i] !== 'breed') continue;
    const slot = G.hatchery && G.hatchery[i];
    if (slot) continue;
    G.hatcheryModes[i] = 'exp';
    if (G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[i]) {
      G.hatcheryAutomation.slots[i].mode = 'exp';
    }
    if (Array.isArray(G.hatcheryPendingModes)) G.hatcheryPendingModes[i] = null;
  }
}
// Mode of a slot (incubation = 'breed') — centralise for the UI and the selector.
function hatcherySlotIsIncubation(slotIdx) {
  return ((G.hatcheryModes && G.hatcheryModes[slotIdx]) || 'exp') === 'breed';
}
// Filling priority for an incubation slot: 'pokemon' (default) or 'fossil'.
function hatcherySlotPriority(slotIdx) {
  const cfg = G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[slotIdx];
  return (cfg && cfg.priority === 'fossil') ? 'fossil' : 'pokemon';
}
function toggleHatcherySlotPriority(slotIdx) {
  ensureHatcheryAutomation();
  const slotCfg = G.hatcheryAutomation.slots[slotIdx];
  if (!slotCfg) return;
  slotCfg.priority = slotCfg.priority === 'fossil' ? 'pokemon' : 'fossil';
  saveGame();
  try { openHatcheryManagementMenu('automation'); } catch (_) {}
}
// Phase 13 — legacy feature update
// A queue entry is either a Pokemon uid (string) or a fossil
// ("fossil:<item key>"). Consumption is strictly FIFO: when a slot
// frees up, it is the FIRST entry of the list that hatches, never another.
const HATCHERY_FOSSIL_QPREFIX = 'fossil:';
function isHatcheryFossilEntry(entry) {
  return typeof entry === 'string' && entry.indexOf(HATCHERY_FOSSIL_QPREFIX) === 0;
}
function fossilKeyOfQueueEntry(entry) {
  return isHatcheryFossilEntry(entry) ? entry.slice(HATCHERY_FOSSIL_QPREFIX.length) : null;
}

const HATCHERY_QUEUE_UPGRADE_COSTS = [250000, 750000, 1500000, 3000000];
function getHatcheryQueueLimit() {
  return 3 + clamp(G.hatcheryQueueUpgradeLevel || 0, 0, HATCHERY_QUEUE_UPGRADE_COSTS.length) * 3;
}
function getHatcheryQueueUpgradeCost() {
  return HATCHERY_QUEUE_UPGRADE_COSTS[G.hatcheryQueueUpgradeLevel || 0] || null;
}
function upgradeHatcheryQueueSize() {
  const cost = getHatcheryQueueUpgradeCost();
  if (!cost) {
    notify(t('queue_size_maxed'), 'var(--green)');
    return;
  }
  if (G.money < cost) {
    notify(t('n.pas_assez_dargent'), 'var(--red)');
    return;
  }
  G.money -= cost;
  G.hatcheryQueueUpgradeLevel = (G.hatcheryQueueUpgradeLevel || 0) + 1;
  updateHeader();
  saveGame();
  notify(tr('queue_size_upgraded', { count: getHatcheryQueueLimit() }), 'var(--green)');
  try {
    openHatcheryManagementMenu('automation');
  } catch (_) {}
}
function isUidInHatchery(uid) {
  return !(!G.hatchery || !G.hatchery.find((slot) => slot && slot.poke && slot.poke.uid === uid));
}
function isUidInAnyTrainingQueue(uid) {
  const a = G.trainingAutomation;
  return !(!a || !Array.isArray(a.slots) || !a.slots.some(
    (s) => s && Array.isArray(s.queue) && s.queue.includes(uid)
  ));
}
function findEmptyHatcherySlot() {
  if (!G.hatchery) G.hatchery = [null];
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  while (G.hatchery.length < maxSlots) G.hatchery.push(null);
  for (let i = 0; i < maxSlots; i++) if (!G.hatchery[i]) return i;
  return -1;
}

function isPokemonQueuedHatchery(p) {
  if (!p || !p.uid) return false;
  if (!G.hatcheryQueues) return false;
  return G.hatcheryQueues.some((q) => q && q.includes(p.uid));
}

function addPokemonToHatcheryQueue(boxId, slotIdx = null, silent = false) {
  ensureHatcheryAutomation();
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];

  const p = G.collection[boxId] || G.collection[String(boxId)];
  if (!p) {
    notify(t('pokemon_not_found'), 'var(--red)');
    return false;
  }
  ensurePokemonUid(p);
  if (p.locked) {
    notify(t('queue_locked_rejected'), 'var(--red)');
    return false;
  }
  if (isPokemonInTeamByUid(p.uid)) {
    notify(t('queue_team_rejected'), 'var(--red)');
    return false;
  }
  if (isUidInHatchery(p.uid)) {
    notify(t('queue_already_busy'), 'var(--red)');
    return false;
  }
  if (isUidInAnyTrainingQueue(p.uid)) {
    notify(t('queue_already_other'), 'var(--red)');
    return false;
  }
  if (isPokemonQueuedHatchery(p)) {
    notify(t('queue_already_added'), 'var(--light1)');
    return false;
  }

  let targetSlotIdx = slotIdx;
  if (targetSlotIdx === null) {
    if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
    const isLevel100 = p.level >= 100;
    targetSlotIdx = G.hatcheryModes.findIndex((m) => (isLevel100 ? m === 'breed' : m === 'exp'));
    if (targetSlotIdx === -1) targetSlotIdx = 0;
  }

  const emptyIdx = findEmptyHatcherySlot();
  if (emptyIdx >= 0 && emptyIdx === targetSlotIdx) {
    const targetMode = (G.hatcheryModes && G.hatcheryModes[emptyIdx]) || 'exp';
    if (targetMode === 'exp' && p.level >= 100) {
      notify(t('hatchery_no_lvl100_passive'), 'var(--red)');
      return false;
    }
    if (targetMode === 'breed' && !isPokemonIncubationUnlocked()) {
      notify(t('hatchery_breeding_locked') || 'Il faut en apprendre plus sur la reproduction des Pokémon.', 'var(--red)');
      return false;
    }
    if (targetMode === 'breed' && p.level < 100) {
      notify(t('hatchery_only_lvl100_breed'), 'var(--red)');
      return false;
    }

    let paid = false;
    if (G.automation && (G.automation.autoHatch || G.automation.autoSeedHatchery)) {
      const fee =
        typeof getHatcheryAutomationFee === 'function' ? getHatcheryAutomationFee() : 0;
      if (fee > 0) {
        if (G.money < fee) {
          notify(t('hatchery_no_money_auto'), 'var(--red)');
          return false;
        }
        G.money -= fee;
        addBattleLog(` [Pension] -${fee}₽ payés d'avance pour l'éclosion automatique.`);
        updateHeader();
        paid = true;
      }
    }

    delete G.collection[boxId];
    delete G.collection[String(boxId)];
    G.hatchery[emptyIdx] = {
      poke: p,
      steps: 0,
      stepsReq: hatcheryStepsForPokemon(p),
      queuedUid: p.uid,
      paid: paid,
      mode: targetMode,
    };
    try { if (typeof progressMainQuestType === 'function') progressMainQuestType('egg_hatch', 1); } catch (_) {}
    try { if (targetMode === 'breed' && typeof recordDexStat === 'function' && p && p.id) recordDexStat(p.id, 'hatcheryIncub', 1); } catch (_) {}
    saveGame();
    try {
      renderHatcheryWindow();
      renderTeamWindow();
    } catch (_) {}
    try {
      if (
        typeof openHatcheryManagementMenu === 'function' &&
        document.getElementById('poke-modal')?.classList.contains('open')
      )
        openHatcheryManagementMenu('automation');
    } catch (_) {}
    if (!silent) notify(tr('deposited_hatchery', { name: p.name }), 'var(--green)');
    return 'slot';
  }

  const queueMode = (G.hatcheryModes && G.hatcheryModes[targetSlotIdx]) || 'exp';
  if (queueMode === 'breed' && !isPokemonIncubationUnlocked()) {
    notify(t('hatchery_breeding_locked') || 'Il faut en apprendre plus sur la reproduction des Pokémon.', 'var(--red)');
    return false;
  }

  const q = G.hatcheryQueues[targetSlotIdx] || [];
  if (q.length >= getHatcheryQueueLimit()) {
    notify(tr('queue_full', { count: getHatcheryQueueLimit() }), 'var(--red)');
    return false;
  }
  q.push(p.uid);
  G.hatcheryQueues[targetSlotIdx] = q;

  // Cascade queue -> slot only if automatic filling is enabled
  // (adding to the queue must not fill the slot while it is disabled).
  try {
    processHatcheryQueue();
  } catch (_) {}
  saveGame();
  try {
    renderHatcheryWindow();
  } catch (_) {}
  try {
    if (
      typeof openHatcheryManagementMenu === 'function' &&
      document.getElementById('poke-modal')?.classList.contains('open')
    )
      openHatcheryManagementMenu('automation');
  } catch (_) {}
  if (!silent) notify(tr('queue_added_hatchery', { name: p.name }), 'var(--green)');
  if (!silent) {
    try {
      openBoxPokeModal(boxId);
    } catch (_) {}
  }
  return 'queue';
}

function removePokemonFromHatcheryQueue(slotIdx, uid) {
  ensureHatcheryAutomation();
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  G.hatcheryQueues[slotIdx] = (G.hatcheryQueues[slotIdx] || []).filter((x) => x !== uid);
  saveGame();
  try {
    openHatcheryManagementMenu('automation');
  } catch (_) {}
}

function clearHatcheryQueue(slotIdx) {
  ensureHatcheryAutomation();
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  G.hatcheryQueues[slotIdx] = [];
  saveGame();
  try {
    openHatcheryManagementMenu('automation');
  } catch (_) {}
}

function hatcheryCandidateEntries() {
  const cfg = ensureHatcheryAutomation();
  const list = [];
  for (const k in G.collection || {}) {
    const p = G.collection[k];
    if (!p) continue;
    ensurePokemonUid(p);
    if (cfg.excludeLocked && p.locked) continue;
    if (isPokemonInTeamByUid(p.uid)) continue;
    const shiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id));
    if (cfg.filterShiny === 'non_shiny' && shiny) continue;
    if (cfg.filterShiny === 'shiny' && !shiny) continue;
    const ivTotal = pokemonIvTotal(p);
    if (cfg.filterIv === 'complete' && ivTotal < 36) continue;
    if (cfg.filterIv === 'incomplete' && ivTotal >= 36) continue;
    if (cfg.filterFav === 'fav_only' && !(p.favorite || p.fav || p.locked)) continue;
    if (cfg.filterFav === 'no_fav' && (p.favorite || p.fav || p.locked)) continue;
    if (cfg.filterRegion && cfg.filterRegion !== 'all') {
      const nid = Number(p.id);
      const reg = nid <= 151 ? 'kanto' : nid <= 251 ? 'johto' : 'hoenn';
      if (reg !== cfg.filterRegion) continue;
    }
    if (cfg.filterRank && cfg.filterRank !== 'all') {
      const ivTotalVal = typeof pokemonIvTotal === 'function' ? pokemonIvTotal(p) : 0;
      if (cfg.filterRank === 'S_or_better' && ivTotalVal < 24) continue;
      if (cfg.filterRank === 'A_or_worse' && ivTotalVal >= 24) continue;
    }
    if (cfg.filterType && cfg.filterType !== 'all') {
      const t1 = String(p.type1 || '').toLowerCase();
      const t2 = String(p.type2 || '').toLowerCase();
      if (t1 !== cfg.filterType && t2 !== cfg.filterType) continue;
    }
    list.push({ key: k, uid: p.uid, p, iv: ivTotal, ev: pokemonEvTotal(p) });
  }
  const sort = cfg.sort || 'iv_desc';
  list.sort((a, b) => {
    if (sort === 'iv_asc') return a.iv - b.iv || a.p.id - b.p.id;
    if (sort === 'level_desc') return (b.p.level || 1) - (a.p.level || 1) || b.iv - a.iv;
    if (sort === 'level_asc') return (a.p.level || 1) - (b.p.level || 1) || a.iv - b.iv;
    if (sort === 'dex') return (a.p.id || 0) - (b.p.id || 0);
    return b.iv - a.iv || (b.p.level || 1) - (a.p.level || 1);
  });
  return list;
}
function rebuildHatcheryQueue() {
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  for (let i = 0; i < 4; i++) {
    cleanHatcheryQueue(i);
  }
  saveGame();
  try {
    if (typeof openHatcheryManagementMenu === 'function')
      openHatcheryManagementMenu('automation');
  } catch (_) {}
  notify(t('queue_refreshed'), 'var(--green)');
}
function setHatcheryAutomationOption(key, value) {
  const cfg = ensureHatcheryAutomation();
  cfg[key] = value;
  saveGame();
  try {
    openHatcheryManagementMenu('automation');
  } catch (_) {}
}
function cleanHatcheryQueue(slotIdx) {
  ensureHatcheryAutomation();
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  const seen = new Set();
  G.hatcheryQueues[slotIdx] = (G.hatcheryQueues[slotIdx] || []).filter((entry) => {
    if (!entry || seen.has(entry)) return false;
    seen.add(entry);
    // Fossil entry: valid as long as the item is still in the bag.
    const fossilKey = fossilKeyOfQueueEntry(entry);
    if (fossilKey) {
      return ((G.inventory && G.inventory[fossilKey]) || 0) > 0;
    }
    if (isPokemonInTeamByUid(entry)) return false;
    const key = findBoxKeyByUid(entry);
    if (!key) return false;
    const p = G.collection[key];
    if (!p || p.locked) return false;
    return true;
  });
  return G.hatcheryQueues[slotIdx];
}

function fillHatcherySlotFromQueue(slotIdx) {
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  cleanHatcheryQueue(slotIdx);
  if (!G.hatchery) G.hatchery = [null];
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  const targetMode = G.hatcheryModes[slotIdx] || 'exp';
  const q = G.hatcheryQueues[slotIdx] || [];

  while (q.length) {
    const entry = q.shift();
    // Strict FIFO: the head of the list goes — Pokemon or fossil.
    const fossilKey = fossilKeyOfQueueEntry(entry);
    if (fossilKey) {
      if (!isFossilReviveUnlocked()) continue;
      const qty = (G.inventory && G.inventory[fossilKey]) || 0;
      if (qty < 1) continue; // fossil used in the meantime → skip it
      const reviveId = getFossilReviveId(fossilKey);
      if (!reviveId) continue;
      G.inventory[fossilKey]--;
      if (G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];
      G.hatchery[slotIdx] = {
        poke: null,
        isFossil: true,
        fossilKey: fossilKey,
        reviveId: reviveId,
        steps: 0,
        stepsReq: hatcheryStepsForPokemon(reviveId),
        mode: 'breed',
      };
      try { if (typeof progressMainQuestType === 'function') progressMainQuestType('fossil_revive', 1); } catch (_) {}
      if (typeof addBattleLog === 'function') addBattleLog(` [Pension] ${getItemName(fossilKey)} placé en incubation (slot #${slotIdx + 1}).`);
      return true;
    }
    const uid = entry;
    const key = findBoxKeyByUid(uid);
    if (!key) continue;
    const p = G.collection[key];
    if (!p || p.locked || isPokemonInTeamByUid(uid)) continue;

    if (targetMode === 'breed' && !isPokemonIncubationUnlocked()) continue;
    if (targetMode === 'breed' && p.level < 100) continue;
    if (targetMode === 'exp' && p.level >= 100) continue;

    let paid = false;
    if (G.automation && G.automation.autoSeedHatchery) {
      const fee =
        typeof getHatcheryAutomationFee === 'function' ? getHatcheryAutomationFee() : 0;
      if (fee > 0) {
        if (G.money < fee) {
          G.automation.autoSeedHatchery = false;
          notify(t('auto_fill_no_money'), 'var(--red)');
          saveGame();
          return false;
        }
        G.money -= fee;
        addBattleLog(` [Pension] -${fee}₽ payés d'avance pour le placement automatique.`);
        updateHeader();
        paid = true;
      }
    }

    delete G.collection[key];
    G.hatchery[slotIdx] = {
      poke: p,
      steps: 0,
      stepsReq: hatcheryStepsForPokemon(p),
      queuedUid: uid,
      paid: paid,
      mode: targetMode,
    };
    try { if (targetMode === 'breed' && typeof recordDexStat === 'function' && p && p.id) recordDexStat(p.id, 'hatcheryIncub', 1); } catch (_) {}
    return true;
  }
  return false;
}

// Number of units of each fossil reserved across all waiting
// queues (all slots combined). A fossil is only consumed from the bag when it
// moves into a slot — every queue entry is a reservation.
function getHatcheryFossilReservations() {
  const reserved = {};
  (G.hatcheryQueues || []).forEach((qq) => qq && qq.forEach((e) => {
    const k = fossilKeyOfQueueEntry(e);
    if (k) reserved[k] = (reserved[k] || 0) + 1;
  }));
  return reserved;
}
// Truly available copies of a fossil = bag stock − reservations.
function getFossilAvailableCount(fossilKey) {
  const qty = (G.inventory && G.inventory[fossilKey]) || 0;
  const reserved = getHatcheryFossilReservations()[fossilKey] || 0;
  return Math.max(0, qty - reserved);
}
// Phase 14 — legacy feature update
// must never appear in 2 queues (seen in an old save). We scan the
// queues in slot order and only keep reservations covered by stock —
// excess duplicates are dropped.
function sanitizeHatcheryFossilQueues() {
  if (!Array.isArray(G.hatcheryQueues)) return 0;
  const counts = {};
  let removed = 0;
  for (let i = 0; i < G.hatcheryQueues.length; i++) {
    const q = G.hatcheryQueues[i];
    if (!Array.isArray(q) || !q.length) continue;
    G.hatcheryQueues[i] = q.filter((entry) => {
      const k = fossilKeyOfQueueEntry(entry);
      if (!k) return true;
      const stock = (G.inventory && G.inventory[k]) || 0;
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] <= stock) return true;
      removed++;
      return false;
    });
  }
  return removed;
}
// Fossils available to feed the queues: bag stock minus the
// units already reserved in all queues (never a double reservation).
function fossilQueueCandidates() {
  sanitizeHatcheryFossilQueues();
  const inv = getFossilInventory();
  if (!inv.length) return [];
  const reserved = getHatcheryFossilReservations();
  const out = [];
  for (const f of inv) {
    const avail = f.qty - (reserved[f.key] || 0);
    for (let i = 0; i < avail; i++) out.push(HATCHERY_FOSSIL_QPREFIX + f.key);
  }
  return out;
}

// Phase 31 — legacy feature update
// ROUND-ROBIN — the 1st element of each queue, then the 2nd, etc. — instead of
// filling slot 0's queue up to its capacity before moving to the next. Before,
// with few candidates, everything went into queue 0: one slot and its list
// full while another slot of the same mode stayed empty (and could not be
// served). FIFO is guaranteed at consumption; entries are filtered by mode
// (day care = Lv. < 100, incubation = Lv. 100 or fossils), fossil/pokemon
// priority per slot — Phase 12 — legacy feature update
function refillHatcheryQueueFromRules() {
  ensureHatcheryAutomation();
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  const cap = getHatcheryQueueLimit();
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  let added = 0;

  // Pokemon already in file / in cours / has the training (mode exp commun)
  const queuedPoke = new Set();
  G.hatcheryQueues.forEach((q) => q && q.forEach((e) => { if (!isHatcheryFossilEntry(e)) queuedPoke.add(e); }));
  const busy = new Set(
    (G.hatchery || [])
      .filter(Boolean)
      .map((slot) => slot.poke && slot.poke.uid)
      .filter(Boolean)
  );
  const pokePool = hatcheryCandidateEntries().filter((en) =>
    !queuedPoke.has(en.uid) && !busy.has(en.uid) && !isUidInAnyTrainingQueue(en.uid)
  );
  const fossilPool = isFossilReviveUnlocked() ? fossilQueueCandidates() : [];

  // Per-slot context (counters for the automatic priority switch).
  const isLv100Match = (en) => (en.p.level || 0) >= 100;
  const ctx = [];
  for (let slotIdx = 0; slotIdx < maxSlots; slotIdx++) {
    // Pending mode change: this slot must not be restocked anymore.
    if (Array.isArray(G.hatcheryPendingModes) && G.hatcheryPendingModes[slotIdx]) { ctx.push(null); continue; }
    const mode = G.hatcheryModes[slotIdx] || 'exp';
    ctx.push({
      idx: slotIdx,
      mode,
      prefer: mode === 'breed' ? hatcherySlotPriority(slotIdx) : 'pokemon',
      appendedPreferred: 0,
      appendedOther: 0,
    });
  }

  // RANK by RANK: each queue receives its n-th element before the next one.
  // An already longer queue (pre-filled) is never modified midway.
  for (let rank = 0; rank < cap; rank++) {
    for (const c of ctx) {
      if (!c) continue;
      const q = G.hatcheryQueues[c.idx] || [];
      if (q.length !== rank) continue;
      let entry = null;
      let usedType = null;
      if (c.mode === 'breed' && c.prefer === 'fossil' && fossilPool.length) {
        entry = fossilPool.shift(); usedType = 'fossil';
      }
      if (entry === null && !(c.mode === 'breed' && !isPokemonIncubationUnlocked())) {
        const pi = pokePool.findIndex((en) => (c.mode === 'breed' ? isLv100Match(en) : !isLv100Match(en)));
        if (pi !== -1) { entry = pokePool.splice(pi, 1)[0].uid; usedType = 'pokemon'; }
      }
      if (entry === null && c.mode === 'breed' && c.prefer === 'pokemon' && fossilPool.length) {
        entry = fossilPool.shift(); usedType = 'fossil';
      }
      if (entry === null) continue; // nothing eligible left for this slot
      q.push(entry);
      G.hatcheryQueues[c.idx] = q;
      added++;
      if (c.mode !== 'breed' || usedType === c.prefer) c.appendedPreferred++; else c.appendedOther++;
    }
  }

  // if the prioritized type ran out but the other one served, the toggle follows
  // Phase 12 — legacy feature update
  for (const c of ctx) {
    if (!c || c.mode !== 'breed') continue;
    if (c.appendedPreferred === 0 && c.appendedOther > 0 &&
        G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[c.idx]) {
      G.hatcheryAutomation.slots[c.idx].priority = c.prefer === 'fossil' ? 'pokemon' : 'fossil';
    }
  }
  return added;
}

// FIFO consumption: when a slot frees up, the FIRST entry of its queue is
// drained into it (phase 31 — the automation hooks exist so this can be
// called before and after any queue replenishment).
function drainHatcheryQueuesIntoSlots() {
  let changed = false;
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  let guard = 0, progress = true;
  while (progress && guard++ < 8) {
    progress = false;
    for (let i = 0; i < maxSlots; i++) {
      if (!G.hatchery[i]) {
        // Pending mode applied if the slot is already empty (safety)
        applyPendingHatcheryMode(i);
        if (G.hatchery[i]) continue;
        const ok = fillHatcherySlotFromQueue(i);
        changed = ok || changed;
        progress = ok || progress;
      }
    }
  }
  return changed;
}

let _hatcheryQueueProcessing = false;
function processHatcheryQueue(force = false) {
  if (_hatcheryQueueProcessing) return false;
  _hatcheryQueueProcessing = true;
  try {
  ensureHatcheryAutomation();
  const autoFill = !!(G.automation && G.automation.autoSeedHatchery);
  // Without active auto-fill (non-forced call): no queue, no slot is
  // filled — manual placements stay case by case.
  if (!force && !autoFill) return false;
  if (!G.hatchery) G.hatchery = [null];
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  while (G.hatchery.length < maxSlots) G.hatchery.push(null);
  let changed = false;

  // 0) Anti-duplication guard: a fossil with only one copy may
  //    stay reserved in a single queue only (repairs old saves).
  try {
    if (sanitizeHatcheryFossilQueues() > 0) { changed = true; saveGame(); }
  } catch (_) {}

  // Phase 31 — legacy feature update
  //    from the existing queues before any restock.
  if (drainHatcheryQueuesIntoSlots()) changed = true;

  // 2) Round-robin restock: 1st element of each queue, then 2nd, etc. —
  //    fair distribution between slots of the same mode (no more queue 0
  //    full while the others stay empty).
  const added = refillHatcheryQueueFromRules();
  if (added) changed = true;

  // 3) Consumption: still-empty slots take the 1st fresh element of
  //    their queue — a free slot is served before piling up its own queue.
  if (drainHatcheryQueuesIntoSlots()) changed = true;

  if (changed) {
    saveGame();
    try {
      renderHatcheryWindow();
    } catch (_) {}
    try {
      if (
        typeof openHatcheryManagementMenu === 'function' &&
        document.getElementById('poke-modal')?.classList.contains('open')
      )
        openHatcheryManagementMenu('automation');
    } catch (_) {}
  }
  return changed;
  } finally { _hatcheryQueueProcessing = false; }
}

function renderHatcheryQueuePreview(slotIdx, limit = 24) {
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  cleanHatcheryQueue(slotIdx);
  const queue = G.hatcheryQueues[slotIdx] || [];
  const rows = queue
    .slice(0, limit)
    .map((entry) => {
      // Fossil entry: item icon + incubation cost
      const fossilKey = fossilKeyOfQueueEntry(entry);
      if (fossilKey) {
        const dispKey = typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(fossilKey) : fossilKey;
        const rid = getFossilReviveId(fossilKey);
        const ko = rid ? hatcheryStepsForPokemon(rid) : 15;
        return `<div class="queue-chip">${itemIcon(dispKey, 28)}<span>${getItemName(dispKey)} · ${ko} KO</span><button class="queue-remove-btn" data-action="legacy-call-stop" data-call="removePokemonFromHatcheryQueue" data-call-args="${slotIdx}, '${entry}'">✕</button></div>`;
      }
      const key = findBoxKeyByUid(entry);
      const p = key ? G.collection[key] : null;
      if (!p) return '';
      const mode = (G.hatcheryModes && G.hatcheryModes[slotIdx]) || 'exp';
      const detail = mode === 'exp' ? `Niv. ${p.level}` : `${hatcheryStepsForPokemon(p)} KO`;
      return `<div class="queue-chip">${spriteImg(p.id, p.emoji, { size: 28, shiny: p.shinyActive })}<span>${p.name} · ${detail}</span><button class="queue-remove-btn" data-action="legacy-call-stop" data-call="removePokemonFromHatcheryQueue" data-call-args="${slotIdx}, '${entry}'">✕</button></div>`;
    })
    .join('');
  return rows || `<div class="dict-muted">${t('queue_empty') || 'Vide'}</div>`;
}

// Incubation shiny roll: a shiny NEVER reverts to normal.
// shinyHatched follows the DICE only — success = +1 even if this
// individual was already shiny; failure = no increment (still shiny).
function applyHatcheryShinyRoll(p) {
  if (!p) return false;
  const rolledShiny = typeof rollShiny === 'function' ? rollShiny(p.id) : false;
  if (!rolledShiny) return false;
  if (!(p.shinyUnlocked || p.shinyActive || p.shiny)) {
    p.shinyUnlocked = true;
    p.shinyActive = true;
    p.shiny = true;
    try { if (typeof unlockShinyForSpecies === 'function') unlockShinyForSpecies(p.id); } catch (_) {}
  }
  try { if (typeof recordDexStat === 'function' && p.id) recordDexStat(p.id, 'shinyHatched', 1); } catch (_) {}
  return true;
}

function hatchEgg(slotIdx = 0) {
  if (!G.hatchery || !G.hatchery[slotIdx]) return;
  const slot = G.hatchery[slotIdx];
  if (slot.steps < slot.stepsReq) return;

  let p;
  if (slot.isFossil) {
    const reviveId = slot.reviveId;
    const alreadyOwned = (typeof speciesOwned === 'function' && speciesOwned(reviveId)) || (G.pokedex && G.pokedex[reviveId] && G.pokedex[reviveId].caught);
    // if already owned, 10% chance of +1 IV instead of a duplicate (user request)
    if (alreadyOwned) {
      // Finds an existing instance (team or box) to add an IV to
      let existing = null;
      if (G.team) existing = G.team.find(x => x && Number(x.id) === Number(reviveId));
      if (!existing) {
        for (const k in G.collection || {}) {
          const cand = G.collection[k];
          if (cand && Number(cand.id) === Number(reviveId)) { existing = cand; break; }
        }
      }
      if (existing && typeof chance === 'function' && chance(10)) {
        if (!existing.ivs) existing.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
        const keys = ['hp','atk','def','spa','spd','spe'].filter(k => (existing.ivs[k]||0) < 6);
        if (keys.length) {
          const picked = keys[Math.floor(Math.random()*keys.length)];
          existing.ivs[picked] = (existing.ivs[picked]||0)+1;
          try { if (typeof recalcPokeStats === 'function') recalcPokeStats(existing); } catch(_){}
          if (typeof notify === 'function') notify(`Fossile déjà possédé : +1 IV ${picked.toUpperCase()} sur ${existing.name} !`, 'var(--green)');
        }
      } else {
        if (typeof notify === 'function') notify(`Fossile déjà possédé : aucun doublon créé.`, 'var(--light1)');
      }
      G.hatchery[slotIdx] = null;
      applyPendingHatcheryMode(slotIdx);
      if (typeof addStaffXp === 'function') addStaffXp('hatchery', 1);
      try { if (typeof progressMainQuestType === 'function') progressMainQuestType('fossil_revive', 1); } catch (_) {}
      if (G.automation && G.automation.autoSeedHatchery) processHatcheryQueue();
      updateHeader(); renderTeamWindow(); renderHatcheryWindow();
      try { if (typeof saveGame === 'function') saveGame(); } catch(_){}
      return;
    }
    const isShiny = rollShiny(reviveId);
    p = createPoke(reviveId, 1, isShiny);
    if (!p) return;
    G.pokedex[reviveId] = { ...(G.pokedex[reviveId] || {}), seen: true, caught: true };
    if (isShiny) {
      p.shinyUnlocked = true; p.shinyActive = true; p.shiny = true;
      unlockShinyForSpecies(reviveId);
      try { if (typeof recordDexStat === 'function') recordDexStat(reviveId, 'shinyHatched', 1); } catch (_) {}
    }
  } else {
    p = slot.poke;
  }
  const BABY_BREED_MAP = { 25: 172, 26: 172, 35: 173, 36: 173, 39: 174, 40: 174, 106: 236, 107: 236, 237: 236, 124: 238, 125: 239, 126: 240, 183: 298, 184: 298, 202: 360 };
  const babyId = p ? BABY_BREED_MAP[Number(p.id)] : null;
  const alreadyHaveBaby = babyId && (
    (typeof speciesOwned === 'function' && speciesOwned(babyId)) ||
    (G.pokedex && G.pokedex[babyId] && G.pokedex[babyId].caught) ||
    (G.team && G.team.some(x => x && Number(x.id) === Number(babyId))) ||
    Object.values(G.collection || {}).some(x => x && Number(x.id) === Number(babyId))
  );
  if (babyId && !alreadyHaveBaby && typeof createPoke === 'function') {
    const isShiny = rollShiny(babyId);
    const babyMon = createPoke(babyId, 5, isShiny);
    if (babyMon) {
      if (isShiny) { babyMon.shinyUnlocked = true; babyMon.shinyActive = true; babyMon.shiny = true; unlockShinyForSpecies(babyId); }
      if (G.team.length < 6) {
        G.team.push(babyMon);
        if (typeof notify === 'function') notify((typeof tr === 'function' ? tr('hatch_baby_party', { parent: p.name, baby: babyMon.name }) : `L'œuf de ${p.name} a éclot en ${babyMon.name} !`), 'var(--green)');
      } else {
        let boxId = 'baby_' + babyId + '_' + Date.now();
        while(G.collection[boxId]) boxId = 'baby_' + babyId + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
        G.collection[boxId] = babyMon;
        if (typeof notify === 'function') notify((typeof tr === 'function' ? tr('hatch_baby_box', { parent: p.name, baby: babyMon.name }) : `L'œuf de ${p.name} a éclot en ${babyMon.name} dans la Boîte PC !`), 'var(--green)');
      }
      G.pokedex[babyId] = { ...(G.pokedex[babyId] || {}), seen: true, caught: true };
      if (isShiny) G.pokedex[babyId].shiny = true;
    }
  }


  if (!p.ivs) p.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const avail = keys.filter((k) => (p.ivs[k] || 0) < 6);
  let ivMsg = '';
  if (avail.length > 0) {
    const picked = avail[rand(0, avail.length - 1)];
    let gain = 1;
    try {
      const active = (G.staff && G.staff.active && G.staff.active.hatchery) || [];
      if (active.includes('manager_goldenrod')) {
        const lvl = (typeof staffLevel === 'function') ? staffLevel('manager_goldenrod') : 1;
        if (Math.random() < (0.002 * lvl)) gain = 2;
      }
    } catch(_){}
    p.ivs[picked] = Math.min(6, (p.ivs[picked] || 0) + gain);
    ivMsg = ` (+${gain} IV ${picked.toUpperCase()})`;
  } else {
    G.money += 5000;
    ivMsg = t('iv_money_bonus');
  }
  if (!slot.isFossil) {
    applyHatcheryShinyRoll(p);
  }
  p.level = 1;
  p.xp = xpForLevel(1);
  p.xpNext = xpForLevel(2);
  recalcPokeStats(p);
  p.currentHP = p.maxHP;

  const _hKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(p.id) : (!G.collection[String(p.id)] ? String(p.id) : ('box_' + p.id + '_' + Date.now()));
      G.collection[_hKey] = p;
  const hatchedWasFossil = !!slot.isFossil;
  G.hatchery[slotIdx] = null;
  // a pending mode change (incubation → day care) applies
  // now that the incubation is over.
  applyPendingHatcheryMode(slotIdx);
  if (typeof addStaffXp === 'function') addStaffXp('hatchery', 1);
  try {
    if (typeof progressMainQuestType === 'function') {
      if (hatchedWasFossil) progressMainQuestType('fossil_revive', 1);
      else progressMainQuestType('egg_hatch', 1);
    }
  } catch (_) {}

  if (G.automation && G.automation.autoSeedHatchery) {
    processHatcheryQueue();
  }

  updateHeader();
  renderTeamWindow();
  renderHatcheryWindow();
  if (p && (p.shinyUnlocked || p.shinyActive || p.shiny)) {
    notify(tr('m.hatchery.2', { p0: p.name }), 'var(--light2)');
  } else {
    notify(tr('m.hatchery.1', { p0: p.name, p1: ivMsg }), 'var(--green)');
  }
}

function getFossilInventory() {
  const inv = G.inventory || {};
  const list = [];
  const seenKeys = new Set();
  const addFossil = (key, qty) => {
    if (seenKeys.has(key) || !(qty > 0)) return;
    const reviveId = getFossilReviveId(key);
    if (!reviveId) return;
    seenKeys.add(key);
    list.push({ key, displayKey: getFossilDisplayKey(key), qty, reviveId });
  };
  for (const key in FOSSIL_REVIVE_MAP) addFossil(key, inv[key] || 0);
  for (const key in inv) {
    if (ITEMS[key] && ITEMS[key].type === 'fossil') addFossil(key, inv[key] || 0);
  }
  return list;
}

function reviveFossil(fossilKey) {
  if (!isFossilReviveUnlocked()) return;
  const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
  if (invQty < 1) {
    notify(t('no_fossil_left'), 'var(--red)');
    return;
  }
  const reserved = getHatcheryFossilReservations()[fossilKey] || 0;
  if (invQty - reserved < 1) {
    notify(t('fossil_all_queued') || t('no_fossil_left'), 'var(--red)');
    return;
  }
  const pokeId = getFossilReviveId(fossilKey);
  if (!pokeId) {
    notify(t('unknown_fossil'), 'var(--red)');
    return;
  }

  // if already owned, 10% chance of +1 IV instead of a duplicate (user request)
  const alreadyOwned = (typeof speciesOwned === 'function' && speciesOwned(pokeId)) || (G.pokedex && G.pokedex[pokeId] && G.pokedex[pokeId].caught);
  if (alreadyOwned) {
    let existing = null;
    if (G.team) existing = G.team.find(x => x && Number(x.id) === Number(pokeId));
    if (!existing) {
      for (const k in G.collection || {}) {
        const cand = G.collection[k];
        if (cand && Number(cand.id) === Number(pokeId)) { existing = cand; break; }
      }
    }
    G.inventory[fossilKey]--;
    if (G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];
    if (existing && Math.random() < 0.1) {
      if (!existing.ivs) existing.ivs = {hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
      const avail = ['hp','atk','def','spa','spd','spe'].filter(k => (existing.ivs[k]||0) < 6);
      if (avail.length) {
        const pick = avail[Math.floor(Math.random()*avail.length)];
        existing.ivs[pick] = (existing.ivs[pick]||0)+1;
        try { if (typeof recalcPokeStats === 'function') recalcPokeStats(existing); } catch(_){}
        notify(`${existing.name} déjà possédé : +1 IV ${pick.toUpperCase()} !`, 'var(--green)');
      }
    } else {
      notify(`${getPokeName(pokeId)} déjà possédé : pas de doublon, IV éventuel à 10%`, 'var(--light1)');
    }
    saveGame(); updateHeader(); renderTeamWindow();
    const el2 = document.getElementById('tab-content');
    if (el2 && _activeTab === 'fossil') renderFossilLab(el2);
    return;
  }

  G.inventory[fossilKey]--;
  if (G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];

  const isShiny = rollShiny(pokeId);
  const p = createPoke(pokeId, 1, isShiny);
  if (!p) {
    notify(t('n.erreur_revival'), 'var(--red)');
    return;
  }

  if (G.team.length < 6) {
    G.team.push(p);
    notify(tr('fossil_revived_party', { name: p.name }), isShiny ? 'var(--light2)' : 'var(--green)');
  } else {
    const _hKey2 = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(pokeId) : (!G.collection[String(pokeId)] ? String(pokeId) : ('box_' + pokeId + '_' + Date.now()));
    G.collection[_hKey2] = p;
    notify(tr('fossil_revived_box', { name: p.name }), isShiny ? 'var(--light2)' : 'var(--green)');
  }
  G.pokedex[pokeId] = {
    ...(G.pokedex[pokeId] || {}),
    seen: true,
    caught: true,
  };
  if (isShiny) G.pokedex[pokeId].shiny = true;
  saveGame();
  try {
    autoSave();
  } catch (_) {}
  updateHeader();
  renderTeamWindow();

  const el = document.getElementById('tab-content');
  if (el && _activeTab === 'fossil') renderFossilLab(el);
}

function withdrawPokemonFromDaycare(slotIdx) {
  if (!G.hatchery || !G.hatchery[slotIdx]) return;
  const slot = G.hatchery[slotIdx];
  if (slot.isFossil) {
    notify(t('hatchery_cannot_remove_fossil'), 'var(--red)');
    return;
  }
  const targetMode = (G.hatcheryModes && G.hatcheryModes[slotIdx]) || slot.mode || 'exp';
  if (targetMode === 'breed') {
    notify(t('hatchery_cannot_remove_breeding'), 'var(--red)');
    return;
  }
  const p = slot.poke;
  const _hKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(p.id) : (!G.collection[String(p.id)] ? String(p.id) : ('box_' + p.id + '_' + Date.now()));
      G.collection[_hKey] = p;
  G.hatchery[slotIdx] = null;
  saveGame();
  renderHatcheryWindow();
  renderTeamWindow();
  notify(`${p.name} a été retiré de la Garderie passive.`, 'var(--green)');
}

function toggleHatcherySlotMode(slotIdx) {
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  ensureHatcheryAutomation(); // garantit also G.hatcheryPendingModes
  if (!Array.isArray(G.hatcheryPendingModes)) G.hatcheryPendingModes = [null, null, null, null];
  const currentMode = G.hatcheryModes[slotIdx] || 'exp';
  const nextMode = currentMode === 'exp' ? 'breed' : 'exp';
  if (nextMode === 'breed' && !isHatcheryModeSwitchUnlocked()) return;
  const occupied = !!(G.hatchery && G.hatchery[slotIdx]);

  // Phase 14 — switch to incubation while a non-Lv.100 Pokemon occupies
  // the slot: no dead lock — the Pokemon is returned to the PC and the
  // queue is emptied, then the mode switches (incubation is reserved for
  // Lv. 100).
  if (
    nextMode === 'breed' &&
    occupied &&
    G.hatchery[slotIdx].poke &&
    !G.hatchery[slotIdx].isFossil &&
    G.hatchery[slotIdx].poke.level < 100
  ) {
    const ejected = G.hatchery[slotIdx].poke;
    const _ejKey = (typeof generateUniqueBoxId==="function") ? generateUniqueBoxId(ejected.id) : (!G.collection[String(ejected.id)] ? String(ejected.id) : ("box_" + ejected.id + "_" + Date.now())); G.collection[_ejKey] = ejected;
    G.hatchery[slotIdx] = null;
    G.hatcheryPendingModes[slotIdx] = null;
    G.hatcheryModes[slotIdx] = 'breed';
    if (G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[slotIdx]) {
      G.hatcheryAutomation.slots[slotIdx].mode = 'breed';
    }
    if (G.hatcheryQueues && G.hatcheryQueues[slotIdx]) {
      G.hatcheryQueues[slotIdx] = []; // switching mode always empties the queue
    }
    notify(
      tr('hatchery_mode_ejected', { name: ejected.name }) ||
      `${ejected.name} a été renvoyé au PC (Incubation réservée aux Niv. 100). Liste vidée.`,
      'var(--light1)'
    );
    saveGame();
    renderHatcheryWindow();
    try { renderTeamWindow(); } catch (_) {}
    try {
      if (
        typeof openHatcheryManagementMenu === 'function' &&
        document.getElementById('poke-modal')?.classList.contains('open')
      ) {
        openHatcheryManagementMenu('automation');
      }
    } catch (_) {}
    return;
  }

  // Slot occupied and switching incubation → day care: an incubation in
  // progress is never cancelled. Two cases:
  //  - incubation FINISHED: it is collected (hatching) then the mode
  //    switches immediately — nothing is cancelled;
  //  - incubation in progress: the change is set pending until
  //    hatching, and the slot's waiting list is emptied right away.
  if (occupied && currentMode === 'breed' && nextMode === 'exp') {
    const slot = G.hatchery[slotIdx];
    const done = (slot.steps || 0) >= (slot.stepsReq || 1);
    if (G.hatcheryPendingModes[slotIdx] === 'exp') {
      // Re-click = cancel the pending change
      G.hatcheryPendingModes[slotIdx] = null;
      notify(t('hatchery_mode_pending_cancelled') || 'Changement de mode annulé.', 'var(--light1)');
      saveGame();
      renderHatcheryWindow();
      try {
        if (
          typeof openHatcheryManagementMenu === 'function' &&
          document.getElementById('poke-modal')?.classList.contains('open')
        ) {
          openHatcheryManagementMenu('automation');
        }
      } catch (_) {}
      return;
    }
    if (!done) {
      G.hatcheryPendingModes[slotIdx] = 'exp';
      G.hatcheryQueues[slotIdx] = []; // switching mode always empties the queue
      notify(
        tr('hatchery_mode_deferred', { slot: slotIdx + 1 }) ||
        `Slot #${slotIdx + 1} passera en mode Garderie une fois l'incubation en cours terminée.`,
        'var(--light1)'
      );
      saveGame();
      renderHatcheryWindow();
      try {
        if (
          typeof openHatcheryManagementMenu === 'function' &&
          document.getElementById('poke-modal')?.classList.contains('open')
        ) {
          openHatcheryManagementMenu('automation');
        }
      } catch (_) {}
      return;
    }
    // done: switch first, then collect the finished incubation
    G.hatcheryPendingModes[slotIdx] = null;
    G.hatcheryModes[slotIdx] = 'exp';
    if (G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[slotIdx]) {
      G.hatcheryAutomation.slots[slotIdx].mode = 'exp';
    }
    if (G.hatcheryQueues && G.hatcheryQueues[slotIdx]) {
      G.hatcheryQueues[slotIdx] = [];
    }
    hatchEgg(slotIdx);
    notify(
      `Slot #${slotIdx + 1} ${typeof t === 'function' ? t('hatchery_mode_set', {mode: t('hatchery_mode_exp')}) : 'configured to Passive Daycare (EXP)'}.`,
      'var(--green)'
    );
    saveGame();
    renderHatcheryWindow();
    try {
      if (
        typeof openHatcheryManagementMenu === 'function' &&
        document.getElementById('poke-modal')?.classList.contains('open')
      ) {
        openHatcheryManagementMenu('automation');
      }
    } catch (_) {}
    return;
  }

  G.hatcheryPendingModes[slotIdx] = null;
  G.hatcheryModes[slotIdx] = nextMode;
  if (G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[slotIdx]) {
    G.hatcheryAutomation.slots[slotIdx].mode = nextMode;
  }
  notify(
    `Slot #${slotIdx + 1} ${typeof t === 'function' ? t('hatchery_mode_set', {mode: nextMode === 'exp' ? t('hatchery_mode_exp') : t('hatchery_mode_breeding')}) : 'configured to ' + (nextMode === 'exp' ? 'Passive Daycare (EXP)' : 'Breeding (Egg / IV)')}.`,
    'var(--green)'
  );

  if (occupied) {
    const slot = G.hatchery[slotIdx];
    if (!slot.isFossil) {
      slot.mode = nextMode;
      if (nextMode === 'breed') {
        slot.steps = 0;
        slot.stepsReq = hatcheryStepsForPokemon(slot.poke);
      }
    }
  }

  // Clear slot-specific queue when slot mode is changed!
  if (G.hatcheryQueues && G.hatcheryQueues[slotIdx]) {
    G.hatcheryQueues[slotIdx] = [];
  }

  saveGame();
  renderHatcheryWindow();
  try {
    if (
      typeof openHatcheryManagementMenu === 'function' &&
      document.getElementById('poke-modal')?.classList.contains('open')
    ) {
      openHatcheryManagementMenu('automation');
    }
  } catch (_) {}
}

// Apply the pending mode change once the slot is empty
// (egg / fossil hatching, or removal). No effect if the slot is
// still occupied, or if there is nothing waiting.
function applyPendingHatcheryMode(slotIdx) {
  if (!Array.isArray(G.hatcheryPendingModes)) G.hatcheryPendingModes = [null, null, null, null];
  const pending = G.hatcheryPendingModes[slotIdx];
  if (!pending) return;
  if (G.hatchery && G.hatchery[slotIdx]) return; // slot still occupied
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  G.hatcheryModes[slotIdx] = pending;
  ensureHatcheryAutomation();
  if (G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[slotIdx]) {
    G.hatcheryAutomation.slots[slotIdx].mode = pending;
  }
  if (G.hatcheryQueues && G.hatcheryQueues[slotIdx]) {
    G.hatcheryQueues[slotIdx] = [];
  }
  G.hatcheryPendingModes[slotIdx] = null;
}

function setHatcherySlotAutomationOption(slotIdx, key, value){
  ensureHatcheryAutomation();
  const slotCfg = G.hatcheryAutomation.slots[slotIdx];
  if(slotCfg){
    slotCfg[key] = value;
    saveGame();
    try{ openHatcheryManagementMenu('automation'); }catch(_){}
  }
}

function toggleHatcheryAutomationSlot(slotIdx){
  ensureHatcheryAutomation();
  const slotCfg = G.hatcheryAutomation.slots[slotIdx];
  if(!slotCfg) return;
  slotCfg.enabled = !slotCfg.enabled;
  saveGame();
  try{ openHatcheryManagementMenu('automation'); }catch(_){}
}

// --- Migrated to ES module, globals exposed ---
if (typeof setHatcherySlotAutomationOption !== 'undefined') { if (typeof window !== 'undefined') window.setHatcherySlotAutomationOption = setHatcherySlotAutomationOption; if (typeof globalThis !== 'undefined') globalThis.setHatcherySlotAutomationOption = setHatcherySlotAutomationOption; }
if (typeof toggleHatcheryAutomationSlot !== 'undefined') { if (typeof window !== 'undefined') window.toggleHatcheryAutomationSlot = toggleHatcheryAutomationSlot; if (typeof globalThis !== 'undefined') globalThis.toggleHatcheryAutomationSlot = toggleHatcheryAutomationSlot; }
if (typeof applyHatcheryShinyRoll !== 'undefined') { if (typeof window !== 'undefined') window.applyHatcheryShinyRoll = applyHatcheryShinyRoll; if (typeof globalThis !== 'undefined') globalThis.applyHatcheryShinyRoll = applyHatcheryShinyRoll; }
if (typeof isPokemonIncubationUnlocked !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonIncubationUnlocked = isPokemonIncubationUnlocked; if (typeof globalThis !== 'undefined') globalThis.isPokemonIncubationUnlocked = isPokemonIncubationUnlocked; }
if (typeof isFossilReviveUnlocked !== 'undefined') { if (typeof window !== 'undefined') window.isFossilReviveUnlocked = isFossilReviveUnlocked; if (typeof globalThis !== 'undefined') globalThis.isFossilReviveUnlocked = isFossilReviveUnlocked; }
if (typeof isHatcheryModeSwitchUnlocked !== 'undefined') { if (typeof window !== 'undefined') window.isHatcheryModeSwitchUnlocked = isHatcheryModeSwitchUnlocked; if (typeof globalThis !== 'undefined') globalThis.isHatcheryModeSwitchUnlocked = isHatcheryModeSwitchUnlocked; }
if (typeof isStoryQuestReached !== 'undefined') { if (typeof window !== 'undefined') window.isStoryQuestReached = isStoryQuestReached; if (typeof globalThis !== 'undefined') globalThis.isStoryQuestReached = isStoryQuestReached; }
if (typeof normalizeHatcheryModesForUnlocks !== 'undefined') { if (typeof window !== 'undefined') window.normalizeHatcheryModesForUnlocks = normalizeHatcheryModesForUnlocks; if (typeof globalThis !== 'undefined') globalThis.normalizeHatcheryModesForUnlocks = normalizeHatcheryModesForUnlocks; }
if (typeof hatcherySlotIsIncubation !== 'undefined') { if (typeof window !== 'undefined') window.hatcherySlotIsIncubation = hatcherySlotIsIncubation; if (typeof globalThis !== 'undefined') globalThis.hatcherySlotIsIncubation = hatcherySlotIsIncubation; }
if (typeof hatcherySlotPriority !== 'undefined') { if (typeof window !== 'undefined') window.hatcherySlotPriority = hatcherySlotPriority; if (typeof globalThis !== 'undefined') globalThis.hatcherySlotPriority = hatcherySlotPriority; }
if (typeof toggleHatcherySlotPriority !== 'undefined') { if (typeof window !== 'undefined') window.toggleHatcherySlotPriority = toggleHatcherySlotPriority; if (typeof globalThis !== 'undefined') globalThis.toggleHatcherySlotPriority = toggleHatcherySlotPriority; }
if (typeof applyPendingHatcheryMode !== 'undefined') { if (typeof window !== 'undefined') window.applyPendingHatcheryMode = applyPendingHatcheryMode; if (typeof globalThis !== 'undefined') globalThis.applyPendingHatcheryMode = applyPendingHatcheryMode; }
if (typeof isHatcheryFossilEntry !== 'undefined') { if (typeof window !== 'undefined') window.isHatcheryFossilEntry = isHatcheryFossilEntry; if (typeof globalThis !== 'undefined') globalThis.isHatcheryFossilEntry = isHatcheryFossilEntry; }
if (typeof fossilKeyOfQueueEntry !== 'undefined') { if (typeof window !== 'undefined') window.fossilKeyOfQueueEntry = fossilKeyOfQueueEntry; if (typeof globalThis !== 'undefined') globalThis.fossilKeyOfQueueEntry = fossilKeyOfQueueEntry; }
if (typeof fossilQueueCandidates !== 'undefined') { if (typeof window !== 'undefined') window.fossilQueueCandidates = fossilQueueCandidates; if (typeof globalThis !== 'undefined') globalThis.fossilQueueCandidates = fossilQueueCandidates; }
if (typeof getHatcheryFossilReservations !== 'undefined') { if (typeof window !== 'undefined') window.getHatcheryFossilReservations = getHatcheryFossilReservations; if (typeof globalThis !== 'undefined') globalThis.getHatcheryFossilReservations = getHatcheryFossilReservations; }
if (typeof getFossilAvailableCount !== 'undefined') { if (typeof window !== 'undefined') window.getFossilAvailableCount = getFossilAvailableCount; if (typeof globalThis !== 'undefined') globalThis.getFossilAvailableCount = getFossilAvailableCount; }
if (typeof sanitizeHatcheryFossilQueues !== 'undefined') { if (typeof window !== 'undefined') window.sanitizeHatcheryFossilQueues = sanitizeHatcheryFossilQueues; if (typeof globalThis !== 'undefined') globalThis.sanitizeHatcheryFossilQueues = sanitizeHatcheryFossilQueues; }
if (typeof refillHatcheryQueueFromRules !== 'undefined') { if (typeof window !== 'undefined') window.refillHatcheryQueueFromRules = refillHatcheryQueueFromRules; if (typeof globalThis !== 'undefined') globalThis.refillHatcheryQueueFromRules = refillHatcheryQueueFromRules; }
if (typeof toggleHatcherySlotMode !== 'undefined') { if (typeof window !== 'undefined') window.toggleHatcherySlotMode = toggleHatcherySlotMode; if (typeof globalThis !== 'undefined') globalThis.toggleHatcherySlotMode = toggleHatcherySlotMode; }
if (typeof withdrawPokemonFromDaycare !== 'undefined') { if (typeof window !== 'undefined') window.withdrawPokemonFromDaycare = withdrawPokemonFromDaycare; if (typeof globalThis !== 'undefined') globalThis.withdrawPokemonFromDaycare = withdrawPokemonFromDaycare; }
if (typeof getHatcherySlotUpgradeCost !== 'undefined') { if (typeof window !== 'undefined') window.getHatcherySlotUpgradeCost = getHatcherySlotUpgradeCost; if (typeof globalThis !== 'undefined') globalThis.getHatcherySlotUpgradeCost = getHatcherySlotUpgradeCost; }
if (typeof upgradeHatcherySlots !== 'undefined') { if (typeof window !== 'undefined') window.upgradeHatcherySlots = upgradeHatcherySlots; if (typeof globalThis !== 'undefined') globalThis.upgradeHatcherySlots = upgradeHatcherySlots; }
if (typeof hatchEgg !== 'undefined') { if (typeof window !== 'undefined') window.hatchEgg = hatchEgg; if (typeof globalThis !== 'undefined') globalThis.hatchEgg = hatchEgg; }
if (typeof getFossilInventory !== 'undefined') { if (typeof window !== 'undefined') window.getFossilInventory = getFossilInventory; if (typeof globalThis !== 'undefined') globalThis.getFossilInventory = getFossilInventory; }
if (typeof getFossilDisplayKey !== 'undefined') { if (typeof window !== 'undefined') window.getFossilDisplayKey = getFossilDisplayKey; if (typeof globalThis !== 'undefined') globalThis.getFossilDisplayKey = getFossilDisplayKey; }
if (typeof getFossilReviveId !== 'undefined') { if (typeof window !== 'undefined') window.getFossilReviveId = getFossilReviveId; if (typeof globalThis !== 'undefined') globalThis.getFossilReviveId = getFossilReviveId; }
if (typeof reviveFossil !== 'undefined') { if (typeof window !== 'undefined') window.reviveFossil = reviveFossil; if (typeof globalThis !== 'undefined') globalThis.reviveFossil = reviveFossil; }

if (typeof hatcheryStepsForPokemon !== 'undefined') { if (typeof window !== 'undefined') window.hatcheryStepsForPokemon = hatcheryStepsForPokemon; if (typeof globalThis !== 'undefined') globalThis.hatcheryStepsForPokemon = hatcheryStepsForPokemon; }
if (typeof getDaycareKosPerLevel !== 'undefined') { if (typeof window !== 'undefined') window.getDaycareKosPerLevel = getDaycareKosPerLevel; if (typeof globalThis !== 'undefined') globalThis.getDaycareKosPerLevel = getDaycareKosPerLevel; }
// hatcheryRegisterBattleKills: exposed by src/application/hatchery-system.js (ECS).
if (typeof pokemonIvTotal !== 'undefined') { if (typeof window !== 'undefined') window.pokemonIvTotal = pokemonIvTotal; if (typeof globalThis !== 'undefined') globalThis.pokemonIvTotal = pokemonIvTotal; }
if (typeof pokemonEvTotal !== 'undefined') { if (typeof window !== 'undefined') window.pokemonEvTotal = pokemonEvTotal; if (typeof globalThis !== 'undefined') globalThis.pokemonEvTotal = pokemonEvTotal; }
if (typeof ensurePokemonUid !== 'undefined') { if (typeof window !== 'undefined') window.ensurePokemonUid = ensurePokemonUid; if (typeof globalThis !== 'undefined') globalThis.ensurePokemonUid = ensurePokemonUid; }
if (typeof ensureHatcheryAutomation !== 'undefined') { if (typeof window !== 'undefined') window.ensureHatcheryAutomation = ensureHatcheryAutomation; if (typeof globalThis !== 'undefined') globalThis.ensureHatcheryAutomation = ensureHatcheryAutomation; }
if (typeof rebuildHatcheryQueue !== 'undefined') { if (typeof window !== 'undefined') window.rebuildHatcheryQueue = rebuildHatcheryQueue; if (typeof globalThis !== 'undefined') globalThis.rebuildHatcheryQueue = rebuildHatcheryQueue; }
if (typeof setHatcheryAutomationOption !== 'undefined') { if (typeof window !== 'undefined') window.setHatcheryAutomationOption = setHatcheryAutomationOption; if (typeof globalThis !== 'undefined') globalThis.setHatcheryAutomationOption = setHatcheryAutomationOption; }
if (typeof processHatcheryQueue !== 'undefined') { if (typeof window !== 'undefined') window.processHatcheryQueue = processHatcheryQueue; if (typeof globalThis !== 'undefined') globalThis.processHatcheryQueue = processHatcheryQueue; }
if (typeof drainHatcheryQueuesIntoSlots !== 'undefined') { if (typeof window !== 'undefined') window.drainHatcheryQueuesIntoSlots = drainHatcheryQueuesIntoSlots; if (typeof globalThis !== 'undefined') globalThis.drainHatcheryQueuesIntoSlots = drainHatcheryQueuesIntoSlots; }
if (typeof renderHatcheryQueuePreview !== 'undefined') { if (typeof window !== 'undefined') window.renderHatcheryQueuePreview = renderHatcheryQueuePreview; if (typeof globalThis !== 'undefined') globalThis.renderHatcheryQueuePreview = renderHatcheryQueuePreview; }
if (typeof getHatcheryQueueLimit !== 'undefined') { if (typeof window !== 'undefined') window.getHatcheryQueueLimit = getHatcheryQueueLimit; if (typeof globalThis !== 'undefined') globalThis.getHatcheryQueueLimit = getHatcheryQueueLimit; }
if (typeof upgradeHatcheryQueueSize !== 'undefined') { if (typeof window !== 'undefined') window.upgradeHatcheryQueueSize = upgradeHatcheryQueueSize; if (typeof globalThis !== 'undefined') globalThis.upgradeHatcheryQueueSize = upgradeHatcheryQueueSize; }
if (typeof addPokemonToHatcheryQueue !== 'undefined') { if (typeof window !== 'undefined') window.addPokemonToHatcheryQueue = addPokemonToHatcheryQueue; if (typeof globalThis !== 'undefined') globalThis.addPokemonToHatcheryQueue = addPokemonToHatcheryQueue; }
if (typeof removePokemonFromHatcheryQueue !== 'undefined') { if (typeof window !== 'undefined') window.removePokemonFromHatcheryQueue = removePokemonFromHatcheryQueue; if (typeof globalThis !== 'undefined') globalThis.removePokemonFromHatcheryQueue = removePokemonFromHatcheryQueue; }
if (typeof clearHatcheryQueue !== 'undefined') { if (typeof window !== 'undefined') window.clearHatcheryQueue = clearHatcheryQueue; if (typeof globalThis !== 'undefined') globalThis.clearHatcheryQueue = clearHatcheryQueue; }
if (typeof isPokemonQueuedHatchery !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonQueuedHatchery = isPokemonQueuedHatchery; if (typeof globalThis !== 'undefined') globalThis.isPokemonQueuedHatchery = isPokemonQueuedHatchery; }
if (typeof FOSSIL_REVIVE_MAP !== 'undefined') { if (typeof window !== 'undefined') window.FOSSIL_REVIVE_MAP = FOSSIL_REVIVE_MAP; if (typeof globalThis !== 'undefined') globalThis.FOSSIL_REVIVE_MAP = FOSSIL_REVIVE_MAP; }



// --- Exported globals ---
if (typeof cleanHatcheryQueue !== 'undefined') { if (typeof window !== 'undefined') window.cleanHatcheryQueue = cleanHatcheryQueue; if (typeof globalThis !== 'undefined') globalThis.cleanHatcheryQueue = cleanHatcheryQueue; }
if (typeof fillHatcherySlotFromQueue !== 'undefined') { if (typeof window !== 'undefined') window.fillHatcherySlotFromQueue = fillHatcherySlotFromQueue; if (typeof globalThis !== 'undefined') globalThis.fillHatcherySlotFromQueue = fillHatcherySlotFromQueue; }
if (typeof findBoxKeyByUid !== 'undefined') { if (typeof window !== 'undefined') window.findBoxKeyByUid = findBoxKeyByUid; if (typeof globalThis !== 'undefined') globalThis.findBoxKeyByUid = findBoxKeyByUid; }
if (typeof findEmptyHatcherySlot !== 'undefined') { if (typeof window !== 'undefined') window.findEmptyHatcherySlot = findEmptyHatcherySlot; if (typeof globalThis !== 'undefined') globalThis.findEmptyHatcherySlot = findEmptyHatcherySlot; }
if (typeof getHatcheryQueueUpgradeCost !== 'undefined') { if (typeof window !== 'undefined') window.getHatcheryQueueUpgradeCost = getHatcheryQueueUpgradeCost; if (typeof globalThis !== 'undefined') globalThis.getHatcheryQueueUpgradeCost = getHatcheryQueueUpgradeCost; }
if (typeof hatcheryCandidateEntries !== 'undefined') { if (typeof window !== 'undefined') window.hatcheryCandidateEntries = hatcheryCandidateEntries; if (typeof globalThis !== 'undefined') globalThis.hatcheryCandidateEntries = hatcheryCandidateEntries; }
if (typeof isPokemonInTeamByUid !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonInTeamByUid = isPokemonInTeamByUid; if (typeof globalThis !== 'undefined') globalThis.isPokemonInTeamByUid = isPokemonInTeamByUid; }
if (typeof isUidInAnyTrainingQueue !== 'undefined') { if (typeof window !== 'undefined') window.isUidInAnyTrainingQueue = isUidInAnyTrainingQueue; if (typeof globalThis !== 'undefined') globalThis.isUidInAnyTrainingQueue = isUidInAnyTrainingQueue; }
if (typeof isUidInHatchery !== 'undefined') { if (typeof window !== 'undefined') window.isUidInHatchery = isUidInHatchery; if (typeof globalThis !== 'undefined') globalThis.isUidInHatchery = isUidInHatchery; }
if (typeof pokemonBaseStatTotal !== 'undefined') { if (typeof window !== 'undefined') window.pokemonBaseStatTotal = pokemonBaseStatTotal; if (typeof globalThis !== 'undefined') globalThis.pokemonBaseStatTotal = pokemonBaseStatTotal; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  setHatcherySlotAutomationOption,
  toggleHatcheryAutomationSlot,
  isPokemonIncubationUnlocked,
  isFossilReviveUnlocked,
  isHatcheryModeSwitchUnlocked,
  isStoryQuestReached,
  normalizeHatcheryModesForUnlocks,
  applyHatcheryShinyRoll,
  hatcherySlotIsIncubation,
  hatcherySlotPriority,
  toggleHatcherySlotPriority,
  applyPendingHatcheryMode,
  isHatcheryFossilEntry,
  fossilKeyOfQueueEntry,
  fossilQueueCandidates,
  getHatcheryFossilReservations,
  getFossilAvailableCount,
  sanitizeHatcheryFossilQueues,
  refillHatcheryQueueFromRules,
  toggleHatcherySlotMode,
  withdrawPokemonFromDaycare,
  getHatcherySlotUpgradeCost,
  upgradeHatcherySlots,
  hatchEgg,
  getFossilInventory,
  getFossilDisplayKey,
  getFossilReviveId,
  reviveFossil,
  hatcheryStepsForPokemon,
  getDaycareKosPerLevel,
  pokemonIvTotal,
  pokemonEvTotal,
  ensurePokemonUid,
  ensureHatcheryAutomation,
  rebuildHatcheryQueue,
  setHatcheryAutomationOption,
  processHatcheryQueue,
  drainHatcheryQueuesIntoSlots,
  renderHatcheryQueuePreview,
  getHatcheryQueueLimit,
  upgradeHatcheryQueueSize,
  addPokemonToHatcheryQueue,
  removePokemonFromHatcheryQueue,
  clearHatcheryQueue,
  isPokemonQueuedHatchery,
  cleanHatcheryQueue,
  fillHatcherySlotFromQueue,
  findBoxKeyByUid,
  findEmptyHatcherySlot,
  getHatcheryQueueUpgradeCost,
  hatcheryCandidateEntries,
  isPokemonInTeamByUid,
  isUidInAnyTrainingQueue,
  isUidInHatchery,
  pokemonBaseStatTotal,
};

