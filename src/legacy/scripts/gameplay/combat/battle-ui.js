function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}

let battleViewSnapshot = '';

function getActivePlayerPoke(){
 if(typeof battle !== 'undefined' && battle && battle.isTraining && battle.trainee){
 return battle.trainee;
 }
 return G.team[battle?.playerPokeIdx || 0] || null;
}

function getBattleViewSnapshot(){
 const enemy = battle && battle.enemyPoke ? battle.enemyPoke : null;
 const team = (battle && battle.isTraining && battle.trainee) ? [battle.trainee] : (G.team || []);
 return JSON.stringify({
 enemy: enemy ? [enemy.uid || enemy.id, enemy.id, enemy.level, enemy.shinyActive, enemy.status, enemy.talent, (enemy.moves || []).map(m => m.id).join(',')] : null,
 active: battle ? battle.playerPokeIdx : 0,
 training: !!(battle && battle.isTraining),
 team: team.map(p => p ? [p.uid || p.id, p.id, p.level, p.shinyActive, p.status, p.heldItem || '', (p.moves || []).map(m => m.id).join(','), p.currentHP <= 0] : null)
 });
}

function updatePokemonCardDynamicState(card, pokemon){
 if(!card || !pokemon) return;
 const pct = pokemon.maxHP ? Math.max(0, Math.min(1, pokemon.currentHP / pokemon.maxHP)) : 0;
 const hpClass = pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low';
 const hpFill = card.querySelector('.hp-fill');
 if(hpFill){
 hpFill.style.width = (pct * 100) + '%';
 hpFill.classList.toggle('high', hpClass === 'high');
 hpFill.classList.toggle('medium', hpClass === 'medium');
 hpFill.classList.toggle('low', hpClass === 'low');
 }
 const hpText = card.querySelector('.hp-text');
 if(hpText) hpText.textContent = pokemon.currentHP + '/' + pokemon.maxHP + ' ' + t('stat_hp_short');
 const levelText = card.querySelector('.poke-level');
 if(levelText) levelText.textContent = t('level_abbrev') + pokemon.level;
 card.classList.toggle('fainted', pokemon.currentHP <= 0);
 const xpFill = card.querySelector('.xp-fill');
 if(xpFill && typeof xpForLevel === 'function'){
 const curBase = xpForLevel(pokemon.level);
 const xpInLevel = Math.max(0, (pokemon.xp || 0) - curBase);
 const xpReqLevel = Math.max(1, (pokemon.xpNext || 1) - curBase);
 xpFill.style.width = Math.min(100, (xpInLevel / xpReqLevel) * 100) + '%';
 }
}

function updateBattleDynamicState(){
 const row = document.getElementById('battle-team-row');
 if(!row) return false;
 const cards = Array.from(row.querySelectorAll('.poke-card'));
 if(!cards.length) return false;
 let index = 0;
 if(battle.enemyPoke) updatePokemonCardDynamicState(cards[index++], battle.enemyPoke);
 if(battle && battle.isTraining && battle.trainee){
 updatePokemonCardDynamicState(cards[index], battle.trainee);
 return true;
 }
 for(let i = 0; i < (G.team || []).length; i++){
 updatePokemonCardDynamicState(cards[index++], G.team[i]);
 }
 return true;
}

function updateBattleUI(){
 const p=getActivePlayerPoke();
 const e=battle.enemyPoke;
 if(!p||!e) return;

 const nextSnapshot = getBattleViewSnapshot();
 if(nextSnapshot !== battleViewSnapshot || !updateBattleDynamicState()){
 battleViewSnapshot = nextSnapshot;
 renderBattleTeamRow();
 updateBattleDynamicState();
 updateMoveBars();
 } else {
 updateBattleDynamicState();
 updateMoveBars();
 }
 try{
 const modal=document.getElementById('battle-summary-modal');
 if(modal&&modal.classList.contains('open')) renderBattleSummary();
 }catch(_){}
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
 return '<div class="auto-move'+(isNext?' next-up':'')+' type-' + (mv.type||'').toLowerCase() + '" data-move-id="'+m.id+'" data-idx="'+i+'" data-context-call="openMoveInfo" data-context-args="\''+m.id+'\'" title="Clic droit : info">'+
 '<div class="am-top">'+
 '<span>'+(i+1)+'. '+getMoveName(m.id)+' '+effHint+'</span>'+
 '<span class="am-type type-' + (mv.type||'').toLowerCase() + '">'+mv.type+'</span>'+
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
    
    document.querySelectorAll('#battle-team-row .poke-card .poke-move').forEach((el) => {
      const card = el.closest('.poke-card');
      if (!card || !card.classList.contains('active')) return;
      const moveIdx = Array.from(el.parentElement.children).indexOf(el);
      const isNext = moveIdx === nextIdx;
      el.classList.toggle('ready', isNext && pct >= 99);
      el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
      if (isNext) {
        el.style.setProperty('--charge-color', mvTypeColor + '66');
      }
    });

    const moveButtons = document.querySelectorAll('#move-buttons .auto-move');
    moveButtons.forEach((el, idx) => {
      const isNext = idx === nextIdx;
      const barFill = el.querySelector('.am-bar-fill');
      if (barFill) {
        barFill.style.width = (isNext ? pct : 0) + '%';
        barFill.style.background = isNext ? mvTypeColor : 'var(--dark1)';
      }
    });
  }
  
  if (e && e.moves && e.moves.length) {
    const nextIdx = (battle.eMoveIdx || 0) % e.moves.length;
    const pct = battle.eCdMax ? clamp(100 - (battle.eCd / battle.eCdMax * 100), 0, 100) : 0;
    const activeMove = e.moves[nextIdx];
    const mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#d3524b';
    
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

function toggleDebugX10(show){
  const x10btn = document.querySelector('.speed-x10');
  if(x10btn) x10btn.style.display = show ? 'inline-block' : 'none';
  const body = document.body;
  if(show) body.classList.add('debug-active');
  else body.classList.remove('debug-active');
}
