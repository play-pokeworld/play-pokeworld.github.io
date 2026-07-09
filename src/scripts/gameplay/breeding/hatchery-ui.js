// ============================================================
// HATCHERY UI — (split from hatchery.js)
// ============================================================
function renderHatcheryWindow(){
  const el = document.getElementById('hatchery-window-body');
  if(!el) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang==='en';
  const unlocked = G.badges.includes('misty') || G.badges.length >= 2;
  if(!unlocked){
    el.innerHTML = `<div style="text-align:center;padding:14px;color:var(--dim);font-size:11px;">
      <div style="font-size:24px;margin-bottom:4px;">🔒</div>
      <b>${isEn?'Hatchery Locked':'Pension & Couveuse verrouillées'}</b><br>
      ${isEn?'Defeat Misty in Cerulean City (2 Badges) to unlock the Route 5 Hatchery!':'Battez Ondine à Azuria (2 Badges) pour débloquer la pension de la Route 5 !'}
    </div>`;
    return;
  }
  // Eggs tab only — fossils now live in the box view (unified selector modal)
  let headerHtml = '';
  // Eggs tab
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  if(!G.hatchery) G.hatchery = [null];
  while(G.hatchery.length < maxSlots) G.hatchery.push(null);
  let html = headerHtml + `<div style="display:flex;flex-direction:column;gap:6px;">`;
  for(let i=0; i<maxSlots; i++){
    const slot = G.hatchery[i];
    if(!slot){
      html += `<button class="hbtn" style="width:100%;padding:10px;background:rgba(30,136,229,0.18);border:1px dashed var(--blue);color:#fff;font-weight:bold;font-size:12px;" onclick="openUnifiedSelectorModal('hatchery')">➕ ${isEn?`Slot #${i+1}: Place Pokémon`:`Slot #${i+1} : Déposer un Pokémon`}</button>`;
    } else {
      const p = slot.poke;
      const isFossil = !!slot.isFossil;
      const displayId = isFossil ? slot.reviveId : p.id;
      const displayEmoji = isFossil ? '🦴' : (p.emoji || '');
      const displayShiny = isFossil ? false : p.shinyActive;
      const displayName = isFossil ? getItemName(slot.fossilKey) : getPokeName(p.id);
      const iconEmoji = isFossil ? '🦴' : '🥚';
      const steps = slot.steps || 0;
      const req = slot.stepsReq || 10;
      const done = steps >= req;
      const pct = clamp(Math.floor((steps / req) * 100), 0, 100);
      html += `<div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.25);padding:8px;border-radius:8px;border:1px solid ${done?'var(--green)':(isFossil?'#6b5b3e':'#5a504a')};">
        <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:6px;cursor:pointer;" onclick="openUnifiedSelectorModal('box_view')">
          ${isFossil ? itemIcon(slot.fossilKey,42) : spriteImg(displayId, displayEmoji, {size:42, shiny:displayShiny})}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${iconEmoji} ${displayName} <span style="font-size:10px;color:var(--dim)">Slot #${i+1}</span></div>
          <div style="font-size:10px;color:var(--dim);margin:4px 0;">${done ? (isEn?'Ready!':'Prêt !') : (isEn?`Incubating: ${steps} / ${req} KOs`:`Incubation : ${steps} / ${req} KO`)}</div>
          <div style="height:6px;background:#221e1c;border-radius:3px;overflow:hidden;border:1px solid #111;">
            <div style="width:${pct}%;background:${done?'var(--green)':(isFossil?'var(--gold)':'var(--blue)')};height:100%;transition:0.3s;"></div>
          </div>
        </div>
        ${done ? `<button class="hbtn" style="padding:6px 10px;background:var(--green);color:#fff;font-weight:bold;font-size:11px;" onclick="hatchEgg(${i})">🌟 ${isEn?'Hatch!':'Éclore'}</button>` : ''}
      </div>`;
    }
  }
  if(maxSlots < 4){
    const upgradeCost = maxSlots * 15000;
    html += `<button class="hbtn" style="width:100%;margin-top:4px;padding:7px;background:#2a2012;border:1px solid var(--gold);color:var(--gold);font-size:11px;font-weight:bold;" onclick="upgradeHatcherySlots(${upgradeCost})">⬆️ ${isEn?`Upgrade Daycare: +1 Egg Slot (${upgradeCost.toLocaleString()}₽)`:`Améliorer Pension : +1 Slot (${upgradeCost.toLocaleString()}₽)`}</button>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}




function renderFossilLab(el){
  const lang = (G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';
  const fossils = getFossilInventory();
  let html = `<div class="loc-title">🦴 ${isEn ? 'Fossil Lab' : 'Laboratoire Fossile'}</div>
  <div class="loc-sub" style="margin-bottom:12px">${isEn ? 'Revive prehistoric Pokémon found in the Underground Mine, PokéClicker style!' : 'Ranimez les Pokémon préhistoriques trouvés dans la Mine Souterraine, façon PokéClicker !'}</div>`;

  if(!fossils.length){
    html += `<div style="text-align:center;padding:30px;color:var(--dim);background:var(--card);border-radius:8px">
      <div style="font-size:32px;margin-bottom:8px">⛏️</div>
      <b>${isEn ? 'No fossils yet' : 'Aucun fossile'}</b><br>
      <span style="font-size:12px">${isEn ? 'Dig in the Underground Mine to find Helix, Dome & Old Amber!' : 'Creusez dans la Mine Souterraine pour trouver des fossiles Nautile, Dôme et Vieil Ambre !'}</span>
      <div style="margin-top:12px"><button class="hbtn" style="background:var(--blue);color:#fff" onclick="showTab('mine')">⛏️ ${isEn ? 'Go to Mine' : 'Aller à la Mine'}</button></div>
    </div>`;
    el.innerHTML = html;
    return;
  }

  html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">`;
  fossils.forEach(f => {
    const item = ITEMS[f.key] || {};
    const pokeId = f.reviveId;
    const pokeName = getPokeName(pokeId);
    const seen = G.pokedex[pokeId]?.seen;
    const owned = speciesOwned(pokeId);
    html += `<div style="background:var(--card);border:1px solid #4a3c2e;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:32px">${itemIcon(f.key,36)}</div>
        <div style="flex:1">
          <div style="font-weight:bold">${getItemName(f.key)}</div>
          <div style="font-size:11px;color:var(--dim)">${isEn ? 'Qty' : 'Qté'}: <b style="color:var(--gold)">${f.qty}</b></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.2);padding:8px;border-radius:6px">
        <div>${spriteImg(pokeId,'🦖',{size:48})}</div>
        <div>
          <div style="font-weight:bold;font-size:13px">${seen ? pokeName : '???'} <span style="color:var(--dim);font-size:11px">#${pokeId}</span></div>
          <div style="font-size:11px;color:var(--dim)">${isEn ? 'Revives into' : 'Ranime en'}</div>
          ${owned ? `<div style="font-size:11px;color:var(--green)">✅ ${isEn ? 'Owned' : 'Possédé'}</div>` : ''}
        </div>
      </div>
      <button class="hbtn" style="background:var(--green);color:#fff;font-weight:bold" onclick="reviveFossil('${f.key}')">🧬 ${isEn ? 'Revive!' : 'Ranimer !'}${f.qty>1 ? ` (${f.qty})` : ''}</button>
    </div>`;
  });
  html += `</div>`;
  html += `<div style="margin-top:14px;background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.25);padding:10px;border-radius:8px;font-size:12px;color:var(--dim)">
    💡 ${isEn ? '<b>PokéClicker style:</b> Fossils are found while mining. Each fossil revives instantly into its prehistoric Pokémon (Lv.1). Shiny chance applies!' : '<b>Style PokéClicker :</b> les fossiles se trouvent en minant. Chaque fossile ranime instantanément son Pokémon préhistorique (Nv.1). Les Shiny sont possibles !'}
  </div>`;
  el.innerHTML = html;
}


function renderFossilLabCompact(el){
  // reuse main fossil lab renderer – it fits in hatchery window
  if(typeof renderFossilLab === 'function') renderFossilLab(el);
}
