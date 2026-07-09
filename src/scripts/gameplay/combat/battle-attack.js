// ============================================================
// BATTLE ATTACK — (split from battle.js)
// ============================================================
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
