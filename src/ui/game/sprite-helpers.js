// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Canonical 2-size policy (ECS design system): every Pokémon sprite is
// rendered at one of the TWO global sizes — 'standard' (72px, waves 15+17)
// everywhere and 'team' (104px) for Team/Battle hero contexts. Numeric
// requests are clamped to the nearest size (>=76 → team, else standard);
// unknown tokens fall back to standard.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function pwClampSpriteSize(size){
 const sizes = (typeof window !== 'undefined' && window.PW_SPRITE_SIZES) || { standard: 72, team: 104 };
 if (size === 'team') return sizes.team;
 if (size === 'standard') return sizes.standard;
 const n = Number(size);
 if (!isFinite(n)) return sizes.standard;
 return n >= 76 ? sizes.team : sizes.standard;
}

function spriteFallback(img, emoji, size){
 try{
 const span = document.createElement('span');
 span.style.fontSize = Math.floor(size*0.6)+'px';
 span.textContent = emoji;
 if(img && typeof img.replaceWith === 'function') img.replaceWith(span);
 }catch(_){}
}
function spriteImg(id, emoji, {shiny=false, back: _back=false, size=40, cls='', silhouette=false}={}){
 size = pwClampSpriteSize(size);
 // Try DEX_MAP (name->number), else use id directly as number
 const lookupId = String(id);
 let num = (typeof DEX_MAP !== 'undefined' && DEX_MAP) ? DEX_MAP[lookupId] : null;
 if (num == null) num = Number(id);
 const bucket = shiny ? 'frontShiny' : 'front';
 const src = (SPRITE_DATA && SPRITE_DATA[bucket] && SPRITE_DATA[bucket][String(num)]) ? SPRITE_DATA[bucket][String(num)] : null;
 if(!src){ if(typeof console !== 'undefined') console.warn('[PokeWorld] Missing Pokémon sprite:', id, '-> num:', num, 'bucket:', bucket); return `<span class="sprite-fallback-emoji">${emoji}</span>`; }
 if(silhouette){
 return `<span class="pw-poke-circle-wrap" style="width:${size}px;height:${size}px;"><span class="pw-poke-circle-bg"></span><img src="${src}" alt="${emoji}" loading="lazy" decoding="async" class="pw-poke-circle-img sprite-img ${cls} silhouette-img silhouette-filtered" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})"></span>`;
 }
 return `<span class="pw-poke-circle-wrap" style="width:${size}px;height:${size}px;"><span class="pw-poke-circle-bg"></span><img src="${src}" alt="${emoji}" loading="lazy" decoding="async" class="pw-poke-circle-img sprite-img ${cls}" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})"></span>`;
}



function spriteSilhouette(id, emoji, {size=40, cls=''}={}){
 size = pwClampSpriteSize(size);
 const num=(typeof DEX_MAP !== 'undefined' && DEX_MAP) ? DEX_MAP[id] : null;
 if(num==null) return `<span class="sprite-fallback-emoji">${emoji}</span>`;
 const src = SPRITE_DATA['front'][String(num)];
 if(!src){ if(typeof console !== 'undefined') console.warn('[PokeWorld] Missing sprite for silhouette:', id, '-> num:', num); return `<span class="sprite-fallback-emoji">${emoji}</span>`; }
 return `<span class="pw-poke-circle-wrap" style="width:${size}px;height:${size}px;"><span class="pw-poke-circle-bg"></span><img src="${src}" alt="${emoji}" loading="lazy" decoding="async" class="pw-poke-circle-img sprite-img ${cls} silhouette-img silhouette-filtered" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})"></span>`;
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
 // Prefere the path canonique items/<key>.png (baies distinctes), then ITEM_SPRITE_DATA.
 let src = null;
 if (typeof getItemSpriteUrl === 'function') {
   try { src = getItemSpriteUrl(key); } catch (_) { src = null; }
 }
 if (!src && typeof ITEM_SPRITE_DATA !== 'undefined' && ITEM_SPRITE_DATA) src = ITEM_SPRITE_DATA[key];
 if(!src){
 if(key === 'rarecandy') src = (ITEM_SPRITE_DATA && ITEM_SPRITE_DATA['rarcandy']) || 'src/assets/images/items/rarecandy.png';
 else if(key === 'shiny_charm') src = 'src/assets/images/items/shiny_charm.png';
 else if(key && String(key).endsWith('_berry')) src = 'src/assets/images/items/' + key + '.png';
 else if(key && key.includes('choice')) src = (ITEM_SPRITE_DATA && (ITEM_SPRITE_DATA['choice_band'] || ITEM_SPRITE_DATA['muscle_band']));
 else if(key === 'leftovers') src = 'src/assets/images/items/leftovers.png';
 else if(key === 'life_orb') src = 'src/assets/images/items/life_orb.png';
 else if(key) src = 'src/assets/images/items/' + key + '.png';
 }
 const emoji = ITEMS[key]?.icon || '?';
 if(!src){ if(typeof console !== 'undefined') console.warn('[PokeWorld] Missing item sprite for:', key); return `<span class="sprite-fallback-emoji">${emoji}</span>`; }
 return `<img src="${src}"alt="${emoji}" loading="lazy" decoding="async" class="pw-poke-circle-img sprite-img ${cls} sprite-middle" width="${size}" height="${size}" onerror="spriteFallback(this,'${emoji}',${size})">`;
}


const _BAG_MAX = 25;


// Phase 26 — legacy feature update
// A single drag "ghost", consistent and identical whatever the dragged
// target (Pokemon, move, window…): dark chip [icon | title + subtitle].
// Usage: pwApplyDragGhost(ev, {icon, title, sub}).
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
    _pwSetHtmlSafe(el, pwDragGhostHtml(opts.icon, opts.title, opts.sub));
    // Off-screen but rendered (required by setDragImage for the snapshot).
    el.style.position = 'fixed';
    el.style.top = '-1000px';
    el.style.left = '-1000px';
    document.body.appendChild(el);
    ev.dataTransfer.setDragImage(el, 26, 22);
    setTimeout(() => { try { el.remove(); } catch (_) {} }, 0);
  } catch (_) {}
}

// Phase 27 — legacy feature update
// Floating bubble following the cursor during drag and showing the swap
// that WILL happen (source <-> target) — "you see what you are giving".
if (typeof globalThis._pwDropPreviewEl === 'undefined') globalThis._pwDropPreviewEl = null;
function pwDropPreviewShow(html, x, y){
  try {
    if (typeof document === 'undefined' || !document.body) return;
    if (!_pwDropPreviewEl) {
      _pwDropPreviewEl = document.createElement('div');
      _pwDropPreviewEl.className = 'pw-drop-preview';
      document.body.appendChild(_pwDropPreviewEl);
    }
    _pwSetHtmlSafe(_pwDropPreviewEl, html);
    _pwDropPreviewEl.style.display = 'flex';
    const maxX = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth - 10 : x + 10;
    _pwDropPreviewEl.style.left = Math.max(10, Math.min(maxX, x)) + 'px';
    _pwDropPreviewEl.style.top = Math.max(10, y - 14) + 'px';
  } catch (_) {}
}
function pwDropPreviewHide(){ try { if (_pwDropPreviewEl) _pwDropPreviewEl.style.display = 'none'; } catch (_) {} }
// "Swap" content: two mini-cards (icon + title + subtitle) and an arrow.
function pwSwapPreviewHtml(sideA, sideB){
  function side(sd){ return '<span class="pw-drop-preview-side">' + (sd.icon || '') + '<span class="pw-drop-preview-txt"><b>' + (sd.title || '') + '</b>' + (sd.sub ? '<small>' + sd.sub + '</small>' : '') + '</span></span>'; }
  return side(sideA) + '<span class="pw-drop-preview-arrow">\u21C4</span>' + side(sideB);
}

// --- Migrated to ES module, globals exposed ---
if (typeof spriteFallback !== 'undefined') { if (typeof window !== 'undefined') window.spriteFallback = spriteFallback; if (typeof globalThis !== 'undefined') globalThis.spriteFallback = spriteFallback; }
if (typeof pwDragGhostHtml !== 'undefined') { if (typeof window !== 'undefined') window.pwDragGhostHtml = pwDragGhostHtml; if (typeof globalThis !== 'undefined') globalThis.pwDragGhostHtml = pwDragGhostHtml; }
if (typeof pwApplyDragGhost !== 'undefined') { if (typeof window !== 'undefined') window.pwApplyDragGhost = pwApplyDragGhost; if (typeof globalThis !== 'undefined') globalThis.pwApplyDragGhost = pwApplyDragGhost; }
if (typeof pwDropPreviewShow !== 'undefined') { if (typeof window !== 'undefined') window.pwDropPreviewShow = pwDropPreviewShow; if (typeof globalThis !== 'undefined') globalThis.pwDropPreviewShow = pwDropPreviewShow; }
if (typeof pwDropPreviewHide !== 'undefined') { if (typeof window !== 'undefined') window.pwDropPreviewHide = pwDropPreviewHide; if (typeof globalThis !== 'undefined') globalThis.pwDropPreviewHide = pwDropPreviewHide; }
if (typeof pwSwapPreviewHtml !== 'undefined') { if (typeof window !== 'undefined') window.pwSwapPreviewHtml = pwSwapPreviewHtml; if (typeof globalThis !== 'undefined') globalThis.pwSwapPreviewHtml = pwSwapPreviewHtml; }
if (typeof spriteImg !== 'undefined') { if (typeof window !== 'undefined') window.spriteImg = spriteImg; if (typeof globalThis !== 'undefined') globalThis.spriteImg = spriteImg; }
if (typeof spriteSilhouette !== 'undefined') { if (typeof window !== 'undefined') window.spriteSilhouette = spriteSilhouette; if (typeof globalThis !== 'undefined') globalThis.spriteSilhouette = spriteSilhouette; }
if (typeof silhouetteCanvas !== 'undefined') { if (typeof window !== 'undefined') window.silhouetteCanvas = silhouetteCanvas; if (typeof globalThis !== 'undefined') globalThis.silhouetteCanvas = silhouetteCanvas; }
if (typeof itemIcon !== 'undefined') { if (typeof window !== 'undefined') window.itemIcon = itemIcon; if (typeof globalThis !== 'undefined') globalThis.itemIcon = itemIcon; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  spriteFallback,
  pwDragGhostHtml,
  pwApplyDragGhost,
  pwDropPreviewShow,
  pwDropPreviewHide,
  pwSwapPreviewHtml,
  spriteImg,
  spriteSilhouette,
  silhouetteCanvas,
  itemIcon,
};

