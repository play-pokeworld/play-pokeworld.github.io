// ============================================================
// TEAM UI — (split from map.js)
// ============================================================
function renderTeamWindow(){
  const el = document.getElementById('team-window-body');
  if(!el) return;
  if(G.team.length===0){
    el.innerHTML=`<div style="text-align:center;padding:20px;color:var(--dim);font-size:12px;">
      ${t('team_empty')}<br><br>
      ${!G.starter?`<button class="hbtn" onclick="chooseStarter()">${t('choose_starter')}</button>`:t('explore_routes')}
    </div>`;
    return;
  }
  const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:6px 8px;border-radius:4px;margin-bottom:6px;color:#ff8a80;font-size:11px;display:flex;align-items:center;gap:6px;">
    <span>🔒</span><span>${t('battle_lock_team')}</span>
  </div>` : '';
  
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  el.innerHTML = renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p, i) => {
    if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
    if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const itm = p.heldItem ? ITEMS[p.heldItem] : null;
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, p.xp - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    const xpPct = clamp(Math.floor((xpInLevel / xpReqLevel) * 100), 0, 100);
    return `<div class="poke-card" draggable="true"
        style="padding:6px;margin-bottom:6px;cursor:pointer;${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.06);':''}"
        ondragstart="onTeamDragStart(event,${i})"
        ondragover="onTeamDragOver(event)"
        ondragleave="onTeamDragLeave(event)"
        ondrop="onTeamDrop(event,${i})"
        onclick="onTeamCardClick(event,${i})"
        oncontextmenu="event.preventDefault(); openPokeModal(${i}); return false;"
        title="Clic: échanger avec boîte | Clic Droit: fiche">
      <div class="poke-card-top" style="gap:6px;">
        <div class="poke-sprite${isShiny?' is-shiny':''}" style="width:34px;height:34px;font-size:15px;background:${TYPE_COLORS[p.type1]||'#333'}22;border:2px solid ${isShiny?'var(--yellow)':TYPE_COLORS[p.type1]}">${spriteImg(p.id,p.emoji,{shiny:isShiny,size:30})}</div>
        <div class="poke-info" style="min-width:0;flex:1;">
          <div class="poke-name" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isShiny?'✨ ':''}${p.name} <span style="font-size:10px;color:var(--dim)">${lang==='en'?'Lv.':'Nv.'}${p.level}</span></div>
          <div style="font-size:10px;color:${itm?'var(--gold)':'var(--dim)'};margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🎒 ${itm ? itm.icon + ' ' + getItemName(p.heldItem) : (lang==='en'?'No item':'Aucun objet')}</div>
          <div style="height:3px;width:100%;background:#1a1412;border-radius:1.5px;overflow:hidden;margin-top:4px;" title="XP: ${xpInLevel}/${xpReqLevel}">
            <div style="width:${xpPct}%;background:var(--purple);height:100%;"></div>
          </div>
          <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:4px;">
            ${(p.moves||[]).map(m=>{
              const mv = MOVES[m.id];
              return `<span style="background:${TYPE_COLORS[mv?.type]||'#444'};color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;">${getMoveName(m.id)}</span>`;
            }).join('')}
          </div>
        </div>
        <button class="hbtn" style="padding:2px 6px;font-size:10px;" onclick="event.stopPropagation();openPokeModal(${i})" title="Fiche">📋</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// LOCATION INFO TAB
// ============================================================

function renderTeamPresetsToolbar(){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
  return `<div style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.3);padding:6px;border-radius:6px;margin-bottom:8px;border:1px solid #3a322c;flex-wrap:wrap;">
    <span style="font-size:10px;color:var(--gold);font-weight:bold;">📑 ${lang==='en'?'Presets:':'Presets :'}</span>
    ${['preset1','preset2','preset3'].map((pk, idx) => {
      const active = G.activePresetId === pk;
      const count = (G.teamPresets[pk]?.uids || []).length;
      return `<div style="display:flex;align-items:center;gap:2px;"><button class="hbtn" style="padding:3px 6px;font-size:10px;${active?'background:var(--accent);border-color:#ff8a80;':''}" onclick="loadTeamFromPreset('${pk}')" title="Charger ${G.teamPresets[pk]?.name}">#${idx+1} (${count})</button>
      <button class="hbtn" style="padding:2px 5px;font-size:9px;color:var(--dim);" onclick="saveCurrentTeamToPreset('${pk}')" title="Sauvegarder l'équipe actuelle">💾</button></div>`;
    }).join('')}
  </div>`;
}

function renderPokeCard(p, i){
  if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
  if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
  const curLevelBase = xpForLevel(p.level);
  const xpInLevel = Math.max(0, p.xp - curLevelBase);
  const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
  const itmKey=p.heldItem;
  const itm=(itmKey && ITEMS[itmKey]) ? {...ITEMS[itmKey], name:getItemName(itmKey), desc:getItemDesc(itmKey)} : null;
  const heldHtml=itm
    ? `<div style="font-size:10px;color:var(--gold);margin-top:2px">🎒 ${itm.icon} ${itm.name}</div>`
    : `<div style="font-size:10px;color:var(--dim);margin-top:2px">🎒 Aucun objet</div>`;
  const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
  return `<div class="poke-card" draggable="true"
      style="${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.06);box-shadow:0 0 8px rgba(255,215,0,0.3);':''}"
      ondragstart="onTeamDragStart(event,${i})"
      ondragover="onTeamDragOver(event)"
      ondragleave="onTeamDragLeave(event)"
      ondrop="onTeamDrop(event,${i})"
      onclick="onTeamCardClick(event,${i})"
      oncontextmenu="event.preventDefault(); openPokeModal(${i}); return false;"
      title="Clic: échanger avec boîte | Clic Droit: voir la fiche">
    <div class="poke-card-top">
      <div class="poke-sprite${isShiny?' is-shiny':''}" style="background:${TYPE_COLORS[p.type1]||'#333'}22;border:2px solid ${isShiny?'var(--yellow)':TYPE_COLORS[p.type1]}">${spriteImg(p.id,p.emoji,{shiny:isShiny,size:40})}</div>
      <div class="poke-info">
        <div class="poke-name">${isShiny?'<span class="shiny-tag" title="Forme Shiny">✨</span>':''}${p.name} <span style="color:var(--dim);font-size:10px">Nv.${p.level}</span></div>
        <div style="margin-top:2px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
        ${heldHtml}
      </div>
      <button class="hbtn" style="padding:3px 8px;font-size:11px" onclick="event.stopPropagation();openPokeModal(${i})" title="Sheet">${t("fiche_btn")}</button>
    </div>
    <div style="font-size:10px;color:var(--dim);margin-top:4px">XP: ${xpInLevel}/${xpReqLevel} · <span style="color:var(--dim)">Glisser réordonner · Clic échanger · Clic Droit Fiche</span></div>
  </div>`;
}

function aliveCount(){return G.team.filter(p=>p.currentHP>0).length;}

function firstAlive(){return G.team.findIndex(p=>p.currentHP>0);}


