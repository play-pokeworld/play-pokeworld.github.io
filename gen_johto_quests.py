# Ajoute les quêtes principales Johto (histoire + trio légendaire + Lugia/Ho-Oh/Celebi)
# et le trio légendaire en wilds rares.
import re

# ---- 1) STORY_QUESTS : insère avant la fermeture de l'array ----
p='src/scripts/data/game-data.js'
s=open(p,encoding='utf-8').read()

anchor_sq="];\n\nfunction getSpeciesTalents(id){"
assert anchor_sq in s, "anchor STORY_QUESTS close introuvable"

new_main = '''  // ===================== HISTOIRE POST-LIGUE JOHTO (légendaires) =====================
  {id:60, region:'johto', title_fr:"La Tour Brûlante : le Mystère des Bêtes", title_en:"Burned Tower: The Beasts' Mystery",
   desc_fr:"À Rosalia, explorez la Tour Brûlante et affrontez 8 Pokémon pour libérer les trois Bêtes Légendaires : Raikou, Entei et Suicune !",
   desc_en:"In Ecruteak, explore Burned Tower and defeat 8 Pokémon to free the three Legendary Beasts: Raikou, Entei and Suicune!",
   type:"defeat_wild", loc:"burnedtower", target:8, rewardMoney:3000, rewardItems:{rarecandy:5}, rewardDesc_fr:"3 000₽ + 5 Super Bonbons", rewardDesc_en:"3,000₽ + 5 Rare Candies"},
  {id:61, region:'johto', title_fr:"Raikou, la Foudre Pourpre", title_en:"Raikou, the Purple Thunder",
   desc_fr:"Sillonnez la Route 44 et remportez 10 combats pour faire surgir Raikou, la Bête Foudre !",
   desc_en:"Roam Route 44 and win 10 battles to summon Raikou, the Thunder Beast!",
   type:"defeat_wild", loc:"jroute44", target:10, rewardMoney:5000, rewardPoke:243, rewardDesc_fr:"Raikou (Légendaire ✨)", rewardDesc_en:"Raikou (Legendary ✨)"},
  {id:62, region:'johto', title_fr:"Entei, le Volcan Vivant", title_en:"Entei, the Living Volcano",
   desc_fr:"Parcourez la Route 28 et remportez 10 combats pour réveiller Entei, la Bête Feu !",
   desc_en:"Travel Route 28 and win 10 battles to awaken Entei, the Fire Beast!",
   type:"defeat_wild", loc:"jroute28", target:10, rewardMoney:5000, rewardPoke:244, rewardDesc_fr:"Entei (Légendaire ✨)", rewardDesc_en:"Entei (Legendary ✨)"},
  {id:63, region:'johto', title_fr:"Suicune, l'Aurore Boréale", title_en:"Suicune, the Aurora",
   desc_fr:"Parcourez la Route 42 et remportez 10 combats pour croiser Suicune, la Bête Eau !",
   desc_en:"Cross Route 42 and win 10 battles to meet Suicune, the Water Beast!",
   type:"defeat_wild", loc:"jroute42", target:10, rewardMoney:5000, rewardPoke:245, rewardDesc_fr:"Suicune (Légendaire ✨)", rewardDesc_en:"Suicune (Legendary ✨)"},
  {id:64, region:'johto', title_fr:"Les Îles Whirl : Lugia, Gardien des Mers", title_en:"Whirl Islands: Lugia, Guardian of the Sea",
   desc_fr:"Plongez aux Îles Whirl et remportez 10 combats pour éveiller Lugia, le Pokémon de la Mer !",
   desc_en:"Dive to the Whirl Islands and win 10 battles to awaken Lugia, the Sea Pokémon!",
   type:"defeat_wild", loc:"whirlislands", target:10, rewardMoney:8000, rewardPoke:249, rewardDesc_fr:"Lugia (Légendaire ✨)", rewardDesc_en:"Lugia (Legendary ✨)"},
  {id:65, region:'johto', title_fr:"La Tour Cendrée : Ho-Oh, Oiseau de Feu", title_en:"Tin Tower: Ho-Oh, the Fire Bird",
   desc_fr:"Gravissez la Tour Cendrée à Rosalia et remportez 10 combats pour faire apparaître Ho-Oh, l'Oiseau de Feu !",
   desc_en:"Climb the Tin Tower in Ecruteak and win 10 battles to summon Ho-Oh, the Fire Bird!",
   type:"defeat_wild", loc:"tintower", target:10, rewardMoney:8000, rewardPoke:250, rewardDesc_fr:"Ho-Oh (Légendaire ✨)", rewardDesc_en:"Ho-Oh (Legendary ✨)"},
  {id:66, region:'johto', title_fr:"Le Bois aux Chênes : Celebi, Pokémon Fabuleux", title_en:"Ilex Forest: Celebi, the Mythical",
   desc_fr:"Dans le Bois aux Chênes, remportez 12 combats pour rencontrer Celebi, le Pokémon du Temps !",
   desc_en:"In Ilex Forest, win 12 battles to meet Celebi, the Time Pokémon!",
   type:"defeat_wild", loc:"ilexforest", target:12, rewardMoney:10000, rewardPoke:251, rewardDesc_fr:"Celebi (Fabuleux ✨)", rewardDesc_en:"Celebi (Mythical ✨)"}'''

s=s.replace(anchor_sq, ",\n" + new_main + "\n];\n\nfunction getSpeciesTalents(id){", 1)

# ---- 2) Trio légendaire en wilds rares (IIFE populateJohtoWild) ----
anchor_iife="  if(LOCS_JOHTO['whirlislands']) LOCS_JOHTO['whirlislands'].wild = [[72, 18, 24, 'common'], [129, 18, 24, 'common']];"
assert anchor_iife in s, "anchor IIFE whirlislands introuvable"
trio='''  // Trio légendaire (Raikou / Entei / Suicune) — rencontres rares disséminées en Johto
  if(LOCS_JOHTO['jroute44']) LOCS_JOHTO['jroute44'].wild.push([243, 30, 36, 'rare']); // Raikou
  if(LOCS_JOHTO['jroute28']) LOCS_JOHTO['jroute28'].wild.push([244, 32, 38, 'rare']); // Entei
  if(LOCS_JOHTO['jroute42']) LOCS_JOHTO['jroute42'].wild.push([245, 28, 34, 'rare']); // Suicune'''
s=s.replace(anchor_iife, anchor_iife + "\n" + trio, 1)

open(p,'w',encoding='utf-8').write(s)
print("game-data.js: quêtes principales Johto + trio légendaire wilds OK")
