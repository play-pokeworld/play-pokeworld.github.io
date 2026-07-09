
// ===== extracted from src/scripts/gameplay/battle.js =====
function gainXP(enemy){
  const base=Math.floor(enemy.xpYield*enemy.level/7);
  const alive=G.team.filter(p=>p.currentHP>0);
  if(!alive.length) return 0;
  // Multi-XP: every LIVING team member gains XP (KO'd Pokémon get nothing).
  const share=Math.max(1,Math.floor(base*0.7));
  for(const p of alive){
    if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
    const before=p.level;
    p.xp+=share;
    while(p.xp>=p.xpNext&&p.level<100){
      levelUp(p);
    }
    if(p.level>before) addBattleLog(`🎉 ${p.name} passe au niveau ${p.level} !`);
  }
  return share;
}
function levelUp(p){
  p.level++;
  const oldMax = p.maxHP;
  recalcPokeStats(p);
  p.currentHP = Math.min(p.maxHP, p.currentHP + (p.maxHP - oldMax));
  p.xpNext = xpForLevel(p.level+1);
  if(p.xp < xpForLevel(p.level)) p.xp = xpForLevel(p.level);
  
  const d = PD[p.id];
  if(d && d[9]){
    const targetMoves = getMovesForLevel(d[9], p.level);
    if(targetMoves.length > p.moves.length && p.moves.length < 4){
      const newMvId = targetMoves[targetMoves.length - 1].id;
      if(!p.moves.some(m => m.id === newMvId)){
        p.moves.push({id:newMvId, pp:MOVES[newMvId]?.pp||10, maxPP:MOVES[newMvId]?.pp||10});
        const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
        addBattleLog(lang === 'en' ? `💡 ${p.name} learned ${getMoveName(newMvId)} at Level ${p.level}!` : `💡 ${p.name} apprend ${getMoveName(newMvId)} au Niveau ${p.level} !`);
      }
    }
  }
  checkEvolution(p);
}
function getEvolutionMethodsHtml(id){
  const nid = Number(id);
  const methods = [];
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  
  if(LEVEL_EVO_MAP[nid] && EVO_LEVELS[nid]){
    const targetId = LEVEL_EVO_MAP[nid];
    const targetName = getPokeName(targetId);
    methods.push(`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
      <span>📈 <b>${lang==='en'?'Level Up:':'Par Niveau :'}</b> ${lang==='en'?'Evolves at <b>Level '+EVO_LEVELS[nid]+'</b> into':'Évolue au <b>Niveau '+EVO_LEVELS[nid]+'</b> en'} <b>${targetName}</b></span>
    </div>`);
  }
  
  if(STONE_EVO[nid]){
    for(const [stoneKey, targetId] of Object.entries(STONE_EVO[nid])){
      const stone = ITEMS[stoneKey];
      const targetName = getPokeName(targetId);
      const stName = getItemName(stoneKey);
      methods.push(`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <span>🪨 <b>${lang==='en'?'Stone / Item:':'Par Objet :'}</b> ${lang==='en'?'Use':'Avec'} ${stone ? stone.icon + ' <b>' + stName + '</b>' : stoneKey} → <b>${targetName}</b></span>
      </div>`);
    }
  }

  if(methods.length === 0){
    return `<div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px;font-size:11px;color:var(--dim);border:1px solid #333;">
      🌱 <b>${lang==='en'?'Evolution Method:':'Méthode d\'évolution :'}</b> ${lang==='en'?'Final stage or single-stage Pokémon (does not evolve further).':'Stade ultime ou espèce sans évolution (n\'évolue pas/plus).'}
    </div>`;
  }

  return `<div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px;font-size:11px;color:var(--text);border:1px solid #333;">
    <div style="font-weight:bold;color:var(--gold);margin-bottom:6px;">🌱 ${lang==='en'?'Evolution Method(s):':'Méthode d\'évolution :'}</div>
    ${methods.join('')}
  </div>`;
}
function checkEvolution(p){
  const evoLevel=EVO_LEVELS[p.id];
  const targetId=LEVEL_EVO_MAP[p.id];
  if(evoLevel&&targetId&&p.level>=evoLevel){
    if(p._evoDone && p._evoDone[targetId]) return;
    evolve(p,targetId);
  }
}
function evolve(p,targetId){
  const nd=PD[targetId];
  if(!nd) return;
  if(!G.evolvedSpecies) G.evolvedSpecies=[];
  if(!G.dupeCatches) G.dupeCatches={};
  // une seule évolution par espèce cible, jamais de boucle argent
  if(G.evolvedSpecies.indexOf(targetId)!==-1) return;
  if(p._evoDone && p._evoDone[targetId]) return;
  if(speciesOwned(targetId)){
    // premier doublon = 1 bonus unique, puis on bloque définitivement
    G.evolvedSpecies.push(targetId);
    G.dupeCatches[targetId]=(G.dupeCatches[targetId]||0)+1;
    const bonus=rand(150,350);
    G.money+=bonus;
    updateHeader();
    notify(`✨ ${p.name} aurait évolué en ${nd[0]}, déjà possédé ! (+${bonus}₽)`,'var(--blue)');
    if(battle.active) addBattleLog(`✨ ${p.name} aurait évolué en <b>${nd[0]}</b>, déjà possédé ! (+${bonus}₽)`);
    if(!p._evoDone) p._evoDone={};
    p._evoDone[targetId]=true;
    saveGame();
    return;
  }
  const shinyUnlock=!!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(targetId));
  const evo=createPoke(targetId,1,shinyUnlock);
  if(!evo) return;
  evo.shinyActive=shinyUnlock; evo.shiny=shinyUnlock;
  evo.shinyUnlocked=shinyUnlock;
  if(G.collection[targetId]) return; // sécurité anti-écrasement
  G.collection[targetId]=evo;
  G.evolvedSpecies.push(targetId);
  if(!p._evoDone) p._evoDone={};
  p._evoDone[targetId]=true;
  G.pokedex[targetId]={...(G.pokedex[targetId]||{}), seen:true,caught:true};
  if(shinyUnlock) unlockShinyForSpecies(targetId);
  notify(`✨ ${p.name} déclenche une évolution : ${evo.name} apparaît dans la boîte PC !`,'var(--purple)');
  if(battle.active) addBattleLog(`✨ Une évolution de ${p.name} est née : <b>${evo.name}</b> (Nv.1, → boîte) !`);
  saveGame();
}
const LEVEL_EVO_MAP = {
    1:2, 2:3, 4:5, 5:6, 7:8, 8:9, 10:11, 11:12, 13:14, 14:15, 16:17, 17:18, 19:20, 21:22, 23:24, 25:26, 27:28, 29:30, 30:31, 32:33, 33:34, 35:36, 37:38, 39:40, 41:42, 43:44, 44:45, 46:47, 48:49, 50:51, 52:53, 54:55, 56:57, 58:59, 60:61, 61:62, 63:64, 64:65, 66:67, 67:68, 69:70, 70:71, 72:73, 74:75, 75:76, 77:78, 79:80, 81:82, 84:85, 86:87, 88:89, 90:91, 92:93, 93:94, 96:97, 98:99, 100:101, 102:103, 104:105, 109:110, 111:112, 116:117, 118:119, 120:121, 129:130, 133:136, 138:139, 140:141, 147:148, 148:149, 113:242, 152:153, 153:154, 155:156, 156:157, 158:159, 159:160, 161:162, 163:164, 165:166, 167:168, 170:171, 172:25, 173:35, 174:39, 175:176, 177:178, 179:180, 180:181, 183:184, 187:188, 188:189, 194:195, 204:205, 209:210, 216:217, 218:219, 220:221, 223:224, 228:229, 231:232, 236:237, 238:124, 239:125, 240:126, 246:247, 247:248
};
const EVO_LEVELS = {
    1:16, 2:32, 4:16, 5:36, 7:16, 8:36, 10:7, 11:32, 13:7, 14:32, 16:18, 17:36, 19:20, 21:20, 23:22, 25:32, 27:22, 29:16, 30:32, 32:16, 33:32, 35:32, 37:32, 39:32, 41:22, 43:16, 44:32, 46:24, 48:31, 50:26, 52:28, 54:33, 56:28, 58:32, 60:25, 61:32, 63:16, 64:32, 66:28, 67:32, 69:21, 70:32, 72:30, 74:25, 75:32, 77:40, 79:37, 81:30, 84:31, 86:34, 88:38, 90:32, 92:25, 93:32, 96:26, 98:28, 100:30, 102:32, 104:28, 109:35, 111:42, 116:32, 118:33, 120:32, 129:20, 133:32, 138:40, 140:40, 147:30, 148:55, 113:36, 152:16, 153:32, 155:14, 156:36, 158:18, 159:30, 161:15, 163:20, 165:18, 167:22, 170:27, 172:20, 173:20, 174:20, 175:20, 177:25, 179:15, 180:30, 183:18, 187:18, 188:27, 194:20, 204:31, 209:23, 216:30, 218:38, 220:33, 223:25, 228:24, 231:25, 236:20, 238:30, 239:30, 240:30, 246:30, 247:55
};
const STONE_EVO = {
  37: {firestone:38},
  58: {firestone:59},
  133: {firestone:136, waterstone:134, thunderstone:135},
  61: {waterstone:62, kings_rock:186},
  90: {waterstone:91},
  120:{waterstone:121},
  25: {thunderstone:26},
  44: {leafstone:45, sunstone:182},
  70: {leafstone:71},
  102:{leafstone:103},
  30: {moonstone:31},
  33: {moonstone:34},
  35: {moonstone:36},
  39: {moonstone:40},
  79: {kings_rock:200},
  95: {metal_coat:208},
  117: {dragon_scale:230},
  123: {metal_coat:212},
  137: {up_grade:233},
  191: {sunstone:192},
};
function tryStoneEvo(teamIdx, stoneKey){
  const p=G.team[teamIdx];
  if(!p) return;
  const evo = STONE_EVO[p.id]?.[stoneKey];
  if(!evo){ setMsg("Cet objet n'a aucun effet sur ce Pokémon."); return; }
  if((G.inventory[stoneKey]||0)<1){ setMsg("Pierre manquante."); return; }
  G.inventory[stoneKey]--;
  if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
  const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(evo));
  const evoMon = createPoke(evo, 1, shinyUnlock);
  if(evoMon){
    evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
    G.collection[evo]=evoMon;
    G.pokedex[evo]={...(G.pokedex[evo]||{}), seen:true,caught:true};
    if(shinyUnlock) unlockShinyForSpecies(evo);
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    notify(lang==='en' ? `✨ ${p.name} evolved into ${evoMon.name} using ${getItemName(stoneKey)}!` : `✨ ${p.name} évolue en ${evoMon.name} grâce à ${getItemName(stoneKey)} !`,"var(--purple)");
    saveGame();
    if(document.querySelector('.tab.active')?.textContent.includes('Sac')){
      onInventoryClick(stoneKey);
    } else {
      openPokeModal(teamIdx);
    }
  }
}

