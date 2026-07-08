
// ===== extracted from src/scripts/gameplay/mine.js =====
function startWildBattle(){
  const loc=LOCS[G.location];
  const wild=loc.wild;
  if(!wild||!wild.length||!G.team.length) return;
  const entry=wild[rand(0,wild.length-1)];
  const lv=rand(entry[1],entry[2]);
  const wp=createPoke(entry[0],lv,rollShiny());
  startBattle(wp,false);
}
function calcAttackCd(spe){
  const base=1900;
  const cd=base*(100/(100+Math.min(spe,180)));
  return Math.round(clamp(cd,500,2600));
}
function effectiveSpeed(poke, mods){
  if(!poke) return 50;
  let s=poke.spe*(mods?.spe||1);
  try{
    const b = getHeldBuff(poke);
    if(b && b.spe) s *= (1 + b.spe);
  }catch(_){}
  if(poke.status==='para') s*=0.5;
  return Math.max(5,s);
}
function resetPlayerCd(){
  const p=getActivePlayerPoke();
  battle.pCd=calcAttackCd(effectiveSpeed(p,battle.playerMods));
  battle.pCdMax=battle.pCd;
}
function resetEnemyCd(){
  const e=battle.enemyPoke;
  battle.eCd=calcAttackCd(effectiveSpeed(e,battle.enemyMods));
  battle.eCdMax=battle.eCd;
}

// ===== extracted from src/scripts/gameplay/world.js =====
function startLegendaryEncounter(pokeId){
  if(!G.team.length){ setMsg('❌ Vous n\'avez pas de Pokémon !'); return; }
  const isShiny = isSpeciesShiny(pokeId) || rollShiny();
  const legPoke = createPoke(pokeId, 65, isShiny);
  if(!legPoke) return;
  legPoke.maxHP = Math.floor(legPoke.maxHP * 2.2);
  legPoke.currentHP = legPoke.maxHP;
  const lang = G.lang || 'fr';
  battle.legendaryCatch = true; // capture GARANTIE à la victoire (combat sauvage)
  addBattleLog(lang === 'en' ? `⚔️ WILD LEGENDARY: ${legPoke.name} (Lv.65) appeared! Defeat it to capture!` : `⚔️ LÉGENDAIRE SAUVAGE : ${legPoke.name} (Nv.65) apparaît ! Vainquez-le pour le capturer !`);
  startBattle(legPoke, false);
  battle.chill = false; // un seul combat légendaire, puis capture + fin (pas de enchaînement sauvage)
}

function startBattle(enemyPoke, isChamp, champId=null, champPokeList=null){
  if(!G.team.length){setMsg('❌ Vous n\'avez pas de Pokémon !');return;}
  if(isChamp && (!champPokeList || !champPokeList.length)){
    setMsg('❌ Erreur : équipe adverse vide.');
    return;
  }
  if(!isChamp && !enemyPoke){
    setMsg('❌ Erreur : Pokémon adverse introuvable.');
    return;
  }
  clearInterval(battle.timerId);
  // Pokémon Centers removed: the whole team is FULLY healed at the start of every battle.
  for(const mp of G.team){
    mp.currentHP=mp.maxHP;
    mp.status=null;
    mp.statusTurns=0;
    if(mp.moves) for(const m of mp.moves) m.pp=m.maxPP;
  }
  battle.active=true;
  battle.isChamp=isChamp;
  battle.champId=champId;
  battle.lastIsChamp=isChamp;
  battle.lastChampId=champId;
  battle.champPokeIdx=0;
  battle.escaped=false;
  battle.paused=false;
  battle.chill=!isChamp;
  battle.speed=battle.speed||1;
  battle.playerMods={atk:1,def:1,spe:1};
  battle.enemyMods={atk:1,def:1,spe:1};
  battle.pMoveIdx=0;
  battle.eMoveIdx=0;
  battle.pendingLeave=false;
  battle.pendingSwitchIdx=null;
  if(!isChamp){
    // Nouvelle session de combat sauvage : on repart avec un butin vierge.
    battle.sessionCatches=[];
    battle.sessionItems={};
  }

  if(isChamp&&champPokeList&&champPokeList.length){
    battle.champTeam=champPokeList.map(p=>({...p,currentHP:p.maxHP,status:null,moves:(p.moves||[]).map(m=>({...m}))}));
    battle.enemyPoke={...battle.champTeam[0]};
  } else {
    battle.enemyPoke=enemyPoke;
  }
  if(!battle.enemyPoke){
    battle.active=false;
    setMsg('❌ Erreur : Pokémon adverse introuvable.');
    return;
  }
  battle.playerPokeIdx=firstAlive();

  const idleScreen = document.getElementById('battle-idle-screen');
  const activeScene = document.getElementById('battle-active-scene');
  if(idleScreen) idleScreen.style.display = 'none';
  if(activeScene) activeScene.style.display = 'flex';
  clearBattleLog();
  G.pokedex[battle.enemyPoke.id]={...(G.pokedex[battle.enemyPoke.id]||{}),seen:true};

  resetPlayerCd();
  resetEnemyCd();
  triggerEntryTalents('both');

  updateBattleUI();
  const eName = battle.enemyPoke?.name || 'Adversaire';
  if(battle.enemyPoke?.shiny) addBattleLog(`<span class="shiny-tag">✨</span> Un ${eName} sauvage apparaît... il brille étrangement !`);
  else addBattleLog(`Un ${eName} apparaît !`);
  if(isChamp){
    const cName = getChampName(champId || battle.champId);
    addBattleLog(`${cName} envoie ${eName} !`);
  }

  const leaveBtn=document.getElementById('leave-btn');
  leaveBtn.disabled=false;
  leaveBtn.textContent=isChamp?'🏳️ Abandonner':'🚪 Quitter';

  renderMoveButtons();
  renderEnemyMoveBars();
  renderBattleTeamRow();
  battle.timerId=setInterval(battleTick,100);
}

function getChampTeam(champId){
  const champ = CHAMPIONS[champId];
  if(!champ || !champ.team || !champ.team.length) return [];
  return champ.team.filter(p => p && p.id).map(p => createPoke(p.id, p.level || 20, p.shiny || false));
}

function startChampBattle(champId){
  const champ=CHAMPIONS[champId];
  if(!champ){return;}
  if((champ.badgeReq||0)>G.badges.length){
    setMsg(`🔒 Il vous faut ${champ.badgeReq} badge(s) pour défier ${getChampName(champId || battle.champId)}.`);
    return;
  }
  if(!G.team.length){setMsg('❌ Vous n\'avez pas de Pokémon !');return;}

  if(champId === 'elite4'){
    battle.isLeague = true;
    battle.leagueStage = 0;
    const firstTrainer = LEAGUE_TRAINERS[0];
    const team = firstTrainer.team.map(([id, lv]) => createPoke(id, lv, false));
    addBattleLog(`🏆 LIGUE KANTO - Combat 1/5 : ${firstTrainer.name} vous défie !`);
    startBattle(null, true, 'elite4', team);
    addBattleLog(`${firstTrainer.name} : « Préparez-vous à affronter la puissance du Conseil 4 ! »`);
    return;
  }

  battle.isLeague = false;
  const team = getChampTeam(champId);
  if(!team || !team.length){
    setMsg(`❌ Erreur d'équipe pour le champion ${getChampName(champId)}.`);
    return;
  }
  addBattleLog(`🎮 Combat contre ${getChampName(champId || battle.champId)} !`);
  startBattle(null, true, champId, team);
  addBattleLog(`${getChampName(champId || battle.champId)} : « Je suis le champion de cette arène ! »`);
}

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
function battleTick(){
  if(!battle.active||battle.paused) return;
  const dt=100*(battle.speed||1);
  battle.pCd-=dt;
  battle.eCd-=dt;
  updateMoveBars();
  if(battle.pCd<=0){ doPlayerMove(); }
  if(!battle.active||battle.paused) return;
  if(battle.eCd<=0){ doEnemyMove(); }
}

function doPlayerMove(){
  const p=getActivePlayerPoke();
  const e=battle.enemyPoke;
  if(!p||!e||p.currentHP<=0||e.currentHP<=0){ resetPlayerCd(); return; }

  applyEndOfTurnStatus(p);
  if(p.currentHP<=0){ updateBattleUI(); onPlayerPokeFaint(); return; }

  if(handleStatusBeforeMove(p,'player')){
    const mv=p.moves[battle.pMoveIdx%p.moves.length];
    battle.pMoveIdx=(battle.pMoveIdx+1)%p.moves.length;
    flashMoveFiring(mv.id,'player');
    executeAttack(p,e,mv.id,'player');
  }
  resetPlayerCd();
  updateBattleUI();

  if(e.currentHP<=0){ onEnemyFaint(); }
  else if(p.currentHP<=0){ onPlayerPokeFaint(); }
}

function doEnemyMove(){
  const p=getActivePlayerPoke();
  const e=battle.enemyPoke;
  if(!p||!e||p.currentHP<=0||e.currentHP<=0){ resetEnemyCd(); return; }

  applyEndOfTurnStatus(e);
  if(e.currentHP<=0){ updateBattleUI(); onEnemyFaint(); return; }

  if(handleStatusBeforeMove(e,'enemy')){
    const mv=e.moves[battle.eMoveIdx%e.moves.length];
    battle.eMoveIdx=(battle.eMoveIdx+1)%e.moves.length;
    flashMoveFiring(mv.id,'enemy');
    executeAttack(e,p,mv.id,'enemy');
  }
  resetEnemyCd();
  updateBattleUI();

  if(p.currentHP<=0){ onPlayerPokeFaint(); }
  else if(e.currentHP<=0){ onEnemyFaint(); }
}

function handleStatusBeforeMove(poke, side){
  const s=poke.status;
  if(!s) return true;
  if(s==='sleep'){
    poke.statusTurns=(poke.statusTurns||1)-1;
    if(poke.statusTurns<=0){poke.status=null;addBattleLog(`${poke.name} se réveille !`);}
    else{addBattleLog(`${poke.name} est endormi...`);updateBattleUI();return false;}
  }
  if(s==='freeze'){
    if(chance(20)){poke.status=null;addBattleLog(`${poke.name} se décongèle !`);}
    else{addBattleLog(`${poke.name} est gelé...`);updateBattleUI();return false;}
  }
  if(s==='para'){
    if(chance(25)){addBattleLog(`${poke.name} est paralysé et ne peut pas attaquer !`);updateBattleUI();return false;}
  }
  return true;
}

function playAttackAnim(side){
  const el = side === 'player' ? document.querySelector('.active-hero .poke-sprite') : document.getElementById('e-sprite');
  if(!el) return;
  const cls=side==='player'?'atk-anim-player':'atk-anim-enemy';
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls),400);
}
function playHitAnim(side){
  const el = side === 'player' ? document.getElementById('e-sprite') : document.querySelector('.active-hero .poke-sprite');
  if(!el) return;
  el.classList.remove('hit-anim'); void el.offsetWidth; el.classList.add('hit-anim');
  setTimeout(()=>el.classList.remove('hit-anim'),350);
}

function executeAttack(attacker, defender, moveId, side){
  const mv=MOVES[moveId];
  if(!mv) return;
  const atkMod=(side==='player'?battle.playerMods:battle.enemyMods).atk;
  const defMod=(side==='player'?battle.enemyMods:battle.playerMods).def;

  addBattleLog(`${attacker.name} utilise <b>${getMoveName(moveId)}</b> !`);
  playAttackAnim(side);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(defender.talent === 'levitate' && mv.type === 'Ground'){
    addBattleLog(lang==='en' ? `🧬 [Levitate] ${defender.name} floats above Ground attacks!` : `🧬 [Lévitation] ${defender.name} flotte au-dessus de l'attaque Sol !`);
    return;
  }
  if(defender.talent === 'lightningrod' && mv.type === 'Electric'){
    addBattleLog(lang==='en' ? `🧬 [Lightning Rod] ${defender.name} absorbed Electric attack!` : `🧬 [Paratonnerre] ${defender.name} absorbe l'attaque Électrik !`);
    return;
  }

  // Accuracy check
  let acc = mv.acc || 100;
  if(attacker.talent === 'compoundeyes') acc += 30;
  if(defender.talent === 'sandveil') acc -= 20;
  if(mv.pow!==null && mv.pow!==undefined && !chance(acc)){
    addBattleLog(lang==='en' ? `${attacker.name}'s attack missed!` : `${attacker.name} rate son coup !`);
    return;
  }

  // Type immunity check
  const eff = typeEff(mv.type, defender.type1, defender.type2);
  if(eff === 0 && !mv.fixed){
    addBattleLog(lang==='en' ? `It doesn't affect ${defender.name}...` : `Ça n'affecte pas ${defender.name}...`);
    return;
  }

  // Stat move
  if(mv.cat==='stat'){
    if(defender.status && (mv.eff === 'para' || mv.eff === 'poison' || mv.eff === 'badpoison' || mv.eff === 'sleep' || mv.eff === 'freeze')){
      addBattleLog(lang==='en' ? `${defender.name} already has a status condition!` : `${defender.name} souffre déjà d'une altération d'état !`);
      return;
    }
    if(mv.eff==='para'){
      if(defender.type1==='Electric'||defender.type2==='Electric'||defender.type1==='Ground'||defender.type2==='Ground'){
        addBattleLog(lang==='en' ? `It doesn't affect ${defender.name}...` : `Ça n'affecte pas ${defender.name}...`);
      } else if(chance(mv.effC||100)){
        defender.status='para';
        addBattleLog(lang==='en' ? `${defender.name} is paralyzed!` : `${defender.name} est paralysé !`);
      } else {
        addBattleLog(lang==='en' ? `${attacker.name}'s attack missed!` : `${attacker.name} rate son coup !`);
      }
    } else if(mv.eff==='poison'||mv.eff==='badpoison'){
      if(defender.type1==='Poison'||defender.type2==='Poison'||defender.type1==='Steel'||defender.type2==='Steel'){
        addBattleLog(lang==='en' ? `It doesn't affect ${defender.name}...` : `Ça n'affecte pas ${defender.name}...`);
      } else if(chance(mv.effC||100)){
        defender.status=mv.eff;
        addBattleLog(lang==='en' ? `${defender.name} was ${mv.eff==='badpoison'?'badly poisoned':'poisoned'}!` : `${defender.name} est ${mv.eff==='badpoison'?'gravement empoisonné':'empoisonné'} !`);
      } else {
        addBattleLog(lang==='en' ? `${attacker.name}'s attack missed!` : `${attacker.name} rate son coup !`);
      }
    } else if(mv.eff==='slow'){
      const targetMods = (side==='player'?battle.enemyMods:battle.playerMods);
      if(targetMods.spe <= 0.25){
        addBattleLog(lang==='en' ? `${defender.name}'s Speed won't go any lower!` : `La vitesse de ${defender.name} ne peut plus baisser !`);
      } else {
        targetMods.spe = Math.max(0.25, targetMods.spe * 0.67);
        addBattleLog(lang==='en' ? `${defender.name}'s Speed fell!` : `La vitesse de ${defender.name} baisse !`);
      }
    }
    updateBattleUI();
    return;
  }

  // Damage
  let power=mv.pow;
  if(mv.fixed!==null&&mv.fixed!==undefined){
    const dmg=typeof mv.fixed==='number'?mv.fixed:attacker.level;
    defender.currentHP=Math.max(0,defender.currentHP-dmg);
    playHitAnim(side);
    addBattleLog(`${defender.name} perd ${dmg} PV !`);
    updateBattleUI();return;
  }
  if(!power) return;

  const stabMult=(attacker.type1===mv.type||attacker.type2===mv.type)?(attacker.talent==='adaptability'?2.0:1.5):1;
  const critMult=(mv.crit&&chance(15))?(attacker.talent==='sniper'?2.25:1.5):1;
  const randMult=(rand(85,100)/100);

  const isSpec = mv.cat === 'spec';
  const atkModVal = (side==='player'?battle.playerMods:battle.enemyMods)[isSpec ? 'spa' : 'atk'] || 1;
  const defModVal = (side==='player'?battle.enemyMods:battle.playerMods)[isSpec ? 'spd' : 'def'] || 1;

  const atkBuff = 1 + (getHeldBuff(attacker)[isSpec ? 'spa' : 'atk'] || 0);
  const defBuff = 1 + (getHeldBuff(defender)[isSpec ? 'spd' : 'def'] || 0);
  let atk = (isSpec ? (attacker.spa || attacker.atk) : attacker.atk) * atkBuff * atkModVal;
  let def = (isSpec ? (defender.spd || defender.def) : defender.def) * defBuff * defModVal;

  if(attacker.talent === 'hugepower' && !isSpec){
    atk *= 1.6;
    if(chance(35)) addBattleLog(lang==='en' ? `🧬 [Huge Power] Physical Attack boosted by +60%!` : `🧬 [Coloforce] Attaque physique augmentée de +60% !`);
  }
  if(attacker.talent === 'solarpower' && isSpec){
    atk *= 1.3;
  }
  if(attacker.talent === 'guts' && attacker.status && !isSpec){
    atk *= 1.5;
    addBattleLog(lang==='en' ? `🧬 [Guts] Attack boosted by +50% due to status!` : `🧬 [Cran] Attaque augmentée de +50% grâce au statut !`);
  }
  if(attacker.talent === 'technician' && power <= 60){
    power = Math.floor(power * 1.5);
  }
  if(attacker.talent === 'overgrow' && mv.type === 'Grass' && attacker.currentHP < attacker.maxHP * 0.35){
    power = Math.floor(power * 1.35);
    addBattleLog(lang==='en' ? `🧬 [Overgrow] Grass power boosted!` : `🧬 [Engrais] Puissance Plante augmentée !`);
  }
  if(attacker.talent === 'blaze' && mv.type === 'Fire' && attacker.currentHP < attacker.maxHP * 0.35){
    power = Math.floor(power * 1.35);
    addBattleLog(lang==='en' ? `🧬 [Blaze] Fire power boosted!` : `🧬 [Brasier] Puissance Feu augmentée !`);
  }
  if(attacker.talent === 'torrent' && mv.type === 'Water' && attacker.currentHP < attacker.maxHP * 0.35){
    power = Math.floor(power * 1.35);
    addBattleLog(lang==='en' ? `🧬 [Torrent] Water power boosted!` : `🧬 [Torrent] Puissance Eau augmentée !`);
  }

  if(defender.talent === 'thickfat' && (mv.type === 'Fire' || mv.type === 'Ice')){
    def *= 2;
    addBattleLog(lang==='en' ? `🧬 [Thick Fat] Fire/Ice damage halved!` : `🧬 [Isograisse] Dégâts Feu/Glace réduits de 50% !`);
  }
  if(defender.talent === 'multiscale' && defender.currentHP >= defender.maxHP){
    def *= 2;
    addBattleLog(lang==='en' ? `🧬 [Multiscale] Full HP defense halved incoming damage!` : `🧬 [Multiécaille] Dégâts subis réduits grâce aux PV max !`);
  }

  let dmg=Math.max(1, Math.floor(((2*attacker.level/5+2)*power*atk/def/50+2)*stabMult*eff*critMult*randMult));
  if(side === 'enemy' && typeof battle !== 'undefined' && battle && battle.isTraining){
    dmg = Math.max(1, Math.floor(dmg * 0.25));
  }

  // Status damage multiplier
  if(attacker.status==='burn'&&mv.cat==='phys') dmg=Math.floor(dmg/2);

  if(mv.drain){
    const drained=Math.floor(dmg/2);
    attacker.currentHP=Math.min(attacker.maxHP,attacker.currentHP+drained);
    addBattleLog(`${attacker.name} absorbe ${drained} PV !`);
    if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
      battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
    }
  }

  if(defender.talent === 'sturdy' && dmg >= defender.currentHP && defender.currentHP >= defender.maxHP){
    dmg = defender.currentHP - 1;
    addBattleLog(lang==='en' ? `🧬 [Sturdy] ${defender.name} endured the fatal hit!` : `🧬 [Fermeté] ${defender.name} encaisse le coup mortel !`);
  }

  defender.currentHP=Math.max(0,defender.currentHP-dmg);
  if(battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
    if(side === 'player') battle.champTeam[battle.champPokeIdx].currentHP = defender.currentHP;
  }
  playHitAnim(side);

  if(defender.talent === 'roughskin' && mv.cat === 'phys'){
    const refl = Math.max(1, Math.floor(attacker.maxHP * 0.12));
    attacker.currentHP = Math.max(0, attacker.currentHP - refl);
    addBattleLog(lang==='en' ? `🧬 [Rough Skin] ${attacker.name} took ${refl} recoil damage!` : `🧬 [Peau Dure] ${attacker.name} subit ${refl} PV de dégâts au contact !`);
    if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
      battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
    }
  }
  if(defender.talent === 'static' && mv.cat === 'phys' && chance(25) && !attacker.status){
    attacker.status = 'para';
    addBattleLog(lang==='en' ? `🧬 [Static] ${attacker.name} paralyzed attacker on contact!` : `🧬 [Statik] ${attacker.name} paralyse l'assaillant au contact !`);
  }
  if(defender.talent === 'poisonpoint' && mv.cat === 'phys' && chance(25) && !attacker.status){
    attacker.status = 'poison';
    addBattleLog(lang==='en' ? `🧬 [Poison Point] ${attacker.name} poisoned attacker on contact!` : `🧬 [Point Poison] ${attacker.name} empoisonne l'assaillant au contact !`);
  }

  const effMsg=effText(eff);
  if(lang === 'en'){
    addBattleLog(`${defender.name} lost ${dmg} HP!${effMsg?' <span style="color:var(--yellow)">'+effMsg+'</span>':''}`);
    if(critMult>1) addBattleLog(`<span style="color:var(--orange)">Critical hit!</span>`);
  } else {
    addBattleLog(`${defender.name} perd ${dmg} PV !${effMsg?' <span style="color:var(--yellow)">'+effMsg+'</span>':''}`);
    if(critMult>1) addBattleLog(`<span style="color:var(--orange)">Coup critique !</span>`);
  }

  // Recoil
  if(mv.recoil){
    const recoil=Math.max(1,Math.floor(dmg/4));
    attacker.currentHP=Math.max(0,attacker.currentHP-recoil);
    addBattleLog(lang==='en' ? `${attacker.name} is damaged by recoil! (-${recoil} HP)` : `${attacker.name} est blessé par le contrecoup ! (-${recoil} PV)`);
    if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
      battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
    }
  }

  // Secondary effects (applied after damage if defender still alive)
  let secChance = mv.effC || 0;
  if(attacker.talent === 'serenegrace') secChance *= 2;
  if(mv.eff&&secChance&&defender.currentHP>0&&!defender.status){
    if(chance(secChance)){
      if(mv.eff==='burn'&&defender.type1!=='Fire'&&defender.type2!=='Fire'){
        defender.status='burn';addBattleLog(lang==='en' ? `${defender.name} was burned!` : `${defender.name} est brûlé !`);
      } else if(mv.eff==='para'){
        defender.status='para';addBattleLog(lang==='en' ? `${defender.name} was paralyzed!` : `${defender.name} est paralysé !`);
      } else if(mv.eff==='poison'){
        defender.status='poison';addBattleLog(lang==='en' ? `${defender.name} was poisoned!` : `${defender.name} est empoisonné !`);
      } else if(mv.eff==='freeze'&&defender.type1!=='Ice'&&defender.type2!=='Ice'){
        defender.status='freeze';defender.statusTurns=rand(2,5);addBattleLog(lang==='en' ? `${defender.name} was frozen!` : `${defender.name} est gelé !`);
      }
    }
  }

  updateBattleUI();
}

// Applied once per attack cycle for the acting Pokémon (burn/poison DOT).
function applyEndOfTurnStatus(p){
  if(!p||p.currentHP<=0) return;
  if(p.talent === 'speedboost'){
    const isPlayerSide = (p === getActivePlayerPoke() || p === G.team[battle.playerPokeIdx]);
    const mods = isPlayerSide ? battle.playerMods : battle.enemyMods;
    if(mods) mods.spe = Math.min(3.0, (mods.spe || 1) * 1.15);
  }
  if(p.status==='burn'){
    const bd=Math.max(1,Math.floor(p.maxHP/8));
    p.currentHP=Math.max(0,p.currentHP-bd);
    addBattleLog(`${p.name} souffre de la brûlure (-${bd} PV)`);
  } else if(p.status==='poison'){
    const pd=Math.max(1,Math.floor(p.maxHP/8));
    p.currentHP=Math.max(0,p.currentHP-pd);
    addBattleLog(`${p.name} souffre du poison (-${pd} PV)`);
  } else if(p.status==='badpoison'){
    p.statusTurns=(p.statusTurns||0)+1;
    const bd=Math.max(1,Math.floor(p.maxHP*p.statusTurns/16));
    p.currentHP=Math.max(0,p.currentHP-bd);
    addBattleLog(`${p.name} souffre du poison virulent (-${bd} PV)`);
  }
}


async function onEnemyFaint(){
  if(!battle || !battle.enemyPoke) return;
  if(G.hatchery && Array.isArray(G.hatchery)){
    let updated = false;
    for(let i=0; i<G.hatchery.length; i++){
      if(G.hatchery[i]){
        G.hatchery[i].steps = (G.hatchery[i].steps || 0) + 1;
        if(G.automation && G.automation.autoHatch && G.hatchery[i].steps >= (G.hatchery[i].stepsReq || 10)){
          hatchEgg(i);
        }
        updated = true;
      }
    }
    if(updated && typeof renderHatcheryWindow === 'function') renderHatcheryWindow();
  }
  battle.paused=true;
  const e=battle.enemyPoke;
  addBattleLog(`${e.name} est mis KO !`);
  updateBattleUI();
  await wait(500);

  if(battle.isChamp){
    battle.champPokeIdx++;
    if(battle.champTeam && battle.champPokeIdx < battle.champTeam.length){
      const next=battle.champTeam[battle.champPokeIdx];
      battle.enemyPoke=next;
      battle.eMoveIdx=0;
      if(battle.isTraining && battle.trainee){
        battle.trainingStage = battle.champPokeIdx;
        if(!battle.trainee.evs) battle.trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
        const keys = ['hp','atk','def','spa','spd','spe'];
        const avail = keys.filter(k => (battle.trainee.evs[k]||0) < 6);
        if(avail.length > 0){
          const pk = avail[rand(0, avail.length - 1)];
          battle.trainee.evs[pk]++;
          addBattleLog(`<span style="color:var(--green)">🟢 Round vaincu ! EV ${pk.toUpperCase()} augmente à ${battle.trainee.evs[pk]}/6 !</span>`);
        }
        battle.trainee.currentHP = battle.trainee.maxHP;
        if(battle.trainee.moves) for(const m of battle.trainee.moves) m.pp = m.maxPP;
        addBattleLog(`⚡ SALLE D'ENTRAÎNEMENT - Round ${battle.champPokeIdx+1}/3 : ${next.name} !`);
      } else {
        addBattleLog(`${getChampName(battle.champId)} envoie ${next.name} !`);
      }
      G.pokedex[next.id]={...(G.pokedex[next.id]||{}),seen:true};
      resetEnemyCd();
      updateBattleUI();
      renderMoveButtons();
      renderEnemyMoveBars();
      renderBattleTeamRow();
      await wait(1000);
      resumeBattleActions();
      return;
    } else {
      if(battle.isLeague && typeof battle.leagueStage === 'number' && battle.leagueStage < 4){
        battle.leagueStage++;
        const trainer = LEAGUE_TRAINERS[battle.leagueStage];
        for(const p of G.team){
          p.currentHP = p.maxHP;
          p.status = null;
          p.statusTurns = 0;
          if(p.moves) for(const m of p.moves) m.pp = m.maxPP;
        }
        addBattleLog(`<span style="color:var(--green)">🎉 Victoire contre ${LEAGUE_TRAINERS[battle.leagueStage - 1].name} ! Votre équipe a été entièrement soignée (100% PV) !</span>`);
        notify(`🎉 Étape ${battle.leagueStage}/5 réussie ! Équipe soignée ! Combat suivant : ${trainer.name}...`, 'var(--green)');
        updateBattleUI();
        renderBattleTeamRow();
        await wait(2200);

        if(!battle.active) return;
        battle.champTeam = trainer.team.map(([id, lv]) => createPoke(id, lv, false));
        battle.champPokeIdx = 0;
        const nextPoke = battle.champTeam[0];
        battle.enemyPoke = nextPoke;
        battle.eMoveIdx = 0;
        addBattleLog(`🏆 LIGUE KANTO - Combat ${battle.leagueStage + 1}/5 : ${trainer.name} envoie ${nextPoke.name} !`);
        G.pokedex[nextPoke.id] = {...(G.pokedex[nextPoke.id]||{}), seen:true};
        resetPlayerCd();
        resetEnemyCd();
        updateBattleUI();
        renderMoveButtons();
        renderEnemyMoveBars();
        renderBattleTeamRow();
        await wait(400);
        resumeBattleActions();
        return;
      }
      await champVictory();
      return;
    }
  }

  // Wild Pokémon defeated: XP goes to the whole LIVING team (multi-XP)
  const xp=gainXP(e);
  addBattleLog(`Votre équipe gagne ${xp} XP chacun !`);

  // Compteur global de victoires sauvages (stats) + compteur PAR LIEU
  // (verrou de progression style PokéClicker : il faut battre N Pokémon
  // dans un lieu pour débloquer les lieux connectés).
  G.totalWildWins = (G.totalWildWins||0) + 1;
  if(!G.wildWinsByLoc) G.wildWinsByLoc = {};
  G.wildWinsByLoc[G.location] = (G.wildWinsByLoc[G.location]||0) + 1;

  // Auto-capture attempt (Pokéchill-style: happens automatically on KO)
  attemptAutoCatch(e);
  EventBus.emit(EVENTS.WILD_DEFEATED, { loc: G.location });
  try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){}

  // Item find — rare loot chance (4%)
  const drops=ROUTE_DROPS[G.location];
  if(drops&&drops.length&&chance(4)){
    const drop=drops[rand(0,drops.length-1)];
    addToInventory(drop,1);
    if(!battle.sessionItems) battle.sessionItems={};
    battle.sessionItems[drop]=(battle.sessionItems[drop]||0)+1;
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    addBattleLog(lang==='en' ? `${itemIcon(drop,16)} Item found: ${getItemName(drop)}!` : `${itemIcon(drop,16)} Objet trouvé : ${getItemName(drop)} !`);
  }

  const mon=rand(e.level*5, e.level*10);
  G.money+=mon;
  updateHeader();
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  addBattleLog(lang==='en' ? `You won ${mon}₽!` : `Vous gagnez ${mon}₽ !`);

  await wait(700);

  // Pokéchill mode: a new wild Pokémon appears right away.
  if(battle.chill && battle.active && aliveCount()>0){
    spawnNextWild();
  } else if(battle.active){
    endBattle();
  }
}

function spawnNextWild(){
  const loc=getLocObj(G.location);
  const wild=loc ? loc.wild : null;
  if(!wild||!wild.length||aliveCount()===0){ endBattle(); return; }
  const roamingId = getRoamingLegendaryForRoute(G.location);
  const wp = pickWildEncounter(loc, roamingId);
  if(!wp){ endBattle(); return; }
  battle.enemyPoke=wp;
  battle.enemyMods={atk:1,def:1,spe:1};
  battle.eMoveIdx=0;
  battle.escaped=false;
  resetEnemyCd();
  G.pokedex[battle.enemyPoke.id]={...(G.pokedex[battle.enemyPoke.id]||{}),seen:true};
  clearBattleLog();
  triggerEntryTalents('both');
  updateBattleUI();
  if(battle.enemyPoke.shiny) addBattleLog(`<span class="shiny-tag">✨</span> Un ${battle.enemyPoke.name} sauvage apparaît... il brille étrangement !`);
  else addBattleLog(`Un ${battle.enemyPoke.name} sauvage apparaît !`);
  renderMoveButtons();
  renderEnemyMoveBars();
  renderBattleTeamRow();
  resumeBattleActions();
}

// Pierres d'évolution – mapping espèce -> {stone: targetId}

async function onPlayerPokeFaint(){
  battle.paused=true;
  const p=getActivePlayerPoke();
  addBattleLog(`${p.name} est KO !`);
  updateBattleUI();
  await wait(500);

  if(battle.isTraining){
    addBattleLog(`<span style="color:var(--red)">❌ Votre Pokémon à l'entraînement est KO ! Entraînement échoué...</span>`);
    notify("❌ Entraînement échoué ! Votre Pokémon a été mis KO.", "var(--red)");
    if(battle.trainee) battle.trainee.currentHP = battle.trainee.maxHP;
    await wait(1200);
    endBattle();
    return;
  }

  const nextAlive=G.team.findIndex((pk,i)=>i!==battle.playerPokeIdx&&pk.currentHP>0);
  if(nextAlive===-1){
    addBattleLog(`<span style="color:var(--red)">Tous vos Pokémon sont KO ! Vous avez perdu...</span>`);
    const penalty=Math.floor(G.money*0.1);
    G.money-=penalty;
    updateHeader();
    addBattleLog(`Vous perdez ${penalty}₽ !`);
    await wait(1200);
    endBattle();
    setMsg('❌ Vous avez perdu ! Relancez un combat quand vous voulez : votre équipe est soignée à chaque début de combat.');
    return;
  }

  battle.playerPokeIdx=nextAlive;
  battle.playerMods={atk:1,def:1,spe:1};
  battle.pMoveIdx=0;
  addBattleLog(`Allez, ${G.team[nextAlive].name} !`);
  resetPlayerCd();
  updateBattleUI();
  renderMoveButtons();
  renderBattleTeamRow();
  await wait(300);
  resumeBattleActions();
}

function healTeamHalf(){
  for(const p of G.team){
    if(p.currentHP<=0) p.currentHP=Math.floor(p.maxHP/2);
    p.status=null;
  }
}

function showQuestCapturePanel(legMon, wasShiny){
  const el = document.getElementById('quest-capture-screen');
  const cont = document.getElementById('qcap-content');
  if(!el || !cont) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const shinyTag = wasShiny ? '<div style="color:var(--yellow);font-weight:bold;font-size:12px;margin-bottom:8px;">✨ POKÉMON SHINY CAPTURÉ ! ✨</div>' : '';
  cont.innerHTML = `
    <div style="font-size:14px;color:var(--gold);font-weight:bold;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px;">
      🎊 ${lang==='en'?'Capture!':'Capture !'}
    </div>
    ${shinyTag}
    <div style="display:flex;justify-content:center;margin:16px 0;">
      <div class="poke-sprite${wasShiny?' is-shiny':''}" style="width:96px;height:96px;border:3px solid ${wasShiny?'var(--yellow)':TYPE_COLORS[legMon.type1]||'#888'};background:${TYPE_COLORS[legMon.type1]||'#333'}22;border-radius:12px;display:flex;align-items:center;justify-content:center;">
        ${spriteImg(legMon.id, legMon.emoji, {shiny:wasShiny, size:80})}
      </div>
    </div>
    <div style="font-size:18px;font-weight:bold;color:#fff;margin-bottom:14px;">
      ${wasShiny?'✨ ':''}${legMon.name}
    </div>
    <div style="margin-bottom:20px;">
      ${typeSpan(legMon.type1)}${legMon.type2?typeSpan(legMon.type2):''}
    </div>
    <button class="hbtn" style="width:100%;padding:10px;background:var(--green);color:#fff;font-weight:bold;font-size:14px;" onclick="document.getElementById('quest-capture-screen').style.display='none'">
      ${lang==='en'?'Continue':'Continuer'}
    </button>
  `;
  el.style.display = 'flex';
}

async function champVictory(){
  if(battle.champId === 'training' || battle.isTraining){
    const trainee = battle.trainee || G.team[0];
    const mode = battle.trainingMode || 'ev';
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    let rewardMsg = '';
    if(trainee){
      if(!trainee.evs) trainee.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
      const keys = ['hp','atk','def','spa','spd','spe'];
      const avail = keys.filter(k => (trainee.evs[k]||0) < 6);
      if(avail.length > 0){
        const pk = avail[rand(0, avail.length - 1)];
        trainee.evs[pk]++;
      }
      if(mode === 'level'){
        levelUp(trainee);
        rewardMsg = ` (+1 Niveau -> Nv.${trainee.level})`;
      } else if(mode === 'hidden_ability'){
        trainee.hiddenTalentUnlocked = true;
        const tals = getSpeciesTalents(trainee.id);
        if(tals && tals[2]) trainee.talent = tals[2];
        rewardMsg = ` (Talent Caché ✨ débloqué !)`;
      } else if(mode === 'ability'){
        const tals = getSpeciesTalents(trainee.id);
        if(tals && tals[0] && tals[1]){
          trainee.talent = (trainee.talent === tals[0]) ? tals[1] : tals[0];
          rewardMsg = ` (Nouveau talent : ${getTalentName(trainee.talent)})`;
        }
      } else {
        trainee.xp += (trainee.level || 20) * 60;
        while(trainee.xp >= trainee.xpNext && trainee.level < 100) levelUp(trainee);
      }
      recalcPokeStats(trainee);
    }
    battle.isTraining = false;
    notify(lang==='en' ? `⚡ Training Complete!${rewardMsg}` : `⚡ Entraînement réussi !${rewardMsg}`, 'var(--green)');
    updateHeader(); renderTeamWindow(); renderTrainingWindow();
    await wait(1200); endBattle(); renderMap(); showTab('info');
    return;
  }
  if(battle.champId && String(battle.champId).startsWith('quest_')){
    const qId = Number(battle.champId.split('_')[1]);
    const q = STORY_QUESTS.find(x => x.id === qId);
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    if(q){
      addBattleLog(lang === 'en' ? `🎉 You defeated Legendary Boss ${getPokeName(q.rewardPoke)}!` : `🎉 Vous avez vaincu le Boss Légendaire ${getPokeName(q.rewardPoke)} !`);
      // (récompense argent/objets déjà appliquée dans claimQuest)
      if(q.rewardPoke){
        const wasShiny = !!(battle.enemyPoke && (battle.enemyPoke.shiny || battle.enemyPoke.shinyActive));
        const legMon = createPoke(q.rewardPoke, 1, wasShiny || isSpeciesShiny(q.rewardPoke));
        if(legMon){
          legMon.shinyActive = wasShiny || legMon.shinyActive;
          legMon.shiny = legMon.shinyActive;
          if(G.team.length < 6) G.team.push(legMon);
          else G.collection[String(legMon.id)] = legMon;
          G.pokedex[q.rewardPoke] = {...(G.pokedex[q.rewardPoke]||{}), seen:true, caught:true};
          if(wasShiny) unlockShinyForSpecies(q.rewardPoke);
          unlockTalentForSpecies(q.rewardPoke, legMon.talent);
          notify(lang === 'en' ? `🎉 Boss defeated! Captured ${legMon.name}${wasShiny?' ✨':''}!` : `🎉 Boss vaincu ! ${legMon.name}${wasShiny?' ✨':''} capturé !`, 'var(--green)');
          showQuestCapturePanel(legMon, wasShiny || isSpeciesShiny(q.rewardPoke));
        }
      }
      // (complétion gérée par completedQuests dans claimQuest)
      updateHeader();
      renderStoryWindow();
      saveGame();
      await wait(1500);
      endBattle();
      renderMap();
      showTab('info');
      return;
    }
  }

  const champ = CHAMPIONS[battle.champId] || { name: getChampName(battle.champId), reward: 5000, badgeName: 'Badge', badgeEmoji: '🏅', team: battle.champTeam || [] };
  const isLeague = (battle.champId === 'elite4' || battle.isLeague);
  const isFirstWin = !isLeague && !G.badges.includes(battle.champId);
  G.defeatedChamps[battle.champId] = true;

  if(isLeague){
    G.championTitle = true;
    EventBus.emit(EVENTS.LEAGUE_WON, {});
    G.money += (champ.reward || 15000);
    updateHeader();
    addBattleLog(`<span style="color:var(--gold)">🏆 Vous avez vaincu le Maître Kanto et triomphé des 5 combats de la Ligue !</span>`);
    notify(`🏆 Félicitations ! Vous obtenez le Titre de Maître Pokémon ! (+${(champ.reward||15000).toLocaleString()}₽)`, 'var(--gold)');
  } else {
    if(isFirstWin) G.badges.push(battle.champId);
    EventBus.emit(EVENTS.BADGE_EARNED, { champId: battle.champId });
    G.money += champ.reward;
    updateHeader();
    addBattleLog(`<span style="color:var(--gold)">🏅 Vous avez vaincu ${getChampName(battle.champId)} !</span>`);
    if(isFirstWin){
      addBattleLog(`Vous recevez le <b>${champ.badgeName}</b> ${champ.badgeEmoji} !`);
      notify(`🏅 ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--purple)');
    } else {
      addBattleLog(`Victoire de revanche contre ${getChampName(battle.champId)} !`);
      notify(`🔄 Revanche remportée contre ${getChampName(battle.champId)} ! (+${champ.reward.toLocaleString()}₽)`,'var(--green)');
    }
  }

  const totalXP = (champ.team || []).reduce((s,p)=>s+(p.xpYield||100)*(p.level||30),0);
  for(const pk of G.team.filter(p=>p.currentHP>0)){
    const xp=Math.floor(totalXP/Math.max(1, G.team.filter(p=>p.currentHP>0).length)/2);
    pk.xp+=xp;
    while(pk.xp>=pk.xpNext&&pk.level<100) levelUp(pk);
  }

  await wait(1500);
  endBattle();
  renderMap();
  showTab('info');

  if(isLeague){
    document.getElementById('victory-msg').textContent=`🎉 Félicitations ! Vous avez triomphé des 5 combats de la Ligue Kanto et obtenez le Titre de Maître Pokémon !`;
    document.getElementById('victory-screen').classList.add('open');
  } else {
    notify(`🏅 ${champ.badgeName} obtenu ! ${champ.badgeEmoji}`,'var(--purple)');
  }

  saveGame();
}

function endBattle(){
  clearInterval(battle.timerId);
  const hadLoot=!battle.isChamp&&(((battle.sessionCatches||[]).length)||Object.keys(battle.sessionItems||{}).length);
  battle.active=false;
  battle.paused=false;
  battle.legendaryCatch=false;
  battle.isTraining=false;
  battle.trainee=null;
  battle.enemyPoke=null;
  battle.champTeam=null;
  const idleScreen = document.getElementById('battle-idle-screen');
  const activeScene = document.getElementById('battle-active-scene');
  if(idleScreen) idleScreen.style.display = 'flex';
  if(activeScene) activeScene.style.display = 'none';
  renderTeamWindow();
  try{ renderMap(); }catch(_){}
  if(hadLoot) openBattleSummary(true);
}

// ============================================================
// UNIFIED SELECTOR & FULL-SCREEN BOX GRID MODAL
// ============================================================

// ============================================================
// HATCHERY SYSTEM (Pension & Couveuse Route 5)
// ============================================================

// ============================================================
// TRAINING SYSTEM (Salle d'Entraînement Major Bob)
// ============================================================

function restartLastBattle(){
  closeBattleSummary();
  if(battle.lastIsChamp && battle.lastChampId){
    startChampBattle(battle.lastChampId);
  } else {
    exploreArea();
  }
}

// ============================================================
// QUITTER / FUIR LE COMBAT — un seul bouton fait les deux (comportement
// identique), et il est PRIORITAIRE : un clic pendant une transition
// (KO adverse, nouveau Pokémon sauvage qui apparaît, changement de Pokémon
// après un KO côté joueur) est mémorisé et exécuté dès que la transition
// se termine, au lieu d'être ignoré silencieusement.
// ============================================================
async function doLeaveBattle(){
  if(!battle.active) return;
  battle.paused=true;
  if(battle.isChamp){
    const cName = getChampName(battle.champId);
    notify(`Vous abandonnez le combat contre ${cName}. Vous pourrez le redéfier à tout moment.`,'var(--blue)');
  } else {
    notify('🚪 Vous quittez le combat.','var(--blue)');
  }
  await wait(300);
  endBattle();
}
function leaveBattle(){
  if(!battle.active) return;
  if(battle.paused){
    // Une transition est en cours (KO / spawn) : le clic est mémorisé et
    // sera exécuté en priorité dès que la transition se termine.
    battle.pendingLeave=true;
    const btn=document.getElementById('leave-btn');
    if(btn){ btn.disabled=true; btn.textContent='⏳ Départ...'; }
    return;
  }
  doLeaveBattle();
}
// Appelé à la fin de chaque transition (KO, nouveau Pokémon sauvage, etc.)
// à la place d'un simple "battle.paused=false" : exécute en priorité toute
// action que le joueur a cliquée pendant que le jeu était en pause.
function resumeBattleActions(){
  if(battle.pendingLeave){
    battle.pendingLeave=false;
    doLeaveBattle();
    return;
  }
  if(battle.pendingSwitchIdx!=null){
    const idx=battle.pendingSwitchIdx;
    battle.pendingSwitchIdx=null;
    const p=G.team[idx];
    battle.paused=false;
    if(p&&p.currentHP>0&&idx!==battle.playerPokeIdx) doSwitchBattlePoke(idx);
    return;
  }
  battle.paused=false;
}

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

// ============================================================
// MENU BUTIN (remplace l'ancien cadre de texte affiché pendant le combat)
// ============================================================
function renderBattleSummary(){
  const el=document.getElementById('battle-summary-content');
  const inline=document.getElementById('battle-loot-inline');
  let html='';
  if(!battle.isChamp){
    html+=`<div style="font-size:11px;color:var(--gold);margin-bottom:6px">${t('live_loot')}</div>`;
    const catches=battle.sessionCatches||[];
    if(catches.length){
      const agg={};
      for(const c of catches){
        if(!agg[c.id]) agg[c.id]={id:Number(c.id),name:c.name,count:0,shinyCount:0,dupeCount:0};
        agg[c.id].count++; if(c.shiny) agg[c.id].shinyCount++; if(c.dupe) agg[c.id].dupeCount++;
      }
      html+=`<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px">`;
      for(const id in agg){
        const a=agg[id];
        html+=`<div style="display:flex;align-items:center;gap:8px;background:var(--card);border-radius:6px;padding:4px 8px;font-size:11px"><div>${spriteImg(a.id,'',{shiny:a.shinyCount>0,size:24})}</div><div style="flex:1;font-weight:bold">${a.shinyCount?'✨ ':''}${a.name}${a.dupeCount?` <span style="color:var(--dim);font-weight:normal">(x${a.dupeCount} ${t('dupe_tag')})</span>`:''}</div><div style="color:var(--gold);font-weight:bold">x${a.count}</div></div>`;
      }
      html+=`</div>`;
    }
    const itemKeys=Object.keys(battle.sessionItems||{});
    if(itemKeys.length){
      html+=`<div style="display:flex;flex-wrap:wrap;gap:4px">`;
      for(const k of itemKeys){
        const itm=ITEMS[k];
        html+=`<span style="background:var(--card);border-radius:4px;padding:2px 6px;font-size:10px">${itemIcon(k,14)} x${battle.sessionItems[k]}</span>`;
      }
      html+=`</div>`;
    }
    if(!catches.length && !itemKeys.length){
      html+=`<div style="color:var(--dim);font-size:11px">${t('no_loot_yet')}</div>`;
    }
  } else {
    html+=`<div style="color:var(--dim);font-size:11px">${t('champ_no_loot')}</div>`;
  }
  if(el) el.innerHTML=html;
  if(inline) inline.innerHTML=html;
}

function openBattleSummary(auto){
  renderBattleSummary();
  document.getElementById('battle-summary-title').textContent=t('loot_summary_title');
  document.getElementById('battle-summary-modal').classList.add('open');
}
function closeBattleSummary(){
  document.getElementById('battle-summary-modal').classList.remove('open');
}

// ============================================================
// BATTLE: team switching + enemy cooldown bars (Pokéchill-style)
// ============================================================

function switchBattlePoke(idx){
  if(!battle.active) return;
  const p=G.team[idx];
  if(!p||p.currentHP<=0||idx===battle.playerPokeIdx) return;
  if(battle.paused){
    // Transition en cours (KO / spawn) : le changement est mémorisé et
    // appliqué en priorité dès que la transition se termine.
    battle.pendingSwitchIdx=idx;
    setMsg(`⏳ ${p.name} entrera en jeu dès que possible...`);
    return;
  }
  doSwitchBattlePoke(idx);
}
function triggerEntryTalents(side){
  if(!battle.active) return;
  const p = getActivePlayerPoke();
  const e = battle.enemyPoke;
  if(!p || !e) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(side === 'player' || side === 'both'){
    if(p.talent === 'intimidate'){
      battle.enemyMods.atk = Math.max(0.25, battle.enemyMods.atk * 0.75);
      addBattleLog(lang==='en' ? `🧬 [Intimidate] ${e.name}'s Attack fell!` : `🧬 [Intimidation] L'Attaque de ${e.name} baisse !`);
    } else if(p.talent === 'regenerator'){
      p.currentHP = Math.min(p.maxHP, p.currentHP + Math.floor(p.maxHP * 0.25));
      addBattleLog(lang==='en' ? `🧬 [Regenerator] ${p.name} restored HP!` : `🧬 [Régé-Force] ${p.name} régénère ses PV !`);
    }
  }
  if(side === 'enemy' || side === 'both'){
    if(e.talent === 'intimidate'){
      battle.playerMods.atk = Math.max(0.25, battle.playerMods.atk * 0.75);
      addBattleLog(lang==='en' ? `🧬 [Intimidate] ${p.name}'s Attack fell!` : `🧬 [Intimidation] L'Attaque de ${p.name} baisse !`);
    } else if(e.talent === 'regenerator'){
      e.currentHP = Math.min(e.maxHP, e.currentHP + Math.floor(e.maxHP * 0.25));
    }
  }
  if(typeof updateBattleUI === 'function') updateBattleUI();
}

function doSwitchBattlePoke(idx){
  if(battle.isTraining){
    notify("🔒 Switch impossible : votre Pokémon s'entraîne en solo au Dojo !", "var(--red)");
    return;
  }
  const p=G.team[idx];
  if(!p||p.currentHP<=0) return;
  battle.playerPokeIdx=idx;
  battle.playerMods={atk:1,def:1,spe:1};
  battle.pMoveIdx=0;
  resetPlayerCd();
  addBattleLog(`Allez, <b>${p.name}</b> !`);
  triggerEntryTalents('player');
  updateBattleUI();
  renderMoveButtons();
  renderBattleTeamRow();
}

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
