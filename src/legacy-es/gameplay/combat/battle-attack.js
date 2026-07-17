
function transformPokemon(attacker, defender, side){
 if(!attacker || !defender) return false;
 if(attacker._transformed){
   addBattleLog(`${attacker.name} est déjà transformé !`);
   return true;
 }
 const hpRatio = attacker.maxHP ? attacker.currentHP / attacker.maxHP : 1;
 attacker._transformBackup = {
   id: attacker.id, name: attacker.name, emoji: attacker.emoji,
   type1: attacker.type1, type2: attacker.type2,
   maxHP: attacker.maxHP, atk: attacker.atk, def: attacker.def, spa: attacker.spa, spd: attacker.spd, spe: attacker.spe,
   talent: attacker.talent, moves: (attacker.moves||[]).map(m=>({...m})), shinyActive: attacker.shinyActive, shiny: attacker.shiny
 };
 attacker._transformed = true;
 attacker._transformedFrom = defender.id;
 attacker.id = defender.id;
 attacker.name = (attacker._transformBackup.name || 'Métamorph') + ' → ' + defender.name;
 attacker.emoji = defender.emoji;
 attacker.type1 = defender.type1;
 attacker.type2 = defender.type2;
 attacker.maxHP = defender.maxHP;
 attacker.currentHP = Math.max(1, Math.min(attacker.maxHP, Math.floor(attacker.maxHP * hpRatio)));
 attacker.atk = defender.atk;
 attacker.def = defender.def;
 attacker.spa = defender.spa || defender.atk;
 attacker.spd = defender.spd || defender.def;
 attacker.spe = defender.spe;
 attacker.talent = defender.talent;
 attacker.moves = (defender.moves||[]).map(m=>({id:m.id, pp:(MOVES[m.id]?.pp||m.pp||10), maxPP:(MOVES[m.id]?.pp||m.maxPP||10)}));
 attacker.shinyActive = defender.shinyActive || defender.shiny;
 attacker.shiny = attacker.shinyActive;
 addBattleLog(`🧬 ${attacker._transformBackup.name} prend l'apparence de ${defender.name} !`);
 try{ renderMoveButtons(); }catch(_){}
 try{ renderBattleTeamRow(); }catch(_){}
 updateBattleUI();
 return true;
}
function restoreTransformedPokemon(p){
 if(!p || !p._transformed || !p._transformBackup) return;
 const b = p._transformBackup;
 const hpRatio = p.maxHP ? p.currentHP / p.maxHP : 1;
 p.id=b.id; p.name=b.name; p.emoji=b.emoji; p.type1=b.type1; p.type2=b.type2;
 p.maxHP=b.maxHP; p.currentHP=Math.max(0, Math.min(p.maxHP, Math.floor(p.maxHP*hpRatio)));
 p.atk=b.atk; p.def=b.def; p.spa=b.spa; p.spd=b.spd; p.spe=b.spe;
 p.talent=b.talent; p.moves=(b.moves||[]).map(m=>({...m}));
 p.shinyActive=b.shinyActive; p.shiny=b.shiny;
 delete p._transformed; delete p._transformedFrom; delete p._transformBackup;
}
function restoreAllTransformedPokemon(){
 try{ (G.team||[]).forEach(restoreTransformedPokemon); }catch(_){}
 try{ Object.values(G.collection||{}).forEach(restoreTransformedPokemon); }catch(_){}
 try{ (G.hatchery||[]).forEach(s=>s&&s.poke&&restoreTransformedPokemon(s.poke)); }catch(_){}
 try{ if(battle&&battle.enemyPoke) restoreTransformedPokemon(battle.enemyPoke); }catch(_){}
 try{ if(battle&&battle.champTeam) battle.champTeam.forEach(restoreTransformedPokemon); }catch(_){}
}

function handleStatusBeforeMove(poke, side){
 const s=poke.status;
 if(!s) return true;
 if(s==='sleep'){
 poke.statusTurns=(poke.statusTurns||1)-1;
 if(poke.statusTurns<=0){
 poke.status=null;poke.statusTurns=0;
 addBattleLog(tr('woke_up_log', {name:poke.name}));
 } else {
 addBattleLog(tr('sleeping_turns_log', {name:poke.name, turns:poke.statusTurns, plural:poke.statusTurns>1?'s':''}));
 updateBattleUI();return false;
 }
 }
 if(s==='freeze'){
 
 if(poke.statusTurns && poke.statusTurns > 0){
 poke.statusTurns--;
 if(poke.statusTurns <= 0){ poke.status=null; poke.statusTurns=0; addBattleLog(tr('thawed_log', {name:poke.name})); return true; }
 }
 if(chance(20)){poke.status=null;poke.statusTurns=0;addBattleLog(tr('thawed_log', {name:poke.name}));}
 else{addBattleLog(tr('frozen_skip_log', {name:poke.name}));updateBattleUI();return false;}
 }
 if(s==='para'){
 if(chance(25)){addBattleLog(tr('paralyzed_skip_log', {name:poke.name}));updateBattleUI();return false;}
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
 const attackerHeldItem = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(attacker) : attacker.heldItem;
 const defenderHeldItem = (typeof getHeldItemForPokemon === 'function') ? getHeldItemForPokemon(defender) : defender.heldItem;
 const atkMod=(side==='player'?battle.playerMods:battle.enemyMods).atk;
 const defMod=(side==='player'?battle.enemyMods:battle.playerMods).def;

 addBattleLog(tr('uses_move_log', {name:attacker.name, move:getMoveName(moveId)}));
 playAttackAnim(side);

 if(moveId === 'transform'){
 transformPokemon(attacker, defender, side);
 return;
 }

 if(defender.talent === 'levitate' && mv.type === 'Ground'){
 addBattleLog(tr('combat_attack_auto_1', {p0:defender.name}));
 return;
 }
 if(defender.talent === 'lightningrod' && mv.type === 'Electric'){
 addBattleLog(tr('combat_attack_auto_2', {p0:defender.name}));
 return;
 }
 const absorbMap = {waterabsorb:'Water', stormdrain:'Water', voltabsorb:'Electric', flashfire:'Fire', sapsipper:'Grass'};
 if(absorbMap[defender.talent] === mv.type){
 const heal = Math.max(1, Math.floor(defender.maxHP * 0.25));
 defender.currentHP = Math.min(defender.maxHP, defender.currentHP + heal);
 addBattleLog(`${defender.name} absorbe ${getMoveName(moveId)} grâce à ${getTalentName(defender.talent)} ! (+${heal} PV)`);
 updateBattleUI();
 return;
 }

 
 let acc = mv.acc || 100;
 if(attacker.talent === 'noguard' || defender.talent === 'noguard') acc = 1000;
 if(attacker.talent === 'compoundeyes') acc += 30;
 if(defender.talent === 'sandveil' || defender.talent === 'snowcloak') acc -= 20;
 if(mv.pow!==null && mv.pow!==undefined && !chance(acc)){
 addBattleLog(tr('combat_attack_auto_3', {p0:attacker.name}));
 return;
 }

 
 const eff = typeEff(mv.type, defender.type1, defender.type2);
 if(eff === 0 && !mv.fixed){
 addBattleLog(tr('combat_attack_auto_4', {p0:defender.name}));
 return;
 }

 
 if(mv.cat==='stat'){
 if(defender.status && (mv.eff === 'para' || mv.eff === 'poison' || mv.eff === 'badpoison' || mv.eff === 'sleep' || mv.eff === 'freeze' || mv.eff === 'burn')){
 addBattleLog(tr('combat_attack_auto_5', {p0:defender.name}));
 return;
 }
 if(mv.eff==='para'){
 if(defender.type1==='Electric'||defender.type2==='Electric'||defender.type1==='Ground'||defender.type2==='Ground'){
 addBattleLog(tr('combat_attack_auto_6', {p0:defender.name}));
 } else if(chance(mv.effC||100)){
 defender.status='para';
 defender.statusTurns=2; 
 addBattleLog(tr('combat_attack_auto_7', {p0:defender.name}));
 } else {
 addBattleLog(tr('combat_attack_auto_8', {p0:attacker.name}));
 }
 } else if(mv.eff==='poison'){
 if(defender.type1==='Poison'||defender.type2==='Poison'||defender.type1==='Steel'||defender.type2==='Steel'){
 addBattleLog(tr('combat_attack_auto_9', {p0:defender.name}));
 } else if(chance(mv.effC||100)){
 defender.status='poison';
 defender.statusTurns=3; 
 addBattleLog(tr('combat_attack_auto_10', {p0:defender.name}));
 } else {
 addBattleLog(tr('combat_attack_auto_11', {p0:attacker.name}));
 }
 } else if(mv.eff==='badpoison'){
 if(defender.type1==='Poison'||defender.type2==='Poison'||defender.type1==='Steel'||defender.type2==='Steel'){
 addBattleLog(tr('combat_attack_auto_12', {p0:defender.name}));
 } else if(chance(mv.effC||100)){
 defender.status='badpoison';
 defender.statusTurns=0; 
 addBattleLog(tr('combat_attack_auto_13', {p0:defender.name}));
 } else {
 addBattleLog(tr('combat_attack_auto_14', {p0:attacker.name}));
 }
 } else if(mv.eff==='burn'){
 if(defender.type1==='Fire'||defender.type2==='Fire'||defender.type1==='Water'||defender.type2==='Water'){
 addBattleLog(tr('combat_attack_auto_15', {p0:defender.name}));
 } else if(chance(mv.effC||100)){
 defender.status='burn';
 defender.statusTurns=3; 
 addBattleLog(tr('combat_attack_auto_16', {p0:defender.name}));
 } else {
 addBattleLog(tr('combat_attack_auto_17', {p0:attacker.name}));
 }
 } else if(mv.eff==='sleep'){
 if(chance(mv.effC||100)){
 defender.status='sleep';
 defender.statusTurns=rand(1,3); 
 addBattleLog(tr('combat_attack_auto_18', {p0:defender.name}));
 } else {
 addBattleLog(tr('combat_attack_auto_19', {p0:attacker.name}));
 }
 } else if(mv.eff==='freeze'){
 if(defender.type1==='Ice'||defender.type2==='Ice'||defender.type1==='Water'||defender.type2==='Water'){
 addBattleLog(tr('combat_attack_auto_20', {p0:defender.name}));
 } else if(chance(mv.effC||100)){
 defender.status='freeze';
 defender.statusTurns=3; 
 addBattleLog(tr('combat_attack_auto_21', {p0:defender.name}));
 } else {
 addBattleLog(tr('combat_attack_auto_22', {p0:attacker.name}));
 }
 } else if(mv.eff==='slow'){
 const targetMods = (side==='player'?battle.enemyMods:battle.playerMods);
 if(targetMods.spe <= 0.25){
 addBattleLog(tr('combat_attack_auto_23', {p0:defender.name}));
 } else {
 targetMods.spe = Math.max(0.25, targetMods.spe * 0.67);
 addBattleLog(tr('combat_attack_auto_24', {p0:defender.name}));
 }
 }
 updateBattleUI();
 return;
 }

 
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
 const critBlocked = defender.talent === 'shellarmor' || defender.talent === 'battlearmor';
 const critMult=(mv.crit&&!critBlocked&&chance(15))?(attacker.talent==='sniper'?2.25:1.5):1;
 const randMult=(rand(85,100)/100);

 const isSpec = mv.cat === 'spec';
 const atkModVal = (side==='player'?battle.playerMods:battle.enemyMods)[isSpec ? 'spa' : 'atk'] || 1;
 const defModVal = (side==='player'?battle.enemyMods:battle.playerMods)[isSpec ? 'spd' : 'def'] || 1;

 const atkBuff = 1 + (getHeldBuff(attacker)[isSpec ? 'spa' : 'atk'] || 0);
 const defBuff = 1 + (getHeldBuff(defender)[isSpec ? 'spd' : 'def'] || 0);
 let atk = (isSpec ? (attacker.spa || attacker.atk) : attacker.atk) * atkBuff * atkModVal;
 let def = (isSpec ? (defender.spd || defender.def) : defender.def) * defBuff * defModVal;

 if((attacker.talent === 'hugepower' || attacker.talent === 'purepower') && !isSpec){
 atk *= 1.6;
 if(chance(35)) addBattleLog(t('combat_attack_auto_25'));
 }
 if(attacker.talent === 'solarpower' && isSpec){
 atk *= 1.3;
 }
 if(attacker.talent === 'guts' && attacker.status && !isSpec){
 atk *= 1.5;
 addBattleLog(t('combat_attack_auto_26'));
 }
 if(attacker.talent === 'technician' && power <= 60){
 power = Math.floor(power * 1.5);
 }
 if(attacker.talent === 'overgrow' && mv.type === 'Grass' && attacker.currentHP < attacker.maxHP * 0.35){
 power = Math.floor(power * 1.35);
 addBattleLog(t('combat_attack_auto_27'));
 }
 if(attacker.talent === 'blaze' && mv.type === 'Fire' && attacker.currentHP < attacker.maxHP * 0.35){
 power = Math.floor(power * 1.35);
 addBattleLog(t('combat_attack_auto_28'));
 }
 if(attacker.talent === 'torrent' && mv.type === 'Water' && attacker.currentHP < attacker.maxHP * 0.35){
 power = Math.floor(power * 1.35);
 addBattleLog(t('combat_attack_auto_29'));
 }
 if(attacker.talent === 'swarm' && mv.type === 'Bug' && attacker.currentHP < attacker.maxHP * 0.35){
 power = Math.floor(power * 1.35);
 }
 if(attacker.talent === 'steelyspirit' && mv.type === 'Steel') power = Math.floor(power * 1.25);

 if(defender.talent === 'thickfat' && (mv.type === 'Fire' || mv.type === 'Ice')){
 def *= 2;
 addBattleLog(t('combat_attack_auto_30'));
 }
 if(defender.talent === 'multiscale' && defender.currentHP >= defender.maxHP){
 def *= 2;
 addBattleLog(t('combat_attack_auto_31'));
 }
 if((defender.talent === 'filter' || defender.talent === 'solidrock') && eff > 1){
 def *= 1.33;
 }
 if(defender.talent === 'marvelscale' && defender.status && !isSpec){
 def *= 1.5;
 }

 
 let itemTypeMult = 1;
 const typeItemMap = {
 'black_belt':'Fighting','black_glasses':'Dark','charcoal':'Fire',
 'dragon_fang':'Dragon','miracle_seed':'Grass','mystic_water':'Water',
 'never_melt_ice':'Ice','sharp_beak':'Flying','poison_barb':'Poison',
 'spell_tag':'Ghost','hard_stone':'Rock','magnet':'Electric',
 'silk_scarf':'Normal','twisted_spoon':'Psychic','metal_coat':'Steel',
 'thick_club':'Ground'
 };
 const heldItemType = typeItemMap[attackerHeldItem];
 if(heldItemType && heldItemType === mv.type){
 itemTypeMult = 1.2;
 }
 
 if(attackerHeldItem === 'choice_band' && mv.cat === 'phys') itemTypeMult = 1.5;
 if(attackerHeldItem === 'choice_specs' && mv.cat === 'spec') itemTypeMult = 1.5;
 
 if(attackerHeldItem === 'life_orb') itemTypeMult = 1.3;
 
 if(attackerHeldItem === 'muscle_band' && mv.cat === 'phys') itemTypeMult *= 1.1;
 
 
 
 if(attackerHeldItem === 'kings_rock' && power > 0 && chance(10) && defender.currentHP > 0){
 addBattleLog(tr('combat_attack_auto_32', {p0:attacker.name, p1:defender.name}));
 }

 let dmg=Math.max(1, Math.floor(((2*attacker.level/5+2)*power*atk/def/50+2)*stabMult*eff*critMult*randMult*itemTypeMult));
 if(side === 'enemy' && typeof battle !== 'undefined' && battle && battle.isTraining){
 dmg = Math.max(1, Math.floor(dmg * 0.25));
 }

 
 if(defenderHeldItem === 'assault_vest' && mv.cat === 'spec'){
 dmg = Math.max(1, Math.floor(dmg * 0.9));
 }

 
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
 addBattleLog(tr('combat_attack_auto_33', {p0:defender.name}));
 }

 defender.currentHP=Math.max(0,defender.currentHP-dmg);
 if(battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 if(side === 'player') battle.champTeam[battle.champPokeIdx].currentHP = defender.currentHP;
 }
 playHitAnim(side);

 if(defender.talent === 'roughskin' && mv.cat === 'phys'){
 const refl = Math.max(1, Math.floor(attacker.maxHP * 0.12));
 attacker.currentHP = Math.max(0, attacker.currentHP - refl);
 addBattleLog(tr('combat_attack_auto_34', {p0:attacker.name, p1:refl}));
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }
 if(defender.talent === 'static' && mv.cat === 'phys' && chance(25) && !attacker.status){
 attacker.status = 'para';
 attacker.statusTurns = 2; 
 addBattleLog(tr('combat_attack_auto_35', {p0:attacker.name}));
 }
 if(defender.talent === 'poisonpoint' && mv.cat === 'phys' && chance(25) && !attacker.status){
 attacker.status = 'poison';
 attacker.statusTurns = 3; 
 addBattleLog(tr('combat_attack_auto_36', {p0:attacker.name}));
 }

 const effMsg=effText(eff);
 addBattleLog(tr('combat_damage_lost', {name:defender.name, damage:dmg, effect:effMsg?' <span class="extracted-template-style-002">'+effMsg+'</span>':''}));
 if(critMult>1) addBattleLog(`<span class="extracted-template-style-154">${t('critical_hit')}</span>`);

 
 if(mv.recoil){
 const recoil=Math.max(1,Math.floor(dmg/4));
 attacker.currentHP=Math.max(0,attacker.currentHP-recoil);
 addBattleLog(tr('combat_attack_auto_37', {p0:attacker.name, p1:recoil}));
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }

 
 if(attackerHeldItem === 'life_orb' && power > 0){
 const loRecoil = Math.max(1, Math.floor(attacker.maxHP / 10));
 attacker.currentHP = Math.max(0, attacker.currentHP - loRecoil);
 addBattleLog(tr('combat_attack_auto_38', {p0:attacker.name, p1:loRecoil}));
 if(side === 'enemy' && battle.isChamp && battle.champTeam && battle.champTeam[battle.champPokeIdx]){
 battle.champTeam[battle.champPokeIdx].currentHP = attacker.currentHP;
 }
 }

 
 if(attackerHeldItem === 'kings_rock' && power > 0 && chance(10) && !defender.status && defender.currentHP > 0){
 addBattleLog(tr('combat_attack_auto_39', {p0:defender.name}));
 
 }

 
 
 let secChance = mv.effC || 0;
 if(attacker.talent === 'serenegrace') secChance *= 2;
 if(mv.eff&&secChance&&defender.currentHP>0&&!defender.status){
 if(chance(secChance)){
 if(mv.eff==='burn'&&defender.type1!=='Fire'&&defender.type2!=='Fire'){
 defender.status='burn';defender.statusTurns=3;addBattleLog(tr('combat_attack_auto_40', {p0:defender.name}));
 } else if(mv.eff==='para'){
 if(!(defender.type1==='Electric'||defender.type2==='Electric'||defender.type1==='Ground'||defender.type2==='Ground')){
 defender.status='para';defender.statusTurns=2;addBattleLog(tr('combat_attack_auto_41', {p0:defender.name}));
 }
 } else if(mv.eff==='poison'){
 if(defender.type1!=='Poison'&&defender.type2!=='Poison'&&defender.type1!=='Steel'&&defender.type2!=='Steel'){
 defender.status='poison';defender.statusTurns=3;addBattleLog(tr('combat_attack_auto_42', {p0:defender.name}));
 }
 } else if(mv.eff==='freeze'&&defender.type1!=='Ice'&&defender.type2!=='Ice'){
 defender.status='freeze';defender.statusTurns=3;addBattleLog(tr('combat_attack_auto_43', {p0:defender.name}));
 } else if(mv.eff==='sleep'){
 defender.status='sleep';defender.statusTurns=rand(1,3);addBattleLog(tr('combat_attack_auto_44', {p0:defender.name}));
 }
 }
 }

 updateBattleUI();
}


// --- Migrated to ES module, globals exposed ---
if (typeof transformPokemon !== 'undefined' && typeof window !== 'undefined') window.transformPokemon = transformPokemon;
if (typeof restoreAllTransformedPokemon !== 'undefined' && typeof window !== 'undefined') window.restoreAllTransformedPokemon = restoreAllTransformedPokemon;
if (typeof handleStatusBeforeMove !== 'undefined' && typeof window !== 'undefined') window.handleStatusBeforeMove = handleStatusBeforeMove;
if (typeof playAttackAnim !== 'undefined' && typeof window !== 'undefined') window.playAttackAnim = playAttackAnim;
if (typeof playHitAnim !== 'undefined' && typeof window !== 'undefined') window.playHitAnim = playHitAnim;
if (typeof executeAttack !== 'undefined' && typeof window !== 'undefined') window.executeAttack = executeAttack;

export {};
