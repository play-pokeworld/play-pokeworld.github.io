// ============================================================
// BOX UI — (split from map.js)
// ============================================================
function renderBox(el){
  const entries=boxedEntries();
  const swap=(_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);
  const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:8px 12px;border-radius:6px;margin-bottom:10px;color:#ff8a80;font-size:11px;display:flex;align-items:center;gap:8px;">
    <span style="font-size:16px;">🔒</span>
    <span>${t('battle_lock_box')}</span>
  </div>` : '';
  if(!entries.length){
    el.innerHTML= battleLockBanner + `<div style="text-align:center;padding:40px;color:var(--dim)">
      ${t('box_empty')}
    </div>${swap?`<div style="text-align:center;margin-top:10px"><button class="hbtn" onclick="cancelBoxSwap()">${t('finish_btn')}</button></div>`:''}`;
    return;
  }
  const header=swap
    ? `<div class="loc-sub" style="margin-bottom:8px">${t('box_swap_header')} <b>${G.team[_swapFromTeamIdx]?.name}</b>. <button class="hbtn" style="margin-left:6px" onclick="cancelBoxSwap()">✕</button></div>`
    : `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span class="loc-sub">📦 ${entries.length} ${t('box_header')}</span>
        <button class="hbtn" style="padding:4px 8px;font-size:11px;background:var(--blue);color:#fff;font-weight:bold;" onclick="openUnifiedSelectorModal('box_view')">🔍 ${typeof G!=='undefined'&&G&&G.lang==='en'?'Full-Screen PC Box':'Agrandir la Boîte'}</button>
      </div>`;
  el.innerHTML= battleLockBanner + `${header}
  <div class="box-grid">
    ${entries.map(({id, cleanId, poke})=>{
      const isShiny = poke.shinyUnlocked || poke.shinyActive || poke.shiny || isSpeciesShiny(poke.id);
      return `
    <div class="box-card" style="cursor:pointer;${isShiny?'border:1px solid var(--yellow);background:rgba(255,215,0,0.06);box-shadow:0 0 8px rgba(255,215,0,0.3);':''}" onclick="openBoxPokeModal('${id}')" oncontextmenu="event.preventDefault(); openBoxPokeModal('${id}'); return false;" title="Clic ou Clic Droit pour voir la fiche">
      <div class="ab-icon${isShiny?' shiny-spark is-shiny':''}">${spriteImg(poke.id,poke.emoji,{shiny:isShiny,size:44})}</div>
      <div style="font-weight:bold;font-size:12px">${isShiny?'<span class="shiny-tag" title="Forme Shiny">✨</span>':''}${poke.name}</div>
      <div style="font-size:10px;color:var(--dim)">Nv.${poke.level}</div>
      <div class="box-actions" onclick="event.stopPropagation()">
        <button class="hbtn" style="padding:3px 6px;font-size:11px" onclick="openBoxPokeModal('${id}')" title="Sheet">${t("fiche_btn")}</button>
        ${swap
          ? `<button class="hbtn" style="padding:3px 6px;font-size:11px" onclick="swapBoxWithTeam('${id}')" ${battle.active?'disabled title="Combat en cours"':''}>${t("swap_btn")}</button>`
          : `<button class="hbtn" style="padding:3px 6px;font-size:11px" onclick="addBoxedToTeam('${id}')" ${G.team.length>=6||battle.active?'disabled':''}>${t("team_btn")}</button>`}
      </div>
    </div>`;
    }).join('')}
  </div>`;
}


function addBoxedToTeam(id){
  if(battle.active){
    notify("🔒 Action impossible en combat : quittez le combat d'abord !", "var(--red)");
    return;
  }
  const poke=G.collection[id] || G.collection[String(id)];
  if(!poke) return;
  if(G.team.length>=6){
    setMsg('❌ Votre équipe est déjà pleine (6/6). Retirez un Pokémon d\'abord.');
    return;
  }
  if(G.team.some(p=>Number(p.id)===Number(poke.id))){
    setMsg('❌ Espèce déjà dans l\'équipe.');
    return;
  }
  // retire l'item éventuel (boîte = pas d'item actif)
  poke.heldItem = null;
  // supprime de la collection avec la bonne clé
  delete G.collection[id];
  delete G.collection[String(id)];
  for(const k of Object.keys(G.collection)){ if(G.collection[k]===poke) delete G.collection[k]; }
  G.team.push(poke);
  notify(`${poke.name} rejoint votre équipe !`);
  showTab('box');
  renderTeamWindow();
  saveGame();
}



function swapBoxWithTeam(id){
  if(battle.active){
    notify("🔒 Action impossible en combat : quittez le combat d'abord !", "var(--red)");
    return;
  }
  const idx=_swapFromTeamIdx;
  if(idx==null||!G.team[idx]) return cancelBoxSwap();
  const boxed=G.collection[id] || G.collection[String(id)];
  if(!boxed) return;
  const teamP=G.team[idx];
  const slotItem = teamP.heldItem || null;
  // le sortant perd son item
  teamP.heldItem = null;
  // l'entrant prend l'item du slot
  if(boxed.heldItem && boxed.heldItem !== slotItem){
    // rend l'item de boîte à l'inventaire, sécurité
    try{ addToInventory(boxed.heldItem,1); }catch(_){}
  }
  boxed.heldItem = slotItem;
  // anti-doublon équipe
  const incomingSpecies = Number(boxed.id);
  const duplicateInTeam = G.team.some((tp,ti)=>ti!==idx && Number(tp.id)===incomingSpecies);
  if(duplicateInTeam){
    setMsg('❌ Espèce déjà présente dans l\'équipe.');
    teamP.heldItem = slotItem;
    boxed.heldItem = null;
    return;
  }
  // --- correction clé collection ---
  // supprime l'entrée boxed
  delete G.collection[id];
  delete G.collection[String(id)];
  // supprime aussi toute référence à l'objet boxed (sécurité)
  for(const k of Object.keys(G.collection)){
    if(G.collection[k] === boxed) delete G.collection[k];
  }
  // insère le sortant sous SA propre clé espèce
  const outId = Number(teamP.id);
  if(G.collection[outId] || G.collection[String(outId)]){
    // collision inattendue : annule
    setMsg('❌ Conflit boîte.');
    teamP.heldItem = slotItem;
    boxed.heldItem = null;
    // restore boxed
    G.collection[incomingSpecies] = boxed;
    return;
  }
  G.collection[outId] = teamP;
  // teamP en boîte = pas d'item
  teamP.heldItem = null;
  // place l'entrant en équipe
  G.team[idx] = boxed;
  _swapFromTeamIdx=null;
  notify(`🔁 ${teamP.name} ↔ ${boxed.name}`);
  showTab('box');
  renderTeamWindow();
  saveGame();
}


// Renvoie un Pokémon de l'équipe vers la boîte (bouton "Retirer")

function sendTeamToBox(idx){
  if(G.team.length<=1){ setMsg('❌ Vous devez garder au moins un Pokémon dans l\'équipe.'); return; }
  const p=G.team[idx];
  if(!p) return;
  const pid = Number(p.id);
  if(G.collection[pid] || G.collection[String(pid)]){
    setMsg('❌ Cette espèce est déjà dans la boîte.');
    return;
  }
  // l'item ne suit pas en boîte : on le rend au sac
  if(p.heldItem){
    try{ addToInventory(p.heldItem,1); }catch(_){}
    p.heldItem = null;
  }
  G.collection[pid]=p;
  G.team.splice(idx,1);
  document.getElementById('poke-modal').classList.remove('open');
  notify(`${p.name} est envoyé dans la boîte.`);
  showTab('box');
  saveGame();
}


// Bascule shiny/normal (uniquement si débloqué)

function toggleShinySkin(idx){
  const p=G.team[idx];
  if(!p||!p.shinyUnlocked) return;
  p.shinyActive=!p.shinyActive;
  p.shiny=p.shinyActive;
  saveGame();
  openPokeModal(idx);
}


function statusColor(s){
  return {burn:'#c06030',poison:'#a040a0',badpoison:'#800080',para:'#c0a000',sleep:'#6070c0',freeze:'#4090d0',confuse:'#d060d0'}[s]||'#555';
}

function statusLabel(s){
  return {burn:'🔥BRÛ',poison:'☠️POI',badpoison:'☠️TXQ',para:'⚡PAR',sleep:'💤SOM',freeze:'🧊GEL',confuse:'💫CON'}[s]||s.toUpperCase();
}

