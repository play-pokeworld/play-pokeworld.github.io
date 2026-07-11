// ============================================================
// BATTLE SUMMARY — Loot display PokéChill style
// ============================================================
function renderBattleSummary(){
  const el = document.getElementById('battle-summary-content');
  const inline = document.getElementById('battle-loot-inline');

  let html = '';
  let inlineHtml = '';

  if (!battle.isChamp) {
    const catches = battle.sessionCatches || [];
    const itemKeys = Object.keys(battle.sessionItems || {});

    if (catches.length || itemKeys.length) {
      // Aggregate catches
      const agg = {};
      for (const c of catches) {
        if (!agg[c.id]) agg[c.id] = {id: Number(c.id), name: c.name, count: 0, shinyCount: 0, dupeCount: 0, emoji: c.emoji};
        agg[c.id].count++;
        if (c.shiny) agg[c.id].shinyCount++;
        if (c.dupe) agg[c.id].dupeCount++;
      }

      // Inline loot (sprites only, compact)
      for (const id in agg) {
        const a = agg[id];
        inlineHtml += `<div class="loot-item" title="${a.name}${a.shinyCount ? ' (Shiny)' : ''}">
          ${spriteImg(a.id, a.emoji || "", {shiny: a.shinyCount > 0, size: 40})}
          ${a.count > 1 ? `<span class="loot-count">×${a.count}</span>` : ''}
        </div>`;
      }

      // Items inline
      for (const k of itemKeys) {
        const itm = ITEMS[k];
        const qty = battle.sessionItems[k];
        inlineHtml += `<div class="loot-item" title="${getItemName(k)}">
          ${itemSpriteHtml(k, 40)}
          ${qty > 1 ? `<span class="loot-count">×${qty}</span>` : ''}
        </div>`;
      }

      // Full summary HTML (for modal)
      html = `<div style="font-size: 13px;color:var(--light2);font-weight:bold;margin-bottom:8px;">Pokémon capturés :</div>`;
      html += `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">`;
      for (const id in agg) {
        const a = agg[id];
        html += `<div style="display:flex;align-items:center;gap:10px;background:var(--dark3);border-radius:6px;padding:8px;border:1px solid ${a.shinyCount ? 'var(--light2)' : 'var(--light1)'};">
          <div style="width:40px;height:40px;">${spriteImg(a.id, a.emoji || '', {shiny: a.shinyCount > 0, size: 40})}</div>
          <div style="flex:1;">
            <div style="font-weight:bold;font-size:13px;color:var(--light2);">${a.shinyCount ? '<span style="color:var(--light2);margin-right:4px;">★</span>' : ''}${a.name}</div>
            ${a.dupeCount ? `<div style="font-size:13px;color:var(--light1);">Doublons: ${a.dupeCount}</div>` : ''}
          </div>
          <div style="background:var(--light1);color:var(--dark1);font-weight:bold;padding:4px 10px;border-radius:4px;font-size: 13px;">×${a.count}</div>
        </div>`;
      }
      html += `</div>`;

      if (itemKeys.length) {
        html += `<div style="font-size: 13px;color:var(--light2);font-weight:bold;margin-bottom:8px;">Objets trouvés :</div>`;
        html += `<div style="display:flex;flex-wrap:wrap;gap:8px;">`;
        for (const k of itemKeys) {
          const itm = ITEMS[k];
          const qty = battle.sessionItems[k];
          html += `<div style="display:flex;align-items:center;gap:8px;background:var(--dark3);border-radius:6px;padding:8px;border:1px solid var(--light1);">
            ${itemSpriteHtml(k, 32)}
            <div>
              <div style="font-weight:bold;font-size: 13px;color:var(--light2);">${getItemName(k)}</div>
              <div style="font-size:13px;color:var(--light1);">×${qty}</div>
            </div>
          </div>`;
        }
        html += `</div>`;
      }
    } else {
      html = `<div style="color:var(--light1);font-size: 13px;">Aucun butin pour le moment</div>`;
      inlineHtml = `<div style="color:var(--light1);font-size: 13px;">Aucun butin pour le moment</div>`;
    }
  } else {
    html = `<div style="color:var(--light1);font-size: 13px;">Les combats de champion ne donnent pas de butin.</div>`;
    inlineHtml = '';
  }

  if (el) el.innerHTML = html;
  if (inline) inline.innerHTML = inlineHtml;
}

function openBattleSummary(auto){
  renderBattleSummary();
  document.getElementById('battle-summary-title').textContent = t('loot_summary_title');
  document.getElementById('battle-summary-modal').classList.add('open');
}

function closeBattleSummary(){
  document.getElementById('battle-summary-modal').classList.remove('open');
}
