// ============================================================
// BATTLE UI — Simplifié : tout passe par renderBattleTeamRow()
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

 // Tout est rendu par renderBattleTeamRow() (ennemis + équipe)
 renderBattleTeamRow();
 try{ renderBattleSummary(); }catch(_){}
}


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
 const effHint=eff===0?'⛔':eff>=2?'':eff<=0.5?'':'';
 const isNext=i===nextIdx;
 return '<div class="auto-move'+(isNext?' next-up':'')+'" data-move-id="'+m.id+'" data-idx="'+i+'" oncontextmenu="event.preventDefault();openMoveInfo(\''+m.id+'\');return false;" title="Clic droit : info">'+
 '<div class="am-top">'+
 '<span>'+(i+1)+'. '+getMoveName(m.id)+' '+effHint+'</span>'+
 '<span class="am-type" style="background:'+(TYPE_COLORS[mv.type]||'#888')+'">'+mv.type+'</span>'+
 '</div>'+
 '<div class="am-bar-bg"><div class="am-bar-fill"></div></div>'+
 '</div>';
 }).join('');
 updateMoveBars();
}


function updateMoveBars(){
  const p = getActivePlayerPoke();
  const e = battle.enemyPoke;
  
  if (p && p.moves.length) {
    const nextIdx = (battle.pMoveIdx || 0) % p.moves.length;
    const pct = battle.pCdMax ? clamp(100 - (battle.pCd / battle.pCdMax * 100), 0, 100) : 0;
    const activeMove = p.moves[nextIdx];
    const mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#3db5c8';
    
    // Update all poke-move elements in battle-team-row
    document.querySelectorAll('#battle-team-row .poke-card .poke-move').forEach((el, idx) => {
      // Check if this is the active player pokemon
      const card = el.closest('.poke-card');
      if (!card || !card.classList.contains('active')) return;
      
      // Check if this move is the next one
      const moveIdx = Array.from(el.parentElement.children).indexOf(el);
      const isNext = moveIdx === nextIdx;
      
      el.classList.toggle('ready', isNext && pct >= 99);
      el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
      if (isNext) {
        el.style.setProperty('--charge-color', mvTypeColor + '66');
      }
    });
  }
  
  if (e && e.moves && e.moves.length) {
    const nextIdx = (battle.eMoveIdx || 0) % e.moves.length;
    const pct = battle.eCdMax ? clamp(100 - (battle.eCd / battle.eCdMax * 100), 0, 100) : 0;
    const activeMove = e.moves[nextIdx];
    const mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#d3524b';
    
    // Update enemy moves (first card in battle-team-row if it has no .active class)
    const enemyCard = document.querySelector('#battle-team-row .poke-card:not(.active)');
    if (enemyCard) {
      enemyCard.querySelectorAll('.poke-move').forEach((el, idx) => {
        const isNext = idx === nextIdx;
        el.classList.toggle('ready', isNext && pct >= 99);
        el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
        if (isNext) {
          el.style.setProperty('--charge-color', mvTypeColor + '66');
        }
      });
    }
  }
}


function flashMoveFiring(moveId, side){
 // Flash effect for moves
 const sel = side === 'enemy'
   ? '#battle-team-row .poke-card:first-child .poke-move'
   : '#battle-team-row .poke-card.active .poke-move';
 document.querySelectorAll(sel).forEach(el => {
   if (el.dataset.moveId == moveId || (el.textContent || '').includes(getMoveName(moveId))) {
     el.classList.add('firing');
     setTimeout(() => el.classList.remove('firing'), 300);
   }
 });
}


function setBattleSpeed(n){
 battle.speed=n;
 document.querySelectorAll('#speed-toggle button').forEach(b=>b.classList.toggle('active',+b.dataset.spd===n));
}

// Toggle x10 speed button visibility based on debug state
function toggleDebugX10(show){
  const x10btn = document.querySelector('.speed-x10');
  if(x10btn) x10btn.style.display = show ? 'inline-block' : 'none';
  const body = document.body;
  if(show) body.classList.add('debug-active');
  else body.classList.remove('debug-active');
}
