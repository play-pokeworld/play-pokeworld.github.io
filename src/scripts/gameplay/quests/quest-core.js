
// ============================================================
// STATE HELPERS
// ============================================================
// --- Chaîne principale par région (une seule quête principale active par région) ---
function getRegionChain(region){ return STORY_QUESTS.filter(q=>q.region===region); }
function getCurrentMain(region){
  const chain = getRegionChain(region);
  const idx = (G.mainStep && G.mainStep[region]!=null) ? G.mainStep[region] : 0;
  return chain[idx] || null;
}
// Garantit que G.activeQuests ne contient QUE la quête principale courante
// (celle de la région où se trouve le joueur), avec la bonne progression.
// NB : ne doit PAS rappeler ensureQuestState (sinon récursion infinie).
function syncActiveMain(){
  if(!G || !G.activeQuests) return;
  const region = G.region || 'kanto';
  G.activeQuests = G.activeQuests.filter(i=>i.cat!=='main');
  const def = getCurrentMain(region);
  if(def){
    const prog = (G.mainProgress && G.mainProgress[region]!=null) ? G.mainProgress[region] : 0;
    G.activeQuests.push({qid:def.id, cat:'main', progress:prog, done:false});
  }
}

function ensureQuestState(){
  if(!G) return;
  if(!G.visitedMaps) G.visitedMaps={};
  if(!G.completedQuests) G.completedQuests={};
  if(!G.mainStep || typeof G.mainStep!=='object') G.mainStep={kanto:0, johto:0};
  if(G.mainStep.kanto==null) G.mainStep.kanto=0;
  if(G.mainStep.johto==null) G.mainStep.johto=0;
  if(!G.mainProgress || typeof G.mainProgress!=='object') G.mainProgress={kanto:0, johto:0};
  if(G.mainProgress.kanto==null) G.mainProgress.kanto=0;
  if(G.mainProgress.johto==null) G.mainProgress.johto=0;
  if(!Array.isArray(G.activeQuests)) G.activeQuests=[];
  if(!Array.isArray(G.repeatables)) G.repeatables=[];
  if(typeof G.totalWildWins!=='number') G.totalWildWins=0;
  if(typeof G.maxRepeatables!=='number') G.maxRepeatables=3;
  if(!G.wildWinsByLoc || typeof G.wildWinsByLoc!=='object') G.wildWinsByLoc={};
  if(!G.unlockedLocs || typeof G.unlockedLocs!=='object') G.unlockedLocs={};
  if(typeof G.storyIdx==='undefined') G.storyIdx=0;
  if(typeof G.storyProgress==='undefined') G.storyProgress=0;
  // Migration depuis l'ancien système linéaire (storyIdx)
  if(G._questMigrated!==true && typeof G.storyIdx==='number' && G.storyIdx>0){
    const kc = getRegionChain('kanto').length;
    G.mainStep.kanto = Math.min(G.storyIdx, kc);
    G._questMigrated = true;
  }
  // S'assurer que la quête principale courante est bien présente
  syncActiveMain();
}

function getMainQuestDef(id){ return STORY_QUESTS.find(q=>q.id===id); }
function getSideQuestDef(id){ return SIDE_QUESTS[id]; }
// Deux lieux appartiennent au meme "groupe de route" (ex: route2 et route2_south
// sont tous deux "Route 2") -> une quete les compte ensemble.
function locGroup(id){ const l=getLocObj(id); return (l&&l.group)||id; }

// Octroie les quêtes principales dont la carte vient d'être visitée (1ʳᵉ fois)
function markVisited(mapId){
  ensureQuestState();
  if(!mapId) return;
  G.visitedMaps[mapId]=true;
  // La chaîne principale avance étape par étape (complétion → quête suivante),
  // elle n'est donc plus octroyée automatiquement à la visite d'une carte.
  try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
  try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){}
}

// ============================================================
// PROGRESSION
// ============================================================
function questDone(inst, def){
  if(!def) return false;
  if(def.type==='badge'){
    if(def.targetBadge==='elite4') return !!(G.championTitle || G.badges.includes('elite4'));
    return G.badges.includes(def.targetBadge);
  }
  if(def.type==='badge_or_loc'){
    if(def.targetBadge && G.badges.includes(def.targetBadge)) return true;
    return (inst.progress||0) >= (def.target||1);
  }
  if(def.type==='talk') return (inst.progress||0) >= (def.target||1);
  return (inst.progress||0) >= (def.target||1);
}

function advanceQuests(type, loc, amount){
  ensureQuestState();
  const amt = amount||1;
  const region = G.region || 'kanto';
  // 1) Quête principale de la région COURANTE uniquement
  const mainInst = G.activeQuests.find(i=>i.cat==='main');
  if(mainInst){
    const def = getMainQuestDef(mainInst.qid);
    if(def && def.region===region && def.type===type && !mainInst.done){
      const locMatch = (type!=='defeat_wild' && type!=='catch') || !def.loc || locGroup(def.loc)===locGroup(loc);
      if(locMatch) mainInst.progress = (mainInst.progress||0) + amt;
      G.mainProgress[region] = mainInst.progress; // miroir pour la persistance inter-régions
    }
  }
  // 2) Quêtes secondaires + répétables
  const lists = [G.activeQuests, G.repeatables];
  for(const list of lists){
    for(const inst of list){
      const def = inst.cat==='side'? SIDE_QUESTS[inst.qid] : inst.def;
      if(!def) continue;
      if(inst.cat==='main') continue;
      if(inst.done) continue;
      if(def.type!==type) continue;
      if(type==='defeat_wild' || type==='catch'){
        if(def.loc!=null && locGroup(def.loc)!==locGroup(loc)) continue;
      }
      inst.progress = (inst.progress||0) + amt;
    }
  }
  try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
}

// ============================================================
// RÉCOMPENSES / CLAIM
// ============================================================
function claimQuest(qid, cat){
  ensureQuestState();
  const list = (cat==='repeatable') ? G.repeatables : G.activeQuests;
  // qid may arrive as a string (from onclick) while inst.qid is a number for
  // main quests → compare by String() so the reward can actually be claimed.
  const idx = list.findIndex(i=>String(i.qid)===String(qid) && i.cat===cat);
  if(idx<0) return;
  const inst = list[idx];
  const def = (cat==='main') ? getMainQuestDef(inst.qid)
            : (cat==='side') ? SIDE_QUESTS[inst.qid]
            : inst.def;
  if(!questDone(inst, def)){ notify('⏳ Objectif pas encore terminé !','var(--red)'); return; }

  if(def.rewardMoney) G.money += def.rewardMoney;
  if(def.rewardItems){ for(const k in def.rewardItems) addToInventory(k, def.rewardItems[k]); }

  if(cat==='main'){
    G.completedQuests[inst.qid]=true;
    const region = G.region || 'kanto';
    const chain = getRegionChain(region);
    const idx = chain.findIndex(q=>q.id===inst.qid);
    if(idx>=0) G.mainStep[region] = idx+1;
    G.mainProgress[region] = 0;
    // retirer l'instance principale, puis synchroniser la quête suivante
    G.activeQuests = G.activeQuests.filter(i=>!(i.cat==='main'));
    syncActiveMain();
  } else if(cat==='side'){
    G.completedQuests['side_'+inst.qid]=true;
  }
  list.splice(idx,1); // une fois finie (pas de suite) → elle disparaît

  const lang = G.lang||'fr';
  if(def.rewardPoke && cat==='main'){
    // Combat de Boss Légendaire (la récompense est le Pokémon légendaire)
    startLegendaryEncounter(def.rewardPoke);
  } else if(def.rewardPoke && cat==='side'){
    const legMon = createPoke(def.rewardPoke, 50, true);
    if(legMon){
      if(G.team.length<6) G.team.push(legMon); else G.collection[String(legMon.id)]=legMon;
      G.pokedex[def.rewardPoke]={...(G.pokedex[def.rewardPoke]||{}),seen:true,caught:true};
      unlockTalentForSpecies(def.rewardPoke, legMon.talent);
      notify(lang==='en'?`🎉 ${legMon.name} obtained!`:`🎉 ${legMon.name} obtenu !`,'var(--green)');
    }
  }
  updateHeader();
  try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
  try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
  saveGame();
  notify(lang==='en'?'🎉 Quest complete! Reward received!':'🎉 Quête terminée ! Récompense reçue !','var(--green)');
}

// ============================================================
// PNJ (clic sur marqueur 🗣 de la carte)
// ============================================================

function talkNpcMainQuest(npc){
  if(!npc || npc.mainTalk==null) return false;
  const region = G.region || 'kanto';
  const inst = G.activeQuests.find(i=>i.cat==='main');
  if(!inst || inst.done) return false;
  const def = getMainQuestDef(inst.qid);
  if(!def || def.id!==npc.mainTalk) return false;
  if(def.type!=='talk') return false;
  // progression persistante (syncActiveMain recrée l'instance depuis mainProgress)
  G.mainProgress[region] = (def.target||1);
  // complète immédiatement la quête (récompense + passage à la suivante)
  claimQuest(def.id, 'main');
  return true;
}

// ============================================================
// QUÊTES RÉPÉTABLES (menu accept/roll façon PokéClicker)
// ============================================================
var _repeatableRoll = [];

// ============================================================
// FENÊTRE QUÊTES (remplace l'ancienne vue linéaire)
// ============================================================

// ============================================================
// EVENT BUS — le combat (et d'autres systèmes) ÉMETTENT des événements ;
// le système de quêtes y RÉAGIT. Le combat ne vérifie jamais l'état des
// quêtes : il se contente d'annoncer « Pokémon sauvage vaincu », etc.
// ============================================================
function _refreshUI(){ try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){} }
EventBus.on(EVENTS.WILD_DEFEATED,  ({loc})  => { advanceQuests('defeat_wild', loc, 1); _refreshUI(); });
EventBus.on(EVENTS.POKEMON_CAUGHT, ({loc})  => { advanceQuests('catch', loc, 1); _refreshUI(); });
EventBus.on(EVENTS.MINE_SELL,      ({amount}) => { advanceQuests('mine_sell', null, amount); _refreshUI(); });
EventBus.on(EVENTS.BADGE_EARNED,   () => { advanceQuests('badge', null, 1); _refreshUI(); });
EventBus.on(EVENTS.LEAGUE_WON,     () => { advanceQuests('league', null, 1); _refreshUI(); });
