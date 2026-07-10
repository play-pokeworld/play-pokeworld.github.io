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

  // Current moves — clicking a move selects it for replacement (grays it)
  const moves=p.moves.map((m,mi)=>{
    const mv=MOVES[m.id];
    const mvName = getMoveName(m.id);
    const selected = moveReplaceSlot === mi;
    const selStyle = selected ? 'opacity:0.4;border:1px solid var(--red);' : '';
    return `<div style="background:var(--bg);border-radius:6px;padding:6px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center;cursor:pointer;${selStyle}" onclick="toggleMoveSelect(${idx},${mi})" oncontextmenu="event.preventDefault();openMoveInfo('${m.id}',${idx});return false;" title="${lang==='en'?'Click to select for replacement | Right-click for info':'Clic pour sélectionner (remplacement) | Clic droit pour info'}">
      <span class="type-badge" style="background:${TYPE_COLORS[mv?.type]||'#888'}">${mv?.type||'?'}</span>
      <span>${mvName}</span>
      ${selected?'<span style="color:var(--red);font-size:10px;font-weight:bold">⬇ Remplacement</span>':''}
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv?.pow||'-'}</span>
    </div>`;
  }).join('');

  // Learnable moves — ALWAYS shown at the bottom
  const pool=learnableMoves(p);
  const canReplace = moveReplaceSlot !== null;
    const full=p.moves.length>=4 && !canReplace;
    let learnHtml=`<div style="font-size:12px;color:var(--gold);font-weight:bold;margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid #333;">
    📖 ${lang==='en'?'Learnable Moves':'Capacités Apprenables'}
    ${canReplace?'<span style="color:var(--red);font-size:11px;margin-left:6px">'+(lang==='en'?'← Click to replace selected':'← Clic pour remplacer')+'</span>':''}
    ${full?'<span style="color:var(--red);font-size:11px;margin-left:6px">'+(lang==='en'?'(4/4 — select a move above first)':'(4/4 — sélectionnez une attaque ci-dessus)')+'</span>':''}
  </div>
  <div style="max-height:200px;overflow-y:auto">
  ${pool.length?pool.map(id=>{
    const mv=MOVES[id];
    const clickAction = canReplace ? `learnMove(${idx},'${id}')` : (!full ? `learnMove(${idx},'${id}')` : '');
    return `<div style="background:var(--card);border-radius:6px;padding:5px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center;cursor:${clickAction?'pointer':'default'};${canReplace?'border:1px solid var(--green);':''}" ${clickAction?`onclick="${clickAction}"`:''} oncontextmenu="event.preventDefault();openMoveInfo('${id}',${idx});return false;" title="${lang==='en'?'Right-click for info':'Clic droit pour info'}">
      <span class="type-badge" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
      <span>${getMoveName(id)}</span>
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv.pow||'-'}</span>
      ${canReplace?'<span style="color:var(--green);font-size:10px">⬆</span>':(!full?`<span style="color:var(--green);font-size:10px">+</span>`:'')}
    </div>`;
  }).join(''):`<div style="color:var(--dim);font-size:11px;text-align:center;padding:10px">${lang==='en'?'No other moves available.':'Aucune autre capacité disponible.'}</div>`}
  </div>`;

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
    ${moveReplaceSlot!==null?`<button class="hbtn" style="padding:3px 10px;font-size:11px;border-color:var(--red)" onclick="moveReplaceSlot=null;openPokeModal(${idx})">${lang==='en'?'Cancel':'Annuler'}</button>`:''}
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

// ============================================================
// POKE INFO — right-click popup showing Pokémon details (battle use)
// ============================================================
function openPokeInfo(pokeId){
  const pd = PD[pokeId];
  if(!pd) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';
  const inner = document.getElementById('poke-modal-inner');
  if(!inner) return;
  
  const [name, type1, type2, hp, atk, def, spe, moves, emoji] = pd;
  const isShiny = isSpeciesShiny(pokeId);
  
  // Get official moveset if available
  const officialMoves = (typeof POKE_MOVE_POOLS !== 'undefined' && POKE_MOVE_POOLS[pokeId]) ? POKE_MOVE_POOLS[pokeId] : [];
  
  inner.innerHTML = `<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div class="${isShiny?'is-shiny':''}" style="font-size:32px">${spriteImg(pokeId, '', {size:56, shiny:isShiny})}</div>
      <div>
        <div>${isShiny?'<span class="shiny-tag">✨</span>':''}${name}</div>
        <div style="margin-top:3px">${typeSpan(type1)}${type2?typeSpan(type2):''}</div>
        ${isShiny?`<div style="font-size:11px;color:var(--yellow);margin-top:4px;font-weight:bold">${isEn?'✨ Shiny form unlocked/owned!':'✨ Forme Shiny débloquée/possédée !'}</div>`:''}
      </div>
    </div>
    <span class="modal-close" onclick="document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  ${getEvolutionMethodsHtml(pokeId)}
  <div style="margin:10px 0">
    <div class="stat-row"><div class="stat-label">${isEn?'Max HP':'PV Max'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,hp/2)}%;background:var(--green)"></div></div><div class="stat-val">${hp}</div></div>
    <div class="stat-row"><div class="stat-label">${isEn?'Attack':'Attaque'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,atk/2)}%;background:var(--red)"></div></div><div class="stat-val">${atk}</div></div>
    <div class="stat-row"><div class="stat-label">${isEn?'Defense':'Défense'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,def/2)}%;background:var(--blue)"></div></div><div class="stat-val">${def}</div></div>
    <div class="stat-row"><div class="stat-label">${isEn?'Speed':'Vitesse'}</div><div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,spe/2)}%;background:var(--yellow)"></div></div><div class="stat-val">${spe}</div></div>
  </div>
  ${officialMoves.length > 0 ? `
  <div style="font-size:12px;color:var(--dim);margin-bottom:4px">${isEn?'Level-up Moves':'Capacités par niveau'}</div>
  <div style="display:flex;flex-wrap:wrap;gap:4px">
    ${officialMoves.filter(m => MOVES[m]).map(m=>`<span style="background:var(--card);border-radius:4px;padding:3px 8px;font-size:11px">${getMoveName(m)}</span>`).join('')}
  </div>` : ''}
  <div style="text-align:center;margin-top:10px"><button class="hbtn" onclick="document.getElementById('poke-modal').classList.remove('open')">${isEn?'Close':'Fermer'}</button></div>`;
  document.getElementById('poke-modal').classList.add('open');
}

// ============================================================
// MOVE INFO — right-click popup showing move details & effects
// ============================================================
// Store context for back-navigation from move info
var _moveInfoContext = null;

function openMoveInfo(moveId, contextIdx, contextBoxId){
  const mv = MOVES[moveId];
  if(!mv) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';
  const inner = document.getElementById('poke-modal-inner');
  if(!inner) return;
  _moveInfoContext = { idx: contextIdx !== undefined ? contextIdx : null, boxId: contextBoxId || null };
  const name = getMoveName(moveId);
  const type = mv.type || '?';
  const cat = mv.cat === 'phys' ? (isEn?'Physical':'Physique') : mv.cat === 'spec' ? (isEn?'Special':'Spéciale') : (isEn?'Status':'Statut');
  const pow = mv.pow || '—';
  const acc = mv.acc || '—';

  // Build effects description
  const effects = [];
  if(mv.eff === 'burn') effects.push(isEn?'May burn (10%)':'Peut brûler (10%)');
  if(mv.eff === 'para') effects.push(isEn?'May paralyze (30%)':'Peut paralyser (30%)');
  if(mv.eff === 'poison') effects.push(isEn?'May poison':'Peut empoisonner');
  if(mv.eff === 'badpoison') effects.push(isEn?'May badly poison':'Peut gravement empoisonner');
  if(mv.eff === 'sleep') effects.push(isEn?'May cause sleep':'Peut endormir');
  if(mv.eff === 'freeze') effects.push(isEn?'May freeze':'Peut geler');
  if(mv.eff === 'slow') effects.push(isEn?'May lower Speed':'Peut baisser la Vitesse');
  if(mv.eff === 'confuse') effects.push(isEn?'May confuse':'Peut rendre confus');
  if(mv.crit) effects.push(isEn?'High critical hit ratio':'Taux de critique élevé');
  if(mv.recoil) effects.push(isEn?'Causes recoil damage':'Dégâts de recul');
  if(mv.recharge) effects.push(isEn?'Requires recharge next turn':'Recharge nécessaire au tour suivant');
  if(mv.trap) effects.push(isEn?'Traps opponent (2-5 turns)': 'Piège l\'adversaire (2-5 tours)');
  if(mv.heal) effects.push(isEn?`Heals ${mv.heal*100}% HP`:`Soigne ${mv.heal*100}% PV`);
  if(mv.prio) effects.push(isEn?`Priority +${mv.prio}`:`Priorité +${mv.prio}`);
  if(mv.boost) {
    const bst = Object.entries(mv.boost).map(([s,v])=>`${s.toUpperCase()}+${Math.round(v*100)}%`).join(', ');
    effects.push(isEn?`Boosts: ${bst}`:`Boost: ${bst}`);
  }

  const effHtml = effects.length ? effects.map(e=>`<div style="font-size:11px;color:var(--gold);margin:3px 0;">✦ ${e}</div>`).join('') : `<div style="font-size:11px;color:var(--dim)">${isEn?'No special effects':'Aucun effet spécial'}</div>`;
  const typeColor = TYPE_COLORS[type] || '#888';

  inner.innerHTML = `<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <span class="type-badge" style="background:${typeColor};font-size:13px;padding:3px 10px">${type}</span>
      <div>${name}</div>
      <span style="font-size:11px;color:var(--dim)">${cat}</span>
    </div>
    <span class="modal-close" onclick="document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
    <div style="background:var(--card);padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:11px;color:var(--dim)">${isEn?'Power':'Puissance'}</div>
      <div style="font-size:20px;font-weight:bold;color:${pow>80?'var(--gold)':pow==='—'?'var(--dim)':'var(--text)'}">${pow}</div>
    </div>
    <div style="background:var(--card);padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:11px;color:var(--dim)">${isEn?'Accuracy':'Précision'}</div>
      <div style="font-size:20px;font-weight:bold;color:${acc>=90?'var(--green)':'var(--text)'}">${acc}%</div>
    </div>
  </div>
  <div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:10px">
    <div style="font-size:12px;font-weight:bold;color:var(--gold);margin-bottom:6px">${isEn?'Effects':'Effets'}</div>
    ${effHtml}
  </div>
  <div style="display:flex;gap:8px;justify-content:center">
    <button class="hbtn" style="background:var(--blue);color:#fff;font-weight:bold" onclick="if(_moveInfoContext && _moveInfoContext.boxId){openBoxPokeModal(_moveInfoContext.boxId)}else if(_moveInfoContext && _moveInfoContext.idx!==null){openPokeModal(_moveInfoContext.idx)}else{document.getElementById('poke-modal').classList.remove('open')}">← ${isEn?'Back to Pokémon':'Retour au Pokémon'}</button>
    <button class="hbtn" onclick="_moveInfoContext=null;document.getElementById('poke-modal').classList.remove('open')">${isEn?'Close':'Fermer'}</button>
  </div>`;
  document.getElementById('poke-modal').classList.add('open');
}

