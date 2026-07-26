function spriteFallback(img, emoji, size){
 try{
 const span = document.createElement('span');
 span.style.fontSize = Math.floor(size*0.6)+'px';
 span.textContent = emoji;
 if(img && typeof img.replaceWith === 'function') img.replaceWith(span);
 }catch(_){}
}
function spriteImg(id, emoji, {shiny=false, back=false, size=40, cls='', silhouette=false}={}){
 // Try DEX_MAP (name->number), else use id directly as number
 var lookupId = String(id);
 var num = (typeof DEX_MAP !== 'undefined' && DEX_MAP) ? DEX_MAP[lookupId] : null;
 if (num == null) num = Number(id);
 var bucket = back ? (shiny?'backShiny':'back') : (shiny?'frontShiny':'front');
 var src = (SPRITE_DATA && SPRITE_DATA[bucket] && SPRITE_DATA[bucket][String(num)]) ? SPRITE_DATA[bucket][String(num)] : null;
 if(!src){ if(typeof console !== 'undefined') console.warn('[PokeWorld] Missing Pokémon sprite:', id, '-> num:', num, 'bucket:', bucket); return `<span class="sprite-fallback-emoji">${emoji}</span>`; }
 if(silhouette){
 
 return `<img src="${src}"alt="${emoji}" loading="lazy" decoding="async" class="sprite-img ${cls} silhouette-img silhouette-filtered" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
 }
 return `<img src="${src}"alt="${emoji}" loading="lazy" decoding="async" class="sprite-img ${cls}" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
}



function spriteSilhouette(id, emoji, {size=40, cls=''}={}){
 const num=(typeof DEX_MAP !== 'undefined' && DEX_MAP) ? DEX_MAP[id] : null;
 if(num==null) return `<span class="sprite-fallback-emoji">${emoji}</span>`;
 const src = SPRITE_DATA['front'][String(num)];
 if(!src){ if(typeof console !== 'undefined') console.warn('[PokeWorld] Missing sprite for silhouette:', id, '-> num:', num); return `<span class="sprite-fallback-emoji">${emoji}</span>`; }
 return `<img src="${src}" alt="${emoji}" loading="lazy" decoding="async" class="sprite-img ${cls} silhouette-img silhouette-filtered" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
}



function silhouetteCanvas(img, canvasId, size){
 try{
   const canvas = document.getElementById(canvasId);
   if(!canvas) return;
   const ctx = canvas.getContext('2d');
   ctx.clearRect(0, 0, size, size);
   
   
   ctx.drawImage(img, 0, 0, size, size);
   
   
   const imageData = ctx.getImageData(0, 0, size, size);
   const data = imageData.data;
   
   
   const gray = 40; 
   for(let i = 0; i < data.length; i += 4){
     if(data[i+3] > 0){ 
       data[i] = gray;     
       data[i+1] = gray;   
       data[i+2] = gray;   
       data[i+3] = 255;    
     }
   }
   
   
   ctx.putImageData(imageData, 0, 0);
   
   
   img.style.display = 'none';
 }catch(e){
   console.error('Silhouette error:', e);
 }
}
function itemIcon(key, size=20, cls=''){
 let src = ITEM_SPRITE_DATA[key];
 if(!src){
 if(key === 'rarecandy') src = ITEM_SPRITE_DATA['rarcandy'];
 else if(key === 'shiny_charm') src = ITEM_SPRITE_DATA['stardust'];
 else if(key.includes('berry')) src = ITEM_SPRITE_DATA['berry'];
 else if(key.includes('choice')) src = ITEM_SPRITE_DATA['choice_band'] || ITEM_SPRITE_DATA['muscle_band'];
 else if(key.includes('stone')) src = ITEM_SPRITE_DATA['moonstone'];
 else if(key.includes('charm')) src = ITEM_SPRITE_DATA['shiny_charm'] || ITEM_SPRITE_DATA['pearl'];
 else if(key === 'leftovers') src = ITEM_SPRITE_DATA['fullrestore'];
 else if(key === 'life_orb') src = ITEM_SPRITE_DATA['revive'];
 else if(key === 'assault_vest' || key === 'eviolite') src = ITEM_SPRITE_DATA[key] || ITEM_SPRITE_DATA['muscle_band'];
 else src = ITEM_SPRITE_DATA['potion'];
 }
 const emoji = ITEMS[key]?.icon || '?';
 if(!src){ if(typeof console !== 'undefined') console.warn('[PokeWorld] Missing item sprite for:', key); return `<span class="sprite-fallback-emoji">${emoji}</span>`; }
 return `<img src="${src}"alt="${emoji}" loading="lazy" decoding="async" class="sprite-img ${cls} sprite-middle" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
}


const BAG_MAX = 25;


// ── Passe 26 : aperçu de glisser-déposer UNIFIÉ ──────────────────────────
// Une seule « vignette » de drag, propre et identique quelle que soit la
// cible déplacée (Pokémon, attaque, fenêtre…) : puce sombre [icône | titre
// + sous-titre]. Utilisation : pwApplyDragGhost(ev, {icon, title, sub}).
function pwDragGhostHtml(iconHtml, title, sub){
  return '<span class="pw-drag-ghost-ico">' + (iconHtml || '') + '</span>'
    + '<span class="pw-drag-ghost-txt"><b>' + (title || '') + '</b>'
    + (sub ? '<small>' + sub + '</small>' : '') + '</span>';
}
function pwApplyDragGhost(ev, opts){
  try {
    if (!ev || !ev.dataTransfer || typeof ev.dataTransfer.setDragImage !== 'function') return;
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'pw-drag-ghost';
    el.innerHTML = pwDragGhostHtml(opts.icon, opts.title, opts.sub);
    // Hors-champ mais rendu (requis par setDragImage pour la capture).
    el.style.position = 'fixed';
    el.style.top = '-1000px';
    el.style.left = '-1000px';
    document.body.appendChild(el);
    ev.dataTransfer.setDragImage(el, 26, 22);
    setTimeout(() => { try { el.remove(); } catch (_) {} }, 0);
  } catch (_) {}
}

// ─── Passe 27 : PREVIEW DU RÉSULTAT d'un drop ────────────────────────────
// Bulle flottante qui suit le curseur pendant le drag et montre l'échange
// qui VA se produire (source ⇄ cible) — « on voit ce que l'on fait ».
var _pwDropPreviewEl = null;
function pwDropPreviewShow(html, x, y){
  try {
    if (typeof document === 'undefined' || !document.body) return;
    if (!_pwDropPreviewEl) {
      _pwDropPreviewEl = document.createElement('div');
      _pwDropPreviewEl.className = 'pw-drop-preview';
      document.body.appendChild(_pwDropPreviewEl);
    }
    _pwDropPreviewEl.innerHTML = html;
    _pwDropPreviewEl.style.display = 'flex';
    var maxX = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth - 10 : x + 10;
    _pwDropPreviewEl.style.left = Math.max(10, Math.min(maxX, x)) + 'px';
    _pwDropPreviewEl.style.top = Math.max(10, y - 14) + 'px';
  } catch (_) {}
}
function pwDropPreviewHide(){ try { if (_pwDropPreviewEl) _pwDropPreviewEl.style.display = 'none'; } catch (_) {} }
// Contenu « échange » : deux mini-fiches (icône + titre + sous-titre) et une flèche.
function pwSwapPreviewHtml(sideA, sideB){
  function side(sd){ return '<span class="pw-drop-preview-side">' + (sd.icon || '') + '<span class="pw-drop-preview-txt"><b>' + (sd.title || '') + '</b>' + (sd.sub ? '<small>' + sd.sub + '</small>' : '') + '</span></span>'; }
  return side(sideA) + '<span class="pw-drop-preview-arrow">\u21C4</span>' + side(sideB);
}

// --- Migrated to ES module, globals exposed ---
if (typeof spriteFallback !== 'undefined' && typeof window !== 'undefined') window.spriteFallback = spriteFallback;
if (typeof pwDragGhostHtml !== 'undefined' && typeof window !== 'undefined') window.pwDragGhostHtml = pwDragGhostHtml;
if (typeof pwApplyDragGhost !== 'undefined' && typeof window !== 'undefined') window.pwApplyDragGhost = pwApplyDragGhost;
if (typeof pwDropPreviewShow !== 'undefined' && typeof window !== 'undefined') window.pwDropPreviewShow = pwDropPreviewShow;
if (typeof pwDropPreviewHide !== 'undefined' && typeof window !== 'undefined') window.pwDropPreviewHide = pwDropPreviewHide;
if (typeof pwSwapPreviewHtml !== 'undefined' && typeof window !== 'undefined') window.pwSwapPreviewHtml = pwSwapPreviewHtml;
if (typeof spriteImg !== 'undefined' && typeof window !== 'undefined') window.spriteImg = spriteImg;
if (typeof spriteSilhouette !== 'undefined' && typeof window !== 'undefined') window.spriteSilhouette = spriteSilhouette;
if (typeof silhouetteCanvas !== 'undefined' && typeof window !== 'undefined') window.silhouetteCanvas = silhouetteCanvas;
if (typeof itemIcon !== 'undefined' && typeof window !== 'undefined') window.itemIcon = itemIcon;

