const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync('pokeworld.html', 'utf8');
const errors = [];
const vc = new VirtualConsole();
['jsdomError','error','warn'].forEach(l=>vc.on(l,(...a)=>errors.push(l+': '+a.map(x=>x&&x.stack?x.stack.split('\n')[0]:x).join(' '))));
const dom = new JSDOM(html, { runScripts:'dangerously', url:'http://localhost/', virtualConsole:vc, pretendToBeVisual:true });
const { window } = dom;
window.addEventListener('error', e => errors.push('window.error: ' + (e.error ? e.error.stack.split('\n')[0] : e.message)));
const log = (...a)=>console.log(...a);
setTimeout(async ()=>{
  const W = window;
  const G = W.G;
  let pass=0, fail=0;
  const ck=(n,c)=>{ if(c){pass++;log('  ✅',n);} else {fail++;log('  ❌',n);} };

  ck('G defined', !!G);
  // pick a starter
  W.pickStarter(1);
  ck('starter chosen', G.starter===true && G.team.length===1);
  // nouvelle partie : Prof Chen (id30) est la quête principale Kanto active
  ck('prof Chen (id30) active main at start', G.activeQuests.some(i=>i.qid===30&&i.cat==='main'));
  ck('only ONE main active', G.activeQuests.filter(i=>i.cat==='main').length===1);
  // parler au prof avance vers q0 (Route 1)
  W.openNpc('pallet',0);
  ck('prof talk advances to q0 (route1)', G.activeQuests.some(i=>i.qid===0&&i.cat==='main'));
  // NPC dialogue renders
  W.openNpc('pallet',1);
  ck('NPC modal body rendered', (W.document.getElementById('quest-body').innerHTML||'').length>20);
  // accept side quest
  W.acceptSideQuest('s1');
  ck('side quest s1 active', G.activeQuests.some(i=>i.qid==='s1'&&i.cat==='side'));
  // repeatable board
  W.openRepeatableMenu();
  ck('repeatable board shows options', (W.document.getElementById('quest-body').innerHTML||'').includes('Accept'));
  W.acceptRepeatable(0);
  ck('repeatable accepted', G.repeatables.length===1);
  // advance + claim main q0
  W.advanceQuests('defeat_wild','route1',3);
  const m0=G.money;
  W.claimQuest(0,'main');
  ck('q0 claimed (money+500)', G.money===m0+500 && !G.activeQuests.some(i=>i.qid===0));
  ck('next main (id40) auto-granted', G.activeQuests.some(i=>i.qid===40&&i.cat==='main'));
  // story panel renders with categories
  const sp = W.document.getElementById('story-panel').innerHTML||'';
  ck('story panel shows Quêtes Principales', sp.includes('Quêtes Principales')||sp.includes('Main Quests'));
  // start a real battle via exploreArea and ensure no throw
  try { W.exploreArea(); ck('exploreArea started battle', true); } catch(e){ ck('exploreArea started battle', false); errors.push('exploreArea: '+e.message); }
  // bag category filter
  try { W.showTab('inventory'); W.setInvCat('berry'); ck('bag category filter works', true); } catch(e){ ck('bag category filter works', false); errors.push('bag: '+e.message); }
  // full-screen box button exists
  ck('header box button present', !!W.document.querySelector('button[onclick*="openUnifiedSelectorModal"]'));
  // region switch keeps one main per region
  G.mainStep={kanto:0,johto:0}; G.region='johto'; W.ensureQuestState();
  ck('johto: prof Orme (id31) active', G.activeQuests.some(i=>i.qid===31&&i.cat==='main'));
  G.region='kanto'; W.ensureQuestState();
  ck('back to kanto: prof Chen (id30) active', G.activeQuests.some(i=>i.qid===30&&i.cat==='main'));
  log('\n=== ERRORS ('+errors.length+') ===');
  errors.slice(0,15).forEach(e=>log(' •',e));
  log('RESULT: pass='+pass+' fail='+fail);
  process.exit(fail||errors.length?1:0);
}, 1400);
