// ===== extracted from src/scripts/gameplay/mine.js =====
const MARKET_STOCK = {
  kanto: [
    // Starters Kanto - base only, non-wild
    1,4,7,
    // Cadeaux / rares Kanto - pas d'évolutions, pas de sauvage
    133, // Evoli
    137, // Porygon
    138, // Amonita (fossile - aussi trouvable en mine)
    140, // Kabuto (fossile)
    142, // Ptera
    106, // Kicklee
    107, // Tygnon
    122  // M.Mime
  ],
  johto: [
    // Starters Johto
    152,155,158,
    // Bébés / rares Johto - formes de base uniquement, non sauvages dans le jeu
    175, // Togepi
    236, // Debugant
    179, // Wattouat
    183, // Marill
    187, // Granivol
    190, // Capumain
    194, // Axoloto
    209, // Snubbull
    216, // Teddiursa
    228, // Malosse
    231  // Phanpy
  ]
};

function getMarketPokemon(){
  if(typeof G === 'undefined' || !G) return [];
  const region = (G.region || 'kanto');
  // Stock curaté, drastiquement réduit, conforme aux jeux officiels.
  // - Aucune évolution si la pré-évo est capturable / achetable
  // - Aucun Pokémon disponible sauvagement sur une route
  let stock = (region === 'johto') ? MARKET_STOCK.johto.slice() : MARKET_STOCK.kanto.slice();

  // Sécurité : filtrer tout ce qui serait sauvage dans la région courante
  // (au cas où la distribution sauvage évolue)
  try {
    const locs = (region === 'johto')
      ? (typeof LOCS_JOHTO !== 'undefined' ? LOCS_JOHTO : LOCS)
      : LOCS;
    const wildSet = new Set();
    for(const loc of Object.values(locs)){
      for(const w of (loc.wild || [])) wildSet.add(+w[0]);
    }
    stock = stock.filter(id => !wildSet.has(id));
  } catch(e){}

  // Sécurité : retirer les évolutions dont la base est elle-même au marché
  // ou capturable (on garde uniquement des formes de base / mono-stade)
  const evoTargets = new Set();
  if(typeof LEVEL_EVO_MAP !== 'undefined'){
    for(const t of Object.values(LEVEL_EVO_MAP)) evoTargets.add(+t);
  }
  if(typeof STONE_EVO !== 'undefined'){
    for(const k in STONE_EVO){
      for(const t of Object.values(STONE_EVO[k])) evoTargets.add(+t);
    }
  }
  // Autoriser quelques mono-stades qui apparaissent techniquement comme cibles
  // (ex: Porygon -> Porygon2 est géré par objet, mais Porygon reste vendable)
  const allowList = new Set([137,133]); // Porygon, Evoli : base vendable malgré évo pierre
  stock = stock.filter(id => !evoTargets.has(id) || allowList.has(id));

  // Retirer les légendaires / fabuleux
  const banned = (region === 'johto')
    ? [243,244,245,249,250,251]
    : [144,145,146,150,151];
  stock = stock.filter(id => !banned.includes(id));

  return stock;
}
function getPokemonPrice(id){
  if(id===151) return 100000;
  if(id===150) return 75000;
  if([144,145,146].includes(id)) return 50000;
  const d=PD[id];
  if(!d) return 999999;
  const bst=d[3]+d[4]+d[5]+d[6];
  if([1,4,7].includes(id)) return 5000;
  if([152,155,158].includes(id)) return 5000;
  if([2,5,8].includes(id)) return 8000;
  if([3,6,9].includes(id)) return 12000;
  if([138,140].includes(id)) return 8000;
  if([139,141].includes(id)) return 12000;
  if([142].includes(id)) return 15000;
  if([147].includes(id)) return 10000;
  if([148].includes(id)) return 15000;
  if([149].includes(id)) return 25000;
  let mult=12;
  if(bst>=350) mult=22;
  else if(bst>=300) mult=18;
  else if(bst>=250) mult=15;
  else if(bst>=200) mult=13;
  return Math.max(1500, Math.floor(bst*mult));
}
function renderMarket(el){
  const ids=getMarketPokemon();
  const isEn = (typeof G !== 'undefined' && G && G.lang === 'en');
  if(!ids.length){
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim)">${t('market_empty')}</div>`;
    return;
  }
  const cats={starter:[],fossil:[],rare:[],other:[]};
  for(const id of ids){
    if([1,4,7,152,155,158].includes(id)) cats.starter.push(id);
    else if([138,139,140,141,142].includes(id)) cats.fossil.push(id);
    else if([133,137,106,107,122,175,236].includes(id)) cats.rare.push(id);
    else cats.other.push(id);
  }
  let html=`<div class="loc-title">${t('market_title')}</div>
  <div class="loc-sub" style="margin-bottom:10px">💰 ${isEn?'Your money':'Votre argent'} : <span style="color:var(--gold);font-weight:bold">${G.money.toLocaleString()}₽</span> · ${t('market_sub')}</div>`;
  const catLabels={starter:t('market_cat_starter'),fossil:t('market_cat_fossil')||'🦴 Fossiles',rare:t('market_cat_rare'),other:t('market_cat_other')};
  for(const cat of ['starter','fossil','rare','other']){
    if(!cats[cat].length) continue;
    html+=`<div class="market-category">${catLabels[cat]}</div>`;
    html+=cats[cat].map(id=>{
      const d=PD[id];
      const price=getPokemonPrice(id);
      const owned=speciesOwned(id);
      const seen=G.pokedex[id]?.seen;
      return `<div class="shop-item${owned?' market-owned':''}">
        <div style="font-size:28px;width:44px;text-align:center">${seen?spriteImg(id,'',{size:40}):'❓'}</div>
        <div style="flex:1">
          <div style="font-weight:bold;font-size:13px">${seen?getPokeName(id):'???'} <span style="color:var(--dim);font-size:11px">#${id}</span></div>
          <div style="font-size:10px;color:var(--dim)">${typeSpan(d[1])}${d[2]?typeSpan(d[2]):''} · BST ${d[3]+d[4]+d[5]+d[6]}</div>
          ${owned?`<div style="font-size:11px;color:var(--green)">${t('market_owned')}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <div style="color:var(--gold);font-weight:bold">${price.toLocaleString()}₽</div>
          <button class="shop-buy-btn" onclick="buyPokemon(${id})" ${(G.money<price||owned)?'disabled':''}>${owned?t('owned_btn'):t('buy_btn')}</button>
        </div>
      </div>`;
    }).join('');
  }
  el.innerHTML=html;
}
function buyPokemon(id){
  const price=getPokemonPrice(id);
  if(G.money<price){notify(t("n.pas_assez_dargent"),'var(--red)');return;}
  if(speciesOwned(id)){notify(t("n.vous_possédez_déjà_cette_espèce"),'var(--red)');return;}
  G.money-=price;
  updateHeader();
  const d=PD[id];
  const isShiny = isSpeciesShiny(id);
  const p=createPoke(id,1,isShiny);
  if(!p){notify(t("n.erreur_lors_de_la_création_du_pokémon"),'var(--red)');return;}
  if(G.team.length<6){
    G.team.push(p);
    notify(`🎉 ${p.name} rejoint votre équipe ! (-${price.toLocaleString()}₽)`);
  }else{
    G.collection[id]=p;
    notify(`📦 ${p.name} est envoyé dans la boîte ! (-${price.toLocaleString()}₽)`);
  }
  G.pokedex[id]={...(G.pokedex[id]||{}),seen:true,caught:true};
  if(isShiny) G.pokedex[id].shiny=true;
  saveGame();
  renderMarket(document.getElementById('tab-content'));
  updateHeader();
}


