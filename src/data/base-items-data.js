// ============================================================================
// DONNÉES — Catalogue des décorations de base secrète — CANON RSE ÉMERAUDE
// ----------------------------------------------------------------------------
// GÉNÉRÉ par tools/build-canon-items.py depuis tools/emerald-ref/canon-decor.json
// (= gDecorations du désassemblage pokeemerald : 119 décorations officielles)
// + 2 objets du jeu (stairs / pc). NE PAS ÉDITER À LA MAIN.
//
// Champs :
//   s      slug (clé i18n base.i.<s>)
//   cat    desks|chairs|plants|objects|mats|wall|dolls|cushions
//   w,d    forme canon DECORSHAPE (rendu ; collision selon layer/behind)
//   layer  floor | surface (poupée/coussin) | wall (poster mural)
//   behind canon BEHIND_FLOOR : collision = rangée de base, dessin DERRIÈRE
//          le joueur (on colle au mur sans blocage, visuel 2 cases de haut)
//   over   passe 45 : nombre de rangées HAUTES purement VISUELLES — la forme
//          canon (w×d) reste celle du dessin, mais l'empreinte au sol ne
//          couvre que les (d - over) rangées BASSES. Sert aux volumes qui
//          « montent » : le toboggan (2×4 dessiné, 2×3 au sol) donne l'effet
//          de hauteur et laisse poser des objets DERRIÈRE lui.
//   surf   reçoit les objets « surface » (bureaux, tapis, pneu, présentoir)
//   rot    0 partout — PASSE 42 : ROTATION SUPPRIMÉE (canon RSE + demande)
//   walk   le visiteur marche dessus (DECORPERM_PASS_FLOOR)
//   fx     effet de visite : burst|door|glitter|jump|spin|note:N|board|
//          stairs|pc|sit
//   price  prix canon ₽ (null = jamais vendu), acq = verrou d'acquisition
// ============================================================================

const BASE_ITEM_CATEGORIES = ['desks', 'chairs', 'plants', 'objects', 'mats', 'wall', 'dolls', 'cushions'];

const BASE_ITEMS = [
 // ─── bureaux (porteurs, 3×2/3×3 canon) ─────────────────────────────────────────
 { s:'small_desk', cat:'desks', w:1, d:1, layer:'floor', surf:true, rot:0, price:3000, acq:'guild_shop' },
 { s:'pokemon_desk', cat:'desks', w:1, d:1, layer:'floor', surf:true, rot:0, price:3000, acq:'guild_shop' },
 { s:'heavy_desk', cat:'desks', w:3, d:2, layer:'floor', surf:true, rot:0, price:6000, acq:'guild_shop' },
 { s:'ragged_desk', cat:'desks', w:3, d:2, layer:'floor', surf:true, rot:0, price:6000, acq:'guild_shop_bronze' },
 { s:'comfort_desk', cat:'desks', w:3, d:2, layer:'floor', surf:true, rot:0, price:6000, acq:'guild_shop_bronze' },
 { s:'pretty_desk', cat:'desks', w:3, d:3, layer:'floor', surf:true, rot:0, price:9000, acq:'glass_workshop' },
 { s:'brick_desk', cat:'desks', w:3, d:3, layer:'floor', surf:true, rot:0, price:9000, acq:'guild_shop_silver' },
 { s:'camp_desk', cat:'desks', w:3, d:3, layer:'floor', surf:true, rot:0, price:9000, acq:'guild_shop_silver' },
 { s:'hard_desk', cat:'desks', w:3, d:3, layer:'floor', surf:true, rot:0, price:9000, acq:'guild_shop_silver' },
 // ─── chaises (franchissables, fx sit) ─────────────────────────────────────────
 { s:'small_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop' },
 { s:'pokemon_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop' },
 { s:'heavy_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop' },
 { s:'pretty_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'glass_workshop' },
 { s:'comfort_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop_bronze' },
 { s:'ragged_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop_bronze' },
 { s:'brick_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop_silver' },
 { s:'camp_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop_silver' },
 { s:'hard_chair', cat:'chairs', w:1, d:1, layer:'floor', walk:true, fx:'sit', rot:0, price:2000, acq:'guild_shop_silver' },
 // ─── plantes (collision rangée de base, 2 cases de haut visuel) ─────────────────────────────────────────
 { s:'red_plant', cat:'plants', w:1, d:2, layer:'floor', behind:true, rot:0, price:3000, acq:'pretty_petal' },
 { s:'tropical_plant', cat:'plants', w:1, d:2, layer:'floor', behind:true, rot:0, price:3000, acq:'pretty_petal' },
 { s:'pretty_flowers', cat:'plants', w:1, d:2, layer:'floor', behind:true, rot:0, price:3000, acq:'pretty_petal' },
 { s:'colorful_plant', cat:'plants', w:2, d:2, layer:'floor', behind:true, rot:0, price:5000, acq:'pretty_petal' },
 { s:'big_plant', cat:'plants', w:2, d:2, layer:'floor', behind:true, rot:0, price:5000, acq:'pretty_petal' },
 { s:'gorgeous_plant', cat:'plants', w:2, d:2, layer:'floor', behind:true, rot:0, price:5000, acq:'pretty_petal' },
 // ─── gros objets & ornements (formes canon 1×2…4×2) ─────────────────────────────────────────
 { s:'red_brick', cat:'objects', w:1, d:2, layer:'floor', rot:0, price:500, acq:'slateport_market' },
 { s:'yellow_brick', cat:'objects', w:1, d:2, layer:'floor', rot:0, price:500, acq:'slateport_market' },
 { s:'blue_brick', cat:'objects', w:1, d:2, layer:'floor', rot:0, price:500, acq:'slateport_market' },
 { s:'red_balloon', cat:'objects', w:1, d:1, layer:'floor', walk:true, fx:'burst', rot:0, price:500, acq:'slateport_market' },
 { s:'blue_balloon', cat:'objects', w:1, d:1, layer:'floor', walk:true, fx:'burst', rot:0, price:500, acq:'slateport_market' },
 { s:'yellow_balloon', cat:'objects', w:1, d:1, layer:'floor', walk:true, fx:'burst', rot:0, price:500, acq:'slateport_market' },
 { s:'red_tent', cat:'objects', w:3, d:3, layer:'floor', walk:true, rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'blue_tent', cat:'objects', w:3, d:3, layer:'floor', walk:true, rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'solid_board', cat:'objects', w:1, d:2, layer:'floor', walk:true, fx:'board', rot:0, price:3000, acq:'guild_shop' },
 // passe 45 (retour utilisateur) : le toboggan est DESSINÉ 2×4 mais n'occupe
 // que ses 3 rangées basses (6 cases) — la rangée du haut est le carter en
 // hauteur, qui surplombe le sol : on passe derrière et on y pose des objets.
 { s:'slide', cat:'objects', w:2, d:4, over:1, layer:'floor', walk:true, rot:0, price:8000, acq:'lilycove_clearance' },
 { s:'fence_length', cat:'objects', w:1, d:1, layer:'floor', rot:0, price:500, acq:'slateport_market' },
 { s:'fence_width', cat:'objects', w:1, d:1, layer:'floor', rot:0, price:500, acq:'slateport_market' },
 { s:'tire', cat:'objects', w:2, d:2, layer:'floor', surf:true, rot:0, price:800, acq:'lilycove_clearance' },
 { s:'stand', cat:'objects', w:4, d:2, layer:'floor', walk:true, surf:true, rot:0, price:7000, acq:'lilycove_clearance' },
 { s:'mud_ball', cat:'objects', w:1, d:1, layer:'floor', walk:true, fx:'burst', rot:0, price:200, acq:'lilycove_clearance' },
 { s:'breakable_door', cat:'objects', w:1, d:2, layer:'floor', walk:true, fx:'door', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'sand_ornament', cat:'objects', w:1, d:2, layer:'floor', behind:true, rot:0, price:3000, acq:'glass_workshop' },
 { s:'silver_shield', cat:'objects', w:1, d:2, layer:'floor', behind:true, rot:0, price:null, acq:'quest_hoenn' },
 { s:'gold_shield', cat:'objects', w:1, d:2, layer:'floor', behind:true, rot:0, price:null, acq:'quest_hoenn' },
 { s:'glass_ornament', cat:'objects', w:1, d:2, layer:'floor', behind:true, rot:0, price:null, acq:'glass_workshop' },
 { s:'tv', cat:'objects', w:1, d:1, layer:'floor', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'round_tv', cat:'objects', w:1, d:1, layer:'floor', rot:0, price:4000, acq:'lilycove_clearance' },
 { s:'cute_tv', cat:'objects', w:1, d:1, layer:'floor', rot:0, price:4000, acq:'lilycove_clearance' },
 { s:'stairs', cat:'objects', w:2, d:2, layer:'floor', walk:true, fx:'stairs', rot:0, price:null, acq:'fortree' },
 { s:'pc', cat:'objects', w:1, d:1, layer:'floor', fx:'pc', rot:0, price:null, acq:'auto' },
 // ─── tapis (franchissables, porteurs) ─────────────────────────────────────────
 { s:'glitter_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'glitter', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'jump_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'jump', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'spin_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'spin', rot:0, price:2000, acq:'guild_shop_bronze' },
 { s:'c_low_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:0', rot:0, price:500, acq:'slateport_market' },
 { s:'d_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:1', rot:0, price:500, acq:'slateport_market' },
 { s:'e_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:2', rot:0, price:500, acq:'slateport_market' },
 { s:'f_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:3', rot:0, price:500, acq:'slateport_market' },
 { s:'g_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:4', rot:0, price:500, acq:'slateport_market' },
 { s:'a_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:5', rot:0, price:500, acq:'slateport_market' },
 { s:'b_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:6', rot:0, price:500, acq:'slateport_market' },
 { s:'c_high_note_mat', cat:'mats', w:1, d:1, layer:'floor', walk:true, surf:true, fx:'note:7', rot:0, price:500, acq:'slateport_market' },
 { s:'surf_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 { s:'thunder_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 { s:'fire_blast_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 { s:'powder_snow_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 { s:'attract_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 { s:'fissure_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 { s:'spikes_mat', cat:'mats', w:3, d:3, layer:'floor', walk:true, surf:true, rot:0, price:4000, acq:'lilycove_d5' },
 // ─── posters (mur nord / face de falaise, 1×1 et 2×1) ─────────────────────────────────────────
 { s:'ball_poster', cat:'wall', w:1, d:1, layer:'wall', rot:0, price:1000, acq:'lilycove_d5' },
 { s:'green_poster', cat:'wall', w:1, d:1, layer:'wall', rot:0, price:1000, acq:'lilycove_d5' },
 { s:'red_poster', cat:'wall', w:1, d:1, layer:'wall', rot:0, price:1000, acq:'lilycove_d5' },
 { s:'blue_poster', cat:'wall', w:1, d:1, layer:'wall', rot:0, price:1000, acq:'lilycove_d5' },
 { s:'cute_poster', cat:'wall', w:1, d:1, layer:'wall', rot:0, price:1000, acq:'lilycove_d5' },
 { s:'pika_poster', cat:'wall', w:2, d:1, layer:'wall', rot:0, price:1500, acq:'lilycove_d5' },
 { s:'long_poster', cat:'wall', w:2, d:1, layer:'wall', rot:0, price:1500, acq:'lilycove_d5' },
 { s:'sea_poster', cat:'wall', w:2, d:1, layer:'wall', rot:0, price:1500, acq:'lilycove_d5' },
 { s:'sky_poster', cat:'wall', w:2, d:1, layer:'wall', rot:0, price:1500, acq:'lilycove_d5' },
 { s:'kiss_poster', cat:'wall', w:2, d:1, layer:'wall', rot:0, price:1500, acq:'lilycove_d5' },
 // ─── poupées (couche surface : tapis/bureau/sol, 1 par case) ─────────────────────────────────────────
 { s:'pichu_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'pikachu_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'marill_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'togepi_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'cyndaquil_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'chikorita_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'totodile_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'jigglypuff_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'meowth_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'clefairy_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'ditto_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'smoochum_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'treecko_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'torchic_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'mudkip_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'duskull_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'wynaut_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'quest_hoenn' },
 { s:'baltoy_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'kecleon_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'azurill_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_d5' },
 { s:'skitty_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'swablu_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'gulpin_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'lotad_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'seedot_doll', cat:'dolls', w:1, d:1, layer:'surface', rot:0, price:3000, acq:'lilycove_clearance' },
 { s:'snorlax_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'rhydon_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'lapras_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'venusaur_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'charizard_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'blastoise_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'wailmer_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'lilycove_clearance' },
 { s:'regirock_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'quest_hoenn' },
 { s:'regice_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'quest_hoenn' },
 { s:'registeel_doll', cat:'dolls', w:1, d:2, layer:'surface', rot:0, price:10000, acq:'quest_hoenn' },
 // ─── coussins (couche surface) ─────────────────────────────────────────
 { s:'pika_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'round_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'kiss_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'zigzag_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'spin_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'diamond_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_clearance' },
 { s:'ball_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_d5' },
 { s:'grass_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_clearance' },
 { s:'fire_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_clearance' },
 { s:'water_cushion', cat:'cushions', w:1, d:1, layer:'surface', rot:0, price:2000, acq:'lilycove_clearance' },
];

const BASE_ITEM_MAX_PLACED = 26; // plafond maison conservé (ROSA); RSE = 16

const BASE_ITEMS_BY_SLUG = (() => { const m = {}; for (const it of BASE_ITEMS) m[it.s] = it; return Object.freeze(m); })();

function baseItemGet(slug) { return BASE_ITEMS_BY_SLUG[slug] || null; }
function baseItemNameKey(slug) { return 'base.i.' + slug; }
function baseItemList(cat) { return cat ? BASE_ITEMS.filter((i) => i.cat === cat) : BASE_ITEMS.slice(); }

// Passe 42 : rotation SUPPRIMÉE (canon RSE + demande utilisateur) — compteurs
// figés à 1, normalisation → 0. Les signatures restent (appelants inchangés).
function baseItemRotCount(item) { return 1; }
function baseItemRotNormalize(item, rotIndex) { return 0; }

// Empreinte de COLLISION/pose :
//  - surface (poupées/coussins) : 1×1 sur la case de base ;
//  - behind (plantes/boucliers, forme 1×2 ou 2×2) : rangée de base w×1 ;
//  - over (passe 45, toboggan) : les `over` rangées HAUTES sont un surplomb
//    purement visuel → l'empreinte ne garde que les rangées basses ;
//  - sinon : forme canon complète (bureaux 3×2, tapis 3×3, présentoir 4×2…).
function baseItemFootprint(item, rotIndex) {
  if (!item) return { w: 1, d: 1 };
  if (item.layer === 'surface') return { w: 1, d: 1 };
  if (item.behind) return { w: item.w, d: 1 };
  if (item.over) return { w: item.w, d: Math.max(1, (item.d || 1) - item.over) };
  return { w: item.w, d: item.d };
}

// Décalage (en cases) entre l'ORIGINE DE DESSIN et l'origine de l'empreinte.
// Un objet « over » est stocké à l'origine de son EMPREINTE (rangées basses) ;
// son sprite complet démarre donc `over` cases plus HAUT. Les renderers et
// l'éditeur utilisent ce décalage pour dessiner le surplomb au bon endroit.
function baseItemDrawOffset(item) {
  return (item && item.over) ? { dx: 0, dy: -item.over } : { dx: 0, dy: 0 };
}

// Migration des anciens slugs (avant le catalogue canon de la passe 42) :
// renommages → slug canon ; le reste est abandonné (objets hors DA Émeraude).
const BASE_ITEM_MIGRATE = Object.freeze({
  pokeball_desk: 'pokemon_desk', rough_desk: 'ragged_desk', soft_desk: 'comfort_desk',
  elegant_desk: 'pretty_desk', log_desk: 'camp_desk',
  pokeball_chair: 'pokemon_chair', elegant_chair: 'pretty_chair', soft_chair: 'comfort_chair',
  rough_chair: 'ragged_chair', log_chair: 'camp_chair',
  red_flower: 'red_plant', flowering_plant: 'pretty_flowers', elegant_bonsai: 'gorgeous_plant',
  spinarak_cushion: 'spin_cushion',
  blue_scroll: 'long_poster', red_scroll: 'sea_poster', dads_scroll: 'sky_poster',
  note_do_mat: 'c_low_note_mat', note_re_mat: 'd_note_mat', note_mi_mat: 'e_note_mat',
  note_fa_mat: 'f_note_mat', note_sol_mat: 'g_note_mat', note_la_mat: 'a_note_mat',
  note_si_mat: 'b_note_mat', note_do2_mat: 'c_high_note_mat',
  substitute_doll: 'wynaut_doll', big_snorlax_doll: 'snorlax_doll', big_rhydon_doll: 'rhydon_doll',
  // hors-canon/ORAS retirés passe 42 → équivalent canon le plus proche
  bench: 'small_chair', poke_flute: 'mud_ball', tall_grass: 'pretty_flowers',
  berry_tree: 'gorgeous_plant', globe: 'gold_shield', comfortable_bed: 'blue_tent',
  star_light: 'glass_ornament', cardboard_boxes: 'red_brick', trash_can: 'yellow_brick',
  makiwara: 'breakable_door', boppoyama: 'sand_ornament', candlestick: 'breakable_door',
  standing_stone: 'red_brick', proclamation: 'ball_poster', blackboard: 'kiss_poster',
  confetti_ball: 'yellow_balloon', vending_machine: 'tv', berry_blender: 'pretty_desk',
  green_mat: 'glitter_mat', red_mat: 'jump_mat', blue_mat: 'spin_mat', flat_mat: 'surf_mat',
  orange_mat: 'thunder_mat',
  blue_warp_panel: 'glitter_mat', red_warp_panel: 'jump_mat', square_one_mat: 'spikes_mat',
  pitfall_mat: 'fissure_mat',
});
function baseItemMigrate(slug) {
  if (BASE_ITEMS_BY_SLUG[slug]) return slug;
  const m = BASE_ITEM_MIGRATE[slug];
  return (m && BASE_ITEMS_BY_SLUG[m]) ? m : null;
}

window.BASE_ITEMS = Object.freeze(BASE_ITEMS);
window.BASE_ITEM_CATEGORIES = Object.freeze(BASE_ITEM_CATEGORIES);
window.BASE_ITEM_MAX_PLACED = BASE_ITEM_MAX_PLACED;
window.baseItemGet = baseItemGet;
window.baseItemNameKey = baseItemNameKey;
window.baseItemList = baseItemList;
window.baseItemRotCount = baseItemRotCount;
window.baseItemRotNormalize = baseItemRotNormalize;
window.baseItemFootprint = baseItemFootprint;
window.baseItemDrawOffset = baseItemDrawOffset;
window.BASE_ITEM_MIGRATE = BASE_ITEM_MIGRATE;
window.baseItemMigrate = baseItemMigrate;


