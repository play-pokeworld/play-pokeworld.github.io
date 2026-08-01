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
 if(kind === 'sheet') return touch ? (typeof t === 'function' ? t('tutorial_hint_sheet_mobile') : 'Mobile : appuie longtemps sur un Pokémon de ton équipe, ou touche sa carte si elle est visible.') : (typeof t === 'function' ? t('tutorial_hint_sheet_pc') : 'PC : clique ou clic droit sur un Pokémon dans la fenêtre Équipe Active.');
 if(kind === 'map') return touch ? (typeof t === 'function' ? t('tutorial_hint_map_mobile') : 'Mobile : utilise la barre du bas pour revenir à la Carte ou au Lieu.') : (typeof t === 'function' ? t('tutorial_hint_map_pc') : 'PC : clique directement sur la Carte puis sur les boutons du panneau Lieu.');
 return touch ? 'Mobile : utilise la barre du bas et les gros boutons.' : 'PC : utilise les raccourcis et le clic droit pour les infos.';
}
// Passe 54 (retour utilisateur : « les quêtes de tuto donnent beaucoup trop
// de baies, elles m'ont donné le max directement au lieu de juste une »).
//
// Cause racine — DOUBLE COMPTABILITÉ des récompenses :
// le verrou anti-doublon vivait UNIQUEMENT dans `G.tutorial.rewards`, un objet
// recréé de zéro par `ensureTutorialState()` dès que `G.tutorial` est absent
// (nouvelle partie, sauvegarde antérieure au tutoriel, import, ou tout
// chargement où la branche `tutorial` n'a pas été persistée). L'INVENTAIRE,
// lui, est bien sauvegardé. À chaque session où l'état du tutoriel repartait
// à vide, les étapes déjà validées (3 combats sur la Route 1, badge de
// Pierre…) étaient re-détectées comme « fraîchement terminées » et payées une
// fois de plus. Reproduit : 30 sessions → 25 baies, soit exactement le
// plafond de pile (`addToInventory` borne les objets tenus à 25) — d'où le
// « max directement ».
//
// Correctif : le verrou est ADOSSÉ À L'INVENTAIRE, pas au seul drapeau. Une
// récompense n'est versée que si le joueur ne possède pas déjà l'objet, et
// le versement est plafonné à la quantité prévue par l'étape. Un flag perdu
// ne peut donc plus rejouer un paiement.
function tutorialRewardAlreadyPaid(step){
 if(!step || !step.items) return false;
 for(const k in step.items){
  const have = Number((G.inventory && G.inventory[k]) || 0);
  if(have >= Number(step.items[k] || 1)) return true;   // déjà en poche
 }
 return false;
}
function tutorialGiveReward(step){
 const st=ensureTutorialState();
 if(!step || st.rewards[step.id]) return;
 // Garde-fou anti-rejeu : on pose le drapeau AVANT toute remise, pour qu'un
 // second passage dans la même session ne puisse pas repayer non plus.
 const alreadyPaid = tutorialRewardAlreadyPaid(step);
 st.rewards[step.id]=true;
 if(alreadyPaid) return;
 if(step.money){ G.money=(G.money||0)+step.money; try{ updateHeader(); }catch(_){} }
 if(step.items){
  for(const k in step.items){
   const want = Math.max(1, Number(step.items[k] || 1));
   const have = Number((G.inventory && G.inventory[k]) || 0);
   const give = Math.max(0, want - have);      // jamais plus que prévu
   if(give > 0) addToInventory(k, give);
  }
 }
 if(step.rewardText) notify(step.rewardText, 'var(--green)');
}
function tutorialSteps(){
 return [
  {id:'route1_battles', title:t('tutorial_step_route1_title')||'Premiers combats', desc:t('tutorial_step_route1_desc')||'Gagne 3 combats sauvages sur la Route 1.', how:()=>`${t('tutorial_step_route1_how')} ${tutorialDeviceHint('map')}`, actionLabel:t('tutorial_step_route1_action'), actionCall:'clickLocation', actionArgs:"'route1'", done:()=>((G.wildWinsByLoc||{}).route1||0)>=3, money:300, items:{occa_berry:1}, rewardText:t('tutorial_step_route1_reward')},
  {id:'open_poke_sheet', title:t('tutorial_step_sheet_title')||'Lire une fiche Pokémon', desc:t('tutorial_step_sheet_desc')||'Ouvre une fiche Pokémon pour lire ses stats, IV, EV, talents et attaques.', how:()=>`${tutorialDeviceHint('sheet')} ${t('tutorial_step_sheet_how')}`, actionLabel:t('tutorial_step_sheet_action'), actionCall:'showTab', actionArgs:"'team'", done:()=>!!ensureTutorialState().completed.open_poke_sheet, money:200, rewardText:t('tutorial_step_sheet_reward')},
  {id:'open_bag', title:t('tutorial_step_bag_title')||'Ouvrir le sac', desc:t('tutorial_step_bag_desc')||'Ouvre le Sac depuis les Raccourcis pour voir tes objets.', how:()=>t('tutorial_step_bag_how'), actionLabel:t('tutorial_step_bag_action'), actionCall:'openFullscreenPanel', actionArgs:"'inventory'", items:{potion:2}, done:()=>!!ensureTutorialState().completed.open_bag, rewardText:t('tutorial_step_bag_reward')},
  {id:'open_pokedex', title:t('tutorial_step_dex_title')||'Consulter le Pokédex', desc:t('tutorial_step_dex_desc')||'Ouvre le Pokédex et clique sur un Pokémon déjà vu.', how:()=>t('tutorial_step_dex_how'), actionLabel:t('tutorial_step_dex_action'), actionCall:'openFullscreenPanel', actionArgs:"'pokedex'", done:()=>!!ensureTutorialState().completed.open_pokedex, money:500, rewardText:t('tutorial_step_dex_reward')},
  {id:'first_badge', title:t('tutorial_step_badge_title')||'Premier badge', desc:t('tutorial_step_badge_desc')||'Progresse jusqu’à Argenta et bats Pierre.', how:()=>t('tutorial_step_badge_how'), actionLabel:t('tutorial_step_badge_action'), actionCall:'showTab', actionArgs:"'info'", done:()=>G.badges&&G.badges.includes('brock'), items:{rarecandy:1}, rewardText:t('tutorial_step_badge_reward')},
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
  <div class="tutorial-quest-head"><span>💡</span><b>${tr('tutorial_step_lbl',{idx:idx,total:steps.length})}</b></div>
  <div class="tutorial-quest-title">${step.title}</div>
  <p>${step.desc}</p>
  <div class="tutorial-how"><b>${t('tutorial_howto')}</b><br>${step.how()}</div>
  <div class="tutorial-progress-bar"><div data-pct="${Math.round(doneCount/steps.length*100)}"></div></div>
  <div class="tutorial-quest-actions">
   ${step.actionCall?`<button class="hbtn tutorial-primary" data-action="legacy-call" data-call="${step.actionCall}" data-call-args="${step.actionArgs||''}">${step.actionLabel||t('tutorial_do_btn')}</button>`:''}
   <button class="hbtn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'guide'">${t('guide_title')||'Guide'}</button>
   <button class="hbtn" data-action="legacy-call" data-call="tutorialDisable" data-call-args="">${t('tutorial_disable_all')||'Désactiver'}</button>
  </div>
 </div>`;
}
function showTutorialTip(id, title, body){ return; }

function guideSections(){
 return {
  map:{icon:(typeof getIcon==='function'?getIcon('map',14):''), title:t('guide_map_title')||'Carte & progression', pages:[
   [(typeof t==='function'?t('guide_map_read'):'Lire la carte'),(typeof t==='function'?t('guide_map_read_desc'):'Les couleurs montrent l’état des lieux : disponibles, verrouillés, zones avec captures manquantes, quêtes actives ou shiny encore absents. Le bouton d’aide de la carte résume ce code couleur.')],
   [(typeof t==='function'?t('guide_movement'):(typeof t==='function'?t('guide_movement'):'Movement')),(typeof t==='function'?t('guide_movement_desc'):'Clique sur un lieu débloqué pour t’y rendre. Une fois sur place, la fenêtre Lieu affiche les actions disponibles : explorer, défier, boutique, PNJ, bateau, labo fossile ou accès spéciaux.')],
   [(typeof t==='function'?t('guide_progress_locks'):'Verrous de progression'),(typeof t==='function'?t('guide_progress_locks_desc'):'La progression peut dépendre d’un nombre de combats sauvages gagnés, d’un badge, d’une quête principale ou d’un objet spécial. Les messages de blocage indiquent toujours la condition manquante.')],
   [(typeof t==='function'?t('guide_regions'):(typeof t==='function'?t('guide_regions'):'Regions')),(typeof t==='function'?t('guide_regions_desc'):'Kanto puis Johto se débloquent avec la progression. Certaines règles d’accès imposent aussi de terminer une Ligue ou un Pokédex régional avant d’aller plus loin.')],
   [(typeof t==='function'?t('guide_npc_quests'):'PNJ et quêtes'),(typeof t==='function'?t('guide_npc_quests_desc'):'Les PNJ servent à faire avancer l’histoire, lancer des quêtes secondaires ou déclencher des combats scénarisés. Pense à revisiter les villes après les gros objectifs.')]
  ]},
  combat:{icon:(typeof getIcon==='function'?getIcon('battle',14):''), title:t('guide_combat_title')||'Combat', pages:[
   [(typeof t==='function'?t('guide_combat_basics'):'Principe général'),(typeof t==='function'?t('guide_combat_basics_desc'):'Les combats sont automatiques et en temps réel. Tu ne choisis pas l’attaque pendant le combat : la stratégie se prépare avant, via l’équipe, les objets, les talents et l’ordre de tes Pokémon.')],
   [t('guide_attack_bars'),(typeof t==='function'?t('guide_attack_bars_desc'):'Each Pokémon automatically charges its next attack. Speed, status effects, and certain abilities modify the attack rhythm.')],
   [(typeof t==='function'?t('guide_combat_eff'):(typeof t==='function'?t('guide_combat_eff'):'Effectiveness')),(typeof t==='function'?t('guide_combat_eff_desc'):'Les indicateurs ×2, ×4, ×½, ×¼ et ×0 montrent l’efficacité d’un type contre la cible actuelle. Ils sont visibles directement sur les attaques pour lire rapidement un matchup.')],
   [(typeof t==='function'?t('guide_combat_switch'):'Changement de Pokémon'),(typeof t==='function'?t('guide_combat_switch_desc'):'Tu peux changer de Pokémon actif pendant un combat normal si un autre membre vivant est disponible. Les combats d’entraînement solo n’autorisent pas ce changement.')],
   [(typeof t==='function'?t('guide_combat_status'):(typeof t==='function'?t('guide_combat_status'):'Status Effects')),(typeof t==='function'?t('guide_combat_status_desc'):'Brûlure, poison, poison grave, sommeil, gel et paralysie ont des effets récurrents ou des pertes de tour. Ils sont affichés en badges courts sur les cartes.')],
   [(typeof t==='function'?t('guide_combat_items'):'Talents et objets'),(typeof t==='function'?t('guide_combat_items_desc'):'Les talents et objets tenus peuvent réduire des dégâts, soigner, booster des stats ou modifier des types d’attaque. Observe les petites capsules visuelles quand ils s’activent.')],
   [(typeof t==='function'?t('guide_combat_loot'):(typeof t==='function'?t('guide_combat_loot'):'Loot & Captures')),(typeof t==='function'?t('guide_combat_loot_desc'):'Après les combats sauvages, le jeu gère automatiquement les captures et le butin. Le résumé de session regroupe captures, objets, victoires, K.O. et dégâts de l’équipe.')],
   [(typeof t==='function'?t('guide_combat_special'):(typeof t==='function'?t('guide_combat_special'):'Special Battles')),(typeof t==='function'?t('guide_combat_special_desc'):'Arènes, Ligue, rival, Team Rocket, boss de quête et Atoll demandent surtout de la préparation : bonne équipe, bons talents, EV et objets tenus.')]
  ]},
  pokemon:{icon:(typeof getIcon==='function'?getIcon('pokeball',14):''), title:t('guide_pokemon_title')||'Pokémon', pages:[
   [t('guide_pokemon_sheet'),`${tutorialDeviceHint('sheet')} ${t('guide_pokemon_sheet_desc')}`],
   [(typeof t==='function'?t('guide_sheet_base'):'Base Stats'),(typeof t==='function'?t('guide_sheet_base_desc'):'Les Base Stats représentent le potentiel naturel de l’espèce. Deux Pokémon d’une même espèce partagent cette base, puis les IV/EV/personnalisation font la différence.')],
   [(typeof t==='function'?t('guide_sheet_iv'):'IV'),(typeof t==='function'?t('guide_sheet_iv_desc'):'Les IV sont des bonus durables sur chaque statistique. Plus ils sont hauts, meilleur est le Pokémon sur le long terme.')],
   [(typeof t==='function'?t('guide_sheet_ev'):(typeof t==='function'?t('guide_ev_training'):'EV')),(typeof t==='function'?t('guide_sheet_ev_desc'):'Les EV représentent l’entraînement spécialisé. Ils montent surtout via l’entraînement EV et améliorent progressivement une statistique précise.')],
   [(typeof t==='function'?t('guide_sheet_abilities'):(typeof t==='function'?t('guide_dict_abilities'):'Abilities')),(typeof t==='function'?t('guide_sheet_abilities_desc'):'Chaque espèce peut disposer de plusieurs talents. La capture, l’entraînement Talent et certains progrès débloquent ces options au fil du temps.')],
   [(typeof t==='function'?t('guide_sheet_moves'):(typeof t==='function'?t('guide_dict_moves'):'Moves')),(typeof t==='function'?t('guide_sheet_moves_desc'):'Clique une attaque connue pour sélectionner un slot à remplacer, puis une attaque apprenable. Les descriptions de capacités indiquent type, puissance, précision et effets.')],
   [(typeof t==='function'?t('guide_sheet_item'):'Objet tenu'),(typeof t==='function'?t('guide_sheet_item_desc'):'Un objet tenu peut transformer un Pokémon médiocre en bon support, ou renforcer un sweeper déjà fort. Un même objet ne peut être équipé que sur un seul Pokémon à la fois.')],
   [(typeof t==='function'?t('guide_sheet_fav'):'Favori / verrouillage'),(typeof t==='function'?t('guide_sheet_fav_desc'):'Favori sert à repérer un Pokémon important. Verrouillé empêche plusieurs automatismes de le recycler par erreur.')]
  ]},
  bag:{icon:(typeof getIcon==='function'?getIcon('bag',14):''), title:t('guide_bag_title')||'Sac', pages:[
   [(typeof t==='function'?t('guide_bag_org'):'Organisation'),(typeof t==='function'?t('guide_bag_org_desc'):'Le sac est trié par catégories : consommables, objets tenus, pierres, trésors, fossiles et objets spéciaux. Utilise les filtres et le tri pour gagner du temps.')],
   [(typeof t==='function'?t('guide_bag_consumables'):'Consommables'),(typeof t==='function'?t('guide_bag_consumables_desc'):'Les soins, bonbons et objets d’usage immédiat s’emploient depuis le sac ou via certaines interfaces dédiées.')],
   [(typeof t==='function'?t('guide_bag_held'):'Objets tenus'),(typeof t==='function'?t('guide_bag_held_desc'):'Les objets tenus sont pensés pour la préparation d’équipe. Le bonus réel dépend parfois du stock possédé dans le sac.')],
   [(typeof t==='function'?t('guide_evo_stones'):'Evolution Stones'),(typeof t==='function'?t('guide_evo_stones_desc'):'Stones show compatible Pokémon. The game also tells you if the target evolution is already obtained.')],
   [(typeof t==='function'?t('guide_bag_treasure'):(typeof t==='function'?t('guide_bag_treasure'):'Treasures & Fossils')),(typeof t==='function'?t('guide_bag_treasure_desc'):'Les trésors servent surtout à l’économie. Les fossiles servent à la pension / résurrection plutôt qu’à la vente.')]
  ]},
  mine:{icon:(typeof getIcon==='function'?getIcon('mine',14):''), title:t('guide_mine_title')||'Mine', pages:[
   [(typeof t==='function'?t('guide_mine_goal'):'Objectif'),(typeof t==='function'?t('guide_mine_goal_desc'):'La mine cache pierres, trésors et fossiles. Il faut révéler complètement les objets pour les récupérer.')],
   [(typeof t==='function'?t('guide_mine_tools'):'Outils'),(typeof t==='function'?t('guide_mine_tools_desc'):'Le burin est précis. Le marteau couvre une petite zone. Les améliorations débloquent des outils plus efficaces comme la pioche renforcée, la foreuse et la dynamite.')],
   [(typeof t==='function'?t('guide_mine_energy'):(typeof t==='function'?t('guide_mine_energy'):'Energy')),(typeof t==='function'?t('guide_mine_energy_desc'):'Chaque coup consomme de l’énergie. L’énergie se régénère avec le temps et certains systèmes de progression.')],
   [(typeof t==='function'?t('guide_mine_refresh'):'Renouvellement'),(typeof t==='function'?t('guide_mine_refresh_desc'):'Une fois tous les objets d’une couche récupérés, la mine se renouvelle. Les futurs mineurs améliorent l’efficacité et l’endurance des sessions.')]
  ]},
  hatchery:{icon:(typeof getIcon==='function'?getIcon('hatchery',14):''), title:t('guide_hatchery_title')||'Pension', pages:[
   [(typeof t==='function'?t('guide_hatchery_deposit'):(typeof t==='function'?t('guide_hatchery_deposit'):'Deposit a Pokémon')),(typeof t==='function'?t('guide_hatchery_deposit_desc'):'Dépose un Pokémon depuis l’équipe ou depuis la boîte si un slot est libre. Plusieurs slots se débloquent via les améliorations.')],
   [(typeof t==='function'?t('guide_hatchery_eggs'):'Progression des œufs'),(typeof t==='function'?t('guide_hatchery_eggs_desc'):'Les œufs et fossiles avancent avec les K.O. de combat. Quand le compteur requis est atteint, ils sont prêts à éclore.')],
   [(typeof t==='function'?t('guide_hatchery_fossils'):'Fossiles'),(typeof t==='function'?t('guide_hatchery_fossils_desc'):'Les fossiles trouvés à la mine peuvent être envoyés en pension pour être ranimés sous forme de Pokémon.')],
   [(typeof t==='function'?t('guide_hatchery_auto'):'Automatisation'),(typeof t==='function'?t('guide_hatchery_auto_desc'):'La pension possède une file d’attente manuelle, un remplissage automatique, une éclosion automatique, des filtres de tri et du personnel.')],
   [(typeof t==='function'?t('guide_hatchery_staff'):(typeof t==='function'?t('guide_hatchery_staff'):'Staff')),(typeof t==='function'?t('guide_hatchery_staff_desc'):'Les gérants améliorent progressivement l’efficacité de la pension. Ils se recrutent par lieu et gagnent de l’XP en travaillant.')]
  ]},
  training:{icon:(typeof getIcon==='function'?getIcon('training',14):''), title:t('guide_training_title')||'Entraînement', pages:[
   [(typeof t==='function'?t('guide_training_modes'):'Modes'),(typeof t==='function'?t('guide_training_modes_desc'):'Les modes principaux sont Niveau, EV, Talent et Capacité. Chaque mode vise une amélioration précise.')],
   [t('guide_training_level'),(typeof t==='function'?t('guide_training_level_desc'):'Le stage Niveau donne plusieurs niveaux d’un coup, dans la limite du niveau 100.')],
   [(typeof t==='function'?t('guide_ev_training'):'EV'),(typeof t==='function'?t('guide_ev_training_desc'):'The EV stage gives exactly +1 random EV as long as the Pokémon is not already at maximum.')],
   [(typeof t==='function'?t('guide_talent_training'):'Talent'),(typeof t==='function'?t('guide_talent_training_desc'):'The Talent stage attempts to unlock or reconfirm a possible ability of the species. Rare abilities naturally take longer.')],
   [(typeof t==='function'?t('guide_ability'):'Ability'),(typeof t==='function'?t('guide_ability_desc'):'Le stage Capacité débloque des attaques avancées réservées à l’entraînement. Elles deviennent ensuite apprenables dans la fiche du Pokémon.')],
   [(typeof t==='function'?t('guide_slots_auto'):'Slots & Automation'),(typeof t==='function'?t('guide_slots_auto_desc'):'Each slot can have its own queue and its own auto mode. Training staff also improves system consistency.')]
  ]},
  quests:{icon:(typeof getIcon==='function'?getIcon('quests',14):''), title:(typeof t==='function'?t('guide_quests_title'):'Quests'), pages:[
   [(typeof t==='function'?t('guide_main_quests'):'Main Quests'),(typeof t==='function'?t('guide_main_quests_desc'):'Elles débloquent l’histoire, des villes, des objets-clés et les passages majeurs comme la Poké Flûte ou l’accès à d’autres régions.')],
   [(typeof t==='function'?t('guide_side_quests'):'Side Quests'),(typeof t==='function'?t('guide_side_quests_desc'):'They mainly give money, items or special battles. They often appear through town NPCs.')],
   [(typeof t==='function'?t('guide_repeatable_quests'):'Repeatable Quests'),(typeof t==='function'?t('guide_repeatable_quests_desc'):'Repeatables serve as long-term economy. They require defeating, capturing or selling depending on the objective.')],
   [(typeof t==='function'?t('guide_quest_battles'):'Quest Battles'),(typeof t==='function'?t('guide_quest_battles_desc'):'Certaines quêtes lancent un combat unique. Le défi est souvent plus important qu’un simple combat sauvage et peut donner un Pokémon ou un gros reward.')]
  ]},
  economy:{icon:(typeof getIcon==='function'?getIcon('shop',14):''), title:(typeof t==='function'?t('guide_economy'):'Economy & Market'), pages:[
   [(typeof t==='function'?t('guide_shops'):'Shops'),(typeof t==='function'?t('guide_shops_desc'):'Les boutiques vendent soins, objets spéciaux, pierres, objets tenus et autres ressources selon ta progression.')],
   [(typeof t==='function'?t('guide_pokemarket'):'PokéMarket'),(typeof t==='function'?t('guide_pokemarket_desc'):'The Market is used to buy certain species not easily found in the wild. It completes the collection more than it replaces exploration.')],
   [(typeof t==='function'?t('guide_treasures'):'Treasures & Sales'),(typeof t==='function'?t('guide_treasures_desc'):'The mine fuels a large part of the economy through treasures. Duplicate special items can also be converted into money.')],
   [(typeof t==='function'?t('guide_rewards'):'Rewards'),(typeof t==='function'?t('guide_economy_rewards_desc'):'Argent et objets viennent des quêtes, combats, mine, captures, répétables et modes spéciaux comme l’Atoll.')]
  ]},
  automation:{icon:(typeof getIcon==='function'?getIcon('settings',14):''), title:t('guide_automation_title')||'Automatisation & personnel', pages:[
   [(typeof t==='function'?t('guide_automation'):'How it works'),(typeof t==='function'?t('guide_automation_desc'):'L’automatisation n’agit pas seule au début : il faut acheter les modules, configurer les règles et parfois remplir la file d’attente manuellement.')],
   [(typeof t==='function'?t('guide_queues'):'Queues'),(typeof t==='function'?t('guide_queues_desc'):'La pension et l’entraînement possèdent leurs propres files, avec capacité maximale, filtres et tri.')],
   [(typeof t==='function'?t('guide_staff'):'Staff'),(typeof t==='function'?t('guide_staff_desc'):'Le personnel se recrute selon la progression. Chaque employé donne un bonus spécialisé et gagne des niveaux avec l’usage.')],
   [(typeof t==='function'?t('guide_protections'):'Protections'),(typeof t==='function'?t('guide_protections_desc'):'Les Pokémon verrouillés et certaines situations évitent que l’automatisation touche à des Pokémon que tu veux garder manuellement.')]
  ]},
  save:{icon:(typeof getIcon==='function'?getIcon('save',14):''), title:t('guide_save_title')||'Sauvegardes & AFK', pages:[
   [(typeof t==='function'?t('guide_multi_saves'):'Multi-saves'),(typeof t==='function'?t('guide_multi_saves_desc'):'The game manages multiple saves with customizable name, background and icon.')],
   [(typeof t==='function'?t('guide_import_export'):'Import / Export'),(typeof t==='function'?t('guide_import_export_desc'):'Exporte régulièrement tes saves pour éviter toute perte pendant les phases alpha. L’import permet aussi d’écraser proprement une partie existante.')],
   [(typeof t==='function'?t('guide_afk'):'AFK'),(typeof t==='function'?t('guide_afk_desc'):'Une partie de la progression peut être simulée hors ligne. Le résumé AFK indique combats gagnés, captures, énergie, argent et K.O. éventuels.')],
   [(typeof t==='function'?t('guide_alpha_safety'):'Alpha Safety'),(typeof t==='function'?t('guide_alpha_safety_desc'):'Comme le projet est encore en alpha, garde toujours une exportation récente avant de tester un nouveau zip.')]
  ]},
  atoll:{icon:(typeof getIcon==='function'?getIcon('atoll',14):''), title:t('battle_atoll_title')||'Atoll de Combat', pages:[
   [(typeof t==='function'?t('guide_battle_atoll'):'Battle Atoll'),(typeof t==='function'?t('guide_battle_atoll_desc'):'L’Atoll de Combat est le contenu de fin d’alpha. Il sert à tester des équipes optimisées dans plusieurs formats.')],
   [(typeof t==='function'?t('guide_formats'):'Formats'),(typeof t==='function'?t('guide_formats_desc'):'Tour, Usine, Arène et Dôme appliquent chacun des contraintes différentes : rang maximum, location, objets interdits ou équipe prêtée.')],
   [(typeof t==='function'?t('guide_atoll_rotation'):(G&&G.lang==='en'?'12-hour rotation':'Rotation de 12 h')),(typeof t==='function'?t('guide_atoll_rotation_desc'):(G&&G.lang==='en'?'Opposing teams, banned legendaries and the shop rotate every 12 hours (shared UTC window). The timer is shown in the Atoll menu.':'Les équipes adverses, les légendaires bannis et la boutique tournent toutes les 12 heures (fenêtre UTC partagée). Le minuteur est affiché dans le menu de l’Atoll.'))],
   [(typeof t==='function'?t('guide_training_prep'):(typeof t==='function'?t('guide_training_prep'):'Preparation')),(typeof t==='function'?t('guide_training_prep_desc'):'Les objets tenus, les talents, les EV et l’ordre d’équipe comptent beaucoup plus ici que dans les combats sauvages classiques.')],
   [(typeof t==='function'?t('guide_rewards'):'Rewards'),(typeof t==='function'?t('guide_atoll_rewards_desc'):'Les victoires donnent des jetons Atoll utilisables dans la boutique dédiée. Les séries augmentent l’intérêt du farm.')]
  ]},
  base:{icon:(typeof getIcon==='function'?getIcon('base',14):'🏠'), title:t('guide_base_title')||((G&&G.lang==='en')?'Secret Bases':'Bases Secrètes'), pages:(G&&G.lang==='en')?[
   ['Unlocking','Secret Bases unlock in Hoenn after the Route 111 desert quest. The Secret Base window then appears in the middle column of the dashboard.'],
   ['Establishing your base','On many Hoenn routes, the Location window offers to examine the alcove and establish your base there. Each route has its own canonical room (cave, tree or shrub).'],
   ['Decorating','Collect furniture, mats, posters and dolls, then place them in edit mode. Placement follows the Emerald rules: floor, wall or surface items, and the entrance must stay clear.'],
   ['Visiting','You can visit your own base or import a friend\u2019s base from a file. Some visits include NPC buddies you can battle for daily records.'],
   ['Perks','An established base grants small comfort bonuses (route loot, money). Flags collected from visits improve your base rank.'],
  ]:[
   ['Déblocage','Les Bases Secrètes se débloquent à Hoenn après la quête du désert de la Route 111. La fenêtre Base Secrète apparaît alors dans la colonne centrale du tableau de bord.'],
   ['Établir sa base','Sur de nombreuses routes de Hoenn, la fenêtre Lieu propose d’examiner l’alcôve et d’y établir votre base. Chaque route possède sa salle canonique (grotte, arbre ou buisson).'],
   ['Décorer','Collectionnez meubles, tapis, posters et poupées, puis placez-les en mode édition. La pose suit les règles d’Émeraude : objets au sol, au mur ou sur surface, et l’entrée doit rester dégagée.'],
   ['Visiter','Vous pouvez visiter votre propre base ou importer celle d’un ami depuis un fichier. Certaines visites incluent des copains PNJ à affronter pour des records quotidiens.'],
   ['Avantages','Une base établie donne de petits bonus de confort (butin de route, argent). Les drapeaux récoltés en visite améliorent le rang de votre base.'],
  ]},
  dictionary:{icon:(typeof getIcon==='function'?getIcon('dictionary',14):''), title:t('guide_dictionary_title')||'Dictionnaire', pages:[
   [(typeof t==='function'?t('guide_dict_items'):'Items'),(typeof t==='function'?t('guide_dict_items_desc'):'Search for an item to see if you own it, where to find it and what it does.')],
   [(typeof t==='function'?t('guide_dict_moves'):'Moves'),(typeof t==='function'?t('guide_dict_moves_desc'):'Cherche une attaque pour voir son type, sa puissance, ses effets et quels Pokémon la connaissent déjà.')],
   [(typeof t==='function'?t('guide_dict_abilities'):'Abilities'),(typeof t==='function'?t('guide_dict_abilities_desc'):'Search for an ability to see its effect, rarity and concerned Pokémon.')],
   [(typeof t==='function'?t('guide_dict_usage'):'Usage'),(typeof t==='function'?t('guide_dict_usage_desc'):'Le dictionnaire devient très utile quand le nombre d’objets, de talents et d’attaques commence à devenir difficile à suivre de tête.')]
  ]}
 };
}
function setGuideSection(section){ _guideSection = section || null; const el=document.getElementById('fs-panel-content'); if(el) renderGuidePanel(el); }
function renderGuidePanel(el){
 const sections=guideSections();
 const unlockedSections = {};
 for(const [id, sec] of Object.entries(sections)){
  if(id === 'mine' && typeof mineUnlocked === 'function' && !mineUnlocked()) continue;
  if(id === 'hatchery' && typeof hatcheryUnlocked === 'function' && !hatcheryUnlocked()) continue;
  if(id === 'training' && typeof trainingUnlocked === 'function' && !trainingUnlocked()) continue;
  // Atoll : visible uniquement quand l'Atoll est réellement débloqué (Ligue gagnée)
  if(id === 'atoll' && !((typeof isAtollUnlocked === 'function') ? isAtollUnlocked() : (G.badges && (G.badges.includes('elite4') || G.badges.includes('johto_elite4'))))) continue;
  // Bases Secrètes : visible uniquement après le déblocage à Hoenn (quête 216)
  if(id === 'base' && !((typeof secretBaseUnlocked === 'function') ? secretBaseUnlocked() : !!(G && G.unlockedSecretBaseHoenn))) continue;
  if(id === 'automation' && typeof hatcheryUnlocked === 'function' && typeof trainingUnlocked === 'function' && typeof mineUnlocked === 'function' && !hatcheryUnlocked() && !trainingUnlocked() && !mineUnlocked()) continue;
  unlockedSections[id] = sec;
 }

 if(_guideSection && unlockedSections[_guideSection]){
  const sec=unlockedSections[_guideSection];
  el.innerHTML=`<div class="guide-header"><div><h2>${sec.icon} ${sec.title}</h2><p>${typeof t==='function'?t('guide_detail'):'Detailed guide'}</p></div><button class="hbtn" data-action="legacy-call" data-call="setGuideSection" data-call-args="null">${typeof t==='function'?t('back'):'← Back'}</button></div>
  <div class="guide-page-list">${sec.pages.map(([title,txt])=>`<article class="guide-info-card"><h3>${title}</h3><p>${txt}</p></article>`).join('')}</div>`;
  return;
 }
 el.innerHTML=`<div class="guide-header"><div><h2>${t('guide_title')||'Guide'}</h2><p>${t('guide_intro')||'Choisis une rubrique pour tout savoir.'}</p></div></div>
 <div class="guide-actions"><button class="hbtn" data-action="legacy-call" data-call="tutorialEnable" data-call-args="">${t('tutorial_enable')||'Activer tutos'}</button><button class="hbtn" data-action="legacy-call" data-call="tutorialDisable" data-call-args="">${t('tutorial_disable_all')||'Désactiver tutos'}</button></div>
 <div class="guide-grid">${Object.entries(unlockedSections).map(([id,sec])=>`<button class="guide-card guide-card-button" data-action="legacy-call" data-call="setGuideSection" data-call-args="'${id}'"><h3>${sec.icon} ${sec.title}</h3><p>${tr('guide_pages_info',{count:sec.pages.length})}</p></button>`).join('')}</div>`;
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


