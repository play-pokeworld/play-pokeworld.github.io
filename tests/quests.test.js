'use strict';
// Tests fonctionnels du NOUVEAU système de quêtes (une quête principale par
// région, progression par chaîne, quêtes secondaires cumulables par région,
// quêtes répétables limitées et visibles partout).
const fs = require('fs');
const vm = require('vm');
const ORDER = [
  'src/scripts/core/state.js','src/scripts/core/event-bus.js','src/scripts/core/util.js','src/scripts/core/pokemon-factory.js',
  'src/languages/translations.js','src/languages/i18n.js',
  'src/scripts/data/moves.js','src/scripts/data/sprites.js','src/scripts/data/game-data.js','src/scripts/data/quest-data.js',
  'src/scripts/display/sprite-helpers.js',
  'src/scripts/gameplay/world/world.js','src/scripts/gameplay/world/collection.js','src/scripts/gameplay/world/team.js',
  'src/scripts/gameplay/quests/quest-core.js','src/scripts/gameplay/quests/quest-ui.js',
  'src/scripts/gameplay/economy/mine.js','src/scripts/gameplay/economy/inventory.js','src/scripts/gameplay/economy/shop.js','src/scripts/gameplay/economy/market.js','src/scripts/gameplay/economy/pokedex.js',
  'src/scripts/gameplay/combat/battle.js','src/scripts/gameplay/combat/progression.js','src/scripts/gameplay/combat/catch.js','src/scripts/gameplay/combat/training.js','src/scripts/gameplay/combat/move-learning.js',
  'src/scripts/gameplay/breeding/hatchery.js','src/scripts/gameplay/automation/automation.js','src/scripts/gameplay/boxes/box-selector.js',
  'src/scripts/gameplay/save/save.js','src/scripts/gameplay/save/settings.js',
  'src/scripts/data/map-images.js','src/scripts/display/map.js','src/scripts/display/bootstrap.js'
];
function mk(path){const fn=function(){return mk(path);};fn.__p=path;const handler={get(t,prop){if(prop===Symbol.toPrimitive)return()=>0;if(prop===Symbol.iterator)return function*(){};if(prop===Symbol.toStringTag)return'Proxy';if(prop==='toString')return()=>'';if(prop==='valueOf')return()=>0;if(prop==='length')return 0;if(prop==='nodeType')return 1;if(prop==='classList')return{add(){},remove(){},toggle(){},contains(){return false;}};if(prop==='style')return mk(path+'.style');if(prop==='dataset')return {};if(prop in t)return t[prop];return mk(path+'.'+String(prop));},set(t,prop,val){t[prop]=val;return true;},apply(){return mk(path+'()');},construct(){return mk('new'+path);}};return new Proxy(fn,handler);}
function makeDocument(){return{getElementById:()=>mk('el'),querySelector:()=>mk('el'),querySelectorAll:()=>[],createElement:()=>mk('el'),createTextNode:()=>mk('text'),addEventListener:()=>{},body:mk('body'),documentElement:mk('html'),title:'',cookie:''};}
const sandbox={Set:Set, Map:Map, WeakMap:WeakMap, WeakSet:WeakSet, console,Math:Math,JSON:JSON,Object:Object,Array:Array,Date:Date,Number:Number,String:String,Boolean:Boolean,Symbol:Symbol,parseInt:parseInt,parseFloat:parseFloat,isNaN:isNaN,RegExp:RegExp,Promise:Promise,document:makeDocument(),window:null,localStorage:{_d:{},getItem(k){return this._d[k]??null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];}},setTimeout:()=>0,setInterval:()=>0,clearInterval:()=>{},clearTimeout:()=>{},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},addEventListener:()=>{},removeEventListener:()=>{},dispatchEvent:()=>{},Image:function(){return mk('Image');},Audio:function(){return mk('Audio');},Notification:function(){return mk('Notification');},fetch:()=>Promise.resolve(mk('resp')),navigator:{userAgent:'node',language:'fr'},location:{href:'',hash:''},alert:()=>{},prompt:()=>null,confirm:()=>true};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.self=sandbox;
const handler={get(t,prop){if(prop in t)return t[prop];if(typeof prop==='symbol')return undefined;return mk('global.'+String(prop));},set(t,prop,val){t[prop]=val;return 1;},has(){return true;}};
const ctx=new Proxy(sandbox,handler);
let code='';
for(const f of ORDER) code+='\n;//==='+f+'===\n'+fs.readFileSync(f,'utf8');
let G, pass=0, fail=0;
function check(name,cond){ if(cond){pass++;console.log('  ✅ '+name);} else {fail++;console.log('  ❌ '+name);} }
try{
  vm.runInNewContext(code,ctx,{filename:'concat.js',timeout:8000});
  G=ctx.G;
  console.log('--- Init ---');
  check('G defined', !!G);
  check('NPCS defined', !!ctx.NPCS && Object.keys(ctx.NPCS).length>0);
  check('STORY_QUESTS Kanto chain >= 30', ctx.getRegionChain('kanto').length>=30);
  check('STORY_QUESTS Johto chain == 17', ctx.getRegionChain('johto').length===17);
  check('new game: prof Chen (id30) is the active Kanto main', G.activeQuests.some(i=>i.qid===30&&i.cat==='main'));
  check('only ONE main quest active', G.activeQuests.filter(i=>i.cat==='main').length===1);
  check('totalWildWins field exists', typeof G.totalWildWins==='number');
  check('maxRepeatables field exists', typeof G.maxRepeatables==='number');
  check('route1.minWins === 10 (route gating)', ctx.LOCS.route1.minWins===10);
  check('viridian (town) minWins === 0', ctx.LOCS.viridian.minWins===0);
  // chaîne de progression style PokéClicker (verrou par lieu via `conn`)
  check('viridian locked before route1 cleared', ctx.locReachable('viridian')===false);
  G.wildWinsByLoc = G.wildWinsByLoc||{}; G.wildWinsByLoc.route1 = 10;
  check('viridian reachable after route1 cleared (10 wins)', ctx.locReachable('viridian')===true);
  check('route2 reachable after viridian cleared (town, 0)', ctx.locReachable('route2')===true);
  G.wildWinsByLoc = {};
  check('story window renders without error', (ctx.renderStoryWindow(), true));

  console.log('--- Talk to Prof Chen (pallet) ---');
  ctx.openNpc('pallet',0);
  check('prof Chen talk advanced chain to route1 (id0)', G.activeQuests.some(i=>i.qid===0&&i.cat==='main'));
  check('only ONE main after talk', G.activeQuests.filter(i=>i.cat==='main').length===1);

  console.log('--- Advance q0 (route1 x3) ---');
  ctx.advanceQuests('defeat_wild','route1',3);
  const q0=G.activeQuests.find(i=>i.qid===0);
  check('q0 progress=3', q0&&q0.progress===3);
  check('q0 done', q0&&ctx.questDone(q0,ctx.getMainQuestDef(0)));

  console.log('--- Claim q0 ---');
  const moneyBefore=G.money;
  ctx.claimQuest(0,'main');
  check('q0 removed after claim', !G.activeQuests.some(i=>i.qid===0));
  check('q0 marked completed', G.completedQuests[0]===true);
  check('next main (id40) auto-granted', G.activeQuests.some(i=>i.qid===40&&i.cat==='main'));
  check('reward money +500', G.money===moneyBefore+500);
  console.log('  DEBUG inv.berry_oran=', G.inventory.berry_oran);
  check('reward item berry_oran x5', (G.inventory.berry_oran||0)>=5);

  console.log('--- Side quest s1 (pallet Régis) ---');
  ctx.openNpc('pallet',1);
  ctx.acceptSideQuest('s1');
  check('s1 active as side', G.activeQuests.some(i=>i.qid==='s1'&&i.cat==='side'));
  check('s1 is kanto region', ctx.SIDE_QUESTS.s1.region==='kanto');
  ctx.advanceQuests('defeat_wild','route1',10);
  const s1=G.activeQuests.find(i=>i.qid==='s1');
  check('s1 done', s1&&ctx.questDone(s1,ctx.getSideQuestDef('s1')));
  ctx.claimQuest('s1','side');
  check('s1 removed after claim', !G.activeQuests.some(i=>i.qid==='s1'));
  check('s1 marked completed', G.completedQuests['side_s1']===true);

  console.log('--- Region filtering (side shown only in region) ---');
  ctx.acceptSideQuest('s2');
  G.region='johto'; ctx.ensureQuestState();
  check('kanto side still in activeQuests (persists)', G.activeQuests.some(i=>i.cat==='side'&&i.qid==='s2'));
  check('story window renders in johto', (ctx.renderStoryWindow(), true));
  G.region='kanto'; ctx.ensureQuestState();

  console.log('--- Repeatable board (limit shared across regions) ---');
  ctx.openRepeatableMenu();
  check('roll produced 3 options', ctx._repeatableRoll.length===3);
  ctx.acceptRepeatable(0);
  check('repeatable accepted', G.repeatables.length===1);
  const rep=G.repeatables[0];
  ctx.advanceQuests(rep.def.type, 'anywhere', 999);
  check('repeatable done', ctx.questDone(rep, rep.def));
  ctx.claimQuest(rep.qid,'repeatable');
  check('repeatable removed after claim', G.repeatables.length===0);
  ctx.openRepeatableMenu();
  ctx.acceptRepeatable(0); ctx.acceptRepeatable(1); ctx.acceptRepeatable(2);
  check('three repeatables active (=== max)', G.repeatables.length===3);
  ctx.acceptRepeatable(0);
  check('4th repeatable blocked by limit', G.repeatables.length===3);
  for(const r of [...G.repeatables]) ctx.claimQuest(r.qid,'repeatable');

  console.log('--- Legendary boss (id18 Mewtwo) ---');
  G.team.push(ctx.createPoke(1,5));
  G.mainStep.kanto=30;
  ctx.syncActiveMain();
  check('id18 is active main after jump', G.activeQuests.some(i=>i.qid===18&&i.cat==='main'));
  ctx.advanceQuests('defeat_wild','ceruleancave',15);
  const q18=G.activeQuests.find(i=>i.qid===18);
  check('q18 done', q18&&ctx.questDone(q18,ctx.getMainQuestDef(18)));
  ctx.claimQuest(18,'main');
  check('q18 removed (boss started)', !G.activeQuests.some(i=>i.qid===18));
  check('q18 marked completed', G.completedQuests[18]===true);
  if(ctx.battle && ctx.battle.active){ check('legendary boss battle started', true); ctx.endBattle(); }
  else { check('legendary boss battle started', false); }

  console.log('--- Region switch keeps one main per region ---');
  G.mainStep={kanto:2, johto:0};
  G.region='johto'; ctx.ensureQuestState();
  check('johto current main is prof Orme (id31)', G.activeQuests.some(i=>i.qid===31&&i.cat==='main'));
  check('only ONE main in johto', G.activeQuests.filter(i=>i.cat==='main').length===1);
  G.region='kanto'; ctx.ensureQuestState();
  check('back to kanto, main is step 2 (id40)', G.activeQuests.some(i=>i.qid===40&&i.cat==='main'));


  console.log('--- Split Route 2 (Kanto) : déblocage ensemble + Argenta après Forêt ---');
  G.region='kanto'; G.location='pallet'; G.wildWinsByLoc={};
  check('route2_south ouvre AVEC route2 depuis Jadielle (conn viridian)', ctx.LOCS.route2_south.conn.includes('viridian'));
  check('route2_south NE va PAS vers Pewter (Argenta gérée par la Forêt)', !ctx.LOCS.route2_south.conn.includes('pewter'));
  G.wildWinsByLoc.route1=10;
  check('route2 débloquée après Route 1', ctx.locReachable('route2')===true);
  check('route2_south débloquée ENSEMBLE avec route2', ctx.locReachable('route2_south')===true);
  check('Argenta (pewter) VERROUILLÉE avant la Forêt', ctx.locReachable('pewter')===false);
  G.wildWinsByLoc.route2=10;
  check('Forêt Jadielle débloquée après Route 2', ctx.locReachable('viridianforest')===true);
  check('Argenta TOUJOURS verrouillée avant la Forêt', ctx.locReachable('pewter')===false);
  G.wildWinsByLoc.viridianforest=10;
  check('Argenta débloquée APRÈS la Forêt de Jade', ctx.locReachable('pewter')===true);
  check('route2_south partage le groupe route2', ctx.LOCS.route2_south.group==='route2');
  check('route2_south partage les Pokémon de route2', JSON.stringify(ctx.LOCS.route2_south.wild)===JSON.stringify(ctx.LOCS.route2.wild));
  // Les quêtes de combat comptent désormais TOUS les Pokémon sauvages
  // vaincus, peu importe le lieu (« battre des pokemons »). On réinitialise
  // la progression pour un test déterministe, puis on vérifie qu'une victoire
  // sur route2_south (même groupe que route2) l'incrémente bien.
  ctx.acceptSideQuest('s2');
  const _s2=G.activeQuests.find(i=>i.qid==='s2'); if(_s2) _s2.progress=0;
  ctx.advanceQuests('defeat_wild','route2_south',5);
  const s2=G.activeQuests.find(i=>i.qid==='s2');
  check('quête s2 progresse sur route2_south (combat global = battre des pokemons)', s2 && s2.progress===5);
  G.activeQuests=G.activeQuests.filter(i=>i.qid!=='s2');

  console.log('--- Johto Route 32 scindée : liens + même Pokémon ---');
  G.region='johto'; G.location='newbark'; G.wildWinsByLoc={};
  check('jroute32_mid ouvre depuis Mauville (violet)', ctx.LOCS_JOHTO.jroute32_mid.conn.includes('violet'));
  check('jroute32_south ouvre depuis Mauville (violet)', ctx.LOCS_JOHTO.jroute32_south.conn.includes('violet'));
  check('Route 32 : les 3 segments partagent le groupe', ctx.LOCS_JOHTO.jroute32.group==='jroute32' && ctx.LOCS_JOHTO.jroute32_mid.group==='jroute32' && ctx.LOCS_JOHTO.jroute32_south.group==='jroute32');
  check('Route 32 : segments partagent les Pokémon', JSON.stringify(ctx.LOCS_JOHTO.jroute32_mid.wild)===JSON.stringify(ctx.LOCS_JOHTO.jroute32.wild) && JSON.stringify(ctx.LOCS_JOHTO.jroute32_south.wild)===JSON.stringify(ctx.LOCS_JOHTO.jroute32.wild));
  G.region='kanto';


  console.log('--- Déblocage PERMANENT (à vie) ---');
  G.region='kanto'; G.location='pallet'; G.wildWinsByLoc={route1:10, route2:10, viridianforest:10};
  ctx.recomputeUnlocks();
  check('route3 débloquée après chaîne', ctx.isLocUnlocked('route3')===true);
  check('route1 débloquée', ctx.isLocUnlocked('route1')===true);
  G.wildWinsByLoc={route1:10}; // chaîne "cassée" (ex : reset partiel de sauvegarde)
  check('route3 RESTE débloquée même si la chaîne est cassée (à vie)', ctx.isLocUnlocked('route3')===true);
  check('route1 RESTE débloquée', ctx.isLocUnlocked('route1')===true);
  check('lieu jamais atteint reste verrouillé (route20)', ctx.isLocUnlocked('route20')===false);

  console.log('--- Routes scindées : MÊMES ITEMS (ROUTE_DROPS) ---');
  check('route2_south partage les items de route2', JSON.stringify(ctx.ROUTE_DROPS.route2_south)===JSON.stringify(ctx.ROUTE_DROPS.route2));
  check('jroute32_mid partage les items de jroute32', JSON.stringify(ctx.ROUTE_DROPS.jroute32_mid)===JSON.stringify(ctx.ROUTE_DROPS.jroute32));
  check('jroute32_south partage les items de jroute32', JSON.stringify(ctx.ROUTE_DROPS.jroute32_south)===JSON.stringify(ctx.ROUTE_DROPS.jroute32));

  console.log('ALL CHECKS DONE. pass='+pass+' fail='+fail);
  process.exit(fail>0?1:0);
}catch(e){
  console.log('RUNTIME ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,8).join('\n'));
  process.exit(2);
}
