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

function renderBattleSummary(){
  const el = document.getElementById('battle-summary-content');
  const inline = document.getElementById('battle-loot-inline');
  if(!el && !inline) return;

  let html = '';
  let inlineHtml = '';

  if (!battle.isChamp) {
    const data = getBattleSessionSummaryData();

    if (data.captureGroups.length || data.itemEntries.length) {
      for (const a of data.captureGroups) {
        inlineHtml += `<div class="loot-item" title="${a.name}${a.shinyCount ? ' (Shiny)' : ''}">
          ${spriteImg(a.id, a.emoji || '', {shiny: a.shinyCount > 0, size: 40})}
          ${a.count > 1 ? `<span class="loot-count">&times;${a.count}</span>` : ''}
        </div>`;
      }
      for (const [key, qty] of data.itemEntries) {
        inlineHtml += `<div class="loot-item" title="${getItemName(key)}">
          ${itemSpriteHtml(key, 40)}
          ${qty > 1 ? `<span class="loot-count">&times;${qty}</span>` : ''}
        </div>`;
      }
    } else {
      inlineHtml = `<div class="extracted-template-style-103">${t('no_loot_yet') || 'Aucun butin récolté pour le moment.'}</div>`;
    }

    const formatDuration = typeof formatPlayTime === 'function'
      ? formatPlayTime(data.durationMs)
      : (Math.max(0, Math.floor(data.durationMs / 1000)) + 's');
    const locationLabel = typeof getLocName === 'function' ? getLocName(G.location) : (G.location || '');

    html += `<div class="battle-session-summary-grid">
      <div class="battle-session-summary-stat"><b>${data.wins}</b><span>${t('afk_panel_battles') || 'Combats'}</span></div>
      <div class="battle-session-summary-stat"><b>${data.totalCaptures}</b><span>${t('afk_panel_captures') || 'Captures'}</span></div>
      <div class="battle-session-summary-stat"><b>${data.totalItems}</b><span>${t('found_items_title') || 'Objets'}</span></div>
      <div class="battle-session-summary-stat"><b>${data.playerKOs}</b><span>${t('afk_panel_team_ko') || 'K.O. équipe'}</span></div>
      <div class="battle-session-summary-stat"><b>${formatDuration}</b><span>${t('afk_panel_duration') || 'Durée'}</span></div>
      <div class="battle-session-summary-stat"><b>${locationLabel}</b><span>${t('tab_info') || 'Lieu'}</span></div>
    </div>`;

    html += `<div class="battle-summary-section-title">${t('battle_team_damage_title') || 'Dégâts de l’équipe'}</div>`;
    if (data.damageEntries.length) {
      html += `<div class="battle-damage-summary-list">`;
      for (const entry of data.damageEntries) {
        const pct = data.totalDamage > 0 ? Math.max(2, Math.round((entry.damage / data.totalDamage) * 100)) : 0;
        html += `<div class="battle-damage-row">
          <div class="battle-damage-head">
            <div class="battle-damage-poke">${spriteImg(entry.id, entry.emoji || '', {shiny: entry.shiny, size: 30})}<b>${entry.name}</b></div>
            <div class="battle-damage-values"><span>${entry.damage.toLocaleString()}</span><small>${pct}%${entry.kos ? ` · ${entry.kos} KO` : ''}</small></div>
          </div>
          <div class="battle-damage-bar"><div class="battle-damage-fill" data-pct="${pct}"></div></div>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="battle-summary-empty">${t('battle_summary_no_damage') || 'Aucun dégât enregistré pour cette session.'}</div>`;
    }

    html += `<div class="battle-summary-section-title">${t('captured_pokemon_title')}</div>`;
    if (data.captureGroups.length) {
      html += `<div class="extracted-template-style-160">`;
      for (const a of data.captureGroups) {
        html += `<div class="battle-summary-entry ${a.shinyCount ? 'is-shiny' : 'is-normal'}">
          <div class="extracted-template-style-161">${spriteImg(a.id, a.emoji || '', {shiny: a.shinyCount > 0, size: 40})}</div>
          <div class="extracted-template-style-088">
            <div class="extracted-template-style-162">${a.shinyCount ? '<span class="extracted-template-style-163">★</span>' : ''}${a.name}</div>
            <div class="extracted-template-style-090">${a.dupeCount ? `${t('battle_summary_duplicates') || 'Doublons'}: ${a.dupeCount}` : (a.shiny ? (t('battle_summary_shiny') || 'Shiny') : (t('battle_summary_standard') || 'Standard'))}</div>
          </div>
          <div class="extracted-template-style-164">&times;${a.count}</div>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="battle-summary-empty">${t('battle_summary_no_captures') || 'Aucune capture pendant cette session.'}</div>`;
    }

    html += `<div class="battle-summary-section-title">${t('found_items_title')}</div>`;
    if (data.itemEntries.length) {
      html += `<div class="extracted-template-style-165">`;
      for (const [key, qty] of data.itemEntries) {
        html += `<div class="extracted-template-style-166 battle-summary-entry is-normal">
          ${itemSpriteHtml(key, 32)}
          <div>
            <div class="extracted-template-style-167">${getItemName(key)}</div>
            <div class="extracted-template-style-090">&times;${qty}</div>
          </div>
        </div>`;
      }
      html += `</div>`;
    } else {
      html += `<div class="battle-summary-empty">${t('battle_summary_no_items') || 'Aucun objet trouvé pendant cette session.'}</div>`;
    }
  } else {
    html = `<div class="extracted-template-style-103">${t('champ_no_loot') || "Les combats d'arène n'accordent pas de capture de Pokémon sauvage."}</div>`;
    inlineHtml = '';
  }

  if (el) el.innerHTML = html;
  if (inline) inline.innerHTML = inlineHtml;
}

function openBattleSummary(auto){
  renderBattleSummary();
  document.getElementById('battle-summary-title').textContent = t('battle_session_summary_title') || t('loot_summary_title');
  document.getElementById('battle-summary-modal').classList.add('open');
}

function closeBattleSummary(){
  document.getElementById('battle-summary-modal').classList.remove('open');
}
