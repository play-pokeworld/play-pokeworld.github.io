var _guideSection = null;

function ensureTutorialState(){
 if(!G.tutorial || typeof G.tutorial !== 'object') G.tutorial = {};
 if(G.tutorial.enabled === undefined) G.tutorial.enabled = true;
 if(!G.tutorial.completed) G.tutorial.completed = {};
 if(!G.tutorial.dismissedTips) G.tutorial.dismissedTips = {};
 if(!G.tutorial.rewards) G.tutorial.rewards = {};
 return G.tutorial;
}
function tutorialIsEnabled(){ return !!(ensureTutorialState().enabled); }
function tutorialDisable(){ const st=ensureTutorialState(); st.enabled=false; closeTutorialTip(); saveGame(); try{ renderStoryWindow(); }catch(_){} notify(t('tutorial_disabled')||'Tutoriel désactivé','var(--light1)'); }
function tutorialEnable(){ const st=ensureTutorialState(); st.enabled=true; saveGame(); try{ renderStoryWindow(); }catch(_){} notify(t('tutorial_enabled')||'Tutoriels activés','var(--green)'); }
function tutorialDismissTip(id){ const st=ensureTutorialState(); if(id) st.dismissedTips[id]=true; closeTutorialTip(); saveGame(); }
function closeTutorialTip(){ const el=document.getElementById('tutorial-tip'); if(el) el.remove(); }
function tutorialMark(id){ const st=ensureTutorialState(); if(!id) return; if(!st.completed[id]){ st.completed[id]=true; updateTutorialProgress(); saveGame(); try{ renderStoryWindow(); }catch(_){} } }
function tutorialDeviceHint(kind){
 const touch = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
 if(kind === 'sheet') return touch ? 'Mobile : appuie longtemps sur un Pokémon de ton équipe, ou touche sa carte si elle est visible.' : 'PC : clique ou clic droit sur un Pokémon dans la fenêtre Équipe Active.';
 if(kind === 'map') return touch ? 'Mobile : utilise la barre du bas pour revenir à la Carte ou au Lieu.' : 'PC : clique directement sur la Carte puis sur les boutons du panneau Lieu.';
 return touch ? 'Mobile : utilise la barre du bas et les gros boutons.' : 'PC : utilise les raccourcis et le clic droit pour les infos.';
}
function tutorialGiveReward(step){
 const st=ensureTutorialState();
 if(!step || st.rewards[step.id]) return;
 if(step.money){ G.money=(G.money||0)+step.money; try{ updateHeader(); }catch(_){} }
 if(step.items){ for(const k in step.items) addToInventory(k, step.items[k]); }
 st.rewards[step.id]=true;
 if(step.rewardText) notify(step.rewardText, 'var(--green)');
}
function tutorialSteps(){
 return [
  {id:'route1_battles', title:t('tutorial_step_route1_title')||'Premiers combats', desc:t('tutorial_step_route1_desc')||'Gagne 3 combats sauvages sur la Route 1.', how:()=>`Où aller : fenêtre Carte → Route 1. Ensuite, dans la fenêtre Lieu, clique sur 🌾 Explorer. ${tutorialDeviceHint('map')}`, actionLabel:'Aller à Route 1', actionCall:'clickLocation', actionArgs:"'route1'", done:()=>((G.wildWinsByLoc||{}).route1||0)>=3, money:300, items:{berry_oran:3}, rewardText:'+300₽ + 3 Baies Oran'},
  {id:'open_poke_sheet', title:t('tutorial_step_sheet_title')||'Lire une fiche Pokémon', desc:t('tutorial_step_sheet_desc')||'Ouvre une fiche Pokémon pour lire ses stats, IV, EV, talents et attaques.', how:()=>`${tutorialDeviceHint('sheet')} La fiche contient les onglets Base Stats / IV / EV et la liste des attaques.`, actionLabel:'Voir mon équipe', actionCall:'showTab', actionArgs:"'team'", done:()=>!!ensureTutorialState().completed.open_poke_sheet, money:200, rewardText:'+200₽'},
  {id:'open_bag', title:t('tutorial_step_bag_title')||'Ouvrir le sac', desc:t('tutorial_step_bag_desc')||'Ouvre le Sac depuis les Raccourcis pour voir tes objets.', how:()=>`Dans la fenêtre Raccourcis, clique 🎒 Sac. Tu y trouveras baies, objets tenus, pierres, trésors et objets spéciaux.`, actionLabel:'Ouvrir le Sac', actionCall:'openFullscreenPanel', actionArgs:"'inventory'", items:{potion:2}, done:()=>!!ensureTutorialState().completed.open_bag, rewardText:'+2 Potions'},
  {id:'open_pokedex', title:t('tutorial_step_dex_title')||'Consulter le Pokédex', desc:t('tutorial_step_dex_desc')||'Ouvre le Pokédex et clique sur un Pokémon déjà vu.', how:()=>`Dans Raccourcis, ouvre le Pokédex. Clique sur un Pokémon non grisé pour voir où le trouver, ses talents et sa description.`, actionLabel:'Ouvrir le Pokédex', actionCall:'openFullscreenPanel', actionArgs:"'pokedex'", done:()=>!!ensureTutorialState().completed.open_pokedex, money:500, rewardText:'+500₽'},
  {id:'first_badge', title:t('tutorial_step_badge_title')||'Premier badge', desc:t('tutorial_step_badge_desc')||'Progresse jusqu’à Argenta et bats Pierre.', how:()=>`Nettoie les routes jusqu’à Argenta. Une fois à Argenta, dans la fenêtre Lieu, clique sur ⚔️ Défier Pierre. Les badges débloquent de nouvelles zones.`, actionLabel:'Voir la Carte', actionCall:'showTab', actionArgs:"'info'", done:()=>G.badges&&G.badges.includes('brock'), items:{rarecandy:1}, rewardText:'+1 Super Bonbon'},
 ];
}
function updateTutorialProgress(){
 const st=ensureTutorialState();
 for(const step of tutorialSteps()){
  if(!st.completed[step.id] && step.done()) st.completed[step.id]=true;
  if(st.completed[step.id]) tutorialGiveReward(step);
 }
 const allDone = tutorialSteps().every(step => st.completed[step.id]);
 if(allDone && st.enabled){
  st.enabled = false;
  try{ saveGame(); }catch(_){}
 }
}
function currentTutorialStep(){ updateTutorialProgress(); const st=ensureTutorialState(); return tutorialSteps().find(step=>!st.completed[step.id]) || null; }
function renderTutorialQuestBlock(){
 const st=ensureTutorialState();
 if(!st.enabled) return '';
 const steps=tutorialSteps();
 const doneCount=steps.filter(s=>st.completed[s.id]).length;
 const step=currentTutorialStep();
 if(!step){ st.enabled=false; try{ saveGame(); }catch(_){} return ''; }
 const idx=steps.findIndex(s=>s.id===step.id)+1;
 return `<div class="tutorial-quest-card active">
  <div class="tutorial-quest-head"><span>💡</span><b>Tutoriel guidé — Étape ${idx}/${steps.length}</b></div>
  <div class="tutorial-quest-title">${step.title}</div>
  <p>${step.desc}</p>
  <div class="tutorial-how"><b>Comment faire :</b><br>${step.how()}</div>
  <div class="tutorial-progress-bar"><div data-pct="${Math.round(doneCount/steps.length*100)}"></div></div>
  <div class="tutorial-quest-actions">
   ${step.actionCall?`<button class="hbtn tutorial-primary" data-action="legacy-call" data-call="${step.actionCall}" data-call-args="${step.actionArgs||''}">${step.actionLabel||'Faire'}</button>`:''}
   <button class="hbtn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'guide'">${t('guide_title')||'Guide'}</button>
   <button class="hbtn" data-action="legacy-call" data-call="tutorialDisable" data-call-args="">${t('tutorial_disable_all')||'Désactiver'}</button>
  </div>
 </div>`;
}
function showTutorialTip(id, title, body){ return; }

function guideSections(){
 return {
  map:{icon:'🗺️', title:t('guide_map_title')||'Carte & progression', pages:[
   ['Lire la carte','Les lieux colorés sont disponibles, les lieux gris sont verrouillés. La couleur indique aussi s’il reste des Pokémon à capturer, des quêtes ou des shiny à trouver. Le bouton ? de la carte explique la légende.'],
   ['Se déplacer','Clique sur un lieu débloqué pour t’y rendre. Sur mobile, utilise la barre du bas pour revenir à Carte ou Lieu rapidement.'],
   ['Dans un lieu','La fenêtre Lieu peut afficher plusieurs actions : 🌾 Explorer pour les combats sauvages, ⚔️ Défier une arène ou un boss, 🏪 Boutique, 🗣 PNJ/Quêtes, accès région/bateau, fossiles ou infos de zone.'],
   ['Débloquer la suite','Certaines routes demandent des combats sauvages pour ouvrir le chemin suivant. D’autres zones demandent un badge, une quête ou un objet spécial comme la Poké Flûte.'],
   ['PNJ et quêtes','Les PNJ marqués sur la carte ou dans le lieu peuvent donner des quêtes. Les quêtes principales font avancer l’histoire ; les secondaires donnent des récompenses utiles.']
  ]},
  combat:{icon:'⚔️', title:t('guide_combat_title')||'Combat', pages:[
   ['Déroulement automatique','Le combat avance en temps réel. Chaque Pokémon utilise ses attaques automatiquement quand sa barre est chargée. La vitesse x1/x2/x3 change le rythme.'],
   ['Attaques et barres','Les attaques affichées ont un type, une puissance et parfois un effet. L’attaque prête ou en cours se met en évidence. Les PP ne sont pas gérés comme dans les jeux classiques : le système repose surtout sur les cooldowns.'],
   ['Changer de Pokémon','Clique sur un Pokémon de ton équipe dans la fenêtre de combat pour le rendre actif. Sur mobile, touche la carte du Pokémon. Certains changements attendent la fin d’une animation.'],
   ['Statuts','Brûlure réduit les dégâts physiques et inflige des dégâts. Poison inflige des dégâts sur la durée. Paralysie peut empêcher d’agir. Sommeil et gel peuvent faire passer des tours. Confusion/peur sont converties en effets simples selon le moteur.'],
   ['Capture et butin','Après un K.O. sauvage, le jeu tente une capture automatiquement. Le butin en bas de la fenêtre montre les Pokémon capturés et les objets trouvés pendant la session.'],
   ['Talents et objets','Les talents et objets tenus peuvent changer les dégâts, la vitesse, les immunités ou les statuts. Consulte la fiche Pokémon ou le Dictionnaire pour les détails.']
  ]},
  pokemon:{icon:'🧬', title:t('guide_pokemon_title')||'Pokémon', pages:[
   ['Ouvrir la fiche',`${tutorialDeviceHint('sheet')} La fiche donne tout : niveau, types, stats, IV, EV, talents, objet tenu, évolutions et attaques.`],
   ['Base Stats','Les Base Stats sont les stats naturelles de l’espèce. Plus elles sont hautes, plus le Pokémon est naturellement fort dans ce domaine.'],
   ['IV','Les IV sont des bonus rares et permanents. Chaque étoile donne un petit bonus à une stat. On peut en gagner à la capture, à la pension ou via de futures améliorations.'],
   ['EV','Les EV sont l’entraînement spécialisé. Chaque point renforce une stat. L’entraînement EV donne exactement +1 EV aléatoire jusqu’à un maximum.'],
   ['Changer les attaques','Dans la fiche, clique une attaque connue pour choisir un slot à remplacer, puis clique une attaque apprenable. Si 4 attaques sont déjà équipées, tu dois sélectionner un slot avant d’apprendre.'],
   ['Attaques verrouillées','Certaines attaques avancées sont verrouillées derrière l’entraînement Capacité. Une fois débloquées, elles apparaissent dans les attaques apprenables.'],
   ['Talents','Chaque Pokémon a plusieurs talents possibles. La capture et l’entraînement Talent peuvent en débloquer. Les talents rares sont plus difficiles à obtenir.'],
   ['Objet tenu','Un Pokémon peut tenir un objet. Un même objet tenu ne peut être porté que par un seul Pokémon à la fois. Les bonus dépendent souvent du nombre possédé dans le sac.']
  ]},
  bag:{icon:'🎒', title:t('guide_bag_title')||'Sac', pages:[
   ['Catégories','Le sac sépare les Baies, objets tenus, pierres/évolutions, trésors, fossiles et objets spéciaux. Utilise les filtres pour t’y retrouver.'],
   ['Objets tenus','Clique l’objet tenu sur un Pokémon ou utilise le sac pour l’équiper. Un objet déjà porté par un autre Pokémon est bloqué.'],
   ['Pierres et évolutions','Les objets d’évolution affichent les Pokémon compatibles. L’indicateur ✓/! montre si l’évolution est déjà possédée.'],
   ['Trésors et fossiles','Les trésors se vendent. Les fossiles se raniment via la pension/labo fossile. Les fossiles sont aussi listés dans le Dictionnaire.'],
   ['Objets spéciaux','Les objets spéciaux comme la Poké Flûte servent à débloquer des quêtes ou des passages.']
  ]},
  mine:{icon:'⛏️', title:t('guide_mine_title')||'Mine', pages:[
   ['But','La mine cache pierres, trésors et fossiles. Creuse les cases pour révéler entièrement les objets.'],
   ['Outils','Le burin coûte peu et creuse précisément. Le marteau coûte plus mais touche une zone plus large.'],
   ['Indices visuels','Les cases non creusées ne révèlent pas les objets. Une case totalement creusée avec un objet devient beaucoup plus visible.'],
   ['Énergie et reset','Creuser consomme de l’énergie. Quand tous les objets de la couche sont récupérés, la mine se renouvelle automatiquement.']
  ]},
  hatchery:{icon:'🥚', title:t('guide_hatchery_title')||'Pension', pages:[
   ['Déposer un Pokémon','Dépose un Pokémon depuis l’équipe ou la boîte dans un slot. La pension peut améliorer certains aspects selon les systèmes débloqués.'],
   ['Fossiles','Les fossiles trouvés à la mine peuvent être envoyés à la pension pour être ranimés en Pokémon.'],
   ['Améliorations','Le bouton Améliorations Pension contient les slots supplémentaires et les automatisations. Plus tard, les bonus de personnel seront ajoutés ici.'],
   ['Automatisation','Éclosion automatique et remplissage automatique existent déjà, mais restent optionnels pour ne pas gêner les joueurs qui veulent gérer manuellement.']
  ]},
  training:{icon:'🏋️', title:t('guide_training_title')||'Entraînement', pages:[
   ['Choisir le Pokémon','Sélectionne un Pokémon à entraîner. Plus tard plusieurs Pokémon pourront être entraînés en parallèle.'],
   ['Capacité','Débloque une attaque avancée verrouillée. Si le Pokémon a moins de 4 attaques, elle peut être ajoutée directement.'],
   ['Talent','Tire un talent parmi la liste du Pokémon. Il peut être nouveau ou déjà connu, selon la rareté et la chance.'],
   ['EV','Donne exactement +1 EV aléatoire si le Pokémon n’est pas déjà au maximum.'],
   ['Niveau','Donne entre +2 et +5 niveaux sans dépasser le niveau 100.'],
   ['Boutons grisés','Un entraînement qui ne sert plus à rien devient grisé : niveau 100, EV au max, plus de talent, plus de capacité à débloquer.'],
   ['Équipes de coachs','Les combats d’entraînement utilisent 6 Pokémon et choisissent une équipe selon le type principal du Pokémon entraîné.']
  ]},
  dictionary:{icon:'📚', title:t('guide_dictionary_title')||'Dictionnaire', pages:[
   ['Objets','Cherche un objet pour savoir si tu le possèdes, où le trouver et à quoi il sert.'],
   ['Attaques','Cherche une attaque pour voir son type, sa puissance, ses effets et si un de tes Pokémon la connaît.'],
   ['Talents','Cherche un talent pour voir sa rareté, son effet, et quels Pokémon peuvent l’avoir.'],
   ['Recherche','La barre de recherche filtre immédiatement la page active. Elle est utile quand les listes deviennent longues.']
  ]}
 };
}
function setGuideSection(section){ _guideSection = section || null; const el=document.getElementById('fs-panel-content'); if(el) renderGuidePanel(el); }
function renderGuidePanel(el){
 const sections=guideSections();
 if(_guideSection && sections[_guideSection]){
  const sec=sections[_guideSection];
  el.innerHTML=`<div class="guide-header"><div><h2>${sec.icon} ${sec.title}</h2><p>Guide détaillé</p></div><button class="hbtn" data-action="legacy-call" data-call="setGuideSection" data-call-args="null">← Retour</button></div>
  <div class="guide-page-list">${sec.pages.map(([title,txt])=>`<article class="guide-info-card"><h3>${title}</h3><p>${txt}</p></article>`).join('')}</div>`;
  return;
 }
 el.innerHTML=`<div class="guide-header"><div><h2>${t('guide_title')||'Guide'}</h2><p>${t('guide_intro')||'Choisis une rubrique pour tout savoir.'}</p></div></div>
 <div class="guide-actions"><button class="hbtn" data-action="legacy-call" data-call="tutorialEnable" data-call-args="">${t('tutorial_enable')||'Activer tutos'}</button><button class="hbtn" data-action="legacy-call" data-call="tutorialDisable" data-call-args="">${t('tutorial_disable_all')||'Désactiver tutos'}</button></div>
 <div class="guide-grid">${Object.entries(sections).map(([id,sec])=>`<button class="guide-card guide-card-button" data-action="legacy-call" data-call="setGuideSection" data-call-args="'${id}'"><h3>${sec.icon} ${sec.title}</h3><p>${sec.pages.length} pages d'informations</p></button>`).join('')}</div>`;
}
function installTutorialHooks(){
 const wrap=(name, cb)=>{ const fn=window[name]; if(typeof fn!=='function' || fn.__tutorialWrapped) return false; const nw=function(...args){ const res=fn.apply(this,args); try{ cb(args,res); }catch(e){} return res; }; nw.__tutorialWrapped=true; window[name]=nw; return true; };
 wrap('pickStarter', ()=>{ try{ renderStoryWindow(); }catch(_){} });
 wrap('openFullscreenPanel', ([panel])=>{ if(panel==='inventory') tutorialMark('open_bag'); if(panel==='pokedex') tutorialMark('open_pokedex'); });
 wrap('openPokeModal', ()=>{ tutorialMark('open_poke_sheet'); });
 wrap('openBoxPokeModal', ()=>{ tutorialMark('open_poke_sheet'); });
 wrap('exploreArea', ()=>{ updateTutorialProgress(); });
 wrap('renderMap', ()=>{ updateTutorialProgress(); });
}
setTimeout(installTutorialHooks, 500);

if(typeof window !== 'undefined'){
 window.ensureTutorialState=ensureTutorialState;
 window.tutorialDisable=tutorialDisable;
 window.tutorialEnable=tutorialEnable;
 window.tutorialDismissTip=tutorialDismissTip;
 window.closeTutorialTip=closeTutorialTip;
 window.tutorialMark=tutorialMark;
 window.renderTutorialQuestBlock=renderTutorialQuestBlock;
 window.renderGuidePanel=renderGuidePanel;
 window.setGuideSection=setGuideSection;
 window.showTutorialTip=showTutorialTip;
 window.installTutorialHooks=installTutorialHooks;
}

export {};
