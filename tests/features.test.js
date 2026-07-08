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
// `battle` est déclaré en `let` (non exposé sur window) : on y accède via eval.
const B = ()=>window.eval('battle');
const owned = (id)=>window.eval('speciesOwned('+id+')');
setTimeout(async ()=>{
  const W = window;
  const G = W.G;
  let pass=0, fail=0;
  const ck=(n,c)=>{ if(c){pass++;log('  ✅',n);} else {fail++;log('  ❌',n);} };

  // ---- Prérequis ----
  ck('G defined', !!G);
  W.pickStarter(1);
  ck('starter chosen', G.starter===true && G.team.length===1);
  W.ensureQuestState();
  ck('unlockedLocs initialized', G.unlockedLocs && typeof G.unlockedLocs==='object');

  // ============================================================
  // 1) PENSION (hatchery) débloquée avec la route de la pension
  // ============================================================
  const hWin = W.document.getElementById('win-hatchery');
  ck('win-hatchery element exists', !!hWin);
  W.updateFeatureWindows();
  ck('hatchery hidden before route5/jroute34 unlocked', hWin.style.display !== 'flex');
  // Simule le déblocage permanent de Route 5 (Kanto) — « route de la pension »
  G.unlockedLocs.route5 = true;
  W.updateFeatureWindows();
  ck('hatchery window shows (flex) after route5 unlocked', hWin.style.display === 'flex');
  // Johto : Route 34
  G.unlockedLocs.route5 = false;
  G.unlockedLocs.jroute34 = true;
  W.updateFeatureWindows();
  ck('hatchery window shows (flex) after jroute34 unlocked', hWin.style.display === 'flex');
  G.unlockedLocs.jroute34 = false;
  W.updateFeatureWindows();
  ck('hatchery hidden again when neither unlocked', hWin.style.display !== 'flex');

  // ============================================================
  // 2) ENTRAÎNEMENT débloqué en battant l'arène du Major Bob (surge)
  // ============================================================
  const tWin = W.document.getElementById('win-training');
  ck('win-training element exists', !!tWin);
  W.updateFeatureWindows();
  ck('training hidden before surge badge', tWin.style.display !== 'flex');
  G.badges.push('surge');
  W.updateFeatureWindows();
  ck('training window shows (flex) after Surge badge', tWin.style.display === 'flex');
  G.badges = G.badges.filter(b=>b!=='surge');
  W.updateFeatureWindows();
  ck('training hidden again without surge badge', tWin.style.display !== 'flex');

  // ============================================================
  // 3) LÉGENDAIRES : vrai combat puis capture
  // ============================================================
  ck('battle inactive before legendary', B().active === false);
  W.startLegendaryEncounter(144); // Artikodin
  ck('legendary battle started (battle.active)', B().active === true);
  ck('legendaryCatch flag set', B().legendaryCatch === true);
  ck('enemy is Artikodin (id 144)', B().enemyPoke && B().enemyPoke.id === 144);
  ck('combat sauvage (not champ)', B().isChamp === false);
  ck('no chill chain (one-shot battle)', B().chill === false);
  ck('legendary at boosted HP (x2.2)', B().enemyPoke.maxHP > 200);
  // stoppe le tick temps réel pour ne pas être KO pendant le test
  W.eval('clearInterval(battle.timerId)');

  const hadBefore = owned(144);
  B().enemyPoke.currentHP = 0;
  try { await W.onEnemyFaint(); } catch(e){ errors.push('onEnemyFaint: '+e.message); }
  ck('Artikodin 144 captured after victory', owned(144));
  ck('Artikodin marked caught in pokedex', G.pokedex[144] && G.pokedex[144].caught === true);
  ck('battle ended after capture', B().active === false);
  ck('legendaryCatch reset after battle', B().legendaryCatch === false);

  // 2e légendaire (Mewtwo 150)
  W.startLegendaryEncounter(150);
  ck('Mewtwo battle started', B().active === true && B().legendaryCatch === true);
  W.eval('clearInterval(battle.timerId)');
  B().enemyPoke.currentHP = 0;
  try { await W.onEnemyFaint(); } catch(e){ errors.push('onEnemyFaint150: '+e.message); }
  ck('Mewtwo 150 captured after victory', owned(150));

  log('\n=== ERRORS ('+errors.length+') ===');
  errors.slice(0,15).forEach(e=>log(' •',e));
  log('RESULT: pass='+pass+' fail='+fail);
  process.exit(fail||errors.length?1:0);
}, 1400);
