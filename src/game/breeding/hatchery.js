const FOSSIL_REVIVE_MAP = {
  fossil: 138,
  helix_fossil: 138,
  dome_fossil: 140,
  old_amber: 142,
  // Passe 14 : cibles canoniques — Lilia (#345) et Anorith (#347) sont
  // désormais jouables (cf. descriptions des objets). Avant : Marcacrin /
  // Embrylex (placeholders faute des vraies espèces dans le dex).
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

const HATCHERY_AUTO_QUEUE_LIMIT = 24;
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
// ─── Passe 30 : Garderie ET Incubation partagent UN compteur de K.O. ───────
// (Décisions bêta utilisateur) La Garderie abandonne son compteur d'XP : comme
// l'incubation, elle avance sur un compteur de Pokémon mis K.O. — 10 K.O. =
// 1 niveau. Chaque K.O. (sauvage, dresseur ou entraînement) nourrit TOUS les
// slots de pension et le MODE du slot décide du résultat :
//   - 'breed' / fossile : compteur d'incubation (éclosion à stepsReq K.O.) ;
//   - 'exp' (Garderie)  : +1 niveau tous les DAYCARE_KOS_PER_LEVEL K.O.
//                          (frais d'automation par niveau, règles inchangées).
// Correctif bonus : avant, le compteur de steps montait AUSSI sur les slots
// Garderie, et avec l'éclosion auto activée le pensionnaire était remis au
// niveau 1 (« éclosion ») au bout de 25–100 K.O. — le routage élimine ce bug.
const DAYCARE_KOS_PER_LEVEL = 10; // décision utilisateur (passe 30)
function getDaycareKosPerLevel(p) { return DAYCARE_KOS_PER_LEVEL; }
// Retourne le nombre de niveaux de Garderie gagnés (utile au récap offline).
function hatcheryRegisterBattleKills(count) {
  if (!G || !Array.isArray(G.hatchery)) return 0;
  count = Math.max(1, Math.floor(Number(count) || 1));
  let daycareLevels = 0;
  let changed = false;
  for (let i = 0; i < G.hatchery.length; i++) {
    const slot = G.hatchery[i];
    if (!slot) continue;
    const mode = (G.hatcheryModes && G.hatcheryModes[i]) || slot.mode || 'exp';
    if (slot.isFossil || mode === 'breed') {
      // Incubation : comportement historique inchangé.
      slot.steps = (slot.steps || 0) + count;
      changed = true;
      if (G.automation && G.automation.autoHatch && slot.steps >= (slot.stepsReq || 10)) {
        hatchEgg(i);
      }
      continue;
    }
    // Garderie : le compteur fait gagner des NIVEAUX (plus d'XP au compte-gouttes).
    const p = slot.poke;
    if (!p || p.level >= 100) continue;
    slot.steps = (slot.steps || 0) + count;
    changed = true;
    const perLevel = getDaycareKosPerLevel(p);
    let levelsGained = 0;
    while ((slot.steps || 0) >= perLevel && p.level < 100) {
      slot.steps -= perLevel;
      levelUp(p);
      levelsGained++;
    }
    if (levelsGained <= 0) continue;
    daycareLevels += levelsGained;
    const feePerLevel = typeof getHatcheryLevelUpFee === 'function' ? getHatcheryLevelUpFee() : 0;
    const totalFee = feePerLevel * levelsGained;
    if (G.money < totalFee) {
      // Règle inchangée : impayé → le pensionnaire garde ses niveaux mais sort.
      G.collection[String(p.id)] = p;
      G.hatchery[i] = null;
      notify(`${p.name} a été retiré de la Garderie : fonds insuffisants pour payer ses nouveaux niveaux (${totalFee}₽ requis) !`, "var(--red)");
      continue;
    }
    if (totalFee > 0) {
      G.money -= totalFee;
      addBattleLog(` [Pension] -${totalFee}₽ payés pour ${levelsGained} niveau(x) gagné(s) par ${p.name}.`);
      try { updateHeader(); } catch (_) {}
    }
    if (p.level >= 100) {
      G.collection[String(p.id)] = p;
      G.hatchery[i] = null;
      addBattleLog(` [Pension] ${p.name} a atteint le Niveau 100 et sort de la Garderie !`);
      notify(`${p.name} a atteint le Niveau 100 et sort de la Garderie !`, "var(--green)");
    }
  }
  if (changed) { try { if (typeof renderHatcheryWindow === 'function') renderHatcheryWindow(); } catch (_) {} }
  return daycareLevels;
}

function hatcheryStepsForPokemon(pOrId) {
  const id = Number(typeof pOrId === 'object' ? pOrId.id : pOrId);
  let base = 100;
  if (HATCHERY_LEGENDARY_IDS.includes(id)) base = 100;
  else {
    const bst = pokemonBaseStatTotal(id);
    if (bst <= 250) base = 25;
    else if (bst <= 330) base = 35;
    else if (bst <= 420) base = 50;
    else if (bst <= 520) base = 70;
    else if (bst <= 600) base = 85;
  }
  const bonus =
    typeof getStaffBonus === 'function' ? getStaffBonus('hatchery', 'hatchery_speed') : 0;
  return clamp(Math.ceil(base * (1 - bonus)), 25, 100);
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
  // Slots existants (anciennes saves) : priorité par défaut = Pokémon
  for (const s of a.slots) { if (s && !s.priority) s.priority = 'pokemon'; }
  return a;
}

// Mode d'un slot (incubation = 'breed') — centralisé pour l'UI et le sélecteur.
function hatcherySlotIsIncubation(slotIdx) {
  return ((G.hatcheryModes && G.hatcheryModes[slotIdx]) || 'exp') === 'breed';
}
// Priorité de remplissage d'un slot d'incubation : 'pokemon' (défaut) ou 'fossil'.
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
// ── File d'attente mixte (passe 13) ────────────────────────────────────────
// Une entrée de file est soit un uid de Pokémon (chaîne), soit un fossile
// ("fossil:<clé d'objet>"). La consommation est strictement FIFO : quand un
// slot se libère, c'est le PREMIER de la liste qui passe, jamais un autre.
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
      notify((typeof t === 'function' ? t('hatchery_no_lvl100_passive') : 'Impossible de mettre un Pokémon de Niveau 100 en Garderie passive !'), 'var(--red)');
      return false;
    }
    if (targetMode === 'breed' && p.level < 100) {
      notify((typeof t === 'function' ? t('hatchery_only_lvl100_breed') : (typeof t==='function'?t('only_lv100_breeding'):"Only Level 100 Pokémon can be placed in Breeding!")), 'var(--red)');
      return false;
    }

    let paid = false;
    if (G.automation && (G.automation.autoHatch || G.automation.autoSeedHatchery)) {
      const fee =
        typeof getHatcheryAutomationFee === 'function' ? getHatcheryAutomationFee() : 0;
      if (fee > 0) {
        if (G.money < fee) {
          notify((typeof t === 'function' ? t('hatchery_no_money_auto') : "Pas assez d'argent pour payer les frais d'automation d'éclosion !"), 'var(--red)');
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

  const q = G.hatcheryQueues[targetSlotIdx] || [];
  if (q.length >= getHatcheryQueueLimit()) {
    notify(tr('queue_full', { count: getHatcheryQueueLimit() }), 'var(--red)');
    return false;
  }
  q.push(p.uid);
  G.hatcheryQueues[targetSlotIdx] = q;

  // Cascade file → slot uniquement si le remplissage automatique est activé
  // (ajouter à la file ne doit pas remplir le slot quand il est désactivé).
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
  let list = [];
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
    // Entrée fossile : valide tant que l'objet est encore en sac.
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
    // FIFO strict : le premier de la liste passe — Pokémon ou fossile.
    const fossilKey = fossilKeyOfQueueEntry(entry);
    if (fossilKey) {
      const qty = (G.inventory && G.inventory[fossilKey]) || 0;
      if (qty < 1) continue; // fossile utilisé entre-temps → on saute
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
      if (typeof addBattleLog === 'function') addBattleLog(` [Pension] ${getItemName(fossilKey)} placé en incubation (slot #${slotIdx + 1}).`);
      return true;
    }
    const uid = entry;
    const key = findBoxKeyByUid(uid);
    if (!key) continue;
    const p = G.collection[key];
    if (!p || p.locked || isPokemonInTeamByUid(uid)) continue;

    if (targetMode === 'breed' && p.level < 100) continue;
    if (targetMode === 'exp' && p.level >= 100) continue;

    let paid = false;
    if (G.automation && G.automation.autoSeedHatchery) {
      const fee =
        typeof getHatcheryAutomationFee === 'function' ? getHatcheryAutomationFee() : 0;
      if (fee > 0) {
        if (G.money < fee) {
          G.automation.autoSeedHatchery = false;
          notify(typeof t==='function'?t('auto_fill_no_money'):"Auto-fill disabled: not enough money!", 'var(--red)');
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
    return true;
  }
  return false;
}

// Nombre d'unités de chaque fossile réservées dans TOUTES les files
// d'attente (tous slots confondus). Un fossile n'est consommé du sac qu'au
// moment de passer dans un slot — toute entrée de file est une réservation.
function getHatcheryFossilReservations() {
  const reserved = {};
  (G.hatcheryQueues || []).forEach((qq) => qq && qq.forEach((e) => {
    const k = fossilKeyOfQueueEntry(e);
    if (k) reserved[k] = (reserved[k] || 0) + 1;
  }));
  return reserved;
}
// Exemplaires réellement disponibles d'un fossile = stock sac − réservations.
function getFossilAvailableCount(fossilKey) {
  const qty = (G.inventory && G.inventory[fossilKey]) || 0;
  const reserved = getHatcheryFossilReservations()[fossilKey] || 0;
  return Math.max(0, qty - reserved);
}
// Garde-fou anti-duplication (passe 14) : un fossile possédé en 1 exemplaire
// ne doit JAMAIS apparaître dans 2 files (vu dans une ancienne save). On
// parcourt les files dans l'ordre des slots et on ne conserve que les
// réservations couvertes par le stock — les doublons excédentaires sautent.
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
// Fossiles disponibles pour alimenter les files : stock en sac moins les
// unités déjà réservées dans TOUTES les files (jamais de double réservation).
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

// Réassort ROUND-ROBIN des files (passe 31, retour bêta) : on tourne RANG PAR
// RANG — le 1ᵉʳ élément de chaque file, puis le 2ᵉ, etc. — au lieu de remplir
// la file du slot 0 jusqu'à sa capacité avant de passer au suivant. Avant,
// avec peu de candidats, tout partait dans la file 0 : un slot et sa liste
// pleins pendant qu'un autre slot du même mode restait vide (et ne pouvait
// jamais être servi). Règles conservées : ajouts TOUJOURS en fin de file
// (FIFO garanti à la consommation), filtrage par mode (Garderie = niv. < 100,
// Incubation = niv. 100 ou fossiles), priorité fossile/pokémon par slot avec
// bascule automatique si le type préféré est épuisé (passe 12).
function refillHatcheryQueueFromRules() {
  ensureHatcheryAutomation();
  if (!G.hatcheryQueues) G.hatcheryQueues = [[], [], [], []];
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  const cap = getHatcheryQueueLimit();
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  let added = 0;

  // Pokémon déjà en file / en cours / à l'entraînement (mode exp commun)
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
  let fossilPool = fossilQueueCandidates();

  // Contexte par slot (compteurs pour la bascule de priorité automatique).
  const isLv100Match = (en) => (en.p.level || 0) >= 100;
  const ctx = [];
  for (let slotIdx = 0; slotIdx < maxSlots; slotIdx++) {
    // Changement de mode en attente : ce slot ne doit plus être réassorti.
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

  // RANG PAR RANG : chaque file reçoit son n-ième élément avant la suivante.
  // Une file déjà plus longue (pré-remplie) n'est jamais modifiée en milieu.
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
      if (entry === null) {
        const pi = pokePool.findIndex((en) => (c.mode === 'breed' ? isLv100Match(en) : !isLv100Match(en)));
        if (pi !== -1) { entry = pokePool.splice(pi, 1)[0].uid; usedType = 'pokemon'; }
      }
      if (entry === null && c.mode === 'breed' && c.prefer === 'pokemon' && fossilPool.length) {
        entry = fossilPool.shift(); usedType = 'fossil';
      }
      if (entry === null) continue; // plus rien d'éligible pour ce slot
      q.push(entry);
      G.hatcheryQueues[c.idx] = q;
      added++;
      if (c.mode !== 'breed' || usedType === c.prefer) c.appendedPreferred++; else c.appendedOther++;
    }
  }

  // Si le type priorisé est épuisé mais que l'autre a servi, le toggle suit
  // (passe 12) — évalué par slot sur l'ensemble du réassort.
  for (const c of ctx) {
    if (!c || c.mode !== 'breed') continue;
    if (c.appendedPreferred === 0 && c.appendedOther > 0 &&
        G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[c.idx]) {
      G.hatcheryAutomation.slots[c.idx].priority = c.prefer === 'fossil' ? 'pokemon' : 'fossil';
    }
  }
  return added;
}

// Consommation FIFO : quand un slot se libère, c'est le PREMIER de la liste
// qui passe — jamais un fossile/Pokémon pris ailleurs. Extraite (passe 31)
// pour être appelée avant ET après le réassort des files.
function drainHatcheryQueuesIntoSlots() {
  let changed = false;
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  let guard = 0, progress = true;
  while (progress && guard++ < 8) {
    progress = false;
    for (let i = 0; i < maxSlots; i++) {
      if (!G.hatchery[i]) {
        // Mode en attente appliqué si le slot est déjà vide (sécurité)
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

var _hatcheryQueueProcessing = false;
function processHatcheryQueue(force = false) {
  if (_hatcheryQueueProcessing) return false;
  _hatcheryQueueProcessing = true;
  try {
  ensureHatcheryAutomation();
  const autoFill = !!(G.automation && G.automation.autoSeedHatchery);
  // Sans remplissage automatique activé (appel non forcé) : aucune liste,
  // aucun slot ne se remplit — les placements manuels restent au cas par cas.
  if (!force && !autoFill) return false;
  if (!G.hatchery) G.hatchery = [null];
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  while (G.hatchery.length < maxSlots) G.hatchery.push(null);
  let changed = false;

  // 0) Garde-fou anti-duplication : un fossile n'ayant qu'un exemplaire ne
  //    peut rester réservé que dans UNE seule file (répare les vieilles saves).
  try {
    if (sanitizeHatcheryFossilQueues() > 0) { changed = true; saveGame(); }
  } catch (_) {}

  // 1) Passe 31 (retour bêta) : les SLOTS VIDES d'abord — consommation FIFO
  //    des files existantes AVANT tout réassort.
  if (drainHatcheryQueuesIntoSlots()) changed = true;

  // 2) Réassort round-robin : 1ᵉʳ élément de chaque file, puis 2ᵉ, etc. —
  //    répartition équitable entre les slots du même mode (plus de file 0
  //    pleine pendant que les autres restent vides).
  const added = refillHatcheryQueueFromRules();
  if (added) changed = true;

  // 3) Consommation : les slots encore vides prennent le 1er élément frais de
  //    leur file — un slot libre est servi AVANT d'empiler sa propre file.
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
      // Entrée fossile : icône de l'objet + coût d'incubation
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

function hatchEgg(slotIdx = 0) {
  if (!G.hatchery || !G.hatchery[slotIdx]) return;
  const slot = G.hatchery[slotIdx];
  if (slot.steps < slot.stepsReq) return;

  let p;
  if (slot.isFossil) {
    const isShiny = rollShiny();
    p = createPoke(slot.reviveId, 1, isShiny);
    if (!p) {
      return;
    }
    G.pokedex[slot.reviveId] = {
      ...(G.pokedex[slot.reviveId] || {}),
      seen: true,
      caught: true,
    };
    if (isShiny) {
      p.shinyUnlocked = true;
      p.shinyActive = true;
      p.shiny = true;
      unlockShinyForSpecies(slot.reviveId);
    }
  } else {
    p = slot.poke;
  }

  if (!p.ivs) p.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const keys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const avail = keys.filter((k) => (p.ivs[k] || 0) < 6);
  let ivMsg = '';
  if (avail.length > 0) {
    const picked = avail[rand(0, avail.length - 1)];
    p.ivs[picked] = (p.ivs[picked] || 0) + 1;
    ivMsg = ` (+1 IV ${picked.toUpperCase()})`;
  } else {
    G.money += 5000;
    ivMsg = t('iv_money_bonus');
  }
  if (!slot.isFossil) {
    const wasShiny = rollShiny();
    if (wasShiny) {
      p.shinyUnlocked = true;
      p.shinyActive = true;
      p.shiny = true;
      unlockShinyForSpecies(p.id);
    }
  }
  p.level = 1;
  p.xp = xpForLevel(1);
  p.xpNext = xpForLevel(2);
  recalcPokeStats(p);
  p.currentHP = p.maxHP;

  G.collection[String(p.id)] = p;
  G.hatchery[slotIdx] = null;
  // Un changement de mode mis en attente (incubation → garderie) s'applique
  // maintenant que l'incubation est terminée.
  applyPendingHatcheryMode(slotIdx);
  if (typeof addStaffXp === 'function') addStaffXp('hatchery', 1);

  if (G.automation && G.automation.autoSeedHatchery) {
    processHatcheryQueue();
  }

  updateHeader();
  renderTeamWindow();
  renderHatcheryWindow();
  if (
    (slot.isFossil && (p.shinyUnlocked || p.shinyActive || p.shiny)) ||
    (!slot.isFossil && rollShiny())
  ) {
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
  const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
  if (invQty < 1) {
    notify(t('no_fossil_left'), 'var(--red)');
    return;
  }
  // Fossiles réservés dans une file d'attente de la pension : on ne peut
  // réanimer que les exemplaires LIBRES (anti-doublon, passe 14).
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

  G.inventory[fossilKey]--;
  if (G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];

  const isShiny = rollShiny();
  const p = createPoke(pokeId, 1, isShiny);
  if (!p) {
    notify(t('n.erreur_revival'), 'var(--red)');
    return;
  }

  if (G.team.length < 6) {
    G.team.push(p);
    notify(tr('fossil_revived_party', { name: p.name }), isShiny ? 'var(--light2)' : 'var(--green)');
  } else {
    G.collection[pokeId] = p;
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
    notify((typeof t === 'function' ? t('hatchery_cannot_remove_fossil') : "Impossible de retirer un fossile en cours d'incubation !"), 'var(--red)');
    return;
  }
  const targetMode = (G.hatcheryModes && G.hatcheryModes[slotIdx]) || slot.mode || 'exp';
  if (targetMode === 'breed') {
    notify((typeof t === 'function' ? t('hatchery_cannot_remove_breeding') : 'Impossible de retirer un Pokémon mis en mode Reproduction !'), 'var(--red)');
    return;
  }
  const p = slot.poke;
  G.collection[String(p.id)] = p;
  G.hatchery[slotIdx] = null;
  saveGame();
  renderHatcheryWindow();
  renderTeamWindow();
  notify(`${p.name} a été retiré de la Garderie passive.`, 'var(--green)');
}

function toggleHatcherySlotMode(slotIdx) {
  if (!G.hatcheryModes) G.hatcheryModes = ['exp', 'exp', 'exp', 'exp'];
  ensureHatcheryAutomation(); // garantit aussi G.hatcheryPendingModes
  if (!Array.isArray(G.hatcheryPendingModes)) G.hatcheryPendingModes = [null, null, null, null];
  const currentMode = G.hatcheryModes[slotIdx] || 'exp';
  const nextMode = currentMode === 'exp' ? 'breed' : 'exp';
  const occupied = !!(G.hatchery && G.hatchery[slotIdx]);

  // Garderie → Incubation avec un Pokémon Niv. < 100 dans le slot (passe 14) :
  // plus de blocage — le Pokémon est renvoyé au PC et la liste est vidée,
  // puis le mode bascule (l'incubation est réservée aux Niv. 100).
  if (
    nextMode === 'breed' &&
    occupied &&
    G.hatchery[slotIdx].poke &&
    !G.hatchery[slotIdx].isFossil &&
    G.hatchery[slotIdx].poke.level < 100
  ) {
    const ejected = G.hatchery[slotIdx].poke;
    G.collection[String(ejected.id)] = ejected;
    G.hatchery[slotIdx] = null;
    G.hatcheryPendingModes[slotIdx] = null;
    G.hatcheryModes[slotIdx] = 'breed';
    if (G.hatcheryAutomation && G.hatcheryAutomation.slots && G.hatcheryAutomation.slots[slotIdx]) {
      G.hatcheryAutomation.slots[slotIdx].mode = 'breed';
    }
    if (G.hatcheryQueues && G.hatcheryQueues[slotIdx]) {
      G.hatcheryQueues[slotIdx] = []; // changer de mode vide toujours la liste
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

  // Slot occupé et passage incubation → garderie : on NE cancelle JAMAIS une
  // incubation en cours. Deux cas :
  //  - incubation TERMINÉE : elle est collectée (éclosion) puis le mode
  //    bascule immédiatement — rien n'est annulé ;
  //  - incubation en cours : le changement est mis en attente jusqu'à
  //    l'éclosion, ET la liste d'attente du slot est vidée tout de suite.
  if (occupied && currentMode === 'breed' && nextMode === 'exp') {
    const slot = G.hatchery[slotIdx];
    const done = (slot.steps || 0) >= (slot.stepsReq || 1);
    if (G.hatcheryPendingModes[slotIdx] === 'exp') {
      // Re-clic = annuler le changement en attente
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
      G.hatcheryQueues[slotIdx] = []; // changer de mode vide toujours la liste
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
    // done : bascule d'abord, puis collecte de l'incubation terminée
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

// Applique le changement de mode mis en attente une fois le slot vidé
// (éclosion d'un œuf / d'un fossile, ou retrait). Sans effet si le slot est
// encore occupé ou s'il n'y a rien en attente.
function applyPendingHatcheryMode(slotIdx) {
  if (!Array.isArray(G.hatcheryPendingModes)) G.hatcheryPendingModes = [null, null, null, null];
  const pending = G.hatcheryPendingModes[slotIdx];
  if (!pending) return;
  if (G.hatchery && G.hatchery[slotIdx]) return; // slot encore occupé
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
if (typeof setHatcherySlotAutomationOption !== 'undefined' && typeof window !== 'undefined') window.setHatcherySlotAutomationOption = setHatcherySlotAutomationOption;
if (typeof toggleHatcheryAutomationSlot !== 'undefined' && typeof window !== 'undefined') window.toggleHatcheryAutomationSlot = toggleHatcheryAutomationSlot;
if (typeof hatcherySlotIsIncubation !== 'undefined' && typeof window !== 'undefined') window.hatcherySlotIsIncubation = hatcherySlotIsIncubation;
if (typeof hatcherySlotPriority !== 'undefined' && typeof window !== 'undefined') window.hatcherySlotPriority = hatcherySlotPriority;
if (typeof toggleHatcherySlotPriority !== 'undefined' && typeof window !== 'undefined') window.toggleHatcherySlotPriority = toggleHatcherySlotPriority;
if (typeof applyPendingHatcheryMode !== 'undefined' && typeof window !== 'undefined') window.applyPendingHatcheryMode = applyPendingHatcheryMode;
if (typeof isHatcheryFossilEntry !== 'undefined' && typeof window !== 'undefined') window.isHatcheryFossilEntry = isHatcheryFossilEntry;
if (typeof fossilKeyOfQueueEntry !== 'undefined' && typeof window !== 'undefined') window.fossilKeyOfQueueEntry = fossilKeyOfQueueEntry;
if (typeof fossilQueueCandidates !== 'undefined' && typeof window !== 'undefined') window.fossilQueueCandidates = fossilQueueCandidates;
if (typeof getHatcheryFossilReservations !== 'undefined' && typeof window !== 'undefined') window.getHatcheryFossilReservations = getHatcheryFossilReservations;
if (typeof getFossilAvailableCount !== 'undefined' && typeof window !== 'undefined') window.getFossilAvailableCount = getFossilAvailableCount;
if (typeof sanitizeHatcheryFossilQueues !== 'undefined' && typeof window !== 'undefined') window.sanitizeHatcheryFossilQueues = sanitizeHatcheryFossilQueues;
if (typeof refillHatcheryQueueFromRules !== 'undefined' && typeof window !== 'undefined') window.refillHatcheryQueueFromRules = refillHatcheryQueueFromRules;
if (typeof toggleHatcherySlotMode !== 'undefined' && typeof window !== 'undefined')
  window.toggleHatcherySlotMode = toggleHatcherySlotMode;
if (typeof withdrawPokemonFromDaycare !== 'undefined' && typeof window !== 'undefined')
  window.withdrawPokemonFromDaycare = withdrawPokemonFromDaycare;
if (typeof getHatcherySlotUpgradeCost !== 'undefined' && typeof window !== 'undefined')
  window.getHatcherySlotUpgradeCost = getHatcherySlotUpgradeCost;
if (typeof upgradeHatcherySlots !== 'undefined' && typeof window !== 'undefined')
  window.upgradeHatcherySlots = upgradeHatcherySlots;
if (typeof hatchEgg !== 'undefined' && typeof window !== 'undefined') window.hatchEgg = hatchEgg;
if (typeof getFossilInventory !== 'undefined' && typeof window !== 'undefined')
  window.getFossilInventory = getFossilInventory;
if (typeof getFossilDisplayKey !== 'undefined' && typeof window !== 'undefined')
  window.getFossilDisplayKey = getFossilDisplayKey;
if (typeof getFossilReviveId !== 'undefined' && typeof window !== 'undefined')
  window.getFossilReviveId = getFossilReviveId;
if (typeof reviveFossil !== 'undefined' && typeof window !== 'undefined')
  window.reviveFossil = reviveFossil;

if (typeof hatcheryStepsForPokemon !== 'undefined' && typeof window !== 'undefined')
  window.hatcheryStepsForPokemon = hatcheryStepsForPokemon;
if (typeof getDaycareKosPerLevel !== 'undefined' && typeof window !== 'undefined')
  window.getDaycareKosPerLevel = getDaycareKosPerLevel;
if (typeof hatcheryRegisterBattleKills !== 'undefined' && typeof window !== 'undefined')
  window.hatcheryRegisterBattleKills = hatcheryRegisterBattleKills;
if (typeof pokemonIvTotal !== 'undefined' && typeof window !== 'undefined')
  window.pokemonIvTotal = pokemonIvTotal;
if (typeof pokemonEvTotal !== 'undefined' && typeof window !== 'undefined')
  window.pokemonEvTotal = pokemonEvTotal;
if (typeof ensurePokemonUid !== 'undefined' && typeof window !== 'undefined')
  window.ensurePokemonUid = ensurePokemonUid;
if (typeof ensureHatcheryAutomation !== 'undefined' && typeof window !== 'undefined')
  window.ensureHatcheryAutomation = ensureHatcheryAutomation;
if (typeof rebuildHatcheryQueue !== 'undefined' && typeof window !== 'undefined')
  window.rebuildHatcheryQueue = rebuildHatcheryQueue;
if (typeof setHatcheryAutomationOption !== 'undefined' && typeof window !== 'undefined')
  window.setHatcheryAutomationOption = setHatcheryAutomationOption;
if (typeof processHatcheryQueue !== 'undefined' && typeof window !== 'undefined')
  window.processHatcheryQueue = processHatcheryQueue;
if (typeof drainHatcheryQueuesIntoSlots !== 'undefined' && typeof window !== 'undefined')
  window.drainHatcheryQueuesIntoSlots = drainHatcheryQueuesIntoSlots;
if (typeof renderHatcheryQueuePreview !== 'undefined' && typeof window !== 'undefined')
  window.renderHatcheryQueuePreview = renderHatcheryQueuePreview;
if (typeof getHatcheryQueueLimit !== 'undefined' && typeof window !== 'undefined')
  window.getHatcheryQueueLimit = getHatcheryQueueLimit;
if (typeof upgradeHatcheryQueueSize !== 'undefined' && typeof window !== 'undefined')
  window.upgradeHatcheryQueueSize = upgradeHatcheryQueueSize;
if (typeof addPokemonToHatcheryQueue !== 'undefined' && typeof window !== 'undefined')
  window.addPokemonToHatcheryQueue = addPokemonToHatcheryQueue;
if (typeof removePokemonFromHatcheryQueue !== 'undefined' && typeof window !== 'undefined')
  window.removePokemonFromHatcheryQueue = removePokemonFromHatcheryQueue;
if (typeof clearHatcheryQueue !== 'undefined' && typeof window !== 'undefined')
  window.clearHatcheryQueue = clearHatcheryQueue;
if (typeof isPokemonQueuedHatchery !== 'undefined' && typeof window !== 'undefined')
  window.isPokemonQueuedHatchery = isPokemonQueuedHatchery;

