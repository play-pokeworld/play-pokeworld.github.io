// ============================================================
// BATTLE UI — (split from battle.js)
// ============================================================
function getActivePlayerPoke(){
  if(typeof battle !== 'undefined' && battle && battle.isTraining && battle.trainee){
    return battle.trainee;
  }
  return G.team[battle?.playerPokeIdx || 0] || null;
}


function updateBattleUI(){
  const p=getActivePlayerPoke();
  const e=battle.enemyPoke;
  if(!p||!e) return;

  // Player side
  const pSprite = document.getElementById('p-sprite');
  if(pSprite){
    pSprite.innerHTML=spriteImg(p.id,p.emoji,{shiny:p.shinyActive,back:true,size:80});
    pSprite.style.background=TYPE_COLORS[p.type1]+'22';
    pSprite.classList.toggle('is-shiny',!!p.shiny);
  }
  const pName = document.getElementById('p-name');
  if(pName) pName.innerHTML=`${p.shiny?'<span class="shiny-tag">✨</span>':''}${p.name} Nv.${p.level}`;
  const pTypes = document.getElementById('p-types');
  if(pTypes) pTypes.innerHTML=typeSpan(p.type1)+(p.type2?typeSpan(p.type2):'');
  const ppct=p.currentHP/p.maxHP;
  const pHpFill = document.getElementById('p-hp-fill');
  if(pHpFill){
    pHpFill.style.width=Math.max(0,ppct*100)+'%';
    pHpFill.style.background=hpColor(ppct);
  }
  const pHpText = document.getElementById('p-hp-text');
  if(pHpText) pHpText.textContent=`${p.currentHP}/${p.maxHP} PV`;

  // Enemy side
  const eSprite = document.getElementById('e-sprite');
  if(eSprite){
    eSprite.innerHTML=spriteImg(e.id,e.emoji,{shiny:e.shiny,back:false,size:80});
    eSprite.style.background=TYPE_COLORS[e.type1]+'22';
    eSprite.classList.toggle('is-shiny',!!e.shiny);
  }
  const eName = document.getElementById('e-name');
  if(eName){
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    let ballRow = '';
    if(battle.isChamp && battle.champTeam){
      ballRow = `<div style="display:flex;gap:3px;font-size:11px;margin-bottom:2px;">` +
        battle.champTeam.map(pk => pk.currentHP > 0 ? '🔴' : '⚫').join('') +
        `</div>`;
    }
    eName.innerHTML = ballRow + `${e.shiny?'<span class="shiny-tag">✨</span>':''}${e.name} ${lang==='en'?'Lv.':'Nv.'}${e.level}`;
  }
  const epct=e.currentHP/e.maxHP;
  const eHpFill = document.getElementById('e-hp-fill');
  if(eHpFill){
    eHpFill.style.width=Math.max(0,epct*100)+'%';
    eHpFill.style.background=hpColor(epct);
  }
  const eHpText = document.getElementById('e-hp-text');
  if(eHpText) eHpText.textContent=`${e.currentHP}/${e.maxHP} PV`;
  const eUnder = document.getElementById('e-under-sprite');
  if(eUnder){
    const eBadges = [];
    if(e.status) eBadges.push(`<span class="battle-status" style="background:${statusColor(e.status)};color:#fff;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:3px;">${statusLabel(e.status)}</span>`);
    const eb = getHeldBuff(e);
    if(eb.atk || (battle.enemyMods && battle.enemyMods.atk > 1)) eBadges.push(`<span style="background:#d32f2f;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">ATK ▲</span>`);
    if(eb.def || (battle.enemyMods && battle.enemyMods.def > 1)) eBadges.push(`<span style="background:#1976d2;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">DEF ▲</span>`);
    if(eb.spe || (battle.enemyMods && battle.enemyMods.spe > 1)) eBadges.push(`<span style="background:#f57c00;color:#fff;font-size:9px;font-weight:bold;padding:2px 5px;border-radius:3px;">VIT ▲</span>`);
    eUnder.innerHTML = eBadges.join('');
  }

  renderBattleTeamRow();
  try{ renderBattleSummary(); }catch(_){}
}

// Auto-move readiness cards (purely visual — nothing here is clickable).
// Moves fire in fixed order (1→2→3→4→1...); only the "next up" move shows
// the live cooldown bar, the others are shown queued.

function renderMoveButtons(){
  const container=document.getElementById('move-buttons');
  if(!container) return;
  const p=getActivePlayerPoke();
  if(!p){container.innerHTML='';return;}
  const nextIdx=(battle.pMoveIdx||0)%p.moves.length;
  container.innerHTML=p.moves.map((m,i)=>{
    const mv=MOVES[m.id];
    if(!mv) return '';
    const eff=battle.enemyPoke?typeEff(mv.type,battle.enemyPoke.type1,battle.enemyPoke.type2):1;
    const effHint=eff===0?'⛔':eff>=2?'⚡':eff<=0.5?'👎':'';
    const isNext=i===nextIdx;
    return `<div class="auto-move${isNext?' next-up':''}" data-move-id="${m.id}" data-idx="${i}">
      <div class="am-top">
        <span>${i+1}. ${getMoveName(m.id)} ${effHint}</span>
        <span class="am-type" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
      </div>
      <div class="am-bar-bg"><div class="am-bar-fill"></div></div>
    </div>`;
  }).join('');
  updateMoveBars();
}


function updateMoveBars(){
  const p=getActivePlayerPoke();
  if(p&&p.moves.length){
    const nextIdx=(battle.pMoveIdx||0)%p.moves.length;
    const pct=battle.pCdMax?clamp(100-(battle.pCd/battle.pCdMax*100),0,100):0;
    const activeMove = p.moves[nextIdx];
    const mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#3db5c8';
    document.querySelectorAll('#move-buttons .auto-move, #battle-team-row .hero-move-bar').forEach(el=>{
      const fill=el.querySelector('.am-bar-fill');
      if(!fill) return;
      const isNext=+el.dataset.idx===nextIdx;
      el.classList.toggle('next-up',isNext);
      fill.style.width=(isNext?pct:0)+'%';
      if(isNext) fill.style.background = mvTypeColor;
      el.classList.toggle('ready',isNext&&pct>=99);
    });
    const activeCharge = document.getElementById(`party-charge-${battle.playerPokeIdx}`);
    if(activeCharge) {
      activeCharge.style.width = pct + '%';
      activeCharge.style.background = mvTypeColor;
    }
  }
  const e=battle.enemyPoke;
  if(e&&e.moves&&e.moves.length){
    const nextIdx=(battle.eMoveIdx||0)%e.moves.length;
    const pct=battle.eCdMax?clamp(100-(battle.eCd/battle.eCdMax*100),0,100):0;
    const activeMove = e.moves[nextIdx];
    const mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#d3524b';
    document.querySelectorAll('#enemy-move-bars .auto-move').forEach(el=>{
      const fill=el.querySelector('.am-bar-fill');
      if(!fill) return;
      const isNext=+el.dataset.idx===nextIdx;
      el.classList.toggle('next-up',isNext);
      fill.style.width=(isNext?pct:0)+'%';
      if(isNext) fill.style.background = mvTypeColor;
      el.classList.toggle('ready',isNext&&pct>=99);
    });
  }
}


function flashMoveFiring(moveId, side){
  const sel=side==='enemy'?'#enemy-move-bars .auto-move':'#move-buttons .auto-move';
  document.querySelectorAll(sel).forEach(el=>{
    if(el.dataset.moveId==moveId){
      el.classList.add('firing');
      setTimeout(()=>el.classList.remove('firing'),300);
    }
  });
}


function setBattleSpeed(n){
  battle.speed=n;
  document.querySelectorAll('#speed-toggle button').forEach(b=>b.classList.toggle('active',+b.dataset.spd===n));
}

// Ticks every 100ms; both sides' cooldowns run independently and in real time.
// Taking damage NEVER pauses a cooldown — only KO transitions pause briefly.
