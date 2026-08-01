// ============================================================================
// BASE SECRÈTE — Renderer 2D « Pokémon Émeraude » (canvas, sprites GBA)
// ----------------------------------------------------------------------------
// Dessin d'une base (gabarit + objets + PNJ) en vue du dessus style GBA.
// Passe 36 : le FOND est le vrai fond Émeraude cuit depuis les tilesets GBA
// (tools/bake-emerald-bgs.py → src/assets/images/secret-base/bg/emerald/
// <layoutId>.png — murs/sol/trous/entrée/plateforme authentiques, 16 px/case).
// Les objets utilisent les vrais sprites Émeraude (manifest.render2d.json,
// sprite GBA sinon icône 2D ORAS). Repli procédural conservé si un fichier
// manque (tests/exports sans assets).
// Rendu pur : aucune interaction — c'est une fenêtre de TEST.
// ============================================================================

const BASE2D_CELL = 32;           // px par case (2× le 16 px natif GBA)
const BASE2D_ELEV = 0;            // passe 36 : la surélévation est DANS le fond

// Palette du repli procédural (si le fond cuit est indisponible).
const BASE2D_THEMES = {
  cave: { floor: '#8a7d66', floorHi: '#9d9179', wall: '#4d463a', cliff: '#3a342c', hole: '#191713', entrance: '#caa64b' },
  tree: { floor: '#83a35f', floorHi: '#97b875', wall: '#39512f', cliff: '#2d4023', hole: '#141a10', entrance: '#caa64b' },
  bush: { floor: '#5f8f4a', floorHi: '#75a55e', wall: '#2c4527', cliff: '#22371e', hole: '#10160c', entrance: '#caa64b' },
};

let _base2dManifestP = null;
// src/assets/images/secret-base/manifest.render2d.json → { slug: { emerald, icon? } }
// NB : le canvas ne consomme QUE la clé emerald — l'icône boutique 2.5D
// serebii est réservée aux boutons du stock (base-window.js).
function baseView2dManifest() {
  if (!_base2dManifestP) {
    if (typeof fetch !== 'function') { _base2dManifestP = Promise.resolve({ items: {} }); return _base2dManifestP; }
    // Passe 40 : en file:// fetch() est bloqué (CORS) — le manifeste est
    // aussi embarqué en script (base-manifest-2d-data.js) lu en priorité.
    if (typeof window !== 'undefined' && window.PokeWorldBaseManifest2D) {
      _base2dManifestP = Promise.resolve(window.PokeWorldBaseManifest2D);
      return _base2dManifestP;
    }
    if (typeof fetch !== 'function') {
      _base2dManifestP = Promise.resolve({ items: {} });
      return _base2dManifestP;
    }
    _base2dManifestP = fetch('src/assets/images/secret-base/manifest.render2d.json')
      .then((r) => (r.ok ? r.json() : { items: {} }))
      .catch(() => ({ items: {} }));
  }
  return _base2dManifestP;
}

// Charge toutes les images nécessaires (cache global par URL).
const _base2dImgCache = new Map();
function baseView2dImage(url) {
  if (!url || typeof Image === 'undefined') return Promise.resolve(null);
  if (_base2dImgCache.has(url)) return _base2dImgCache.get(url);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  _base2dImgCache.set(url, p);
  return p;
}

// → { slug: HTMLImageElement|null } — sprite Émeraude uniquement, jamais
// l'icône serebii (DA passe 37/39 : un seul style sur le canvas).
async function baseView2dLoadSprites() {
  const mf = await baseView2dManifest();
  const out = {};
  const jobs = [];
  for (const slug of Object.keys(mf.items || {})) {
    const e = mf.items[slug];
    // passe 37 (DA) : sprites Émeraude UNIQUEMENT — le fond GBA n'accepte pas
    // les icônes boutique 2.5D serebii (mélange de styles signalé). Pas de
    // repli serebii ici ; les objets sans sprite GBA passent en pastille.
    jobs.push(baseView2dImage(e.emerald).then((img) => { out[slug] = img; }));
  }
  await Promise.all(jobs);
  return out;
}

// Passe 42 : feuilles de personnages (héros + PNJ) — 64×128 :
// colonnes = frames [debout, pas A, debout, pas B], lignes = down/up/left/right.
const _base2dPeopleCache = { map: null };
// Portrait d'un PNJ : trainer-N.png (images/trainers/profil), mis en cache.
const _base2dNpcPortraits = {};
async function base2dNpcPortrait(n) {
  const url = (typeof baseNpcSpriteUrl === 'function')
    ? baseNpcSpriteUrl(n && n.sprite)
    : ('src/assets/images/trainers/profil/' + ((n && n.sprite) || 'trainer-0') + '.png');
  if (_base2dNpcPortraits[url] !== undefined) return _base2dNpcPortraits[url];
  let img = null;
  try { img = await baseView2dImage(url); } catch (e) { img = null; }
  _base2dNpcPortraits[url] = img;
  return img;
}

async function baseView2dPeople() {
  if (_base2dPeopleCache.map) return _base2dPeopleCache.map;
  const out = {};
  try {
    const mf = await baseView2dManifest();
    const people = (mf && mf.people) || {};
    await Promise.all(Object.keys(people).map((pid) =>
      baseView2dImage(people[pid]).then((img) => { if (img) out[pid] = img; })));
  } catch (e) { /* repli jeton */ }
  _base2dPeopleCache.map = out;
  return out;
}

// PNJ : sa feuille est son sprite déclaré (vivier passe 44) ; repli stable
// par hachage pour les vieilles sauvegardes / imports exotiques.
const BASE2D_NPC_PEOPLE = ['boy', 'girl', 'sailor', 'scholar'];
function base2dNpcPersonId(n) {
  const s = String((n && n.sprite) || '');
  if (BASE2D_NPC_PEOPLE.indexOf(s) >= 0) return s;
  const f = String((n && n.name) || 'npc');
  let h = 0;
  for (let i = 0; i < f.length; i++) h = (h + f.charCodeAt(i)) & 0xff;
  return BASE2D_NPC_PEOPLE[h % BASE2D_NPC_PEOPLE.length];
}

// Dessine une frame de personnage (feuille 64×128, frame 16×32) ancrée bas-case,
// débordant d'une demi-case vers le haut (sprite 32 de haut pour case 32).
// dir : 'down'|'up'|'left'|'right' ; frame : 0 debout, 1/3 pas.
const BASE2D_DIR_ROW = { down: 0, up: 1, left: 2, right: 3 };
function base2dPerson(ctx, img, px, py, C, dir, frame) {
  const row = BASE2D_DIR_ROW[dir] || 0;
  const col = frame | 0;
  const k = C / 16;
  ctx.drawImage(img, col * 16, row * 32, 16, 32,
    Math.round(px + (C - 16 * k) / 2), Math.round(py + C - 32 * k), 16 * k, 32 * k);
}

// Passe 43 (demande utilisateur) : le personnage CONTRÔLÉ n'est plus une
// feuille de marche procédurale mais le vrai sprite statique trainer-54
// (people.player) — dessiné entier, ancré bas-case, centré, légèrement plus
// haut qu'une case comme les personnages GBA (tête au-dessus de la case).
function base2dPlayerStatic(ctx, img, px, py, C) {
  const h = Math.round(C * 1.3);
  const w = Math.round(img.width * (h / img.height));
  ctx.drawImage(img, Math.round(px + (C - w) / 2), Math.round(py + C - h), w, h);
}

function base2dRect(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
}

// Jeton PNJ procédural simple (silhouette dresseur).
// Copain posé dans la base : petit dresseur chibi détouré (passe 41 — fini
// la « pastille » bleue), échelle cohérente avec les meubles (~1 case).
function base2dNpcToken(ctx, px, py, cell) {
  const cx = px + cell / 2, u = cell / 16; // unité ~2 px
  const ink = '#1c2733', shirt = '#3e668c', shirtHi = '#5d87ad', skin = '#e8c39e', hair = '#33261c';
  const round = (x, y, w, h) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, 2 * u); else ctx.rect(x, y, w, h);
    ctx.fill();
  };
  // jambes
  ctx.fillStyle = ink; round(cx - 5 * u, py + cell - 6 * u, 4 * u, 5 * u); round(cx + 1 * u, py + cell - 6 * u, 4 * u, 5 * u);
  // corps (détouré)
  ctx.fillStyle = ink; round(cx - 6.5 * u, py + cell - 13 * u, 13 * u, 8.5 * u);
  ctx.fillStyle = shirt; round(cx - 5.5 * u, py + cell - 12 * u, 11 * u, 7 * u);
  ctx.fillStyle = shirtHi; round(cx - 5.5 * u, py + cell - 12 * u, 11 * u, 2 * u);
  // tête (détourée) + visage
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(cx, py + cell - 15.5 * u, 6 * u, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx, py + cell - 15 * u, 5 * u, 0, Math.PI * 2); ctx.fill();
  // cheveux/calotte
  ctx.fillStyle = hair;
  ctx.beginPath(); ctx.arc(cx, py + cell - 17 * u, 4.6 * u, Math.PI, Math.PI * 2); ctx.fill();
  // yeux
  ctx.fillStyle = ink;
  ctx.fillRect(cx - 2.6 * u, py + cell - 15.5 * u, 1.4 * u, 2 * u);
  ctx.fillRect(cx + 1.2 * u, py + cell - 15.5 * u, 1.4 * u, 2 * u);
}

// Fond Émeraude cuit (vrai tileset GBA) — cache par gabarit.
const _base2dBgCache = new Map();
function baseView2dBg(layoutId) {
  if (_base2dBgCache.has(layoutId)) return _base2dBgCache.get(layoutId);
  const p = baseView2dImage(`src/assets/images/secret-base/bg/emerald/${layoutId}.png`);
  _base2dBgCache.set(layoutId, p);
  return p;
}

// Dessin complet. st = état moteur (G.base) ; sprites = résultat de baseView2dLoadSprites.
// overlay (passe 38, optionnel) : {ghost, hover, select, path, visitor} pour
// l'éditeur de pose et la visite interactive — voir base2dOverlay.
async function baseView2dDraw(canvas, st, sprites, overlay) {
  const layout = baseLayoutGet(st.layoutId);
  if (!layout) return false;
  const C = BASE2D_CELL;
  const pal = BASE2D_THEMES[layout.theme] || BASE2D_THEMES.cave;
  canvas.width = layout.w * C + 8;
  canvas.height = layout.h * C + 8;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const ox = 4, oy = 4;
  const cy = (x, y) => ({ px: ox + x * C, py: oy + y * C });
  // Passe 53 (retour utilisateur : « il y a un décalage sur l'étage, les
  // assets ne sont plus placés au bon endroit ; le mur (hauteur) doit faire
  // pile une tuile de haut »).
  // Cause racine : depuis la passe 43, tout ce qui se trouvait sur la
  // MEZZANINE était remonté de 14 px (0.45 × 32) à l'écran. Mais le fond est
  // CUIT tuile par tuile, sans aucun décalage : la falaise y occupe exactement
  // UNE tuile et la case (x,y) du plateau est peinte à y×32, pas à y×32−14.
  // Les meubles et les personnages flottaient donc 14 px au-dessus de leur
  // case — un demi-carreau d'écart avec la grille de collision.
  // L'effet de hauteur vient déjà, entièrement, de la falaise du fond : le
  // décalage était un doublon. On l'annule → l'étage est de nouveau aligné
  // au pixel près sur ses tuiles.
  const ELEV_PX = 0;
  const elevOff = () => 0;
  // En revanche, MONTER SUR UN MEUBLE (présentoir, palier de toboggan) reste
  // un vrai perchoir : lui n'est pas dans le fond, il garde son décalage.
  const PERCH_PX = Math.round(C * 0.45);
  const cyElev = (x, y) => ({ px: ox + x * C, py: oy + y * C - elevOff(x, y) });

  // ——— Fond : vrai fond Émeraude (murs/sol/trous/plateforme/entrée) ———
  const bg = await baseView2dBg(st.layoutId);
  if (bg) {
    ctx.drawImage(bg, ox, oy, layout.w * C, layout.h * C);
  } else {
    // repli procédural (assets absents — tests/exports minimalistes)
    for (let y = 0; y < layout.h; y++) {
      for (let x = 0; x < layout.w; x++) {
        const cell = layout.cells[y][x];
        const { px, py } = cy(x, y);
        switch (cell.t) {
          case 'wall': base2dRect(ctx, px, py, C, C, pal.wall, '#00000030'); break;
          case 'floor': base2dRect(ctx, px, py, C, C, cell.elev ? pal.floorHi : pal.floor, '#00000022'); break;
          case 'cliff': base2dRect(ctx, px, py, C, C, pal.cliff, '#00000044'); break;
          case 'hole':
            base2dRect(ctx, px, py, C, C, pal.hole, '#00000066');
            ctx.fillStyle = '#ffffff18'; ctx.fillRect(px + 3, py + 3, C - 6, 2);
            break;
          default: break;
        }
        if (cell.entrance) {
          ctx.fillStyle = pal.entrance;
          ctx.beginPath();
          ctx.moveTo(px + C / 2, py + C - 6);
          ctx.lineTo(px + C / 2 - 6, py + C - 14);
          ctx.lineTo(px + C / 2 + 6, py + C - 14);
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  // ——— Objets ET PNJ : UN SEUL passe de tri en PROFONDEUR (passe 47) ———
  // Retour utilisateur : « le PNJ doit passer derrière certains blocs et on
  // doit voir l'effet de profondeur quand il est devant ou derrière un objet ».
  // Avant, les PNJ étaient dessinés APRÈS tous les objets : ils passaient donc
  // TOUJOURS au-dessus. On fusionne maintenant objets et personnages dans une
  // même liste triée par « profondeur » = rangée BASSE occupée à l'écran :
  // ce qui est plus au sud est dessiné en dernier, donc devant. À égalité, un
  // objet de couche « surface » (poupée sur un bureau) passe devant son
  // porteur, et un personnage passe devant un objet de la même rangée.
  const people = await baseView2dPeople();

  const depthOf = (y, kind) => y * 10 + kind;   // kind : 0 porteur, 1 surface, 2 personnage

  // Passe 48 (retour utilisateur « je passe À TRAVERS le toboggan / l'escalier
  // au lieu de monter dessus ») : un personnage DEBOUT SUR un objet marchable
  // (toboggan, escalier, présentoir, tapis…) doit être peint APRÈS lui, sinon
  // l'objet le recouvre. Sa profondeur est donc remontée au PIED de l'objet
  // qui le porte — il se retrouve visuellement « dessus ».
  // Passe 49 : on distingue MONTER SUR un objet (toboggan, présentoir,
  // escalier → le personnage passe DEVANT/au-dessus) et PASSER DESSOUS
  // (tente : on entre dans le couloir central, la toile doit rester DEVANT).
  // Passe 52 : `solid_board` rejoint CLIMB_ON. La planche est marchable
  // (fx:'board', elle couvre un trou) et fait 1×2 : debout sur sa case HAUTE,
  // le personnage avait la profondeur de cette case (it.y) alors que la
  // planche, elle, est peinte au pied de son empreinte (it.y+1) — elle
  // repassait donc PAR-DESSUS lui (« la partie haute de la planche nous
  // considère comme derrière au lieu de dessus »).
  const CLIMB_ON = { slide: 1, stand: 1, stairs: 1, solid_board: 1 };
  const WALK_UNDER = { red_tent: 1, blue_tent: 1 };
  const charDepth = (x, y) => {
    let row = y;
    for (const it of st.items) {
      if (it.uid === st._moveUid) continue;
      const def = baseItemGet(it.s);
      if (!def || def.layer === 'wall' || !def.walk) continue;
      const fp = baseItemFootprint(def, it.rot);
      // Passe 52 : on teste la forme DESSINÉE, pas la seule empreinte. Un
      // objet « over » (toboggan) est stocké à l'origine de son empreinte
      // BASSE ; ses rangées de surplomb (le carter, où l'on marche pourtant)
      // sont AU-DESSUS de it.y et sortaient donc du test — le personnage y
      // gardait la profondeur de sa case et le toboggan, peint au pied de son
      // empreinte, le recouvrait (« sur le dessus du toboggan, on passe
      // derrière alors qu'on devrait être dessus »).
      const over = def.over | 0;
      const top = it.y - over;
      if (x < it.x || x >= it.x + fp.w || y < top || y >= it.y + fp.d) continue;
      // sous une tente : profondeur INCHANGÉE (la toile, dessinée au pied de
      // la tente, passe donc devant le personnage → il est « dedans »)
      if (WALK_UNDER[it.s]) continue;
      if (CLIMB_ON[it.s]) row = Math.max(row, it.y + fp.d - 1); // perché : au-dessus
    }
    return depthOf(row, 2);
  };

  // Passe 52 — POUPÉES / COUSSINS (couche « surface ») posés sur un porteur.
  // Retour utilisateur : « les poupées se mettent derrière les tapis alors
  // qu'elles devraient être dessus ». Une poupée vaut z = sa rangée ×10 + 1,
  // un tapis z = la rangée de SON PIED ×10 + 0. Sur un tapis 3×3, une poupée
  // posée sur la rangée du haut ou du milieu a donc une profondeur INFÉRIEURE
  // au tapis, qui la repeint. On rattache la poupée au PIED de son porteur :
  // elle est peinte juste après lui, quelle que soit la case occupée.
  const carrierFootRow = (x, y) => {
    let row = y;
    for (const it of st.items) {
      if (it.uid === st._moveUid) continue;
      const def = baseItemGet(it.s);
      if (!def || def.layer !== 'floor') continue;
      if (!def.surf && !def.walk) continue;   // seuls les objets « porteurs »
      const fp = baseItemFootprint(def, it.rot);
      const over = def.over | 0;
      if (x < it.x || x >= it.x + fp.w || y < it.y - over || y >= it.y + fp.d) continue;
      row = Math.max(row, it.y + fp.d - 1);
    }
    return row;
  };
  const draws = [];
  for (const it of st.items) {
    if (it.uid === st._moveUid) continue; // passe 40 : tenu à la souris (fantôme seul)
    const def = baseItemGet(it.s);
    if (!def) continue;
    const fp = baseItemFootprint(def, it.rot);
    // Un mural est plaqué sur la face : il reste AU FOND, avant tout le reste.
    if (def.layer === 'wall') { draws.push({ z: -1, it, def, fp, kind: 'wall' }); continue; }
    // profondeur = dernière rangée de l'EMPREINTE (le pied de l'objet) ;
    // pour une poupée/coussin (couche « surface »), le pied de son PORTEUR
    // (passe 52 : sinon elle disparaît sous un grand tapis 3×3).
    const foot = (def.layer === 'surface')
      ? carrierFootRow(it.x, it.y)
      : (it.y + fp.d - 1);
    draws.push({ z: depthOf(foot, def.layer === 'surface' ? 1 : 0), it, def, fp, kind: 'item' });
  }
  for (const n of st.npcs) {
    if (n.x == null) continue;
    draws.push({ z: charDepth(n.x, n.y), npc: n, kind: 'npc' });
  }
  // Le VISITEUR (joueur) est trié avec le reste : il passe donc lui aussi
  // DERRIÈRE ce qui est plus au sud, et devant ce qui est plus au nord.
  const vis = overlay && overlay.visitor;
  if (vis) draws.push({ z: charDepth(vis.x, vis.y), kind: 'visitor', vis });
  draws.sort((a, b) => a.z - b.z);

  for (const d of draws) {
    if (d.kind === 'visitor') {
      const { px, py } = cyElev(d.vis.x, d.vis.y);
      const vpy = py - (d.vis.subElev ? PERCH_PX : 0);
      const img = people && people.player;
      if (img) base2dPlayerStatic(ctx, img, px, vpy, C);
      else base2dVisitorToken(ctx, px, vpy, C);
      continue;
    }
    if (d.kind === 'npc') {
      const n = d.npc;
      let { px, py } = cyElev(n.x, n.y);
      if (typeof baseZoneTopAt === 'function' && baseZoneTopAt(st, n.x, n.y)) py -= PERCH_PX;
      // Passe 47 : les PNJ utilisent les VRAIS portraits de dresseurs
      // (images/trainers/profil), comme le joueur — plus de feuilles
      // procédurales. Rendu identique au visiteur : statique, ancré au sol.
      const img = await base2dNpcPortrait(n);
      if (img) base2dPlayerStatic(ctx, img, px, py, C);
      else base2dNpcToken(ctx, px, py, C);
      continue;
    }
    const { it, def, fp } = d;
    const img = sprites && sprites[it.s];
    if (d.kind === 'wall') {
      const { px, py } = cy(it.x, it.y);
      // Passe 42 : mural = plaqué sur la FACE (mur nord ou falaise), échelle
      // native GBA (1 tuile 16 px = C px), centré sur l'empreinte (2×1 ok).
      if (img) {
        const k = C / 16;
        const dw = img.width * k, dh = img.height * k;
        ctx.drawImage(img, Math.round(px + (fp.w * C - dw) / 2), Math.round(py + (C - dh) / 2), dw, dh);
      } else base2dRect(ctx, px + 6, py - 2, C - 12, C - 6, '#7a5230', '#3f2a14');
      continue;
    }
    const { px, py } = cyElev(it.x, it.y); // mezzanine : décalage vertical
    const h = fp.d * C;
    if (img) {
      // passe 41 : rotation bitmap réelle + visu haute (débord 1 case max)
      base2dDrawSprite(ctx, img, px, py, def, fp, C, it.rot | 0);
    } else {
      // repli procédural : pastille colorée + initiale (passe 35 : la
      // référence baseItemNameKey inexistante cassait tout le rendu 2D !)
      base2dRect(ctx, px + 4, py + h - (C - 8) - 4, C - 8, C - 8, '#8a5fbf', '#52357d');
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(((it.s && it.s[0]) || '?').toUpperCase(), px + C / 2, py + h - 9);
    }
  }

  // ——— Surcouche éditeur/visite (passe 38, optionnelle) ———
  if (overlay) base2dOverlay(ctx, cyElev, C, overlay, sprites, people);
  return true;
}

// ——— Boîte d'affichage d'un sprite d'objet (passe 41) —————————————————————
// Visu HAUTE possible : le canon fait deux cases de haut à certains objets
// (plantes, trophées, machine, portes…) avec collision sur la case BASSE
// seulement → le sprite DÉBORDE d'une case vers le haut s'il est plus haut
// que l'empreinte (collision inchangée).
function base2dSpriteBox(def, fp, img, C) {
  const w = fp.w * C, h = fp.d * C;
  let maxH = h;
  // Canon : certains objets font 2 cases de HAUT mais ne bloquent que la case
  // de base (plantes/boucliers BEHIND, grosses poupées 1×2) → débord visuel.
  // Fix : tous les objets >1 case (w>1 ou d>1) doivent pouvoir déborder d'1 case vers le haut pour prendre leur vraie taille
  if (def.behind) maxH = h + Math.max(1, ((def.d || 1))) * C;
  else if (def.over) maxH = h + def.over * C;
  else if ((def.w && def.w > 1) || (def.d && def.d > 1)) maxH = h + C;
  else if (def.layer === 'surface' && ((def.d || 1) > 1)) maxH = h + ((def.d || 1) - 1) * C;
  return { w, h, maxH };
}

// Dessin du sprite (passe 42 : ROTATION SUPPRIMÉE — canon RSE, demande
// utilisateur). Échelle GBA native : 1 tuile 16 px = C/2×… exactement C px
// à l'écran (×2), donc rien n'est jamais étiré ni rétréci ; ancrage bas au
// bas de l'empreinte et centrage horizontal — une grosse poupée (32×32)
// déborde donc naturellement de moitié à gauche/droite, et un objet « behind »
// déborde vers le haut derrière le joueur. « rotIdx » ignoré (compat appelants).
// Passe 43 : ombre de contact au sol — les objets « simulent une vraie
// hauteur » (demande utilisateur) : une ellipse sombre au pied des meubles
// posés AU SOL les plante dans le décor. Ni tapis/planches (à plat), ni
// poupées/coussins (souvent portés par un bureau), ni l'escalier (ombre
// déjà bakée dans son sprite).
const BASE2D_SHADOW_CATS = { objects: 1, desks: 1, chairs: 1, plants: 1 };
const BASE2D_SHADOW_SKIP = { solid_board: 1, stairs: 1 };
function base2dHasContactShadow(def) {
  return !!(def && def.layer !== 'wall' && BASE2D_SHADOW_CATS[def.cat] && !BASE2D_SHADOW_SKIP[def.s]);
}
function base2dContactShadow(ctx, x, y, w, h, C) {
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h - Math.max(2, C * 0.10), Math.min(w * 0.46, C * 0.9), Math.max(2.5, C * 0.13), 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20,12,6,.30)';
  ctx.fill();
}

function base2dDrawSprite(ctx, img, x, y, def, fp, C, rotIdx) {
  const { w, h, maxH } = base2dSpriteBox(def, fp, img, C);
  if (base2dHasContactShadow(def)) base2dContactShadow(ctx, x, y, w, h, C);
  const k = C / 16;
  let dw = img.width * k, dh = img.height * k;
  // Fix : les objets >1 case avaient leurs sprites réduits à 1 case car on bridait l'agrandissement à 1.
  // On autorise l'agrandissement jusqu'à remplir l'empreinte (w/maxH), tout en gardant le ratio.
  const sMaxW = Math.max(w, def.layer === 'surface' ? 2 * C : w) / (img.width * k);
  const sMaxH = maxH / (img.height * k);
  const s = Math.min(sMaxW, sMaxH) * k;
  dw = img.width * s; dh = img.height * s;
  const dx = x + (w - dw) / 2;
  const dy = y + h - dh;
  ctx.drawImage(img, Math.round(dx), Math.round(dy), dw, dh);
}

// Jeton du VISITEUR (casquette rouge — distinct du bleu des copains).
function base2dVisitorToken(ctx, px, py, cell) {
  ctx.fillStyle = '#b71c1c';
  ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2 - 4, cell / 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8c39e';
  ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2 - 3, cell / 6.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(px + cell / 2 - cell / 4, py + cell / 2 + 2, cell / 2, cell / 3.4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + cell / 2 - 2, py + 3, 4, 3); // logo de casquette
}

// Dessin de la surcouche interactive : fantôme de pose (vert/rouge), case
// survolée, meuble sélectionné, chemin du visiteur, jeton du visiteur.
// people (passe 42) : feuilles de personnages — le visiteur devient le héros
// GBA animé (dir + phase de marche), jeton casquette en repli.
function base2dOverlay(ctx, cy, C, overlay, sprites, people) {
  // Fantôme de pose — sous le reste pour ne pas masquer la sélection
  const gh = overlay.ghost;
  if (gh) {
    const { px, py } = cy(gh.x, gh.y);
    const w = gh.w * C, h = gh.d * C;
    ctx.fillStyle = gh.ok ? 'rgba(105,220,120,.30)' : 'rgba(244,67,54,.32)';
    ctx.fillRect(px, py, w, h);
    ctx.strokeStyle = gh.ok ? '#69dc78' : '#f44336';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, w - 2, h - 2);
    const img = gh.slug && sprites ? sprites[gh.slug] : null;
    if (img) {
      // fantôme = même rendu que l'objet posé (rotation + hauteur), en faint
      const gd = (typeof baseItemGet === 'function') ? baseItemGet(gh.slug) : null;
      ctx.globalAlpha = 0.62;
      if (gd) base2dDrawSprite(ctx, img, px, py, gd, { w: gh.w, d: gh.d }, C, gh.rot | 0);
      else {
        const s = Math.min(w / img.width, h / img.height);
        const dw = Math.max(6, img.width * s), dh = Math.max(6, img.height * s);
        ctx.drawImage(img, px + (w - dw) / 2, py + h - dh, dw, dh);
      }
      ctx.globalAlpha = 1;
    }
  }
  // Chemin du visiteur (points jaune pâle, façon tap-to-move)
  if (overlay.path && overlay.path.length) {
    ctx.fillStyle = 'rgba(255,238,140,.9)';
    for (const st2 of overlay.path) {
      const { px, py } = cy(st2.x, st2.y);
      ctx.beginPath();
      ctx.arc(px + C / 2, py + C / 2 + 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Visiteur : passe 47 — il n'est PLUS dessiné ici. Il participe à la passe
  // de tri en profondeur avec les objets et les PNJ (base2dDrawSprite), sinon
  // il passerait toujours au-dessus des meubles placés devant lui.
  // Case survolée (mode édition, rien en main) : fin liseré blanc
  if (overlay.hover) {
    const { px, py } = cy(overlay.hover.x, overlay.hover.y);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, C - 1, C - 1);
  }
  // Meuble / copain sélectionné : cadre jaune franc
  if (overlay.select) {
    const { px, py } = cy(overlay.select.x, overlay.select.y);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, overlay.select.w * C - 2, overlay.select.d * C - 2);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(px - 1, py - 1, 5, 5);
  }
}

window.baseView2dLoadSprites = baseView2dLoadSprites;
window.baseView2dDraw = baseView2dDraw;
window.baseView2dBg = baseView2dBg;
window.base2dOverlay = base2dOverlay;
window.baseView2dPeople = baseView2dPeople;
window.base2dPerson = base2dPerson;
window.base2dPlayerStatic = base2dPlayerStatic;
window.base2dNpcPersonId = base2dNpcPersonId;
window.base2dNpcPortrait = base2dNpcPortrait;
window.base2dSpriteBox = base2dSpriteBox;
window.base2dDrawSprite = base2dDrawSprite;

