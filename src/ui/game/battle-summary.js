// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function buildBattleSessionCaptureGroups(catches){
  const grouped = {};
  for (const c of catches || []) {
    const key = c.id + '_' + (c.shiny ? 'shiny' : 'normal');
    if (!grouped[key]) grouped[key] = {id: Number(c.id), name: c.name, count: 0, shinyCount: 0, dupeCount: 0, emoji: c.emoji, shiny: !!c.shiny};
    grouped[key].count++;
    if (c.shiny) grouped[key].shinyCount++;
    if (c.dupe) grouped[key].dupeCount++;
  }
  return Object.values(grouped);
}

function getBattleSessionSummaryData(){
  const catches = battle.sessionCatches || [];
  const itemEntries = Object.entries(battle.sessionItems || {}).filter(([, qty]) => Number(qty) > 0);
  const captureGroups = buildBattleSessionCaptureGroups(catches);
  const durationMs = battle.sessionStartedAt ? Math.max(0, Date.now() - battle.sessionStartedAt) : 0;
  const totalItems = itemEntries.reduce((sum, [, qty]) => sum + Number(qty || 0), 0);
  const damageEntries = Object.values(battle.sessionDamageByPokemon || {}).sort((a,b) => (b.damage||0) - (a.damage||0));
  const totalDamage = damageEntries.reduce((sum, entry) => sum + Number(entry.damage || 0), 0);
  return {
    catches,
    itemEntries,
    captureGroups,
    damageEntries,
    totalDamage,
    totalCaptures: catches.length,
    distinctCaptures: captureGroups.length,
    shinyCaptures: catches.filter(c => c && c.shiny).length,
    duplicateCaptures: catches.filter(c => c && c.dupe).length,
    totalItems,
    distinctItems: itemEntries.length,
    wins: Number(battle.sessionWins || 0),
    playerKOs: Number(battle.sessionPlayerKOs || 0),
    durationMs,
  };
}

// The battle-session summary = ONE structured model (labels localized
// here) rendered by the ECS SessionSummaryView — no HTML is hand-built in
// this file anymore, only data + localized labels (+ sprite fragments via
// spriteImg / itemSpriteHtml, still produced by the classic helpers).
function battleSummaryUIModel(){
  const data = getBattleSessionSummaryData();
  const title = t('battle_session_summary_title') || t('loot_summary_title');
  if (battle.isChamp) {
    return { isChamp: true, title, champMsg: t('champ_no_loot') || "Les combats d'arène n'accordent pas de capture de Pokémon sauvage." };
  }

  const formatDuration = typeof formatPlayTime === 'function'
    ? formatPlayTime(data.durationMs)
    : (Math.max(0, Math.floor(data.durationMs / 1000)) + 's');
  const locationLabel = typeof getLocName === 'function' ? getLocName(G.location) : (G.location || '');

  const hasLoot = data.captureGroups.length || data.itemEntries.length;
  return {
    title,
    stats: [
      { value: data.wins, label: t('afk_panel_battles') || 'Combats' },
      { value: data.totalCaptures, label: t('afk_panel_captures') || 'Captures' },
      { value: data.totalItems, label: t('found_items_title') || 'Objets' },
      { value: data.playerKOs, label: t('afk_panel_team_ko') || 'K.O. équipe' },
      { value: formatDuration, label: t('afk_panel_duration') || 'Durée' },
      { value: locationLabel, label: t('tab_info') || 'Lieu' },
    ],
    damage: {
      title: t('battle_team_damage_title') || 'Dégâts de l’équipe',
      rows: data.damageEntries.map((entry) => ({
        spriteHtml: spriteImg(entry.id, entry.emoji || '', { shiny: entry.shiny, size: 30 }),
        name: entry.name,
        valueText: (entry.damage || 0).toLocaleString(),
        pct: data.totalDamage > 0 ? Math.max(2, Math.round((entry.damage / data.totalDamage) * 100)) : 0,
        koCount: entry.kos || 0,
      })),
      emptyLabel: t('battle_summary_no_damage') || (typeof t==='function'?t('battle_summary_no_damage'):'No damage recorded for this session.'),
    },
    captures: {
      title: t('captured_pokemon_title'),
      entries: data.captureGroups.map((a) => ({
        spriteHtml: spriteImg(a.id, a.emoji || '', { shiny: a.shinyCount > 0, size: 40 }),
        shiny: a.shinyCount > 0,
        name: a.name,
        subLabel: a.dupeCount ? `${t('battle_summary_duplicates') || 'Doublons'}: ${a.dupeCount}` : (a.shiny ? (t('battle_summary_shiny') || 'Shiny') : (t('battle_summary_standard') || 'Standard')),
        count: a.count,
      })),
      emptyLabel: t('battle_summary_no_captures') || (typeof t==='function'?t('battle_summary_no_captures'):'No captures during this session.'),
    },
    items: {
      title: t('found_items_title'),
      entries: data.itemEntries.map(([key, qty]) => ({
        iconHtml: itemSpriteHtml(key, 32),
        name: getItemName(key),
        qty,
      })),
      emptyLabel: t('battle_summary_no_items') || (typeof t==='function'?t('battle_summary_no_items'):'No items found during this session.'),
    },
    loot: hasLoot
      ? {
        chips: [
          ...data.captureGroups.map((a) => ({
            html: spriteImg(a.id, a.emoji || '', { shiny: a.shinyCount > 0, size: 40 }),
            title: `${a.name}${a.shinyCount ? ' (Shiny)' : ''}`,
            count: a.count,
          })),
          ...data.itemEntries.map(([key, qty]) => ({
            html: itemSpriteHtml(key, 40),
            title: getItemName(key),
            count: qty,
          })),
        ],
      }
      : { empty: true, emptyLabel: t('no_loot_yet') || 'Aucun butin récolté pour le moment.' },
    restartLabel: t('loot_restart_btn') || 'Relancer le combat immédiatement',
    continueLabel: t('loot_continue_btn') || 'Continuer sur la route',
    closeLabel: t('modal_close_btn') || 'Fermer',
  };
}

function renderBattleSummary(){
  const inner = document.getElementById('battle-summary-inner');
  const inline = document.getElementById('battle-loot-inline');
  if(!inner && !inline) return;
  const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if(!views || typeof views.SessionSummaryView !== 'function') throw new Error('[ui] PokeUI views not loaded (SessionSummaryView)');
  const model = battleSummaryUIModel();
  if (inner) _pwSetHtmlSafe(inner, views.SessionSummaryView.toHTML(model));
  if (inline) _pwSetHtmlSafe(inline, views.SessionSummaryView.inlineHTML(model));
}

function openBattleSummary(_auto){
  renderBattleSummary();
  document.getElementById('battle-summary-modal').classList.add('open');
}

function closeBattleSummary(){
  document.getElementById('battle-summary-modal').classList.remove('open');
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderBattleSummary !== 'undefined') { if (typeof window !== 'undefined') window.renderBattleSummary = renderBattleSummary; if (typeof globalThis !== 'undefined') globalThis.renderBattleSummary = renderBattleSummary; }
if (typeof battleSummaryUIModel !== 'undefined') { if (typeof window !== 'undefined') window.battleSummaryUIModel = battleSummaryUIModel; if (typeof globalThis !== 'undefined') globalThis.battleSummaryUIModel = battleSummaryUIModel; }
if (typeof openBattleSummary !== 'undefined') { if (typeof window !== 'undefined') window.openBattleSummary = openBattleSummary; if (typeof globalThis !== 'undefined') globalThis.openBattleSummary = openBattleSummary; }
if (typeof closeBattleSummary !== 'undefined') { if (typeof window !== 'undefined') window.closeBattleSummary = closeBattleSummary; if (typeof globalThis !== 'undefined') globalThis.closeBattleSummary = closeBattleSummary; }



// --- Exported globals ---
if (typeof buildBattleSessionCaptureGroups !== 'undefined') { if (typeof window !== 'undefined') window.buildBattleSessionCaptureGroups = buildBattleSessionCaptureGroups; if (typeof globalThis !== 'undefined') globalThis.buildBattleSessionCaptureGroups = buildBattleSessionCaptureGroups; }
if (typeof getBattleSessionSummaryData !== 'undefined') { if (typeof window !== 'undefined') window.getBattleSessionSummaryData = getBattleSessionSummaryData; if (typeof globalThis !== 'undefined') globalThis.getBattleSessionSummaryData = getBattleSessionSummaryData; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderBattleSummary,
  battleSummaryUIModel,
  openBattleSummary,
  closeBattleSummary,
  buildBattleSessionCaptureGroups,
  getBattleSessionSummaryData,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('openBattleSummary', openBattleSummary); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('closeBattleSummary', closeBattleSummary); } catch (_) {} }
