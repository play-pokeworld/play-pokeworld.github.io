#!/usr/bin/env python3
# Générateur de données Johto (152-251) pour PokéWorld.
# Ajoute : PD (moves.js), DEX_MAP, SPRITE_DATA (sprites.js), POKE_TALENTS (game-data.js),
# et un IIFE de population des rencontres sauvages Johto (LOCS_JOHTO).
import re, os

# (nid, fr, en, t1, t2, hp, atk, df, spa, spd, spe, cr, xy, a1, a2, a3)
J = [
(152,'Germignon','Chikorita','Grass',None,45,49,65,49,65,45,45,64,'overgrow','overgrow','chlorophyll'),
(153,'Macronium','Bayleef','Grass',None,60,62,80,63,80,60,45,142,'overgrow','overgrow','chlorophyll'),
(154,'Méganium','Meganium','Grass',None,80,82,100,83,100,80,45,236,'overgrow','overgrow','chlorophyll'),
(155,'Héricendre','Cyndaquil','Fire',None,39,52,43,60,50,65,45,65,'blaze','blaze','solarpower'),
(156,'Feurisson','Quilava','Fire',None,58,64,58,80,65,80,45,142,'blaze','blaze','solarpower'),
(157,'Typhlosion','Typhlosion','Fire',None,78,84,78,109,85,100,45,240,'blaze','blaze','solarpower'),
(158,'Kaiminus','Totodile','Water',None,50,65,64,44,48,43,45,66,'torrent','torrent','regenerator'),
(159,'Crocrodil','Croconaw','Water',None,65,80,80,59,63,58,45,142,'torrent','torrent','regenerator'),
(160,'Aligatueur','Feraligatr','Water',None,85,105,100,79,83,78,45,239,'torrent','torrent','regenerator'),
(161,'Fouinette','Sentret','Normal',None,35,46,34,35,45,20,255,50,'compoundeyes','guts','hugepower'),
(162,'Fouinar','Furret','Normal',None,85,76,64,55,66,90,90,145,'compoundeyes','guts','hugepower'),
(163,'Hoothoot','Hoothoot','Normal','Flying',60,30,30,36,56,50,255,52,'compoundeyes','serenegrace','guts'),
(164,'Noarfang','Noctowl','Normal','Flying',100,50,50,86,96,70,90,158,'compoundeyes','serenegrace','guts'),
(165,'Coxy','Ledyba','Bug','Flying',40,20,30,40,80,55,255,53,'compoundeyes','guts','hugepower'),
(166,'Coxyclaque','Ledian','Bug','Flying',55,35,50,55,110,85,90,137,'compoundeyes','guts','hugepower'),
(167,'Mimigal','Spinarak','Bug','Poison',40,60,40,40,40,30,255,50,'poisonpoint','compoundeyes','guts'),
(168,'Migalos','Ariados','Bug','Poison',70,90,70,60,60,40,90,137,'poisonpoint','compoundeyes','guts'),
(169,'Nostenfer','Crobat','Poison','Flying',85,90,80,70,80,130,90,204,'clearbody','serenegrace','regenerator'),
(170,'Loupio','Chinchou','Water','Electric',75,38,38,56,56,67,190,66,'lightningrod','compoundeyes','regenerator'),
(171,'Lanturn','Lanturn','Water','Electric',125,58,58,76,76,67,75,165,'lightningrod','compoundeyes','regenerator'),
(172,'Pichu','Pichu','Electric',None,20,40,15,35,35,60,190,41,'static','static','lightningrod'),
(173,'Mélo','Cleffa','Fairy',None,50,25,28,45,55,15,150,44,'magicguard','serenegrace','regenerator'),
(174,'Toudoudou','Igglybuff','Normal','Fairy',90,30,15,40,20,15,170,42,'magicguard','serenegrace','regenerator'),
(175,'Togepi','Togepi','Fairy',None,35,20,65,40,65,20,140,49,'serenegrace','magicguard','naturalcure'),
(176,'Togetic','Togetic','Fairy','Flying',55,40,85,80,105,40,75,142,'serenegrace','naturalcure','magicguard'),
(177,'Natu','Natu','Psychic','Flying',40,45,45,70,45,70,190,64,'serenegrace','compoundeyes','naturalcure'),
(178,'Xatu','Xatu','Psychic','Flying',65,75,70,95,95,95,75,165,'serenegrace','compoundeyes','naturalcure'),
(179,'Wattouat','Mareep','Electric',None,55,40,40,65,45,35,190,59,'static','static','lightningrod'),
(180,'Lainergie','Flaaffy','Electric',None,70,55,55,80,60,45,120,128,'static','static','lightningrod'),
(181,'Pharamp','Ampharos','Electric',None,90,75,85,115,90,55,45,230,'static','static','lightningrod'),
(182,'Joliflor','Bellossom','Grass',None,75,80,85,100,90,50,45,216,'chlorophyll','chlorophyll','solarpower'),
(183,'Marill','Marill','Water','Fairy',70,20,50,20,50,40,190,71,'thickfat','hugepower','hugepower'),
(184,'Azumarill','Azumarill','Water','Fairy',100,50,80,60,80,50,75,185,'thickfat','hugepower','hugepower'),
(185,'Simularbre','Sudowoodo','Rock',None,70,100,115,30,65,30,65,137,'sturdy','sturdy','guts'),
(186,'Tarpaud','Politoed','Water',None,90,75,75,90,100,70,45,230,'sturdy','regenerator','thickfat'),
(187,'Granivol','Hoppip','Grass','Flying',35,35,40,35,55,50,255,50,'chlorophyll','chlorophyll','solarpower'),
(188,'Floravol','Skiploom','Grass','Flying',55,45,50,45,65,80,120,119,'chlorophyll','solarpower','guts'),
(189,'Cotovol','Jumpluff','Grass','Flying',75,55,70,55,85,110,45,200,'chlorophyll','solarpower','guts'),
(190,'Capumain','Aipom','Normal',None,55,70,55,40,55,85,120,100,'compoundeyes','guts','hugepower'),
(191,'Tournegrin','Sunkern','Grass',None,30,30,30,30,30,30,235,36,'chlorophyll','solarpower','guts'),
(192,'Héliatronc','Sunflora','Grass',None,75,75,55,105,85,30,120,151,'chlorophyll','solarpower','guts'),
(193,'Yanma','Yanma','Bug','Flying',65,65,45,75,45,95,75,78,'speedboost','compoundeyes','serenegrace'),
(194,'Axoloto','Wooper','Water','Ground',55,45,45,25,25,15,255,42,'sturdy','regenerator','guts'),
(195,'Maraiste','Quagsire','Water','Ground',95,85,85,65,65,35,90,151,'sturdy','regenerator','guts'),
(196,'Mentali','Espeon','Psychic',None,65,65,60,130,95,110,45,184,'serenegrace','magicguard','naturalcure'),
(197,'Noctali','Umbreon','Dark',None,95,65,110,60,130,65,45,184,'serenegrace','clearbody','guts'),
(198,'Cornèbre','Murkrow','Dark','Flying',60,85,42,85,42,91,30,108,'compoundeyes','guts','hugepower'),
(199,'Roigada','Slowking','Water','Psychic',95,75,80,100,110,30,70,172,'regenerator','naturalcure','serenegrace'),
(200,'Feuforêve','Misdreavus','Ghost',None,60,60,60,85,85,85,45,159,'levitate','levitate','magicguard'),
(201,'Zarbi','Unown','Psychic',None,48,72,48,72,48,48,225,61,'levitate','levitate','clearbody'),
(202,'Qulbutoké','Wobbuffet','Psychic',None,190,33,58,33,58,33,45,142,'clearbody','magicguard','regenerator'),
(203,'Girafarig','Girafarig','Normal','Psychic',70,80,65,90,65,85,90,140,'clearbody','serenegrace','guts'),
(204,'Pomdepik','Pineco','Bug',None,50,65,90,35,35,15,190,59,'sturdy','sturdy','regenerator'),
(205,'Foretress','Forretress','Bug','Steel',75,90,140,60,60,40,75,163,'sturdy','clearbody','regenerator'),
(206,'Insolourdo','Dunsparce','Normal',None,100,70,70,65,65,45,90,145,'serenegrace','magicguard','guts'),
(207,'Scorplane','Gligar','Ground','Flying',65,75,105,35,65,85,60,125,'sandveil','sturdy','guts'),
(208,'Steelix','Steelix','Steel','Ground',75,85,200,55,65,30,25,179,'sturdy','guts','hugepower'),
(209,'Snubbull','Snubbull','Fairy',None,60,80,50,40,40,30,190,78,'intimidate','guts','hugepower'),
(210,'Granbull','Granbull','Fairy',None,90,120,50,45,45,45,75,178,'intimidate','guts','hugepower'),
(211,'Qwilfish','Qwilfish','Water','Poison',65,95,85,55,55,85,45,130,'poisonpoint','guts','hugepower'),
(212,'Cizayox','Scizor','Bug','Steel',70,130,100,55,80,65,25,175,'technician','guts','hugepower'),
(213,'Caratroc','Shuckle','Bug','Rock',20,10,230,10,230,5,75,77,'sturdy','guts','hugepower'),
(214,'Scarhino','Heracross','Bug','Fighting',80,125,75,40,95,85,45,175,'guts','technician','hugepower'),
(215,'Farfuret','Sneasel','Dark','Ice',55,95,55,35,75,115,60,132,'clearbody','guts','hugepower'),
(216,'Teddiursa','Teddiursa','Normal',None,60,80,50,50,50,40,120,124,'guts','hugepower','sturdy'),
(217,'Ursaring','Ursaring','Normal',None,90,130,75,75,75,55,60,189,'guts','hugepower','sturdy'),
(218,'Limagma','Slugma','Fire',None,40,40,40,70,40,20,190,61,'sturdy','guts','hugepower'),
(219,'Volcaropod','Magcargo','Fire','Rock',50,50,120,90,110,30,75,151,'sturdy','guts','hugepower'),
(220,'Cochignon','Swinub','Ice','Ground',50,50,40,30,40,50,190,50,'sturdy','guts','hugepower'),
(221,'Corayon','Piloswine','Ice','Ground',100,100,80,60,60,50,75,161,'sturdy','guts','hugepower'),
(222,'Corsola','Corsola','Water','Rock',55,55,85,65,85,35,190,116,'naturalcure','regenerator','sturdy'),
(223,'Rémoraid','Remoraid','Water',None,35,65,35,65,35,65,190,66,'sniper','guts','hugepower'),
(224,'Octillery','Octillery','Water',None,75,105,75,105,75,45,45,184,'sniper','guts','hugepower'),
(225,'Cadoizo','Delibird','Ice','Flying',45,55,45,65,45,75,45,126,'guts','hugepower','sturdy'),
(226,'Démanta','Mantine','Water','Flying',85,40,70,80,140,70,25,168,'sturdy','regenerator','naturalcure'),
(227,'Airmure','Skarmory','Steel','Flying',65,80,140,40,70,70,25,163,'sturdy','regenerator','guts'),
(228,'Malosse','Houndour','Dark','Fire',45,60,30,80,50,65,120,66,'guts','intimidate','hugepower'),
(229,'Démolosse','Houndoom','Dark','Fire',75,90,50,110,80,95,45,195,'guts','intimidate','hugepower'),
(230,'Hyporoi','Kingdra','Water','Dragon',75,95,95,95,95,85,45,207,'sniper','guts','hugepower'),
(231,'Phanpy','Phanpy','Ground',None,90,60,60,40,40,40,120,66,'sturdy','guts','hugepower'),
(232,'Donphan','Donphan','Ground',None,90,120,120,60,60,50,60,175,'sturdy','guts','hugepower'),
(233,'Porygon2','Porygon2','Normal',None,85,80,90,105,95,60,45,180,'adaptability','regenerator','guts'),
(234,'Cerfrousse','Stantler','Normal','Psychic',73,95,62,85,65,85,45,163,'intimidate','guts','hugepower'),
(235,'Queulorior','Smeargle','Normal',None,55,20,35,20,45,75,45,61,'technician','guts','hugepower'),
(236,'Debugant','Tyrogue','Fighting',None,35,35,35,35,35,35,75,42,'guts','sturdy','hugepower'),
(237,'Kapoera','Hitmontop','Fighting',None,50,95,95,35,110,70,45,159,'guts','sturdy','hugepower'),
(238,'Lippouti','Smoochum','Ice','Psychic',45,30,15,85,65,65,45,97,'naturalcure','serenegrace','magicguard'),
(239,'Élekid','Elekid','Electric',None,45,63,37,65,55,95,45,106,'static','guts','hugepower'),
(240,'Magby','Magby','Fire',None,45,75,37,70,55,83,45,117,'guts','serenegrace','hugepower'),
(241,'Écrémeuh','Miltank','Normal',None,95,80,105,40,70,100,45,200,'thickfat','guts','hugepower'),
(242,'Leuphorie','Blissey','Normal',None,255,10,10,75,135,55,30,255,'naturalcure','serenegrace','magicguard'),
(243,'Raikou','Raikou','Electric',None,90,85,75,115,100,115,3,261,'sturdy','intimidate','lightningrod'),
(244,'Entei','Entei','Fire',None,115,115,85,90,75,100,3,261,'sturdy','intimidate','guts'),
(245,'Suicune','Suicune','Water',None,100,75,115,90,115,85,3,261,'sturdy','intimidate','regenerator'),
(246,'Embrylex','Larvitar','Rock','Ground',50,64,50,45,50,41,45,60,'guts','sturdy','hugepower'),
(247,'Ymphect','Pupitar','Rock','Ground',70,84,70,65,70,51,45,144,'guts','sturdy','hugepower'),
(248,'Tyranocif','Tyranitar','Rock','Dark',100,134,110,95,100,61,45,270,'guts','sturdy','hugepower'),
(249,'Lugia','Lugia','Psychic','Flying',106,90,130,90,154,110,3,306,'sturdy','regenerator','multiscale'),
(250,'Ho-Oh','Ho-Oh','Fire','Flying',106,130,90,110,154,90,3,306,'sturdy','regenerator','solarpower'),
(251,'Celebi','Celebi','Psychic','Grass',100,100,100,100,100,100,45,270,'naturalcure','serenegrace','magicguard'),
]

type_moves = {
 'Normal': ['tackle','scratch','slash','quickattack'],
 'Fire': ['ember','flamethrower','fireblast','fieryspin'],
 'Water': ['watergun','bubble','surf','hydropump'],
 'Grass': ['vinewhip','razorleaf','solarbeam','absorb'],
 'Electric': ['thundershock','thunderbolt','thunder','thunderwave'],
 'Psychic': ['confusion','psychic','psybeam'],
 'Rock': ['rockthrow','rockslide','stoneedge'],
 'Ground': ['dig','earthquake','mudshot'],
 'Ice': ['icebeam','blizzard','powdersnow'],
 'Fighting': ['karatechop','megapunch','jumpkick'],
 'Poison': ['poisonsting','sludgebomb','toxic'],
 'Ghost': ['lick','shadowball','nightshade'],
 'Dragon': ['dragonrage','outrage','dragonbreath'],
 'Flying': ['gust','wingattack','skyattack'],
 'Bug': ['stringshot','bugbite'],
 'Dark': ['bite','crunch'],
 'Steel': ['metalclaw','irontail'],
 'Fairy': ['dazzlinggleam','moonblast'],
}
fill = ['tackle','quickattack','scratch','slash']

def moveset_for(t1, t2):
    c = []
    for m in type_moves.get(t1, []) + type_moves.get(t2, []):
        if m not in c: c.append(m)
    for m in fill:
        if m not in c: c.append(m)
        if len(c) >= 4: break
    return c[:4]

# ---- 1) PD + DEX_MAP (moves.js) ----
moves_path = 'src/scripts/data/moves.js'
moves = open(moves_path, encoding='utf-8').read()

pd_block = []
for (nid,fr,en,t1,t2,hp,atk,df,spa,spd,spe,cr,xy,a1,a2,a3) in J:
    ms = moveset_for(t1, t2)
    t2s = ("'%s'" % t2) if t2 else 'null'
    line = "  ['%s','%s',%s, %d,%d,%d,%d,%d,%d, %s, %d, %d]," % (
        fr, t1, t2s, hp, atk, df, spa, spd, spe, str(ms), cr, xy)
    pd_block.append(line)
pd_text = "\n".join(pd_block)

anchor_pd = "  ['Mew','Psychic',null, 100,100,100,100,100,100, ['confusion','psychic','psybeam','tackle'], 45, 270]\n];"
assert anchor_pd in moves, "PD anchor not found"
moves = moves.replace(anchor_pd, "  ['Mew','Psychic',null, 100,100,100,100,100,100, ['confusion','psychic','psybeam','tackle'], 45, 270],\n" + pd_text + "\n];", 1)

dex_block = ",\n".join("  %d:%d" % (n, n) for n in range(152, 252))
anchor_dex = "  151:151\n};"
assert anchor_dex in moves, "DEX_MAP anchor not found"
moves = moves.replace(anchor_dex, "  151:151,\n" + dex_block + "\n};", 1)
open(moves_path, 'w', encoding='utf-8').write(moves)
print("moves.js: PD + DEX_MAP mis a jour")

# ---- 2) SPRITE_DATA (sprites.js) ----
sp_path = 'src/scripts/data/sprites.js'
sp = open(sp_path, encoding='utf-8').read()
buckets = {
 'front': 'front',
 'back': 'back',
 'frontShiny': 'frontShiny',
 'backShiny': 'backShiny',
}
for b, folder in buckets.items():
    block = []
    for (nid,fr,en,*_rest) in J:
        fn = en.lower()
        block.append('    "%d": "src/assets/images/pokemon/%s/%s.png",' % (nid, folder, fn))
    txt = "\n".join(block)
    anchor = '    "151": "src/assets/images/pokemon/%s/mew.png",' % folder
    assert anchor in sp, "sprite anchor not found for %s" % b
    sp = sp.replace(anchor, anchor + "\n" + txt, 1)
open(sp_path, 'w', encoding='utf-8').write(sp)
print("sprites.js: SPRITE_DATA mis a jour")

# ---- 3) POKE_TALENTS (game-data.js) ----
gd_path = 'src/scripts/data/game-data.js'
gd = open(gd_path, encoding='utf-8').read()
tblock = []
for (nid,fr,en,t1,t2,hp,atk,df,spa,spd,spe,cr,xy,a1,a2,a3) in J:
    tblock.append("  %d:['%s','%s','%s']," % (nid, a1, a2, a3))
ttext = "\n".join(tblock)
anchor_t = "  151:['serenegrace','adaptability','regenerator'],\n};"
assert anchor_t in gd, "POKE_TALENTS anchor not found"
gd = gd.replace(anchor_t, "  151:['serenegrace','adaptability','regenerator'],\n" + ttext + "\n};", 1)

# ---- 4) Wild Johto populations (IIFE) ----
W = {
 'jroute29': [[161,3,6,'common'],[16,3,6,'common'],[19,3,6,'common']],
 'jroute30': [[10,4,7,'common'],[13,4,7,'common'],[16,4,7,'common'],[161,4,7,'uncommon']],
 'jroute31': [[163,5,9,'common'],[41,5,9,'common'],[19,5,9,'uncommon']],
 'jroute32': [[19,6,10,'common'],[69,6,10,'common'],[41,6,10,'uncommon']],
 'jroute32_mid': [[19,6,10,'common'],[69,6,10,'common'],[41,6,10,'uncommon']],
 'jroute32_south': [[19,7,11,'common'],[69,7,11,'common'],[183,7,11,'uncommon']],
 'unioncave': [[41,8,12,'common'],[74,8,12,'common'],[95,10,14,'rare']],
 'jroute33': [[19,9,13,'common'],[16,9,13,'common']],
 'ilexforest': [[10,10,14,'common'],[13,10,14,'common'],[43,10,14,'common'],[69,11,15,'uncommon']],
 'jroute34': [[16,12,16,'common'],[19,12,16,'common'],[63,12,16,'uncommon'],[29,12,16,'uncommon']],
 'jroute35': [[16,14,18,'common'],[19,14,18,'common'],[39,14,18,'uncommon'],[29,14,18,'uncommon']],
 'jroute36': [[29,15,20,'common'],[39,15,20,'common'],[69,15,20,'uncommon']],
 'jroute38': [[20,16,21,'common'],[88,16,21,'common'],[109,18,23,'uncommon']],
 'jroute40': [[72,18,24,'common'],[129,18,24,'common'],[98,18,24,'uncommon']],
 'jroute42': [[203,20,26,'common'],[20,20,26,'common'],[21,20,26,'uncommon']],
 'jroute43': [[218,20,26,'common'],[219,22,28,'common'],[220,22,28,'uncommon']],
 'lakerage': [[129,22,28,'common'],[130,25,32,'rare']],
 'jroute44': [[131,24,30,'common'],[220,24,30,'common'],[221,26,34,'rare']],
 'jroute45': [[169,25,32,'common'],[74,25,32,'common'],[111,26,34,'uncommon']],
 'jroute26': [[16,30,35,'common'],[19,30,35,'common']],
 'jroute27': [[16,30,35,'common'],[19,30,35,'common'],[21,30,35,'uncommon']],
 'jroute28': [[20,30,35,'common'],[112,32,36,'uncommon'],[22,30,35,'uncommon']],
 'jroute37': [[163,12,18,'common'],[43,12,18,'common'],[69,13,19,'uncommon']],
 'jroute39': [[241,14,20,'common'],[128,14,20,'common'],[16,14,20,'common']],
 'jroute41': [[72,18,24,'common'],[129,18,24,'common'],[73,19,25,'uncommon']],
 'jroute46': [[16,28,34,'common'],[19,28,34,'common'],[21,28,34,'uncommon']],
 'jroute47': [[16,30,35,'common'],[19,30,35,'common']],
 'jroute48': [[16,30,35,'common'],[19,30,35,'common']],
 'nationalpark': [[191,15,19,'common'],[43,15,19,'common'],[123,18,22,'rare'],[127,18,22,'rare']],
 'sprouttower': [[19,10,14,'common'],[92,12,16,'uncommon']],
 'ruinsofalph': [[201,15,20,'common'],[41,15,20,'uncommon']],
 'burnedtower': [[92,18,24,'common'],[109,18,24,'uncommon']],
 'tintower': [[92,20,26,'common'],[109,20,26,'uncommon']],
 'mtmortar': [[41,20,26,'common'],[74,20,26,'common'],[169,22,28,'uncommon']],
 'icepath': [[124,25,32,'common'],[220,25,32,'common'],[221,26,34,'rare']],
 'darkcave': [[41,18,24,'common'],[169,18,24,'uncommon']],
 'slowpokewell': [[79,20,26,'common'],[80,22,28,'uncommon']],
 'whirlislands': [[72,18,24,'common'],[129,18,24,'common']],
 'victoryroad_jo': [[95,30,36,'common'],[169,32,38,'common'],[111,30,36,'uncommon']],
 'mtsilver': [[246,40,46,'common'],[247,42,48,'common'],[112,40,46,'uncommon']],
 'tohjofalls': [[129,28,34,'common'],[130,30,36,'rare']],
}

lines = []
lines.append("// ============================================================")
lines.append("// POPULATION SAUVAGE JOHTO (ajout régional - ordre officiel Or/Argent)")
lines.append("// Appliqué APRES linkSplitRoutes pour écraser / peupler les lieux Johto.")
lines.append("(function populateJohtoWild(){")
lines.append("  if(typeof LOCS_JOHTO === 'undefined') return;")
for key, arr in W.items():
    inner = str(arr)
    lines.append("  if(LOCS_JOHTO['%s']) LOCS_JOHTO['%s'].wild = %s;" % (key, key, inner))
lines.append("})();")
wild_text = "\n".join(lines)

# insérer avant le commentaire "PART 2"
anchor_part2 = "// ============================================================================\n// PART 2:"
assert anchor_part2 in gd, "PART 2 anchor not found"
gd = gd.replace(anchor_part2, wild_text + "\n\n" + anchor_part2, 1)
open(gd_path, 'w', encoding='utf-8').write(gd)
print("game-data.js: POKE_TALENTS + wild Johto mis a jour")

# ---- 5) Liste de téléchargement des sprites (nid, en) ----
with open('johto_sprites.txt', 'w', encoding='utf-8') as f:
    for (nid,fr,en,*_rest) in J:
        f.write("%d %s\n" % (nid, en.lower()))
print("johto_sprites.txt ecrit (%d entrees)" % len(J))
