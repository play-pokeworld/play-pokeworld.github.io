const MOVES = {
  // Normal
  tackle:{name:'Charge',type:'Normal',pow:40,acc:100,pp:35,cat:'phys'},
  scratch:{name:'Griffe',type:'Normal',pow:40,acc:100,pp:35,cat:'phys'},
  slash:{name:'Tranche',type:'Normal',pow:70,acc:100,pp:20,cat:'phys',crit:true},
  hyperbeam:{name:'Ultralaser',type:'Normal',pow:150,acc:90,pp:5,cat:'spec',recharge:true},
  return:{name:'Retour',type:'Normal',pow:102,acc:100,pp:20,cat:'phys'},
  quickattack:{name:'Vive-Attaque',type:'Normal',pow:40,acc:100,pp:30,cat:'phys',prio:1},
  bodyslam:{name:'Jackpot',type:'Normal',pow:85,acc:100,pp:15,cat:'phys',eff:'para',effC:30},
  doubleedge:{name:'Damocles',type:'Normal',pow:120,acc:100,pp:15,cat:'phys',recoil:true},
  // Fire
  ember:{name:'Flammèche',type:'Fire',pow:40,acc:100,pp:25,cat:'spec',eff:'burn',effC:10},
  flamethrower:{name:'Lance-Flammes',type:'Fire',pow:90,acc:100,pp:15,cat:'spec',eff:'burn',effC:10},
  fireblast:{name:'Déflagration',type:'Fire',pow:110,acc:85,pp:5,cat:'spec',eff:'burn',effC:10},
  fieryspin:{name:'Tourniquet',type:'Fire',pow:35,acc:85,pp:15,cat:'spec',trap:true},
  // Water
  watergun:{name:'Pistolet à O',type:'Water',pow:40,acc:100,pp:25,cat:'spec'},
  surf:{name:'Surf',type:'Water',pow:90,acc:100,pp:15,cat:'spec'},
  hydropump:{name:'Hydroblast',type:'Water',pow:110,acc:80,pp:5,cat:'spec'},
  bubble:{name:'Bulles d\'O',type:'Water',pow:40,acc:100,pp:30,cat:'spec',eff:'slow',effC:10},
  // Grass
  vinewhip:{name:'Fouet Lianes',type:'Grass',pow:45,acc:100,pp:25,cat:'phys'},
  razorleaf:{name:'Tranche-Herbe',type:'Grass',pow:55,acc:95,pp:25,cat:'phys',crit:true},
  solarbeam:{name:'Laser Végétal',type:'Grass',pow:120,acc:100,pp:10,cat:'spec',charge:true},
  absorb:{name:'Vampigraine',type:'Grass',pow:20,acc:100,pp:25,cat:'spec',drain:true},
  // Electric
  thundershock:{name:'Éclair',type:'Electric',pow:40,acc:100,pp:30,cat:'spec',eff:'para',effC:10},
  thunderbolt:{name:'Tonnerre',type:'Electric',pow:90,acc:100,pp:15,cat:'spec',eff:'para',effC:10},
  thunder:{name:'Foudre',type:'Electric',pow:110,acc:70,pp:10,cat:'spec',eff:'para',effC:30},
  thunderwave:{name:'Cage-Éclair',type:'Electric',pow:0,acc:90,pp:20,cat:'stat',eff:'para',effC:100},
  // Psychic
  confusion:{name:'Choc Mental',type:'Psychic',pow:50,acc:100,pp:25,cat:'spec'},
  psychic:{name:'Psyko',type:'Psychic',pow:90,acc:100,pp:10,cat:'spec'},
  psybeam:{name:'Méga-Sangsue',type:'Psychic',pow:65,acc:100,pp:20,cat:'spec',eff:'confuse',effC:10},
  // Rock
  rockthrow:{name:'Jet-Pierres',type:'Rock',pow:50,acc:90,pp:15,cat:'phys'},
  rockslide:{name:'Éboulement',type:'Rock',pow:75,acc:90,pp:10,cat:'phys',eff:'flinch',effC:30},
  stoneedge:{name:'Lame de Roc',type:'Rock',pow:100,acc:80,pp:5,cat:'phys',crit:true},
  // Ground
  dig:{name:'Tunnel',type:'Ground',pow:80,acc:100,pp:10,cat:'phys'},
  earthquake:{name:'Séisme',type:'Ground',pow:100,acc:100,pp:10,cat:'phys'},
  mudshot:{name:'Gadoue',type:'Ground',pow:55,acc:95,pp:15,cat:'spec',eff:'slow',effC:100},
  // Ice
  icebeam:{name:'Laser Glace',type:'Ice',pow:90,acc:100,pp:10,cat:'spec',eff:'freeze',effC:10},
  blizzard:{name:'Blizzard',type:'Ice',pow:110,acc:70,pp:5,cat:'spec',eff:'freeze',effC:10},
  powdersnow:{name:'Poudreneige',type:'Ice',pow:40,acc:100,pp:25,cat:'spec',eff:'freeze',effC:10},
  // Fighting
  karatechop:{name:'Poing Karaté',type:'Fighting',pow:50,acc:100,pp:25,cat:'phys',crit:true},
  megapunch:{name:'Mégapoing',type:'Fighting',pow:80,acc:85,pp:20,cat:'phys'},
  jumpkick:{name:'Saut-de-Pied',type:'Fighting',pow:100,acc:95,pp:10,cat:'phys'},
  // Poison
  poisonsting:{name:'Dard-Venin',type:'Poison',pow:15,acc:100,pp:35,cat:'phys',eff:'poison',effC:30},
  sludgebomb:{name:'Bombe Beurk',type:'Poison',pow:90,acc:100,pp:10,cat:'spec',eff:'poison',effC:30},
  toxic:{name:'Toxik',type:'Poison',pow:0,acc:90,pp:10,cat:'stat',eff:'badpoison',effC:100},
  // Ghost
  lick:{name:'Léchage',type:'Ghost',pow:30,acc:100,pp:30,cat:'phys',eff:'para',effC:30},
  shadowball:{name:'Boule Ombre',type:'Ghost',pow:80,acc:100,pp:15,cat:'spec'},
  nightshade:{name:'Abyssnuit',type:'Ghost',pow:null,acc:100,pp:15,cat:'spec',fixed:true},
  // Dragon
  dragonrage:{name:'Colère',type:'Dragon',pow:null,acc:100,pp:10,cat:'spec',fixed:40},
  outrage:{name:'Colère-Feu',type:'Dragon',pow:120,acc:100,pp:10,cat:'phys'},
  dragonbreath:{name:'Dracosouffle',type:'Dragon',pow:60,acc:100,pp:20,cat:'spec',eff:'para',effC:30},
  // Flying
  gust:{name:'Rafale',type:'Flying',pow:40,acc:100,pp:35,cat:'spec'},
  wingattack:{name:'Aéropique',type:'Flying',pow:60,acc:100,pp:35,cat:'phys'},
  skyattack:{name:'Vol Plané',type:'Flying',pow:140,acc:90,pp:5,cat:'phys'},
  // Bug
  stringshot:{name:'Sécrétion',type:'Bug',pow:0,acc:95,pp:40,cat:'stat',eff:'slow',effC:100},
  bugbite:{name:'Mord-Croq',type:'Bug',pow:60,acc:100,pp:20,cat:'phys'},
  // Dark
  bite:{name:'Morsure',type:'Dark',pow:60,acc:100,pp:25,cat:'phys',eff:'flinch',effC:30},
  crunch:{name:'Croquefer',type:'Dark',pow:80,acc:100,pp:15,cat:'phys',eff:'flinch',effC:20},
  // Steel
  metalclaw:{name:'Griffe Acier',type:'Steel',pow:50,acc:95,pp:35,cat:'phys'},
  irontail:{name:'Queue de Fer',type:'Steel',pow:100,acc:75,pp:15,cat:'phys'},
  // Fairy
  dazzlinggleam:{name:'Éclat Magique',type:'Fairy',pow:80,acc:100,pp:10,cat:'spec'},
  moonblast:{name:'Éblouissement',type:'Fairy',pow:95,acc:100,pp:15,cat:'spec'},
};

// ============================================================
// POKEMON DATA
// ============================================================
// Format: [name, type1, type2|null, hp,atk,def,spe, [moves], emoji, catchRate, xp]



function syncAllNames(){
  if(!G) return;
  for(const p of (G.team || [])){
    if(p && p.id) p.name = getPokeName(p.id);
  }
  for(const k in (G.collection || {})){
    const p = G.collection[k];
    if(p && typeof p === 'object' && p.id) p.name = getPokeName(p.id);
  }
  for(const slot of (G.hatchery || [])){
    if(slot && slot.poke && slot.poke.id) slot.poke.name = getPokeName(slot.poke.id);
  }
}

















function getLocName(id){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(lang === 'en' && LOC_NAMES_EN[id]) return LOC_NAMES_EN[id];
  if(LOC_NAMES_FR[id]) return LOC_NAMES_FR[id];
  return LOCS[id]?.name || LOCS_JOHTO[id]?.name || id;
}

function getCurrentRegionLocs(){
  const reg = (typeof G !== 'undefined' && G && G.region) ? G.region : 'kanto';
  return reg === 'johto' ? LOCS_JOHTO : LOCS;
}
function getLocObj(id){
  return LOCS[id] || LOCS_JOHTO[id] || null;
}

const CHAMP_EN = {
  brock: {name:'Brock', title:'Pewter Gym Leader', bname:'Boulder Badge'},
  misty: {name:'Misty', title:'Cerulean Gym Leader', bname:'Cascade Badge'},
  surge: {name:'Lt. Surge', title:'Vermilion Gym Leader', bname:'Thunder Badge'},
  erika: {name:'Erika', title:'Celadon Gym Leader', bname:'Rainbow Badge'},
  koga:  {name:'Koga', title:'Fuchsia Gym Leader', bname:'Soul Badge'},
  sabrina: {name:'Sabrina', title:'Saffron Gym Leader', bname:'Marsh Badge'},
  blaine:{name:'Blaine', title:'Cinnabar Gym Leader', bname:'Volcano Badge'},
  giovanni:{name:'Giovanni', title:'Viridian Gym Leader', bname:'Earth Badge'},
  elite4: {name:'Kanto League (Blue)', title:'Champion', bname:'Champion Title'},
  falkner: {name:'Falkner', title:'Violet Gym Leader', bname:'Zephyr Badge'},
  bugsy:   {name:'Bugsy', title:'Azalea Gym Leader', bname:'Hive Badge'},
  whitney: {name:'Whitney', title:'Goldenrod Gym Leader', bname:'Plain Badge'},
  morty:   {name:'Morty', title:'Ecruteak Gym Leader', bname:'Fog Badge'},
  chuck:   {name:'Chuck', title:'Cianwood Gym Leader', bname:'Storm Badge'},
  jasmine: {name:'Jasmine', title:'Olivine Gym Leader', bname:'Mineral Badge'},
  pryce:   {name:'Pryce', title:'Mahogany Gym Leader', bname:'Glacier Badge'},
  clair:   {name:'Clair', title:'Blackthorn Gym Leader', bname:'Rising Badge'}
};

function getChampName(id){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(typeof battle !== 'undefined' && battle && (battle.isLeague || id === 'elite4' || battle.champId === 'elite4') && typeof battle.leagueStage === 'number' && typeof LEAGUE_TRAINERS !== 'undefined' && LEAGUE_TRAINERS[battle.leagueStage]){
    return LEAGUE_TRAINERS[battle.leagueStage].name;
  }
  if(id && String(id).startsWith('quest_')){
    return lang === 'en' ? 'Legendary Boss' : 'Boss Légendaire';
  }
  if(lang === 'en' && CHAMP_EN[id]) return CHAMP_EN[id].name;
  return CHAMPIONS[id]?.name || id || 'Adversaire';
}
function getChampTitle(id){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(lang === 'en' && CHAMP_EN[id]) return CHAMP_EN[id].title;
  return CHAMPIONS[id]?.title || id;
}
function getChampBadgeName(id){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(lang === 'en' && CHAMP_EN[id]) return CHAMP_EN[id].bname;
  return CHAMPIONS[id]?.badgeName || id;
}


function updateI18nLabels(){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const tabEls = document.querySelectorAll('.tab');
  const tabKeys = ['tab_info','tab_box','tab_mine','tab_inv','tab_shop','tab_market','tab_dex'];
  tabEls.forEach((el, i) => {
    if(tabKeys[i]) el.textContent = t(tabKeys[i]);
  });
  const mapTitle = document.querySelector('#win-map .win-header-title');
  if(mapTitle) mapTitle.textContent = '⋮⋮ ' + t('win_map');
  const teamTitle = document.querySelector('#win-team .win-header-title');
  if(teamTitle) teamTitle.textContent = '⋮⋮ ' + t('win_team');
  const battleTitle = document.querySelector('#win-battle .win-header-title');
  if(battleTitle) battleTitle.textContent = '⋮⋮ ' + t('win_battle');
  const tabsTitle = document.querySelector('#win-tabs .win-header-title');
  if(tabsTitle) tabsTitle.textContent = '⋮⋮ ' + t('win_tabs');
  const hTitle = document.getElementById('hatchery-win-title');
  if(hTitle) hTitle.textContent = lang === 'en' ? "Daycare & Hatchery" : "Pension & Couveuse";
  const trTitle = document.getElementById('training-win-title');
  if(trTitle) trTitle.textContent = lang === 'en' ? "Training Room" : "Salle d'Entraînement";
  const autoTitle = document.getElementById('auto-win-title');
  if(autoTitle) autoTitle.textContent = lang === 'en' ? "Automation (PokéClicker Tools)" : "Automatisation (PokéClicker Tools)";
  const idleTitle = document.querySelector('#battle-idle-screen div:nth-child(2)');
  const idleDesc = document.querySelector('#battle-idle-screen div:nth-child(3)');
  if(idleTitle) idleTitle.textContent = t('idle_title');
  if(idleDesc) idleDesc.innerHTML = t('idle_desc');
  const leaveBtn = document.getElementById('leave-btn');
  if(leaveBtn) leaveBtn.textContent = (battle && battle.isChamp) ? (lang==='en' ? '🏳️ Forfeit' : '🏳️ Abandonner') : t('leave_combat');
  const mobBtns = document.querySelectorAll('.mob-btn');
  if(mobBtns && mobBtns.length >= 4 && mobBtns[0] && mobBtns[1] && mobBtns[2] && mobBtns[3]){
    mobBtns[0].textContent = lang === 'en' ? '⚔️ Battle' : '⚔️ Combat';
    mobBtns[1].textContent = lang === 'en' ? '🗺️ Map' : '🗺️ Carte';
    mobBtns[2].textContent = lang === 'en' ? '⚡ Party' : '⚡ Équipe';
    mobBtns[3].textContent = lang === 'en' ? '📑 Menus' : '📑 Menus';
  }
  const lootOpenBtn = document.getElementById('loot-open-btn');
  if(lootOpenBtn) lootOpenBtn.textContent = t('loot_btn');
  const lootRestartBtn = document.getElementById('loot-restart-btn');
  if(lootRestartBtn) lootRestartBtn.textContent = t('loot_restart_btn');
  const lootContBtn = document.getElementById('loot-continue-btn');
  if(lootContBtn) lootContBtn.textContent = t('loot_continue_btn');
  const sumTitle = document.getElementById('battle-summary-title');
  if(sumTitle) sumTitle.textContent = t('loot_summary_title');
  const sel = document.getElementById('map-region-select');
  if(sel){
    sel.options[0].textContent = lang==='en' ? '🗺️ Kanto Region' : '🗺️ Région Kanto';
    sel.options[1].textContent = lang==='en' ? '🗺️ Johto Region' : '🗺️ Région Johto';
    sel.options[2].textContent = lang==='en' ? '🔒 Hoenn Region (Soon)' : '🔒 Région Hoenn (Bientôt)';
    sel.options[3].textContent = lang==='en' ? '🔒 Sinnoh Region (Soon)' : '🔒 Région Sinnoh (Bientôt)';
  }
  const mapWinTitleEl = document.getElementById('map-win-title');
  if(mapWinTitleEl) mapWinTitleEl.textContent = (lang==='en' ? 'Map: ' : 'Carte : ') + (G?.region === 'johto' ? 'Johto' : 'Kanto');
  try{ renderBattleSummary(); }catch(_){}
}



const PD = [
  null,
  ['Bulbasaur','Grass','Poison', 45,49,49,65,65,45, ['vinewhip','razorleaf','solarbeam','absorb'], 255, 64],
  ['Ivysaur','Grass','Poison', 60,62,63,80,80,60, ['vinewhip','razorleaf','solarbeam','absorb'], 45, 142],
  ['Venusaur','Grass','Poison', 80,82,83,100,100,80, ['vinewhip','razorleaf','solarbeam','absorb'], 45, 236],
  ['Charmander','Fire',null, 39,52,43,60,50,65, ['ember','flamethrower','fireblast','fieryspin'], 255, 62],
  ['Charmeleon','Fire',null, 58,64,58,80,65,80, ['ember','flamethrower','fireblast','fieryspin'], 45, 142],
  ['Charizard','Fire','Flying', 78,84,78,109,85,100, ['ember','flamethrower','fireblast','fieryspin'], 45, 240],
  ['Squirtle','Water',null, 44,48,65,50,64,43, ['watergun','bubble','surf','hydropump'], 255, 63],
  ['Wartortle','Water',null, 59,63,80,65,80,58, ['watergun','bubble','surf','hydropump'], 45, 142],
  ['Blastoise','Water',null, 79,83,100,85,105,78, ['watergun','bubble','surf','hydropump'], 45, 239],
  ['Caterpie','Bug',null, 45,30,35,20,20,45, ['stringshot','bugbite','tackle','scratch'], 255, 39],
  ['Metapod','Bug',null, 50,20,55,25,25,30, ['stringshot','bugbite','tackle','scratch'], 120, 72],
  ['Butterfree','Bug','Flying', 60,45,50,90,80,70, ['stringshot','bugbite','gust','wingattack'], 45, 178],
  ['Weedle','Bug','Poison', 40,35,30,20,20,50, ['stringshot','bugbite','poisonsting','sludgebomb'], 255, 39],
  ['Kakuna','Bug','Poison', 45,25,50,25,25,35, ['stringshot','bugbite','poisonsting','sludgebomb'], 120, 72],
  ['Beedrill','Bug','Poison', 65,90,40,45,80,75, ['stringshot','bugbite','poisonsting','sludgebomb'], 45, 178],
  ['Pidgey','Normal','Flying', 40,45,40,35,35,56, ['tackle','scratch','slash','quickattack'], 255, 50],
  ['Pidgeotto','Normal','Flying', 63,60,55,50,50,71, ['tackle','scratch','slash','quickattack'], 120, 122],
  ['Pidgeot','Normal','Flying', 83,80,75,70,70,101, ['tackle','scratch','slash','quickattack'], 45, 216],
  ['Rattata','Normal',null, 30,56,35,25,35,72, ['tackle','scratch','slash','quickattack'], 255, 51],
  ['Raticate','Normal',null, 55,81,60,50,70,97, ['tackle','scratch','slash','quickattack'], 127, 145],
  ['Spearow','Normal','Flying', 40,60,30,31,31,70, ['tackle','scratch','slash','quickattack'], 255, 52],
  ['Fearow','Normal','Flying', 65,90,65,61,61,100, ['tackle','scratch','slash','quickattack'], 90, 155],
  ['Ekans','Poison',null, 35,60,44,40,54,55, ['poisonsting','sludgebomb','toxic','tackle'], 255, 58],
  ['Arbok','Poison',null, 60,95,69,65,79,80, ['poisonsting','sludgebomb','toxic','tackle'], 90, 157],
  ['Pikachu','Electric',null, 35,55,40,50,50,90, ['thundershock','thunderbolt','thunder','thunderwave'], 190, 112],
  ['Raichu','Electric',null, 60,90,55,90,80,110, ['thundershock','thunderbolt','thunder','thunderwave'], 75, 218],
  ['Sandshrew','Ground',null, 50,75,85,20,30,40, ['dig','earthquake','mudshot','tackle'], 255, 60],
  ['Sandslash','Ground',null, 75,100,110,45,55,65, ['dig','earthquake','mudshot','tackle'], 90, 158],
  ['Nidoran♀','Poison',null, 55,47,52,40,40,41, ['poisonsting','sludgebomb','toxic','tackle'], 235, 55],
  ['Nidorina','Poison',null, 70,62,67,55,55,56, ['poisonsting','sludgebomb','toxic','tackle'], 120, 128],
  ['Nidoqueen','Poison','Ground', 90,92,87,75,85,76, ['poisonsting','sludgebomb','toxic','dig'], 45, 227],
  ['Nidoran♂','Poison',null, 46,57,40,40,40,50, ['poisonsting','sludgebomb','toxic','tackle'], 235, 55],
  ['Nidorino','Poison',null, 61,72,57,55,55,65, ['poisonsting','sludgebomb','toxic','tackle'], 120, 128],
  ['Nidoking','Poison','Ground', 81,102,77,85,75,85, ['poisonsting','sludgebomb','toxic','dig'], 45, 227],
  ['Clefairy','Fairy',null, 70,45,48,60,65,35, ['dazzlinggleam','moonblast','tackle','scratch'], 150, 113],
  ['Clefable','Fairy',null, 95,70,73,95,90,60, ['dazzlinggleam','moonblast','tackle','scratch'], 25, 217],
  ['Vulpix','Fire',null, 38,41,40,50,65,65, ['ember','flamethrower','fireblast','fieryspin'], 190, 60],
  ['Ninetales','Fire',null, 73,76,75,81,100,100, ['ember','flamethrower','fireblast','fieryspin'], 75, 177],
  ['Jigglypuff','Normal','Fairy', 115,45,20,45,25,20, ['tackle','scratch','slash','quickattack'], 170, 95],
  ['Wigglytuff','Normal','Fairy', 140,70,45,85,50,45, ['tackle','scratch','slash','quickattack'], 50, 196],
  ['Zubat','Poison','Flying', 40,45,35,30,40,55, ['poisonsting','sludgebomb','toxic','gust'], 255, 49],
  ['Golbat','Poison','Flying', 75,80,70,65,75,90, ['poisonsting','sludgebomb','toxic','gust'], 90, 159],
  ['Oddish','Grass','Poison', 45,50,55,75,65,30, ['vinewhip','razorleaf','solarbeam','absorb'], 255, 64],
  ['Gloom','Grass','Poison', 60,65,70,85,75,40, ['vinewhip','razorleaf','solarbeam','absorb'], 120, 138],
  ['Vileplume','Grass','Poison', 75,80,85,110,90,50, ['vinewhip','razorleaf','solarbeam','absorb'], 45, 221],
  ['Paras','Bug','Grass', 35,70,55,45,55,25, ['stringshot','bugbite','vinewhip','razorleaf'], 190, 70],
  ['Parasect','Bug','Grass', 60,95,80,60,80,30, ['stringshot','bugbite','vinewhip','razorleaf'], 75, 142],
  ['Venonat','Bug','Poison', 60,55,50,40,55,45, ['stringshot','bugbite','poisonsting','sludgebomb'], 190, 61],
  ['Venomoth','Bug','Poison', 70,65,60,90,75,90, ['stringshot','bugbite','poisonsting','sludgebomb'], 75, 158],
  ['Diglett','Ground',null, 10,55,25,35,45,95, ['dig','earthquake','mudshot','tackle'], 255, 53],
  ['Dugtrio','Ground',null, 35,100,50,50,70,120, ['dig','earthquake','mudshot','tackle'], 50, 149],
  ['Meowth','Normal',null, 40,45,35,40,40,90, ['tackle','scratch','slash','quickattack'], 255, 58],
  ['Persian','Normal',null, 65,70,60,65,65,115, ['tackle','scratch','slash','quickattack'], 90, 154],
  ['Psyduck','Water',null, 50,52,48,65,50,55, ['watergun','bubble','surf','hydropump'], 190, 64],
  ['Golduck','Water',null, 80,82,78,95,80,85, ['watergun','bubble','surf','hydropump'], 75, 175],
  ['Mankey','Fighting',null, 40,80,35,35,45,70, ['karatechop','megapunch','jumpkick','tackle'], 190, 61],
  ['Primeape','Fighting',null, 65,105,60,60,70,95, ['karatechop','megapunch','jumpkick','tackle'], 75, 159],
  ['Growlithe','Fire',null, 55,70,45,70,50,60, ['ember','flamethrower','fireblast','fieryspin'], 190, 70],
  ['Arcanine','Fire',null, 90,110,80,100,80,95, ['ember','flamethrower','fireblast','fieryspin'], 75, 194],
  ['Poliwag','Water',null, 40,50,40,40,40,90, ['watergun','bubble','surf','hydropump'], 255, 60],
  ['Poliwhirl','Water',null, 65,65,65,50,50,90, ['watergun','bubble','surf','hydropump'], 120, 135],
  ['Poliwrath','Water','Fighting', 90,95,95,70,90,70, ['watergun','bubble','surf','hydropump'], 45, 230],
  ['Abra','Psychic',null, 25,20,15,105,55,90, ['confusion','psychic','psybeam','tackle'], 200, 62],
  ['Kadabra','Psychic',null, 40,35,30,120,70,105, ['confusion','psychic','psybeam','tackle'], 100, 140],
  ['Alakazam','Psychic',null, 55,50,45,135,95,120, ['confusion','psychic','psybeam','tackle'], 50, 221],
  ['Machop','Fighting',null, 70,80,50,35,35,35, ['karatechop','megapunch','jumpkick','tackle'], 180, 61],
  ['Machoke','Fighting',null, 80,100,70,50,60,45, ['karatechop','megapunch','jumpkick','tackle'], 90, 142],
  ['Machamp','Fighting',null, 90,130,80,65,85,55, ['karatechop','megapunch','jumpkick','tackle'], 45, 227],
  ['Bellsprout','Grass','Poison', 50,75,35,70,30,40, ['vinewhip','razorleaf','solarbeam','absorb'], 255, 60],
  ['Weepinbell','Grass','Poison', 65,90,50,85,45,55, ['vinewhip','razorleaf','solarbeam','absorb'], 120, 137],
  ['Victreebel','Grass','Poison', 80,105,65,100,70,70, ['vinewhip','razorleaf','solarbeam','absorb'], 45, 221],
  ['Tentacool','Water','Poison', 40,40,35,50,100,70, ['watergun','bubble','surf','hydropump'], 190, 67],
  ['Tentacruel','Water','Poison', 80,70,65,80,120,100, ['watergun','bubble','surf','hydropump'], 60, 180],
  ['Geodude','Rock','Ground', 40,80,100,30,30,20, ['rockthrow','rockslide','stoneedge','dig'], 255, 60],
  ['Graveler','Rock','Ground', 55,95,115,45,45,35, ['rockthrow','rockslide','stoneedge','dig'], 120, 137],
  ['Golem','Rock','Ground', 80,120,130,55,65,45, ['rockthrow','rockslide','stoneedge','dig'], 45, 223],
  ['Ponyta','Fire',null, 50,85,55,65,65,90, ['ember','flamethrower','fireblast','fieryspin'], 190, 82],
  ['Rapidash','Fire',null, 65,100,70,80,80,105, ['ember','flamethrower','fireblast','fieryspin'], 60, 175],
  ['Slowpoke','Water','Psychic', 90,65,65,40,40,15, ['watergun','bubble','surf','hydropump'], 190, 63],
  ['Slowbro','Water','Psychic', 95,75,110,100,80,30, ['watergun','bubble','surf','hydropump'], 75, 172],
  ['Magnemite','Electric','Steel', 25,35,70,95,55,45, ['thundershock','thunderbolt','thunder','thunderwave'], 190, 65],
  ['Magneton','Electric','Steel', 50,60,95,120,70,70, ['thundershock','thunderbolt','thunder','thunderwave'], 60, 163],
  ['Farfetch\'d','Normal','Flying', 52,90,55,58,62,60, ['tackle','scratch','slash','quickattack'], 45, 132],
  ['Doduo','Normal','Flying', 35,85,45,35,35,75, ['tackle','scratch','slash','quickattack'], 190, 62],
  ['Dodrio','Normal','Flying', 60,110,70,60,60,110, ['tackle','scratch','slash','quickattack'], 45, 165],
  ['Seel','Water',null, 65,45,55,45,70,45, ['watergun','bubble','surf','hydropump'], 190, 65],
  ['Dewgong','Water','Ice', 90,70,80,70,95,70, ['watergun','bubble','surf','hydropump'], 75, 166],
  ['Grimer','Poison',null, 80,80,50,40,50,25, ['poisonsting','sludgebomb','toxic','tackle'], 190, 65],
  ['Muk','Poison',null, 105,105,75,65,100,50, ['poisonsting','sludgebomb','toxic','tackle'], 75, 175],
  ['Shellder','Water',null, 30,65,100,45,25,40, ['watergun','bubble','surf','hydropump'], 190, 61],
  ['Cloyster','Water','Ice', 50,95,180,85,45,70, ['watergun','bubble','surf','hydropump'], 60, 184],
  ['Gastly','Ghost','Poison', 30,35,30,100,35,80, ['confusion','psychic','psybeam','tackle'], 190, 62],
  ['Haunter','Ghost','Poison', 45,50,45,115,55,95, ['confusion','psychic','psybeam','tackle'], 90, 142],
  ['Gengar','Ghost','Poison', 60,65,60,130,75,110, ['confusion','psychic','psybeam','tackle'], 45, 225],
  ['Onix','Rock','Ground', 35,45,160,30,45,70, ['rockthrow','rockslide','stoneedge','dig'], 45, 77],
  ['Drowzee','Psychic',null, 60,48,45,43,90,42, ['confusion','psychic','psybeam','tackle'], 190, 66],
  ['Hypno','Psychic',null, 85,73,70,73,115,67, ['confusion','psychic','psybeam','tackle'], 75, 169],
  ['Krabby','Water',null, 30,105,90,25,25,50, ['watergun','bubble','surf','hydropump'], 225, 65],
  ['Kingler','Water',null, 55,130,115,50,50,75, ['watergun','bubble','surf','hydropump'], 60, 166],
  ['Voltorb','Electric',null, 40,30,50,55,55,100, ['thundershock','thunderbolt','thunder','thunderwave'], 190, 66],
  ['Electrode','Electric',null, 60,50,70,80,80,150, ['thundershock','thunderbolt','thunder','thunderwave'], 60, 172],
  ['Exeggcute','Grass','Psychic', 60,40,80,60,45,40, ['vinewhip','razorleaf','solarbeam','absorb'], 90, 65],
  ['Exeggutor','Grass','Psychic', 95,95,85,125,75,55, ['vinewhip','razorleaf','solarbeam','absorb'], 45, 186],
  ['Cubone','Ground',null, 50,50,95,40,50,35, ['dig','earthquake','mudshot','tackle'], 190, 64],
  ['Marowak','Ground',null, 60,80,110,50,80,45, ['dig','earthquake','mudshot','tackle'], 75, 149],
  ['Hitmonlee','Fighting',null, 50,120,53,35,110,87, ['karatechop','megapunch','jumpkick','tackle'], 45, 159],
  ['Hitmonchan','Fighting',null, 50,105,79,35,110,76, ['karatechop','megapunch','jumpkick','tackle'], 45, 159],
  ['Lickitung','Normal',null, 90,55,75,60,75,30, ['tackle','scratch','slash','quickattack'], 45, 77],
  ['Koffing','Poison',null, 40,65,95,60,45,35, ['poisonsting','sludgebomb','toxic','tackle'], 190, 68],
  ['Weezing','Poison',null, 65,90,120,85,70,60, ['poisonsting','sludgebomb','toxic','tackle'], 60, 172],
  ['Rhyhorn','Ground','Rock', 80,85,95,30,30,25, ['dig','earthquake','mudshot','rockthrow'], 120, 69],
  ['Rhydon','Ground','Rock', 105,130,120,45,45,40, ['dig','earthquake','mudshot','rockthrow'], 60, 170],
  ['Chansey','Normal',null, 250,5,5,35,105,50, ['tackle','scratch','slash','quickattack'], 30, 395],
  ['Tangela','Grass',null, 65,55,115,100,40,60, ['vinewhip','razorleaf','solarbeam','absorb'], 45, 87],
  ['Kangaskhan','Normal',null, 105,95,80,40,80,90, ['tackle','scratch','slash','quickattack'], 45, 172],
  ['Horsea','Water',null, 30,40,70,70,25,60, ['watergun','bubble','surf','hydropump'], 225, 59],
  ['Seadra','Water',null, 55,65,95,95,45,85, ['watergun','bubble','surf','hydropump'], 75, 154],
  ['Goldeen','Water',null, 45,67,60,35,50,63, ['watergun','bubble','surf','hydropump'], 225, 64],
  ['Seaking','Water',null, 80,92,65,65,80,68, ['watergun','bubble','surf','hydropump'], 60, 158],
  ['Staryu','Water',null, 30,45,55,70,55,85, ['watergun','bubble','surf','hydropump'], 225, 68],
  ['Starmie','Water','Psychic', 60,75,85,100,85,115, ['watergun','bubble','surf','hydropump'], 60, 182],
  ['Mr. Mime','Psychic','Fairy', 40,45,65,100,120,90, ['confusion','psychic','psybeam','tackle'], 45, 161],
  ['Scyther','Bug','Flying', 70,110,80,55,80,105, ['stringshot','bugbite','gust','wingattack'], 45, 100],
  ['Jynx','Ice','Psychic', 65,50,35,115,95,95, ['icebeam','blizzard','confusion','psychic'], 45, 159],
  ['Electabuzz','Electric',null, 65,83,57,95,85,105, ['thundershock','thunderbolt','thunder','thunderwave'], 45, 172],
  ['Magmar','Fire',null, 65,95,57,100,85,93, ['ember','flamethrower','fireblast','fieryspin'], 45, 173],
  ['Pinsir','Bug',null, 65,125,100,55,70,85, ['stringshot','bugbite','tackle','scratch'], 45, 175],
  ['Tauros','Normal',null, 75,100,95,40,70,110, ['tackle','scratch','slash','quickattack'], 45, 172],
  ['Magikarp','Water',null, 20,10,55,15,20,80, ['watergun','bubble','surf','hydropump'], 255, 40],
  ['Gyarados','Water','Flying', 95,125,79,60,100,81, ['watergun','bubble','surf','hydropump'], 45, 189],
  ['Lapras','Water','Ice', 130,85,80,85,95,60, ['watergun','bubble','surf','hydropump'], 45, 187],
  ['Ditto','Normal',null, 48,48,48,48,48,48, ['tackle','scratch','slash','quickattack'], 35, 101],
  ['Eevee','Normal',null, 55,55,50,45,65,55, ['tackle','scratch','slash','quickattack'], 45, 65],
  ['Vaporeon','Water',null, 130,65,60,110,95,65, ['watergun','bubble','surf','hydropump'], 45, 184],
  ['Jolteon','Electric',null, 65,65,60,110,95,130, ['thundershock','thunderbolt','thunder','thunderwave'], 45, 184],
  ['Flareon','Fire',null, 65,130,60,95,110,65, ['ember','flamethrower','fireblast','fieryspin'], 45, 184],
  ['Porygon','Normal',null, 65,60,70,85,75,40, ['tackle','scratch','slash','quickattack'], 45, 79],
  ['Omanyte','Rock','Water', 35,40,100,90,55,35, ['rockthrow','rockslide','stoneedge','watergun'], 45, 71],
  ['Omastar','Rock','Water', 70,60,125,115,70,55, ['rockthrow','rockslide','stoneedge','watergun'], 45, 173],
  ['Kabuto','Rock','Water', 30,80,90,55,45,55, ['rockthrow','rockslide','stoneedge','watergun'], 45, 71],
  ['Kabutops','Rock','Water', 60,115,105,65,70,80, ['rockthrow','rockslide','stoneedge','watergun'], 45, 173],
  ['Aerodactyl','Rock','Flying', 80,105,65,60,75,130, ['rockthrow','rockslide','stoneedge','gust'], 45, 180],
  ['Snorlax','Normal',null, 160,110,65,65,110,30, ['tackle','scratch','slash','quickattack'], 25, 189],
  ['Articuno','Ice','Flying', 90,85,100,95,125,85, ['icebeam','blizzard','powdersnow','gust'], 3, 261],
  ['Zapdos','Electric','Flying', 90,90,85,125,90,100, ['thundershock','thunderbolt','thunder','thunderwave'], 3, 261],
  ['Moltres','Fire','Flying', 90,100,90,125,85,90, ['ember','flamethrower','fireblast','fieryspin'], 3, 261],
  ['Dratini','Dragon',null, 41,64,45,50,50,50, ['dragonrage','outrage','dragonbreath','tackle'], 45, 60],
  ['Dragonair','Dragon',null, 61,84,65,70,70,70, ['dragonrage','outrage','dragonbreath','tackle'], 45, 147],
  ['Dragonite','Dragon','Flying', 91,134,95,100,100,80, ['dragonrage','outrage','dragonbreath','gust'], 45, 270],
  ['Mewtwo','Psychic',null, 106,110,90,154,90,130, ['confusion','psychic','psybeam','tackle'], 3, 306],
  ['Mew','Psychic',null, 100,100,100,100,100,100, ['confusion','psychic','psybeam','tackle'], 45, 270]
];



// ============================================================
// SPRITES (real Pokémon sprites, sourced from the public PokeAPI
// sprite CDN — not redrawn/hosted by us). Maps our internal PD
// index to the matching National Pokédex number.
// ============================================================
const DEX_MAP = {
  1:1,
  2:2,
  3:3,
  4:4,
  5:5,
  6:6,
  7:7,
  8:8,
  9:9,
  10:10,
  11:11,
  12:12,
  13:13,
  14:14,
  15:15,
  16:16,
  17:17,
  18:18,
  19:19,
  20:20,
  21:21,
  22:22,
  23:23,
  24:24,
  25:25,
  26:26,
  27:27,
  28:28,
  29:29,
  30:30,
  31:31,
  32:32,
  33:33,
  34:34,
  35:35,
  36:36,
  37:37,
  38:38,
  39:39,
  40:40,
  41:41,
  42:42,
  43:43,
  44:44,
  45:45,
  46:46,
  47:47,
  48:48,
  49:49,
  50:50,
  51:51,
  52:52,
  53:53,
  54:54,
  55:55,
  56:56,
  57:57,
  58:58,
  59:59,
  60:60,
  61:61,
  62:62,
  63:63,
  64:64,
  65:65,
  66:66,
  67:67,
  68:68,
  69:69,
  70:70,
  71:71,
  72:72,
  73:73,
  74:74,
  75:75,
  76:76,
  77:77,
  78:78,
  79:79,
  80:80,
  81:81,
  82:82,
  83:83,
  84:84,
  85:85,
  86:86,
  87:87,
  88:88,
  89:89,
  90:90,
  91:91,
  92:92,
  93:93,
  94:94,
  95:95,
  96:96,
  97:97,
  98:98,
  99:99,
  100:100,
  101:101,
  102:102,
  103:103,
  104:104,
  105:105,
  106:106,
  107:107,
  108:108,
  109:109,
  110:110,
  111:111,
  112:112,
  113:113,
  114:114,
  115:115,
  116:116,
  117:117,
  118:118,
  119:119,
  120:120,
  121:121,
  122:122,
  123:123,
  124:124,
  125:125,
  126:126,
  127:127,
  128:128,
  129:129,
  130:130,
  131:131,
  132:132,
  133:133,
  134:134,
  135:135,
  136:136,
  137:137,
  138:138,
  139:139,
  140:140,
  141:141,
  142:142,
  143:143,
  144:144,
  145:145,
  146:146,
  147:147,
  148:148,
  149:149,
  150:150,
  151:151
};
