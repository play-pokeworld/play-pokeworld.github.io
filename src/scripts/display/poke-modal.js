// ============================================================
// POKE MODAL — (split from map.js)
// ============================================================
function buildTalentSelectorHtml(p, idx, boxId){
  const nid = Number(p.id);
  const tals = getSpeciesTalents(nid);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(!G.unlockedTalents) G.unlockedTalents = {};
  if(!G.unlockedTalents[nid]) G.unlockedTalents[nid] = [tals[0]];
  if(p.talent && !G.unlockedTalents[nid].includes(p.talent)) G.unlockedTalents[nid].push(p.talent);

  const uniqueTals = [];
  tals.forEach((tal, ti) => {
    if(!uniqueTals.some(x => x.tal === tal)){
      const isHid = ti === 2 && tals[0] !== tal && tals[1] !== tal;
      uniqueTals.push({tal, isHid});
    }
  });

  return `<div style="background:#181412;border-radius:6px;padding:8px;margin-bottom:10px;border:1px solid #4a3c2a;">
    <div style="font-size:11px;color:var(--gold);font-weight:bold;margin-bottom:4px;">🧬 ${lang==='en'?'Abilities / Talents':'Talents du Pokémon'}</div>
    <select onmousedown="event.stopPropagation()" onchange="changePokeTalent(${idx!=null?idx:'null'}, '${boxId||''}', this.value)" style="width:100%;background:#0c0a09;color:#fff;border:1px solid var(--accent);padding:6px;border-radius:4px;font-size:12px;margin-bottom:4px;cursor:pointer;">
      ${uniqueTals.map(item => {
        const {tal, isHid} = item;
        const unlocked = (G.unlockedTalents?.[nid] || []).includes(tal);
        const talName = getTalentName(tal);
        const tag = isHid ? (lang==='en' ? 'Hidden Talent ✨' : 'Talent Caché ✨') : (lang==='en' ? 'Normal Talent' : 'Talent Normal');
        if(!unlocked){
          return `<option value="" disabled>🔒 ${talName} [${tag}] — (${lang==='en'?'Locked: Farm/catch to unlock':'Verrouillé : à capturer pour débloquer'})</option>`;
        }
        return `<option value="${tal}" ${p.talent===tal?'selected':''}>✅ ${talName} [${tag}]</option>`;
      }).join('')}
    </select>
    <div style="font-size:11px;color:#ddd;line-height:1.3;">${getTalentDesc(p.talent)}</div>
  </div>`;
}

// ============================================================
// POKEMON MODAL
// ============================================================

function openPokeModal(idx){
  const p=G.team[idx];
  if(!p){ moveEditorFor=null; return; }
  const modal=document.getElementById('poke-modal');
  const inner=document.getElementById('poke-modal-inner');
  const editing=moveEditorFor===idx;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  const moves=p.moves.map((m,mi)=>{
    const mv=MOVES[m.id];
    const mvName = getMoveName(m.id);
    return `<div style="background:var(--bg);border-radius:6px;padding:6px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center">
      <span class="type-badge" style="background:${TYPE_COLORS[mv?.type]||'#888'}">${mv?.type||'?'}</span>
      <span>${mvName}</span>
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv?.pow||'-'} | PP: ${m.pp}/${m.maxPP}</span>
      ${editing?`<button class="hbtn" style="padding:2px 8px;font-size:10px;border-color:var(--red)" onclick="forgetMove(${idx},${mi})">${lang==='en'?'Forget':'Oublier'}</button>`:''}
    </div>`;
  }).join('');

  let learnHtml='';
  if(editing){
    const pool=learnableMoves(p);
    const full=p.moves.length>=4;
    learnHtml=`<div style="font-size:12px;color:var(--dim);margin:10px 0 4px">${lang==='en' ? 'Learnable moves '+(full?'<span style="color:var(--red)">(forget one first)</span>':'') + ':' : 'Capacités apprenables '+(full?'<span style="color:var(--red)">(oubliez-en une d\'abord)</span>':'') + ' :'}</div>
    <div style="max-height:170px;overflow-y:auto">
    ${pool.length?pool.map(id=>{
      const mv=MOVES[id];
      return `<div style="background:var(--card);border-radius:6px;padding:5px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center">
        <span class="type-badge" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
        <span>${getMoveName(id)}</span>
        <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv.pow||'-'}</span>
        <button class="hbtn" style="padding:2px 8px;font-size:10px" ${full?'disabled':''} onclick="learnMove(${idx},'${id}')">${lang==='en'?'Learn':'Apprendre'}</button>
      </div>`;
    }).join(''):`<div style="color:var(--dim);font-size:11px">${lang==='en'?'No other moves available.':'Aucune autre capacité disponible.'}</div>`}
    </div>`;
  }

  const stLabels = lang === 'en' ? ['Max HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'] : ['PV Max','Attaque','Défense','Atk Spé','Déf Spé','Vitesse'];
  const buff=getHeldBuff(p);
  const buffedAtk=Math.floor(p.atk*(1+(buff.atk||0)));
  const buffedDef=Math.floor(p.def*(1+(buff.def||0)));
  const buffedSpe=Math.floor(p.spe*(1+(buff.spe||0)));
  const buffedHP =Math.floor(p.maxHP*(1+(buff.hpMax||0)));
  const showDelta=(base,cur)=> cur>base ? `<span style="color:var(--green);font-size:10px"> +${cur-base}</span>` : '';
  const buffedSpa=Math.floor((p.spa||p.atk)*(1+(buff.spa||0)));
  const buffedSpd=Math.floor((p.spd||p.def)*(1+(buff.spd||0)));
  const stats=[
    [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP],
    [stLabels[1], buffedAtk,200, '#f44336', p.atk],
    [stLabels[2], buffedDef,200, '#2196f3', p.def],
    [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk],
    [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def],
    [stLabels[5], buffedSpe,200, '#ff9800', p.spe],
  ];

  // Held item block
  const itmKey=p.heldItem;
  const itm=(itmKey && ITEMS[itmKey]) ? {...ITEMS[itmKey], name:getItemName(itmKey), desc:getItemDesc(itmKey)} : null;
  const count=itmKey?Math.min(BAG_MAX,G.inventory[itmKey]||0):0;
  const heldBlock=itm
    ? `<div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px">
        <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${lang==='en'?'Equipped Item':'Objet équipé'}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-size:22px">${itm.icon}</div>
          <div style="flex:1">
            <div style="font-weight:bold">${getItemName(itmKey)}</div>
            <div style="font-size:11px;color:var(--dim)">${lang==='en'?'Power:':'Puissance :'} ${count}/${BAG_MAX} — buff ${Math.round(count/BAG_MAX*100)}%</div>
          </div>
          <button class="hbtn" style="padding:3px 8px;font-size:11px;border-color:var(--red)" onclick="unequipItem(${idx})">${lang==='en'?'Remove':'Retirer'}</button>
        </div>
      </div>`
    : `<div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px;text-align:center;color:var(--dim);font-size:11px">
        ${lang==='en'?'No item equipped. Choose one from the 🎒 Bag tab.':'Aucun objet équipé. Choisissez-en un depuis l\'onglet 🎒 Sac.'}
      </div>`;

  inner.innerHTML=`<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:32px" class="${p.shinyActive?'shiny-spark':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:56})}</div>
      <div>
        <div>${p.shinyActive?'<span class="shiny-tag">✨</span>':''}${p.name}</div>
        <div style="font-size:12px;color:var(--dim)">${lang==='en'?'Level':'Niveau'} ${p.level}</div>
        <div style="margin-top:3px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
      </div>
    </div>
    <span class="modal-close" onclick="moveEditorFor=null;document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  ${p.shinyUnlocked?`<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;background:var(--bg);padding:6px 10px;border-radius:6px;cursor:pointer">
    <input type="checkbox" ${p.shinyActive?'checked':''} onchange="toggleShinySkin(${idx})">
    <span>✨ ${lang==='en'?'Shiny Skin':'Skin Shiny'}</span>
    <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Cosmetic switch only':'Bascule d\'apparence uniquement'}</span>
  </label>`:''}
  ${heldBlock}
  ${buildTalentSelectorHtml(p, idx, null)}
  ${getEvolutionMethodsHtml(p.id)}
  <div style="margin-bottom:10px">
    ${stats.map(([l,v,m,c,base], sIdx)=>{
      const keys = ['hp','atk','def','spa','spd','spe'];
      const k = keys[sIdx] || 'hp';
      const ivVal = (p.ivs||{})[k] || 0;
      const evVal = (p.evs||{})[k] || 0;
      return `<div class="stat-row" style="flex-direction:column;align-items:stretch;margin-bottom:8px;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;height:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span class="stat-label" style="font-weight:bold;width:auto;">${l}</span>
          <span class="stat-val" style="width:auto;">${v}${showDelta(base,v)}</span>
        </div>
        <div class="stat-bar" style="margin-bottom:4px;"><div class="stat-fill" style="width:${Math.min(100,v/m*100)}%;background:${c}"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#bbb;">
          <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
          <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
        </div>
      </div>`;
    }).join('')}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-size:12px;color:var(--dim)">${t('moves_lbl')}</span>
    <button class="hbtn" style="padding:3px 10px;font-size:11px" onclick="toggleMoveEditor(${idx})">${editing?t('finish_btn'):t('modify_btn')}</button>
  </div>
  ${moves}
  ${learnHtml}
  ${(() => {
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    return `<div style="font-size:12px;color:var(--dim);margin:8px 0 4px">XP : ${xpInLevel} / ${xpReqLevel} <span style="font-size:10px;">(${p.xp||0} total)</span></div>`;
  })()}
  ${(() => {
    const evos = STONE_EVO[p.id];
    if(!evos) return '';
    let html = `<div style="background:var(--bg);border-radius:8px;padding:8px;margin:8px 0"><div style="font-size:12px;color:var(--gold);margin-bottom:6px">${t('stone_evo_title')}</div><div style="display:flex;flex-wrap:wrap;gap:6px">`;
    for(const [stoneKey, targetId] of Object.entries(evos)){
      const stone = ITEMS[stoneKey];
      const owned = G.inventory[stoneKey]||0;
      const target = PD[targetId];
      const already = speciesOwned(targetId);
      html += `<button class="hbtn" onclick="tryStoneEvo(${idx},'${stoneKey}')" ${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||'🪨'} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ✅':''}</button>`;
    }
    html += '</div></div>';
    return html;
  })()}
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    <button class="hbtn" onclick="sendTeamToBox(${idx})" ${G.team.length<=1?'disabled':''}>${t('to_box_btn')}</button>
  </div>`;

  modal.classList.add('open');
}
