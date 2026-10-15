// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function useRareCandy(teamIdx) {
  if ((G.inventory['rarecandy'] || 0) < 1) return;
  const p = G.team[teamIdx];
  if (!p) return;
  G.inventory['rarecandy']--;
  if (G.inventory['rarecandy'] <= 0) delete G.inventory['rarecandy'];
  levelUp(p);
  saveGame();
  notify(tr('m.save.10', { p0: p.name, p1: p.level }), 'var(--accent)');
  updateHeader();
  renderTeamWindow();

  if (document.getElementById('poke-modal')?.classList.contains('open')) {
    openPokeModal(teamIdx);
  }

  const fsModal = document.getElementById('fullscreen-panel-modal');
  if (fsModal && fsModal.style.display === 'flex') {
    const fsContent = document.getElementById('fs-panel-content');
    if (fsContent) {
      const fsTitle = document.getElementById('fs-panel-title');
      if (fsTitle && (fsTitle.textContent.includes('Sac') || fsTitle.textContent.includes('Bag'))) {
        renderInventory(fsContent);
      }
    }
  }

  onInventoryClick('rarecandy');
}

function useBoxRareCandy(boxId) {
  if ((G.inventory['rarecandy'] || 0) < 1) return;
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if (!p) return;
  G.inventory['rarecandy']--;
  if (G.inventory['rarecandy'] <= 0) delete G.inventory['rarecandy'];
  levelUp(p);
  saveGame();
  notify(tr('m.save.9', { p0: p.name, p1: p.level }), 'var(--accent)');
  updateHeader();
  renderTeamWindow();

  const fsModal = document.getElementById('fullscreen-panel-modal');
  if (fsModal && fsModal.style.display === 'flex') {
    const fsContent = document.getElementById('fs-panel-content');
    if (fsContent) {
      const fsTitle = document.getElementById('fs-panel-title');
      if (fsTitle && (fsTitle.textContent.includes('Sac') || fsTitle.textContent.includes('Bag'))) {
        renderInventory(fsContent);
      }
    }
  }

  onInventoryClick('rarecandy');
}

function copyExportText() {
  const ta = document.getElementById('export-textarea');
  if (!ta) return;
  ta.select();
  ta.setSelectionRange(0, 999999);
  let copied = false;
  try {
    if (document.execCommand && document.execCommand('copy')) {
      copied = true;
    }
  } catch (_) {}
  if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(ta.value)
      .then(() => {
        notify(t('m.save.8'), 'var(--green)');
      })
      .catch(() => {
        notify(t('m.save.7'), 'var(--light2)');
      });
    return;
  }
  if (copied) {
    notify(t('m.save.6'), 'var(--green)');
  } else {
    notify(t('m.save.5'), 'var(--light2)');
  }
}

function exportSave() {
  if (typeof exportActiveMultiSave === 'function') return exportActiveMultiSave();
}

function importSave(event) {
  if (typeof importMultiSave === 'function') return importMultiSave(event);
}

// --- Migrated to ES module, globals exposed ---
if (typeof useRareCandy !== 'undefined') {
  if (typeof window !== 'undefined') window.useRareCandy = useRareCandy;
  if (typeof globalThis !== 'undefined') globalThis.useRareCandy = useRareCandy;
}
if (typeof useBoxRareCandy !== 'undefined') {
  if (typeof window !== 'undefined') window.useBoxRareCandy = useBoxRareCandy;
  if (typeof globalThis !== 'undefined') globalThis.useBoxRareCandy = useBoxRareCandy;
}
if (typeof copyExportText !== 'undefined') {
  if (typeof window !== 'undefined') window.copyExportText = copyExportText;
  if (typeof globalThis !== 'undefined') globalThis.copyExportText = copyExportText;
}
if (typeof exportSave !== 'undefined') {
  if (typeof window !== 'undefined') window.exportSave = exportSave;
  if (typeof globalThis !== 'undefined') globalThis.exportSave = exportSave;
}
if (typeof importSave !== 'undefined') {
  if (typeof window !== 'undefined') window.importSave = importSave;
  if (typeof globalThis !== 'undefined') globalThis.importSave = importSave;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export { useRareCandy, useBoxRareCandy, copyExportText, exportSave, importSave };

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('copyExportText', copyExportText);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('exportSave', exportSave);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('importSave', importSave);
  } catch (_) {}
}

// ── DORM-06 — consommables (vitamines, bouchons, capsules) ───────────────
const _CONS_STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
function _consEnsure(p) {
  if (!p) return;
  if (!p.evs) p.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  if (!p.ivs) p.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}
function applyConsumableToPoke(p, key) {
  const itm = typeof ITEMS !== 'undefined' && ITEMS[key] ? ITEMS[key] : null;
  if (!p || !itm) return false;
  const cat = itm.category;
  if (cat === 'vitamin') {
    // Décision joueur : les vitamines donnent UNIQUEMENT des EV (+1 aléatoire).
    // Les IV se montent via les Capsules (bottle_cap / golden_bottle_cap).
    _consEnsure(p);
    const evCap = Number(globalThis.STAT_EV_CAP) || 18;
    const evTotalCap = Number(globalThis.STAT_EV_TOTAL_CAP) || 36;
    const evTotal = _CONS_STATS.reduce((a, s) => a + (Number(p.evs[s]) || 0), 0);
    const evCands = _CONS_STATS.filter((s) => (p.evs[s] || 0) < evCap && evTotal < evTotalCap);
    if (evCands.length) p.evs[evCands[Math.floor(Math.random() * evCands.length)]]++;
    if (typeof recalcPokeStats === 'function') recalcPokeStats(p);
    return true;
  }
  if (cat === 'iv_boost') {
    _consEnsure(p);
    const ivCap = Number(globalThis.CAPTURE_IV_CAP) || 12;
    const ivCands = _CONS_STATS.filter((s) => (p.ivs[s] || 0) < ivCap);
    if (ivCands.length) p.ivs[ivCands[Math.floor(Math.random() * ivCands.length)]]++;
    if (typeof recalcPokeStats === 'function') recalcPokeStats(p);
    return true;
  }
  if (cat === 'iv_boost_all') {
    _consEnsure(p);
    const ivCapAll = Number(globalThis.CAPTURE_IV_CAP) || 12;
    for (const s of _CONS_STATS) if ((p.ivs[s] || 0) < ivCapAll) p.ivs[s]++;
    if (typeof recalcPokeStats === 'function') recalcPokeStats(p);
    return true;
  }
  if (cat === 'ability_reroll') {
    if (typeof getSpeciesTalents === 'function') {
      const pool = (getSpeciesTalents(p.id) || []).filter((t) => t !== p.talent);
      if (pool.length) p.talent = pool[Math.floor(Math.random() * pool.length)];
    }
    return true;
  }
  if (cat === 'ability_hidden') {
    const nid = Number(p.id);
    const ha =
      typeof POKEMON_TALENTS !== 'undefined' && POKEMON_TALENTS[nid]
        ? POKEMON_TALENTS[nid].hiddenAbility
        : null;
    if (ha) {
      p.talent = ha;
      // LNT-01: the helper called here before never existed — the species talent
      // registry is `unlockTalentForSpecies` (game-helpers.js).
      try {
        unlockTalentForSpecies(nid, ha);
      } catch (_) {}
    }
    return true;
  }
  return false;
}
function _consConsume() {
  const key = G.pendingItemUseKey;
  if (!key) return false;
  if ((G.inventory[key] || 0) < 1) return false;
  G.inventory[key]--;
  if (G.inventory[key] <= 0) delete G.inventory[key];
  return true;
}
function useConsumableOnTeam(teamIdx) {
  const key = G.pendingItemUseKey;
  if (!key) return;
  const p = G.team[teamIdx];
  if (!p) return;
  if (!_consConsume()) return;
  const ok = applyConsumableToPoke(p, key);
  saveGame();
  notify(tr('consumable_used', { item: getItemName(key), name: p.name }), 'var(--accent)');
  updateHeader();
  renderTeamWindow();
  const fsModal = document.getElementById('fullscreen-panel-modal');
  if (fsModal && fsModal.style.display === 'flex') {
    const fsContent = document.getElementById('fs-panel-content');
    if (fsContent) {
      const fsTitle = document.getElementById('fs-panel-title');
      if (fsTitle && (fsTitle.textContent.includes('Sac') || fsTitle.textContent.includes('Bag')))
        renderInventory(fsContent);
    }
  }
  if (!ok) notify(t('consumable_no_effect'), 'var(--red)');
  G.pendingItemUseKey = null;
}
function useConsumableOnBox(boxId) {
  const key = G.pendingItemUseKey;
  if (!key) return;
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if (!p) return;
  if (!_consConsume()) return;
  const ok = applyConsumableToPoke(p, key);
  saveGame();
  notify(tr('consumable_used', { item: getItemName(key), name: p.name }), 'var(--accent)');
  updateHeader();
  renderTeamWindow();
  const fsModal = document.getElementById('fullscreen-panel-modal');
  if (fsModal && fsModal.style.display === 'flex') {
    const fsContent = document.getElementById('fs-panel-content');
    if (fsContent) {
      const fsTitle = document.getElementById('fs-panel-title');
      if (fsTitle && (fsTitle.textContent.includes('Sac') || fsTitle.textContent.includes('Bag')))
        renderInventory(fsContent);
    }
  }
  if (!ok) notify(t('consumable_no_effect'), 'var(--red)');
  G.pendingItemUseKey = null;
}
if (typeof applyConsumableToPoke !== 'undefined') {
  if (typeof window !== 'undefined') window.applyConsumableToPoke = applyConsumableToPoke;
  if (typeof globalThis !== 'undefined') globalThis.applyConsumableToPoke = applyConsumableToPoke;
}
if (typeof useConsumableOnTeam !== 'undefined') {
  if (typeof window !== 'undefined') window.useConsumableOnTeam = useConsumableOnTeam;
  if (typeof globalThis !== 'undefined') globalThis.useConsumableOnTeam = useConsumableOnTeam;
}
if (typeof useConsumableOnBox !== 'undefined') {
  if (typeof window !== 'undefined') window.useConsumableOnBox = useConsumableOnBox;
  if (typeof globalThis !== 'undefined') globalThis.useConsumableOnBox = useConsumableOnBox;
}
