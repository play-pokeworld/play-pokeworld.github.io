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
  {id:'route1_battles', title:t('tutorial_step_route1_title')||'Premiers combats', desc:t('tutorial_step_route1_desc')||'Gagne 3 combats sauvages sur la Route 1.', how:()=>`Où aller : fenêtre Carte → Route 1. Ensuite, dans la fenêtre Lieu, clique sur Explorer. ${tutorialDeviceHint('map')}`, actionLabel:'Aller à Route 1', actionCall:'clickLocation', actionArgs:"'route1'", done:()=>((G.wildWinsByLoc||{}).route1||0)>=3, money:300, items:{berry_oran:3}, rewardText:'+300₽ + 3 Baies Oran'},
  {id:'open_poke_sheet', title:t('tutorial_step_sheet_title')||'Lire une fiche Pokémon', desc:t('tutorial_step_sheet_desc')||'Ouvre une fiche Pokémon pour lire ses stats, IV, EV, talents et attaques.', how:()=>`${tutorialDeviceHint('sheet')} La fiche contient les onglets Base Stats / IV / EV et la liste des attaques.`, actionLabel:'Voir mon équipe', actionCall:'showTab', actionArgs:"'team'", done:()=>!!ensureTutorialState().completed.open_poke_sheet, money:200, rewardText:'+200₽'},
  {id:'open_bag', title:t('tutorial_step_bag_title')||'Ouvrir le sac', desc:t('tutorial_step_bag_desc')||'Ouvre le Sac depuis les Raccourcis pour voir tes objets.', how:()=>`Dans la fenêtre Raccourcis, clique sur Sac. Tu y trouveras baies, objets tenus, pierres, trésors et objets spéciaux.`, actionLabel:'Ouvrir le Sac', actionCall:'openFullscreenPanel', actionArgs:"'inventory'", items:{potion:2}, done:()=>!!ensureTutorialState().completed.open_bag, rewardText:'+2 Potions'},
  {id:'open_pokedex', title:t('tutorial_step_dex_title')||'Consulter le Pokédex', desc:t('tutorial_step_dex_desc')||'Ouvre le Pokédex et clique sur un Pokémon déjà vu.', how:()=>`Dans Raccourcis, ouvre le Pokédex. Clique sur un Pokémon non grisé pour voir où le trouver, ses talents et sa description.`, actionLabel:'Ouvrir le Pokédex', actionCall:'openFullscreenPanel', actionArgs:"'pokedex'", done:()=>!!ensureTutorialState().completed.open_pokedex, money:500, rewardText:'+500₽'},
  {id:'first_badge', title:t('tutorial_step_badge_title')||'Premier badge', desc:t('tutorial_step_badge_desc')||'Progresse jusqu’à Argenta et bats Pierre.', how:()=>`Nettoie les routes jusqu’à Argenta. Une fois à Argenta, dans la fenêtre Lieu, clique sur Défier Pierre. Les badges débloquent de nouvelles zones.`, actionLabel:'Voir la Carte', actionCall:'showTab', actionArgs:"'info'", done:()=>G.badges&&G.badges.includes('brock'), items:{rarecandy:1}, rewardText:'+1 Super Bonbon'},
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
  map:{icon:(typeof getIcon==='function'?getIcon('map',14):''), title:t('guide_map_title')||'Carte & progression', pages:[
   ['Lire la carte','Les couleurs montrent l’état des lieux : disponibles, verrouillés, zones avec captures manquantes, quêtes actives ou shiny encore absents. Le bouton d’aide de la carte résume ce code couleur.'],
   ['Déplacements','Clique sur un lieu débloqué pour t’y rendre. Une fois sur place, la fenêtre Lieu affiche les actions disponibles : explorer, défier, boutique, PNJ, bateau, labo fossile ou accès spéciaux.'],
   ['Verrous de progression','La progression peut dépendre d’un nombre de combats sauvages gagnés, d’un badge, d’une quête principale ou d’un objet spécial. Les messages de blocage indiquent toujours la condition manquante.'],
   ['Régions','Kanto puis Johto se débloquent avec la progression. Certaines règles d’accès imposent aussi de terminer une Ligue ou un Pokédex régional avant d’aller plus loin.'],
   ['PNJ et quêtes','Les PNJ servent à faire avancer l’histoire, lancer des quêtes secondaires ou déclencher des combats scénarisés. Pense à revisiter les villes après les gros objectifs.']
  ]},
  combat:{icon:(typeof getIcon==='function'?getIcon('battle',14):''), title:t('guide_combat_title')||'Combat', pages:[
   ['Principe général','Les combats sont automatiques et en temps réel. Tu ne choisis pas l’attaque pendant le combat : la stratégie se prépare avant, via l’équipe, les objets, les talents et l’ordre de tes Pokémon.'],
   ['Barres d’attaque','Chaque Pokémon charge automatiquement son attaque suivante. La vitesse, les statuts et certains talents modifient le rythme des attaques.'],
   ['Efficacité','Les indicateurs ×2, ×4, ×½, ×¼ et ×0 montrent l’efficacité d’un type contre la cible actuelle. Ils sont visibles directement sur les attaques pour lire rapidement un matchup.'],
   ['Changement de Pokémon','Tu peux changer de Pokémon actif pendant un combat normal si un autre membre vivant est disponible. Les combats d’entraînement solo n’autorisent pas ce changement.'],
   ['Statuts','Brûlure, poison, poison grave, sommeil, gel et paralysie ont des effets récurrents ou des pertes de tour. Ils sont affichés en badges courts sur les cartes.'],
   ['Talents et objets','Les talents et objets tenus peuvent réduire des dégâts, soigner, booster des stats ou modifier des types d’attaque. Observe les petites capsules visuelles quand ils s’activent.'],
   ['Butin et captures','Après les combats sauvages, le jeu gère automatiquement les captures et le butin. Le résumé de session regroupe captures, objets, victoires, K.O. et dégâts de l’équipe.'],
   ['Combats spéciaux','Arènes, Ligue, rival, Team Rocket, boss de quête et Atoll demandent surtout de la préparation : bonne équipe, bons talents, EV et objets tenus.']
  ]},
  pokemon:{icon:(typeof getIcon==='function'?getIcon('pokeball',14):''), title:t('guide_pokemon_title')||'Pokémon', pages:[
   ['Fiche Pokémon',`${tutorialDeviceHint('sheet')} La fiche montre types, niveau, rang, Base Stats, IV, EV, talents, objet tenu, évolutions, attaques connues et attaques apprenables.`],
   ['Base Stats','Les Base Stats représentent le potentiel naturel de l’espèce. Deux Pokémon d’une même espèce partagent cette base, puis les IV/EV/personnalisation font la différence.'],
   ['IV','Les IV sont des bonus durables sur chaque statistique. Plus ils sont hauts, meilleur est le Pokémon sur le long terme.'],
   ['EV','Les EV représentent l’entraînement spécialisé. Ils montent surtout via l’entraînement EV et améliorent progressivement une statistique précise.'],
   ['Talents','Chaque espèce peut disposer de plusieurs talents. La capture, l’entraînement Talent et certains progrès débloquent ces options au fil du temps.'],
   ['Attaques','Clique une attaque connue pour sélectionner un slot à remplacer, puis une attaque apprenable. Les descriptions de capacités indiquent type, puissance, précision et effets.'],
   ['Objet tenu','Un objet tenu peut transformer un Pokémon médiocre en bon support, ou renforcer un sweeper déjà fort. Un même objet ne peut être équipé que sur un seul Pokémon à la fois.'],
   ['Favori / verrouillage','Favori sert à repérer un Pokémon important. Verrouillé empêche plusieurs automatismes de le recycler par erreur.']
  ]},
  bag:{icon:(typeof getIcon==='function'?getIcon('bag',14):''), title:t('guide_bag_title')||'Sac', pages:[
   ['Organisation','Le sac est trié par catégories : consommables, objets tenus, pierres, trésors, fossiles et objets spéciaux. Utilise les filtres et le tri pour gagner du temps.'],
   ['Consommables','Les soins, bonbons et objets d’usage immédiat s’emploient depuis le sac ou via certaines interfaces dédiées.'],
   ['Objets tenus','Les objets tenus sont pensés pour la préparation d’équipe. Le bonus réel dépend parfois du stock possédé dans le sac.'],
   ['Pierres d’évolution','Les pierres affichent les Pokémon compatibles. Le jeu t’indique aussi si l’évolution cible est déjà obtenue.'],
   ['Trésors et fossiles','Les trésors servent surtout à l’économie. Les fossiles servent à la pension / résurrection plutôt qu’à la vente.']
  ]},
  mine:{icon:(typeof getIcon==='function'?getIcon('mine',14):''), title:t('guide_mine_title')||'Mine', pages:[
   ['Objectif','La mine cache pierres, trésors et fossiles. Il faut révéler complètement les objets pour les récupérer.'],
   ['Outils','Le burin est précis. Le marteau couvre une petite zone. Les améliorations débloquent des outils plus efficaces comme la pioche renforcée, la foreuse et la dynamite.'],
   ['Énergie','Chaque coup consomme de l’énergie. L’énergie se régénère avec le temps et certains systèmes de progression.'],
   ['Renouvellement','Une fois tous les objets d’une couche récupérés, la mine se renouvelle. Les futurs mineurs améliorent l’efficacité et l’endurance des sessions.']
  ]},
  hatchery:{icon:(typeof getIcon==='function'?getIcon('hatchery',14):''), title:t('guide_hatchery_title')||'Pension', pages:[
   ['Déposer un Pokémon','Dépose un Pokémon depuis l’équipe ou depuis la boîte si un slot est libre. Plusieurs slots se débloquent via les améliorations.'],
   ['Progression des œufs','Les œufs et fossiles avancent avec les K.O. de combat. Quand le compteur requis est atteint, ils sont prêts à éclore.'],
   ['Fossiles','Les fossiles trouvés à la mine peuvent être envoyés en pension pour être ranimés sous forme de Pokémon.'],
   ['Automatisation','La pension possède une file d’attente manuelle, un remplissage automatique, une éclosion automatique, des filtres de tri et du personnel.'],
   ['Gérants','Les gérants améliorent progressivement l’efficacité de la pension. Ils se recrutent par lieu et gagnent de l’XP en travaillant.']
  ]},
  training:{icon:(typeof getIcon==='function'?getIcon('training',14):''), title:t('guide_training_title')||'Entraînement', pages:[
   ['Modes','Les modes principaux sont Niveau, EV, Talent et Capacité. Chaque mode vise une amélioration précise.'],
   ['Niveau','Le stage Niveau donne plusieurs niveaux d’un coup, dans la limite du niveau 100.'],
   ['EV','Le stage EV donne exactement +1 EV aléatoire tant que le Pokémon n’est pas déjà au maximum.'],
   ['Talent','Le stage Talent tente de débloquer ou reconfirmer un talent possible de l’espèce. Les talents rares prennent naturellement plus de temps.'],
   ['Capacité','Le stage Capacité débloque des attaques avancées réservées à l’entraînement. Elles deviennent ensuite apprenables dans la fiche du Pokémon.'],
   ['Slots et automatisation','Chaque slot peut avoir sa propre file d’attente et son propre mode auto. Le personnel d’entraînement améliore aussi la régularité du système.']
  ]},
  quests:{icon:(typeof getIcon==='function'?getIcon('quests',14):''), title:'Quêtes', pages:[
   ['Quêtes principales','Elles débloquent l’histoire, des villes, des objets-clés et les passages majeurs comme la Poké Flûte ou l’accès à d’autres régions.'],
   ['Quêtes secondaires','Elles donnent surtout de l’argent, des objets ou des combats spéciaux. Elles apparaissent souvent via les PNJ de ville.'],
   ['Quêtes répétables','Les répétables servent d’économie long terme. Elles demandent de vaincre, capturer ou vendre selon l’objectif proposé.'],
   ['Combats de quête','Certaines quêtes lancent un combat unique. Le défi est souvent plus important qu’un simple combat sauvage et peut donner un Pokémon ou un gros reward.']
  ]},
  economy:{icon:(typeof getIcon==='function'?getIcon('shop',14):''), title:'Économie & marché', pages:[
   ['Boutiques','Les boutiques vendent soins, objets spéciaux, pierres, objets tenus et autres ressources selon ta progression.'],
   ['PokéMarket','Le marché sert à acheter certaines espèces introuvables facilement dans la nature. Il complète la collection plus qu’il ne remplace l’exploration.'],
   ['Trésors et ventes','La mine alimente une grande partie de l’économie via les trésors. Les doublons d’objets spéciaux peuvent aussi être convertis en argent.'],
   ['Récompenses','Argent et objets viennent des quêtes, combats, mine, captures, répétables et modes spéciaux comme l’Atoll.']
  ]},
  automation:{icon:(typeof getIcon==='function'?getIcon('settings',14):''), title:'Automatisation & personnel', pages:[
   ['Principe','L’automatisation n’agit pas seule au début : il faut acheter les modules, configurer les règles et parfois remplir la file d’attente manuellement.'],
   ['Files d’attente','La pension et l’entraînement possèdent leurs propres files, avec capacité maximale, filtres et tri.'],
   ['Personnel','Le personnel se recrute selon la progression. Chaque employé donne un bonus spécialisé et gagne des niveaux avec l’usage.'],
   ['Protections','Les Pokémon verrouillés et certaines situations évitent que l’automatisation touche à des Pokémon que tu veux garder manuellement.']
  ]},
  save:{icon:(typeof getIcon==='function'?getIcon('save',14):''), title:'Sauvegardes & AFK', pages:[
   ['Multi-saves','Le jeu gère plusieurs sauvegardes avec nom, fond et icône personnalisables.'],
   ['Import / export','Exporte régulièrement tes saves pour éviter toute perte pendant les phases alpha. L’import permet aussi d’écraser proprement une partie existante.'],
   ['AFK','Une partie de la progression peut être simulée hors ligne. Le résumé AFK indique combats gagnés, captures, énergie, argent et K.O. éventuels.'],
   ['Sécurité alpha','Comme le projet est encore en alpha, garde toujours une exportation récente avant de tester un nouveau zip.']
  ]},
  atoll:{icon:(typeof getIcon==='function'?getIcon('atoll',14):''), title:t('battle_atoll_title')||'Atoll de Combat', pages:[
   ['Rôle','L’Atoll de Combat est le contenu de fin d’alpha. Il sert à tester des équipes optimisées dans plusieurs formats.'],
   ['Formats','Tour, Usine, Arène et Dôme appliquent chacun des contraintes différentes : rang maximum, location, objets interdits ou équipe prêtée.'],
   ['Préparation','Les objets tenus, les talents, les EV et l’ordre d’équipe comptent beaucoup plus ici que dans les combats sauvages classiques.'],
   ['Récompenses','Les victoires donnent des jetons Atoll utilisables dans la boutique dédiée. Les séries augmentent l’intérêt du farm.']
  ]},
  dictionary:{icon:(typeof getIcon==='function'?getIcon('dictionary',14):''), title:t('guide_dictionary_title')||'Dictionnaire', pages:[
   ['Objets','Cherche un objet pour savoir si tu le possèdes, où le trouver et à quoi il sert.'],
   ['Attaques','Cherche une attaque pour voir son type, sa puissance, ses effets et quels Pokémon la connaissent déjà.'],
   ['Talents','Cherche un talent pour voir son effet, sa rareté et les Pokémon concernés.'],
   ['Usage','Le dictionnaire devient très utile quand le nombre d’objets, de talents et d’attaques commence à devenir difficile à suivre de tête.']
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


