// ============================================================
// BATTLE TEAM UI — (split from battle.js)
// ============================================================
function renderBattleTeamRow(){
  const row=document.getElementById('battle-team-row');
  if(!row) return;
  if(battle && battle.isTraining && battle.trainee){
    const p = battle.trainee;
    const pct = (p.currentHP||1) / (p.maxHP||1);
    const nextIdx = (battle.pMoveIdx||0) % (p.moves||[]).length;
    const cdPct = (battle.pCdMax) ? clamp(100 - (battle.pCd/battle.pCdMax*100), 0, 100) : 0;
    const itm = p.heldItem ? ITEMS[p.heldItem] : null;
    row.innerHTML = `<div class="pokechill-row active-hero" style="background: rgba(43, 38, 36, 0.95); border-radius: 8px; padding: 10px; border: 2px solid #ffd700; margin-bottom: 6px; display: flex; gap: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
      <div style="flex: 0 0 95px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 75%); border-radius: 6px; padding: 6px;">
        <div style="height: 75px; display: flex; align-items: center; justify-content: center;">${spriteImg(p.id, p.emoji, {size: 70, shiny: p.shinyActive})}</div>
        <div style="font-size:10px;color:var(--gold);margin-top:4px;font-weight:bold;">🏋️ SOLO TRAINEE</div>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; gap: 8px;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <div>
              <span style="color: #fff; font-weight: bold; font-size: 15px;">${p.name}</span>
              <span style="background: #62584c; color: #eee; font-size: 11px; padding: 1px 6px; border-radius: 3px; font-weight: bold; margin-left: 6px;">lvl ${p.level}</span>
            </div>
            <span style="color: #bbb; font-size: 11px;">${p.currentHP}/${p.maxHP} PV</span>
          </div>
          <div class="battle-hp-bar" style="height: 8px; background: #221e1c; border-radius: 4px; overflow: hidden; border: 1px solid #111;">
            <div class="battle-hp-fill" style="width: ${Math.max(0, pct*100)}%; background: #55a646; height: 100%;"></div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(p.moves||[]).map((m, mi) => {
            const mv = MOVES[m.id];
            if(!mv) return '';
            const isNext = mi === nextIdx;
            return `<div class="hero-move-bar${isNext?' next-up':''}" data-idx="${mi}" style="background: #554e46; border-radius: 4px; height: 24px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; border: 1px solid ${isNext?'#fff':'#3c352d'};">
              <div class="am-bar-fill" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${isNext ? cdPct : 0}%; background: #3db5c8; opacity: 0.6; transition: width 0.1s linear;"></div>
              <span style="color: #fff; font-size: 12px; font-weight: bold; position: relative; z-index: 1;">${getMoveName(m.id)}</span>
              <span style="font-size: 11px; position: relative; z-index: 1; background: ${TYPE_COLORS[mv.type]||'#555'}; padding: 1px 6px; border-radius: 3px; font-weight: bold; color: #fff;">${mv.type}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
    return;
  }
  row.innerHTML=G.team.map((p,i)=>{
    const pct=p.currentHP/p.maxHP;
    const fainted=p.currentHP<=0;
    const active=i===battle.playerPokeIdx;
    const clickable=!fainted&&!active;
    const nextIdx=(battle.pMoveIdx||0)%p.moves.length;
    const cdPct=(active && battle.pCdMax)?clamp(100-(battle.pCd/battle.pCdMax*100),0,100):0;
    const itm = p.heldItem ? ITEMS[p.heldItem] : null;
    const b = getHeldBuff(p);
    const buffBadges = [];
    if(p.status) buffBadges.push(`<span class="battle-status" style="background:${statusColor(p.status)};color:#fff;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:3px;">${statusLabel(p.status)}</span>`);
    if(b.atk || (battle.playerMods && battle.playerMods.atk > 1)) buffBadges.push(`<span style="background:#d32f2f;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">ATK ▲</span>`);
    if(b.def || (battle.playerMods && battle.playerMods.def > 1)) buffBadges.push(`<span style="background:#1976d2;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">DEF ▲</span>`);
    if(b.spe || (battle.playerMods && battle.playerMods.spe > 1)) buffBadges.push(`<span style="background:#f57c00;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">VIT ▲</span>`);
    if(b.hpMax) buffBadges.push(`<span style="background:#388e3c;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">PV ▲</span>`);

    if(active){
      return `<div class="pokechill-row active-hero" style="background: rgba(43, 38, 36, 0.95); border-radius: 8px; padding: 10px; border: 2px solid #ffd700; margin-bottom: 6px; display: flex; gap: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
        <div style="flex: 0 0 95px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 75%); border-radius: 6px; padding: 6px;">
          <div style="height: 75px; display: flex; align-items: center; justify-content: center;">${spriteImg(p.id, p.emoji, {size: 70, shiny: p.shinyActive})}</div>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 3px; margin-top: 6px;">
            ${buffBadges.join('')}
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-width: 0; gap: 8px;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <div>
                <span style="color: #fff; font-weight: bold; font-size: 15px;">${p.shinyActive?'<span style="color:#ff5252" title="Shiny">♦</span> ':''}${p.name}</span>
                <span style="background: #62584c; color: #eee; font-size: 11px; padding: 1px 6px; border-radius: 3px; font-weight: bold; margin-left: 6px;">lvl ${p.level}</span>
                <span style="font-size: 11px; color: ${itm?'var(--gold)':'var(--dim)'}; margin-left: 8px;">🎒 ${itm ? itm.icon + ' ' + getItemName(p.heldItem) : 'Aucun objet'}</span>
              </div>
              <span id="p-hp-text" style="color: #bbb; font-size: 11px;">${p.currentHP}/${p.maxHP} PV</span>
            </div>
            <div class="battle-hp-bar" style="height: 8px; background: #221e1c; border-radius: 4px; overflow: hidden; border: 1px solid #111;">
              <div id="p-hp-fill" class="battle-hp-fill" style="width: ${Math.max(0, pct*100)}%; background: #55a646; height: 100%;"></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${p.moves.map((m, mi) => {
              const mv = MOVES[m.id];
              if(!mv) return '';
              const isNext = mi === nextIdx;
              return `<div class="hero-move-bar${isNext?' next-up':''}" data-idx="${mi}" style="background: #554e46; border-radius: 4px; height: 24px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; border: 1px solid ${isNext?'#fff':'#3c352d'};">
                <div class="am-bar-fill" style="position: absolute; left: 0; top: 0; bottom: 0; width: ${isNext ? cdPct : 0}%; background: #3db5c8; opacity: 0.6; transition: width 0.1s linear;"></div>
                <span style="color: #fff; font-size: 12px; font-weight: bold; position: relative; z-index: 1;">${getMoveName(m.id)}</span>
                <span style="font-size: 11px; position: relative; z-index: 1; background: ${TYPE_COLORS[mv.type]||'#555'}; padding: 1px 6px; border-radius: 3px; font-weight: bold; color: #fff;">${mv.type}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    } else {
      return `<div class="pokechill-row${fainted?' fainted':''}" ${clickable?`onclick="switchBattlePoke(${i})"`:''} style="background: rgba(43, 38, 36, 0.85); border-radius: 6px; padding: 6px 10px; border: 1px solid #5a504a; margin-bottom: 6px; cursor: ${clickable?'pointer':'default'}; transition: 0.2s;" ${clickable?'onmouseover="this.style.borderColor=\'#ffd700\'" onmouseout="this.style.borderColor=\'#5a504a\'"':''}>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">${spriteImg(p.id, p.emoji, {size: 26, shiny: p.shinyActive})}</div>
            <span style="color: #fff; font-weight: bold; font-size: 13px;">${p.shinyActive?'<span style="color:#ff5252" title="Shiny">♦</span> ':''}${p.name}</span>
            <span style="background: #62584c; color: #eee; font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: bold;">lvl ${p.level}</span>
            <span style="font-size: 10px; color: ${itm?'var(--gold)':'var(--dim)'};">🎒 ${itm ? itm.icon + ' ' + getItemName(p.heldItem) : '—'}</span>
          </div>
          <span style="color: #bbb; font-size: 10px;">${p.currentHP}/${p.maxHP} PV</span>
        </div>
        <div style="height: 6px; background: #221e1c; border-radius: 3px; overflow: hidden; border: 1px solid #111; margin-bottom: 3px;">
          <div style="width: ${Math.max(0, pct*100)}%; background: #2bc0a4; height: 100%;"></div>
        </div>
        <div style="height: 3px; background: #221e1c; border-radius: 1.5px; overflow: hidden;">
          <div id="party-charge-${i}" style="width: 0%; background: #4dd0e1; height: 100%;"></div>
        </div>
      </div>`;
    }
  }).join('');
}


function renderEnemyMoveBars(){
  const e=battle.enemyPoke;
  const container=document.getElementById('enemy-move-bars');
  if(!container){return;}
  if(!e||!e.moves){container.innerHTML='';return;}
  const nextIdx=(battle.eMoveIdx||0)%e.moves.length;
  container.innerHTML=e.moves.map((m,i)=>{
    const mv=MOVES[m.id];
    if(!mv) return '';
    const isNext=i===nextIdx;
    return `<div class="auto-move${isNext?' next-up':''}" data-move-id="${m.id}" data-idx="${i}">
      <div class="am-top">
        <span>${getMoveName(m.id)}</span>
        <span class="am-type" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
      </div>
      <div class="am-bar-bg"><div class="am-bar-fill"></div></div>
    </div>`;
  }).join('');
  updateMoveBars();
}

// ============================================================
// MOVE LEARNING (learn / change a Pokémon's moves)
// ============================================================

// ============================================================
// SAVE / LOAD
// ============================================================
