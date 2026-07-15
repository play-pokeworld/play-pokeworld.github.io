function renderBattleSummary(){
  const el = document.getElementById('battle-summary-content');
  const inline = document.getElementById('battle-loot-inline');

  let html = '';
  let inlineHtml = '';

  if (!battle.isChamp) {
    const catches = battle.sessionCatches || [];
    const itemKeys = Object.keys(battle.sessionItems || {});

    if (catches.length || itemKeys.length) {
      
      const agg = {};
      for (const c of catches) {
        const key = c.id + '_' + (c.shiny ? 'shiny' : 'normal');
        if (!agg[key]) agg[key] = {id: Number(c.id), name: c.name, count: 0, shinyCount: 0, dupeCount: 0, emoji: c.emoji, shiny: !!c.shiny};
        agg[key].count++;
        if (c.shiny) agg[key].shinyCount++;
        if (c.dupe) agg[key].dupeCount++;
      }

      
      for (const id in agg) {
        const a = agg[id];
        inlineHtml += `<div class="loot-item" title="${a.name}${a.shinyCount ? ' (Shiny)' : ''}">
          ${spriteImg(a.id, a.emoji || "", {shiny: a.shinyCount > 0, size: 40})}
          ${a.count > 1 ? `<span class="loot-count">&times;${a.count}</span>` : ''}
        </div>`;
      }

      
      for (const k of itemKeys) {
        const itm = ITEMS[k];
        const qty = battle.sessionItems[k];
        inlineHtml += `<div class="loot-item" title="${getItemName(k)}">
          ${itemSpriteHtml(k, 40)}
          ${qty > 1 ? `<span class="loot-count">&times;${qty}</span>` : ''}
        </div>`;
      }

      
      html = `<div class="extracted-template-style-159">${t('captured_pokemon_title')}</div>`;
      html += `<div class="extracted-template-style-160">`;
      for (const id in agg) {
        const a = agg[id];
        html += `<div>
          <div class="extracted-template-style-161">${spriteImg(a.id, a.emoji || '', {shiny: a.shinyCount > 0, size: 40})}</div>
          <div class="extracted-template-style-088">
            <div class="extracted-template-style-162">${a.shinyCount ? '<span class="extracted-template-style-163">★</span>' : ''}${a.name}</div>
            ${a.dupeCount ? `<div class="extracted-template-style-090">Doublons: ${a.dupeCount}</div>` : ''}
          </div>
          <div class="extracted-template-style-164">&times;${a.count}</div>
        </div>`;
      }
      html += `</div>`;

      if (itemKeys.length) {
        html += `<div class="extracted-template-style-159">${t('found_items_title')}</div>`;
        html += `<div class="extracted-template-style-165">`;
        for (const k of itemKeys) {
          const itm = ITEMS[k];
          const qty = battle.sessionItems[k];
          html += `<div class="extracted-template-style-166">
            ${itemSpriteHtml(k, 32)}
            <div>
              <div class="extracted-template-style-167">${getItemName(k)}</div>
              <div class="extracted-template-style-090">&times;${qty}</div>
            </div>
          </div>`;
        }
        html += `</div>`;
      }
    } else {
      html = `<div class="extracted-template-style-103">Aucun butin pour le moment</div>`;
      inlineHtml = `<div class="extracted-template-style-103">Aucun butin pour le moment</div>`;
    }
  } else {
    html = `<div class="extracted-template-style-103">Les combats de champion ne donnent pas de butin.</div>`;
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


// --- Migrated to ES module, globals exposed ---
if (typeof renderBattleSummary !== 'undefined' && typeof window !== 'undefined') window.renderBattleSummary = renderBattleSummary;
if (typeof openBattleSummary !== 'undefined' && typeof window !== 'undefined') window.openBattleSummary = openBattleSummary;
if (typeof closeBattleSummary !== 'undefined' && typeof window !== 'undefined') window.closeBattleSummary = closeBattleSummary;

export {};
