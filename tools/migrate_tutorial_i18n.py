#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migre les chaînes FR en dur de src/game/display/tutorial.js vers les locales
fr/ui.js + en/ui.js. Idempotent : réutilise les clés existantes quand elles
existent déjà, n'ajoute que les nouvelles. Vérifie chaque remplacement.
"""
import io, re, sys

ROOT = '/home/user/pokeworld_refactor'
TUT = ROOT + '/src/game/display/tutorial.js'
FR = ROOT + '/src/localization/fr/ui.js'
EN = ROOT + '/src/localization/en/ui.js'

# ---------------------------------------------------------------- clés ------
# (clé, FR, EN) — FR doit matcher EXACTEMENT le littéral en dur du fichier.
KEYS = [
 ("tutorial_step_route1_how",
  "Où aller : fenêtre Carte → Route 1. Ensuite, dans la fenêtre Lieu, clique sur Explorer.",
  "Where to go: Map window → Route 1. Then, in the Location window, click Explore."),
 ("tutorial_step_route1_action", "Aller à Route 1", "Go to Route 1"),
 ("tutorial_step_route1_reward", "+300₽ + 3 Baies Oran", "+300₽ + 3 Oran Berries"),
 ("tutorial_step_sheet_how",
  "La fiche contient les onglets Base Stats / IV / EV et la liste des attaques.",
  "The sheet contains the Base Stats / IV / EV tabs and the move list."),
 ("tutorial_step_sheet_action", "Voir mon équipe", "View my team"),
 ("tutorial_step_sheet_reward", "+200₽", "+200₽"),
 ("tutorial_step_bag_how",
  "Dans la fenêtre Raccourcis, clique sur Sac. Tu y trouveras baies, objets tenus, pierres, trésors et objets spéciaux.",
  "In the Shortcuts window, click Bag. You will find berries, held items, stones, treasures and special items."),
 ("tutorial_step_bag_action", "Ouvrir le Sac", "Open the Bag"),
 ("tutorial_step_bag_reward", "+2 Potions", "+2 Potions"),
 ("tutorial_step_dex_how",
  "Dans Raccourcis, ouvre le Pokédex. Clique sur un Pokémon non grisé pour voir où le trouver, ses talents et sa description.",
  "In Shortcuts, open the Pokédex. Click a non-greyed Pokémon to see where to find it, its abilities and description."),
 ("tutorial_step_dex_action", "Ouvrir le Pokédex", "Open the Pokédex"),
 ("tutorial_step_dex_reward", "+500₽", "+500₽"),
 ("tutorial_step_badge_how",
  "Nettoie les routes jusqu’à Argenta. Une fois à Argenta, dans la fenêtre Lieu, clique sur Défier Pierre. Les badges débloquent de nouvelles zones.",
  "Clear the routes up to Pewter City. Once there, in the Location window, click Challenge Brock. Badges unlock new areas."),
 ("tutorial_step_badge_action", "Voir la Carte", "View the Map"),
 ("tutorial_step_badge_reward", "+1 Super Bonbon", "+1 Rare Candy"),

 ("guide_map_read_desc",
  "Les couleurs montrent l’état des lieux : disponibles, verrouillés, zones avec captures manquantes, quêtes actives ou shiny encore absents. Le bouton d’aide de la carte résume ce code couleur.",
  "Zone colors show the state of locations: available, locked, areas with missing captures, active quests or missing shinies. The map help button summarizes this color code."),
 ("guide_movement_desc",
  "Clique sur un lieu débloqué pour t’y rendre. Une fois sur place, la fenêtre Lieu affiche les actions disponibles : explorer, défier, boutique, PNJ, bateau, labo fossile ou accès spéciaux.",
  "Click an unlocked location to travel there. Once on site, the Location window shows the available actions: explore, challenge, shop, NPCs, boat, fossil lab or special access."),
 ("guide_progress_locks_desc",
  "La progression peut dépendre d’un nombre de combats sauvages gagnés, d’un badge, d’une quête principale ou d’un objet spécial. Les messages de blocage indiquent toujours la condition manquante.",
  "Progress can depend on a number of wild battles won, a badge, a main quest or a special item. Blocking messages always state the missing condition."),
 ("guide_regions_desc",
  "Kanto puis Johto se débloquent avec la progression. Certaines règles d’accès imposent aussi de terminer une Ligue ou un Pokédex régional avant d’aller plus loin.",
  "Kanto then Johto unlock as you progress. Some access rules also require completing a League or a regional Pokédex before going further."),
 ("guide_npc_quests_desc",
  "Les PNJ servent à faire avancer l’histoire, lancer des quêtes secondaires ou déclencher des combats scénarisés. Pense à revisiter les villes après les gros objectifs.",
  "NPCs drive the story forward, start side quests or trigger scripted battles. Remember to revisit towns after major objectives."),

 ("guide_combat_basics_desc",
  "Les combats sont automatiques et en temps réel. Tu ne choisis pas l’attaque pendant le combat : la stratégie se prépare avant, via l’équipe, les objets, les talents et l’ordre de tes Pokémon.",
  "Battles are automatic and in real time. You do not pick the attack during battle: strategy is prepared beforehand, through your team, items, abilities and Pokémon order."),
 ("guide_combat_eff_desc",
  "Les indicateurs ×2, ×4, ×½, ×¼ et ×0 montrent l’efficacité d’un type contre la cible actuelle. Ils sont visibles directement sur les attaques pour lire rapidement un matchup.",
  "The ×2, ×4, ×½, ×¼ and ×0 indicators show a type's effectiveness against the current target. They are displayed directly on attacks to quickly read a matchup."),
 ("guide_combat_switch_desc",
  "Tu peux changer de Pokémon actif pendant un combat normal si un autre membre vivant est disponible. Les combats d’entraînement solo n’autorisent pas ce changement.",
  "You can switch your active Pokémon during a normal battle if another living member is available. Solo training battles do not allow switching."),
 ("guide_combat_status_desc",
  "Brûlure, poison, poison grave, sommeil, gel et paralysie ont des effets récurrents ou des pertes de tour. Ils sont affichés en badges courts sur les cartes.",
  "Burn, poison, bad poison, sleep, freeze and paralysis have recurring effects or lost turns. They are shown as short badges on cards."),

 ("guide_combat_loot_desc",
  "Après les combats sauvages, le jeu gère automatiquement les captures et le butin. Le résumé de session regroupe captures, objets, victoires, K.O. et dégâts de l’équipe.",
  "After wild battles, the game automatically handles captures and loot. The session summary groups captures, items, wins, K.O.s and team damage."),
 ("guide_combat_special_desc",
  "Arènes, Ligue, rival, Team Rocket, boss de quête et Atoll demandent surtout de la préparation : bonne équipe, bons talents, EV et objets tenus.",
  "Gyms, League, rival, Team Rocket, quest bosses and the Atoll mostly require preparation: good team, good abilities, EVs and held items."),

 ("guide_pokemon_sheet", "Fiche Pokémon", "Pokémon Sheet"),
 ("guide_pokemon_sheet_desc",
  "La fiche montre types, niveau, rang, Base Stats, IV, EV, talents, objet tenu, évolutions, attaques connues et attaques apprenables.",
  "The sheet shows types, level, rank, Base Stats, IVs, EVs, abilities, held item, evolutions, known moves and learnable moves."),
 ("guide_sheet_base_desc",
  "Les Base Stats représentent le potentiel naturel de l’espèce. Deux Pokémon d’une même espèce partagent cette base, puis les IV/EV/personnalisation font la différence.",
  "Base Stats represent the species' natural potential. Two Pokémon of the same species share this base, then IVs/EVs/customization make the difference."),
 ("guide_sheet_iv_desc",
  "Les IV sont des bonus durables sur chaque statistique. Plus ils sont hauts, meilleur est le Pokémon sur le long terme.",
  "IVs are lasting bonuses on each stat. The higher they are, the better the Pokémon in the long run."),
 ("guide_sheet_ev_desc",
  "Les EV représentent l’entraînement spécialisé. Ils montent surtout via l’entraînement EV et améliorent progressivement une statistique précise.",
  "EVs represent specialized training. They mainly rise through EV training and gradually improve one specific stat."),
 ("guide_sheet_abilities_desc",
  "Chaque espèce peut disposer de plusieurs talents. La capture, l’entraînement Talent et certains progrès débloquent ces options au fil du temps.",
  "Each species can have several abilities. Catching, Talent training and certain progress unlock these options over time."),
 ("guide_sheet_moves_desc",
  "Clique une attaque connue pour sélectionner un slot à remplacer, puis une attaque apprenable. Les descriptions de capacités indiquent type, puissance, précision et effets.",
  "Click a known move to select a slot to replace, then a learnable move. Move descriptions show type, power, accuracy and effects."),
 ("guide_sheet_item_desc",
  "Un objet tenu peut transformer un Pokémon médiocre en bon support, ou renforcer un sweeper déjà fort. Un même objet ne peut être équipé que sur un seul Pokémon à la fois.",
  "A held item can turn a mediocre Pokémon into a good support, or strengthen an already strong sweeper. The same item can only be equipped on one Pokémon at a time."),
 ("guide_sheet_fav_desc",
  "Favori sert à repérer un Pokémon important. Verrouillé empêche plusieurs automatismes de le recycler par erreur.",
  "Favorite helps spot an important Pokémon. Locked prevents several automations from recycling it by mistake."),

 ("guide_bag_org_desc",
  "Le sac est trié par catégories : consommables, objets tenus, pierres, trésors, fossiles et objets spéciaux. Utilise les filtres et le tri pour gagner du temps.",
  "The bag is sorted by categories: consumables, held items, stones, treasures, fossils and special items. Use filters and sorting to save time."),
 ("guide_bag_consumables_desc",
  "Les soins, bonbons et objets d’usage immédiat s’emploient depuis le sac ou via certaines interfaces dédiées.",
  "Healing items, candies and immediate-use items are used from the bag or through dedicated interfaces."),
 ("guide_bag_treasure_desc",
  "Les trésors servent surtout à l’économie. Les fossiles servent à la pension / résurrection plutôt qu’à la vente.",
  "Treasures are mostly for the economy. Fossils go to the daycare / resurrection rather than being sold."),

 ("guide_mine_goal_desc",
  "La mine cache pierres, trésors et fossiles. Il faut révéler complètement les objets pour les récupérer.",
  "The mine hides stones, treasures and fossils. You must fully reveal items to collect them."),
 ("guide_mine_tools_desc",
  "Le burin est précis. Le marteau couvre une petite zone. Les améliorations débloquent des outils plus efficaces comme la pioche renforcée, la foreuse et la dynamite.",
  "The chisel is precise. The hammer covers a small area. Upgrades unlock more efficient tools like the reinforced pickaxe, the drill and dynamite."),
 ("guide_mine_energy_desc",
  "Chaque coup consomme de l’énergie. L’énergie se régénère avec le temps et certains systèmes de progression.",
  "Each hit consumes energy. Energy regenerates over time and through certain progression systems."),
 ("guide_mine_refresh_desc",
  "Une fois tous les objets d’une couche récupérés, la mine se renouvelle. Les futurs mineurs améliorent l’efficacité et l’endurance des sessions.",
  "Once all items in a layer are collected, the mine renews itself. Future miners improve session efficiency and endurance."),

 ("guide_hatchery_deposit_desc",
  "Dépose un Pokémon depuis l’équipe ou depuis la boîte si un slot est libre. Plusieurs slots se débloquent via les améliorations.",
  "Deposit a Pokémon from the team or from the box if a slot is free. Several slots unlock through upgrades."),
 ("guide_hatchery_eggs_desc",
  "Les œufs et fossiles avancent avec les K.O. de combat. Quand le compteur requis est atteint, ils sont prêts à éclore.",
  "Eggs and fossils progress with battle K.O.s. When the required counter is reached, they are ready to hatch."),
 ("guide_hatchery_fossils_desc",
  "Les fossiles trouvés à la mine peuvent être envoyés en pension pour être ranimés sous forme de Pokémon.",
  "Fossils found in the mine can be sent to the daycare to be revived as Pokémon."),
 ("guide_hatchery_auto_desc",
  "La pension possède une file d’attente manuelle, un remplissage automatique, une éclosion automatique, des filtres de tri et du personnel.",
  "The daycare has a manual queue, automatic filling, automatic hatching, sorting filters and staff."),
 ("guide_hatchery_staff_desc",
  "Les gérants améliorent progressivement l’efficacité de la pension. Ils se recrutent par lieu et gagnent de l’XP en travaillant.",
  "Managers gradually improve daycare efficiency. They are recruited per location and gain XP while working."),

 ("guide_training_modes_desc",
  "Les modes principaux sont Niveau, EV, Talent et Capacité. Chaque mode vise une amélioration précise.",
  "The main modes are Level, EV, Talent and Move. Each mode targets a specific improvement."),
 ("guide_training_level", "Niveau", "Level"),
 ("guide_training_level_desc",
  "Le stage Niveau donne plusieurs niveaux d’un coup, dans la limite du niveau 100.",
  "The Level stage grants several levels at once, up to level 100."),
 ("guide_ability_desc",
  "Le stage Capacité débloque des attaques avancées réservées à l’entraînement. Elles deviennent ensuite apprenables dans la fiche du Pokémon.",
  "The Move stage unlocks advanced moves reserved for training. They then become learnable in the Pokémon's sheet."),

 ("guide_main_quests_desc",
  "Elles débloquent l’histoire, des villes, des objets-clés et les passages majeurs comme la Poké Flûte ou l’accès à d’autres régions.",
  "They unlock the story, towns, key items and major passages like the Poké Flute or access to other regions."),
 ("guide_quest_battles_desc",
  "Certaines quêtes lancent un combat unique. Le défi est souvent plus important qu’un simple combat sauvage et peut donner un Pokémon ou un gros reward.",
  "Some quests start a unique battle. The challenge is often greater than a simple wild battle and can give a Pokémon or a big reward."),

 ("guide_shops_desc",
  "Les boutiques vendent soins, objets spéciaux, pierres, objets tenus et autres ressources selon ta progression.",
  "Shops sell healing items, special items, stones, held items and other resources depending on your progress."),
 ("guide_economy_rewards_desc",
  "Argent et objets viennent des quêtes, combats, mine, captures, répétables et modes spéciaux comme l’Atoll.",
  "Money and items come from quests, battles, the mine, captures, repeatables and special modes like the Atoll."),

 ("guide_automation_title", "Automatisation & personnel", "Automation & Staff"),
 ("guide_automation_desc",
  "L’automatisation n’agit pas seule au début : il faut acheter les modules, configurer les règles et parfois remplir la file d’attente manuellement.",
  "Automation does not act alone at first: you must buy the modules, configure the rules and sometimes fill the queue manually."),
 ("guide_queues_desc",
  "La pension et l’entraînement possèdent leurs propres files, avec capacité maximale, filtres et tri.",
  "The daycare and training each have their own queues, with maximum capacity, filters and sorting."),
 ("guide_staff_desc",
  "Le personnel se recrute selon la progression. Chaque employé donne un bonus spécialisé et gagne des niveaux avec l’usage.",
  "Staff is recruited as you progress. Each employee gives a specialized bonus and gains levels with use."),
 ("guide_protections_desc",
  "Les Pokémon verrouillés et certaines situations évitent que l’automatisation touche à des Pokémon que tu veux garder manuellement.",
  "Locked Pokémon and certain situations prevent automation from touching Pokémon you want to manage manually."),

 ("guide_save_title", "Sauvegardes & AFK", "Saves & AFK"),
 ("guide_import_export_desc",
  "Exporte régulièrement tes saves pour éviter toute perte pendant les phases alpha. L’import permet aussi d’écraser proprement une partie existante.",
  "Export your saves regularly to avoid any loss during the alpha phases. Import also lets you cleanly overwrite an existing game."),
 ("guide_afk_desc",
  "Une partie de la progression peut être simulée hors ligne. Le résumé AFK indique combats gagnés, captures, énergie, argent et K.O. éventuels.",
  "Part of the progression can be simulated offline. The AFK summary shows battles won, captures, energy, money and possible K.O.s."),
 ("guide_alpha_safety_desc",
  "Comme le projet est encore en alpha, garde toujours une exportation récente avant de tester un nouveau zip.",
  "Since the project is still in alpha, always keep a recent export before testing a new zip."),

 ("guide_battle_atoll_desc",
  "L’Atoll de Combat est le contenu de fin d’alpha. Il sert à tester des équipes optimisées dans plusieurs formats.",
  "The Battle Atoll is the end-of-alpha content. It is used to test optimized teams in several formats."),
 ("guide_formats_desc",
  "Tour, Usine, Arène et Dôme appliquent chacun des contraintes différentes : rang maximum, location, objets interdits ou équipe prêtée.",
  "Tower, Factory, Arena and Dome each apply different constraints: maximum rank, rentals, forbidden items or a loaned team."),
 ("guide_training_prep_desc",
  "Les objets tenus, les talents, les EV et l’ordre d’équipe comptent beaucoup plus ici que dans les combats sauvages classiques.",
  "Held items, abilities, EVs and team order matter much more here than in regular wild battles."),
 ("guide_atoll_rewards_desc",
  "Les victoires donnent des jetons Atoll utilisables dans la boutique dédiée. Les séries augmentent l’intérêt du farm.",
  "Victories give Atoll tokens usable in the dedicated shop. Streaks increase the farming value."),

 ("guide_dict_moves_desc",
  "Cherche une attaque pour voir son type, sa puissance, ses effets et quels Pokémon la connaissent déjà.",
  "Search for a move to see its type, power, effects and which Pokémon already know it."),
 ("guide_dict_usage_desc",
  "Le dictionnaire devient très utile quand le nombre d’objets, de talents et d’attaques commence à devenir difficile à suivre de tête.",
  "The dictionary becomes very useful when the number of items, abilities and moves starts getting hard to track by heart."),
]

# ----------------------------------------------------------- remplacements --
# (marqueur_unique_dans_tutorial.js, texte_de_remplacement)
# {K:key} est substitué par le nom de clé.
REPLACEMENTS = [
 # --- tutorialSteps ---
 ("how:()=>`Où aller : fenêtre Carte → Route 1. Ensuite, dans la fenêtre Lieu, clique sur Explorer. ${tutorialDeviceHint('map')}`",
  "how:()=>`${t('{K:tutorial_step_route1_how}')} ${tutorialDeviceHint('map')}`"),
 ("actionLabel:'Aller à Route 1'", "actionLabel:t('{K:tutorial_step_route1_action}')"),
 ("rewardText:'+300₽ + 3 Baies Oran'", "rewardText:t('{K:tutorial_step_route1_reward}')"),
 ("how:()=>`${tutorialDeviceHint('sheet')} La fiche contient les onglets Base Stats / IV / EV et la liste des attaques.`",
  "how:()=>`${tutorialDeviceHint('sheet')} ${t('{K:tutorial_step_sheet_how}')}`"),
 ("actionLabel:'Voir mon équipe'", "actionLabel:t('{K:tutorial_step_sheet_action}')"),
 ("rewardText:'+200₽'", "rewardText:t('{K:tutorial_step_sheet_reward}')"),
 ("how:()=>`Dans la fenêtre Raccourcis, clique sur Sac. Tu y trouveras baies, objets tenus, pierres, trésors et objets spéciaux.`",
  "how:()=>t('{K:tutorial_step_bag_how}')"),
 ("actionLabel:'Ouvrir le Sac'", "actionLabel:t('{K:tutorial_step_bag_action}')"),
 ("rewardText:'+2 Potions'", "rewardText:t('{K:tutorial_step_bag_reward}')"),
 ("how:()=>`Dans Raccourcis, ouvre le Pokédex. Clique sur un Pokémon non grisé pour voir où le trouver, ses talents et sa description.`",
  "how:()=>t('{K:tutorial_step_dex_how}')"),
 ("actionLabel:'Ouvrir le Pokédex'", "actionLabel:t('{K:tutorial_step_dex_action}')"),
 ("rewardText:'+500₽'", "rewardText:t('{K:tutorial_step_dex_reward}')"),
 ("how:()=>`Nettoie les routes jusqu’à Argenta. Une fois à Argenta, dans la fenêtre Lieu, clique sur Défier Pierre. Les badges débloquent de nouvelles zones.`",
  "how:()=>t('{K:tutorial_step_badge_how}')"),
 ("actionLabel:'Voir la Carte'", "actionLabel:t('{K:tutorial_step_badge_action}')"),
 ("rewardText:'+1 Super Bonbon'", "rewardText:t('{K:tutorial_step_badge_reward}')"),

 # --- renderTutorialQuestBlock ---
 ("<b>Tutoriel guidé — Étape ${idx}/${steps.length}</b>",
  "<b>${tr('{K:tutorial_step_lbl}',{idx:idx,total:steps.length})}</b>"),
 ("<div class=\"tutorial-how\"><b>Comment faire :</b><br>",
  "<div class=\"tutorial-how\"><b>${t('{K:tutorial_howto}')}</b><br>"),
 ("${step.actionLabel||'Faire'}", "${step.actionLabel||t('{K:tutorial_do_btn}')}"),

 # --- guideSections : remplacement des littéraux 'FR' par ref clé ---
 # Clés EXISTANTES réutilisées (pas d'ajout dans les locales) :
 ("'Les talents et objets tenus peuvent réduire des dégâts, soigner, booster des stats ou modifier des types d’attaque. Observe les petites capsules visuelles quand ils s’activent.'",
  "(typeof t==='function'?t('guide_combat_items_desc'):'Les talents et objets tenus peuvent réduire des dégâts, soigner, booster des stats ou modifier des types d’attaque. Observe les petites capsules visuelles quand ils s’activent.')"),
 ("'Les objets tenus sont pensés pour la préparation d’équipe. Le bonus réel dépend parfois du stock possédé dans le sac.'",
  "(typeof t==='function'?t('guide_bag_held_desc'):'Les objets tenus sont pensés pour la préparation d’équipe. Le bonus réel dépend parfois du stock possédé dans le sac.')"),
]

# Remplacements génériques de descriptions de pages : (clé, valeur FR exacte)
PAGE_REPLACEMENTS = [
 ("guide_map_read_desc", KEYS), ("guide_movement_desc", KEYS),
 ("guide_progress_locks_desc", KEYS), ("guide_regions_desc", KEYS),
 ("guide_npc_quests_desc", KEYS),
 ("guide_combat_basics_desc", KEYS), ("guide_combat_eff_desc", KEYS),
 ("guide_combat_switch_desc", KEYS), ("guide_combat_status_desc", KEYS),
 ("guide_combat_loot_desc", KEYS),
 ("guide_combat_special_desc", KEYS),
 ("guide_sheet_base_desc", KEYS),
 ("guide_sheet_iv_desc", KEYS), ("guide_sheet_ev_desc", KEYS),
 ("guide_sheet_abilities_desc", KEYS), ("guide_sheet_moves_desc", KEYS),
 ("guide_sheet_item_desc", KEYS), ("guide_sheet_fav_desc", KEYS),
 ("guide_bag_org_desc", KEYS), ("guide_bag_consumables_desc", KEYS),
 ("guide_bag_treasure_desc", KEYS),
 ("guide_mine_goal_desc", KEYS), ("guide_mine_tools_desc", KEYS),
 ("guide_mine_energy_desc", KEYS), ("guide_mine_refresh_desc", KEYS),
 ("guide_hatchery_deposit_desc", KEYS), ("guide_hatchery_eggs_desc", KEYS),
 ("guide_hatchery_fossils_desc", KEYS), ("guide_hatchery_auto_desc", KEYS),
 ("guide_hatchery_staff_desc", KEYS),
 ("guide_training_modes_desc", KEYS), ("guide_training_level_desc", KEYS),
 ("guide_ability_desc", KEYS),
 ("guide_main_quests_desc", KEYS), ("guide_quest_battles_desc", KEYS),
 ("guide_shops_desc", KEYS), ("guide_economy_rewards_desc", KEYS),
 ("guide_automation_desc", KEYS), ("guide_queues_desc", KEYS),
 ("guide_staff_desc", KEYS), ("guide_protections_desc", KEYS),
 ("guide_import_export_desc", KEYS), ("guide_afk_desc", KEYS),
 ("guide_alpha_safety_desc", KEYS),
 ("guide_battle_atoll_desc", KEYS), ("guide_formats_desc", KEYS),
 ("guide_training_prep_desc", KEYS), ("guide_atoll_rewards_desc", KEYS),
 ("guide_dict_moves_desc", KEYS), ("guide_dict_usage_desc", KEYS),
]

def load(path):
    return io.open(path, encoding='utf-8').read()

def js_escape(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')

def main():
    tut = load(TUT)
    fr = load(FR)
    en = load(EN)
    kd = {k: (vfr, ven) for k, vfr, ven in KEYS}

    # ---- 1) descriptions de pages : 'FR exact' -> ref clé ----
    fails = []
    for key, _ in PAGE_REPLACEMENTS:
        vfr, _ven = kd[key]
        old = "'" + vfr + "'"
        if old not in tut:
            fails.append(('page', key))
            continue
        new = "(typeof t==='function'?t('%s'):'%s')" % (key, vfr.replace("'", "\\'"))
        tut = tut.replace(old, new, 1)

    # ---- 2) titres en dur ----
    title_repls = [
        ("['Barres d’attaque',", "[t('guide_attack_bars'),"),
        ("['Niveau',", "[t('guide_training_level'),"),
        ("['Fiche Pokémon',`${tutorialDeviceHint('sheet')} La fiche montre types, niveau, rang, Base Stats, IV, EV, talents, objet tenu, évolutions, attaques connues et attaques apprenables.`],",
         "[t('{K:guide_pokemon_sheet}'),`${tutorialDeviceHint('sheet')} ${t('{K:guide_pokemon_sheet_desc}')}`],"),
        ("title:'Automatisation & personnel'", "title:t('guide_automation_title')||'Automatisation & personnel'"),
        ("title:'Sauvegardes & AFK'", "title:t('guide_save_title')||'Sauvegardes & AFK'"),
    ]
    # La page pokemon utilise déjà guide_pokemon_sheet_desc via PAGE_REPLACEMENTS ?
    # Non : sa desc est dans un template string, géré ci-dessus. On retire donc
    # guide_pokemon_sheet_desc des fail s'il y était.
    for old, new in title_repls:
        new = new.replace('{K:guide_pokemon_sheet_desc}', 'guide_pokemon_sheet_desc').replace('{K:guide_pokemon_sheet}', 'guide_pokemon_sheet')
        if old in tut:
            tut = tut.replace(old, new, 1)
        elif old.startswith("['Fiche Pokémon'"):
            # le template contient déjà la desc remplacée ? essayer forme modifiée
            alt = "['Fiche Pokémon',`${tutorialDeviceHint('sheet')} (typeof t==='function'?t('guide_pokemon_sheet_desc')"
            if "['Fiche Pokémon'," in tut:
                tut = tut.replace("['Fiche Pokémon',", "[t('guide_pokemon_sheet'),", 1)
            else:
                fails.append(('title', 'guide_pokemon_sheet'))
        else:
            fails.append(('title', old[:40]))

    # ---- 3) remplacements explicites ----
    for old, new in REPLACEMENTS:
        for m in re.finditer(r'\{K:([a-z0-9_]+)\}', new):
            new = new.replace('{K:%s}' % m.group(1), m.group(1))
        if old not in tut:
            fails.append(('explicit', old[:60]))
            continue
        tut = tut.replace(old, new, 1)

    # ---- 4) renderGuidePanel : "pages d'informations" ----
    old_pi = "<p>${sec.pages.length} pages d'informations</p>"
    if old_pi in tut:
        tut = tut.replace(old_pi, "<p>${tr('guide_pages_info',{count:sec.pages.length})}</p>", 1)
    else:
        fails.append(('renderGuidePanel', 'pages info'))

    # ---- 5) injection des clés manquantes dans les locales ----
    def existing_keys(txt):
        return set(re.findall(r'^\s*"([A-Za-z0-9_\.]+)"\s*:', txt, re.M))

    fr_existing = existing_keys(fr)
    en_existing = existing_keys(en)
    add_fr = []
    add_en = []
    for key, vfr, ven in KEYS:
        # clés déjà présentes / déjà gérées ailleurs
        if key in ('tutorial_step_lbl', 'tutorial_howto', 'tutorial_do_btn', 'guide_pages_info'):
            continue
        if key not in fr_existing:
            add_fr.append('  "%s":"%s"' % (key, js_escape(vfr)))
        if key not in en_existing:
            add_en.append('  "%s":"%s"' % (key, js_escape(ven)))

    def inject(txt, lines):
        if not lines:
            return txt
        block = ',\n'.join(lines) + '\n'
        # remplacer le "  \"tutorial_do_btn\":\"...\"\n}" final pour insérer avant }
        idx = txt.rstrip().rfind('}')
        head = txt.rstrip()[:idx]
        if not head.rstrip().endswith(','):
            head = head.rstrip() + ','
        return head + '\n' + block + '}\n'

    fr = inject(fr, add_fr)
    en = inject(en, add_en)

    # ---- 6) écriture ----
    io.open(TUT, 'w', encoding='utf-8').write(tut)
    io.open(FR, 'w', encoding='utf-8').write(fr)
    io.open(EN, 'w', encoding='utf-8').write(en)

    print('clés ajoutées fr:', len(add_fr), ' en:', len(add_en))
    if fails:
        print('ÉCHECS (%d):' % len(fails))
        for kind, info in fails:
            print(' -', kind, info)
        return 1
    print('Tous les remplacements ont réussi.')
    return 0

if __name__ == '__main__':
    sys.exit(main())

