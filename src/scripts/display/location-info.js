// ============================================================
// LOCATION INFO — (split from map.js)
// ============================================================
function renderLocInfo(el){
  const loc=getLocObj(G.location);
  if(!loc) return;
  const champId=loc.champ;
  const champ=champId?CHAMPIONS[champId]:null;
  const champDefeated=champId&&G.defeatedChamps[champId];
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  let html=`<div class="loc-title">${loc.type==='town'?'🏙':'🌿'} ${getLocName(G.location)}</div>`;
  html+=`<div class="loc-sub">${typeLabel(loc.type)}</div>`;

  const lore = getLore(G.location);
  if(lore && lore.text){
    const spk = lore.speaker;
    const txt = lore.text;
    html += `<div style="background:rgba(255,255,255,0.05);border-left:3px solid var(--accent);padding:8px 10px;border-radius:0 6px 6px 0;margin:8px 0;font-size:11px;color:#ddd;line-height:1.4;">
      <div style="font-weight:bold;color:var(--accent);margin-bottom:3px;">💬 ${spk} :</div>
      <div style="font-style:italic;">« ${txt} »</div>
    </div>`;
  }

  // Habitants / PNJ — boutons d'action (taille identique à Boutique / Arène)
  const locNpcs = (typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : [];
  let npcActions='';
  if(locNpcs.length){
    npcActions += `<div style="grid-column:1/-1;margin-bottom:8px;">`;
    npcActions += `<div style="font-size:11px;color:var(--gold);font-weight:bold;margin-bottom:5px;">👥 ${lang==='en'?'Talk to inhabitants':'Parlez aux habitants'}</div>`;
    npcActions += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
    locNpcs.forEach((npc, ni)=>{
      const npcName = getNpc(G.location, ni).name || ('NPC '+(ni+1));
      npcActions += `<div class="action-btn" onclick="openNpc('${G.location}',${ni})" style="border:1px solid #7b3fa0;background:rgba(123,63,160,0.20)"><span class="ab-icon">🗣️</span><span class="ab-label">${npcName}</span></div>`;
    });
    npcActions += `</div></div>`;
  }

  // Actions
  html+=`<div class="action-grid">`+npcActions;

  if(G.location === 'vermilion'){
    html += `<div class="action-btn" onclick="travelToRegion('johto')" style="border:1px solid #2196f3;background:rgba(33,150,243,0.18)"><span class="ab-icon">🚢</span><span class="ab-label">${lang==='en'?'Sail to Johto Region (Harbor)':'Prendre le bateau vers Johto (Port)'}</span></div>`;
  } else if(G.location === 'olivine'){
    html += `<div class="action-btn" onclick="travelToRegion('kanto')" style="border:1px solid #2196f3;background:rgba(33,150,243,0.18)"><span class="ab-icon">🚢</span><span class="ab-label">${lang==='en'?'Sail to Kanto Region (Harbor)':'Prendre le bateau vers Kanto (Port)'}</span></div>`;
  }

  // Explore (route/dungeon/sea) — searching for items now happens through
  // wild encounters: defeating a Pokémon can drop an item AND/OR capture it.
  if(loc.type!=='town'){
    html+=`<div class="action-btn" onclick="exploreArea()"><span class="ab-icon">🌾</span><span class="ab-label">${t('explore_btn')}</span></div>`;
  }

  // Shop
  if(loc.shopId&&SHOPS[loc.shopId]){
    if(loc.shopId === 'indigo' && !G.championTitle){
      html+=`<div class="action-btn disabled" title="${lang==='en'?'Requires winning Kanto League':'Nécessite d\'avoir vaincu la Ligue Kanto'}"><span class="ab-icon">🔒</span><span class="ab-label">${t('tab_shop')} (${lang==='en'?'Locked: League Champion only':'Verrouillé : Maître Ligue uniquement'})</span></div>`;
    } else {
      html+=`<div class="action-btn" onclick="openFullscreenPanel('shop')"><span class="ab-icon">🛒</span><span class="ab-label">${t('tab_shop')}</span></div>`;
    }
  }

  // Champion
  if(champId){
    const champBadgeReq=champ?(champ.badgeReq||0):0;
    const champLocked=champBadgeReq>G.badges.length;
    if(champLocked){
      html+=`<div class="action-btn disabled"><span class="ab-icon">🔒</span><span class="ab-label">${getChampName(champId)} (${champBadgeReq}🏅 ${t('req_lbl')})</span></div>`;
    } else if(champDefeated){
      html+=`<div class="action-btn" onclick="startChampBattle('${champId}')" style="border:1px solid var(--gold)"><span class="ab-icon">🔄</span><span class="ab-label">${t('rematch_btn')} ${getChampName(champId)}</span></div>`;
    } else {
      html+=`<div class="action-btn" onclick="startChampBattle('${champId}')"><span class="ab-icon">⚔️</span><span class="ab-label">${t('challenge_btn')} ${getChampName(champId)}</span></div>`;
    }
  }

  // Pokémon Centers removed: your team auto-heals at the start of every battle.

  html+=`</div>`;

  // --- Compteur de déblocage de la prochaine zone ---
  // Si ce lieu verrouille des voisins (route/dungeon avec minWins > 0),
  // afficher une barre "x / y combats avant le déblocage de la prochaine zone".
  if(loc.type!=='town' && (loc.minWins||0) > 0 && loc.wild && loc.wild.length){
    const curWins = ((G.wildWinsByLoc||{})[G.location]||0);
    const need = loc.minWins;
    // Quelles zones ce lieu débloque-t-il ? (voisins pas encore atteignables
    // parce que CE lieu n'est pas encore "cleared")
    const nextZones = [];
    for(const c of (loc.conn||[])){
      if(c === G.location) continue;
      const cLoc = getLocObj(c);
      if(!cLoc) continue;
      // n'est pas encore atteignable depuis le départ
      if(!locReachable(c)) nextZones.push(getLocName(c));
    }
    if(curWins < need){
      const pct = clamp(Math.floor((curWins / need) * 100), 0, 100);
      const zoneTxt = nextZones.length ? nextZones.slice(0,2).join(', ') : (lang==='en'?'the next zone':'la prochaine zone');
      html += `<div style="background:rgba(255,215,0,0.08);border:1px solid var(--gold);padding:8px 10px;border-radius:8px;margin:8px 0;">
        <div style="font-size:11px;color:var(--gold);font-weight:bold;margin-bottom:4px;">
          ⚔️ ${curWins} / ${need} ${lang==='en'?'battles':'combats'} — ${lang==='en'?'to unlock':'avant le déblocage de'} ${zoneTxt}
        </div>
        <div style="height:8px;background:#221e1c;border-radius:4px;overflow:hidden;border:1px solid #111;">
          <div style="width:${pct}%;background:var(--gold);height:100%;transition:width .3s;"></div>
        </div>
      </div>`;
    }
  }

  const roamingId = getRoamingLegendaryForRoute(G.location);
  if(roamingId){
    html += `<div style="background:rgba(255,215,0,0.12);border:1px solid var(--gold);padding:6px 10px;border-radius:6px;margin:8px 0;font-size:11px;color:var(--gold);display:flex;align-items:center;gap:8px;">
      <span style="font-size:18px;">⚡</span>
      <span><b>${lang==='en'?'Roaming Legendary Notice (12h rotation):':'Légendaire errant en rotation (12h) :'}</b> ${getPokeName(roamingId)} ${lang==='en'?'can be encountered in wild battles here!':'peut apparaître dans les combats sauvages ici !'}</span>
    </div>`;
  }

  // Wild Pokémon
  if(loc.wild&&loc.wild.length){
    const comp=locCompletion(G.location);
    const complete=comp&&comp.caught===comp.total;
    const shinyCount=comp?comp.ids.filter(id=>isSpeciesShiny(id)).length:0;
    html+=`<div style="margin-top:10px;font-size:12px;color:var(--dim);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <span>${t('wild_poke')}</span>
      <span style="color:${complete?'var(--green)':'var(--gold)'};font-weight:bold">${comp?`${comp.caught}/${comp.total}`:''}</span>
      ${complete?'✅':''}
      ${shinyCount>0?`<span style="color:var(--yellow);background:rgba(255,215,0,0.1);padding:1px 6px;border-radius:8px;border:1px solid var(--yellow);font-weight:bold" title="Pokémon Shiny capturés ici">✨ Shiny : ${shinyCount}/${comp.total}</span>`:''}
    </div>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">`;
    for(const w of loc.wild){
      const [id,lo,hi,rarity] = w;
      const r = rarity||"common";
      const pd=PD[id];
      if(!pd) continue;
      const seen=G.pokedex[id];
      const owned=speciesOwned(id);
      const shinyOwned=isSpeciesShiny(id);
      html+=`<div style="background:var(--card);border-radius:6px;padding:6px 8px;font-size:11px;text-align:center;position:relative;${owned?`border:1px solid ${shinyOwned?'var(--yellow)':'var(--green)'};${shinyOwned?'box-shadow:0 0 8px rgba(255,215,0,0.3);':''}`:''}">
        ${owned?`<div style="position:absolute;top:2px;right:3px;font-size:10px">${shinyOwned?'<span class="shiny-tag" title="Capturé en Shiny">✨</span>':''}✅</div>`:''}
        <div class="${shinyOwned?'is-shiny':''}" style="height:32px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">${seen?spriteImg(id,pd[8],{size:28, shiny:shinyOwned}):'❓'}</div>
        <div style="font-weight:${shinyOwned?'bold':'normal'}">${shinyOwned?'<span class="shiny-tag">✨</span>':''}${seen?getPokeName(id):'???'}</div>
        <div style="color:var(--dim)">Nv.${lo}-${hi}</div><div style="font-size:9px;margin-top:2px;color:${r==='rare'?'var(--gold)':r==='uncommon'?'var(--blue)':'var(--dim)'}">${r==='rare'?t('rarity_rare'):r==='uncommon'?t('rarity_uncom'):t('rarity_com')}</div>
      </div>`;
    }
    if(roamingId){
      const pd = PD[roamingId];
      const seen = G.pokedex[roamingId];
      const owned = speciesOwned(roamingId);
      const shinyOwned = isSpeciesShiny(roamingId);
      html += `<div style="background:var(--card);border-radius:6px;padding:6px 8px;font-size:11px;text-align:center;position:relative;border:1px solid var(--purple);box-shadow:0 0 10px rgba(156,39,176,0.3);">
        ${owned?`<div style="position:absolute;top:2px;right:3px;font-size:10px">${shinyOwned?'<span class="shiny-tag" title="Capturé en Shiny">✨</span>':''}✅</div>`:''}
        <div class="${shinyOwned?'is-shiny':''}" style="height:32px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">${seen?spriteImg(roamingId,pd[8],{size:28, shiny:shinyOwned}):'❓'}</div>
        <div style="font-weight:bold;color:var(--purple);">${shinyOwned?'<span class="shiny-tag">✨</span>':''}${seen?getPokeName(roamingId):'???'}</div>
        <div style="color:var(--dim)">Nv.45</div>
        <div style="font-size:9px;margin-top:2px;color:var(--purple);font-weight:bold;">⚡ ${lang==='en'?'Roaming (1%)':'Errant (1%)'}</div>
      </div>`;
    }
    html+=`</div>`;
  }

  // Drop items preview
  const drops=ROUTE_DROPS[G.location];
  if(drops&&drops.length){
    html+=`<div style="margin-top:10px;font-size:12px;color:var(--dim)">${t('drop_items_lbl')}</div>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">`;
    for(const d of drops){
      const itm=ITEMS[d];
      html+=`<span style="background:var(--card);border-radius:4px;padding:2px 8px;font-size:11px;display:inline-flex;align-items:center;gap:4px">${itm?itemIcon(d,16):'?'} ${getItemName(d)}</span>`;
    }
    html+=`</div>`;
  }

  // Badges
  if(G.badges.length>0){
    html+=`<div style="margin-top:12px;font-size:12px;color:var(--dim)">Badges :</div>`;
    html+=`<div class="badge-row">`;
    const badgeList=['brock','misty','surge','erika','koga','blaine','giovanni','elite4'];
    for(const b of badgeList){
      const c=CHAMPIONS[b];
      const has=G.badges.includes(b);
      html+=`<div class="badge${has?' earned':''}" style="background:${has?'var(--card)':'#111'}" title="${c.badgeName}">${has?c.badgeEmoji:'⬛'}</div>`;
    }
    html+=`</div>`;
  }

  el.innerHTML=html;
}


function typeLabel(typ){
  return t('typ_' + typ) || typ;
}

// ============================================================
// EXPLORE (wild encounter — items & captures both happen via combat)
// ============================================================

