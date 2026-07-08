
// ===== extracted from src/scripts/gameplay/mine.js =====
function getMarketPokemon(){
  const obtainable=new Set();
  // Wild Pokémon
  for(const loc of Object.values(LOCS)){
    for(const w of (loc.wild||[])) obtainable.add(w[0]);
  }
  const evoMap={1:2,2:3,4:5,5:6,7:8,8:9,10:11,11:12,13:14,14:15,16:17,17:18,19:20,21:22,23:24,25:26,27:28,29:30,30:31,32:33,33:34,35:36,37:38,39:40,41:42,43:44,44:45,46:47,48:49,50:51,52:53,54:55,56:57,58:59,60:61,61:62,63:64,64:65,66:67,67:68,69:70,70:71,72:73,74:75,75:76,77:78,79:80,81:82,84:85,86:87,88:89,90:91,92:93,93:94,96:97,98:99,100:101,102:103,104:105,109:110,111:112,116:117,118:119,120:121,129:130,133:134,133:135,133:136,138:139,140:141,147:148,148:149};
  const stoneEvo={37:[38],58:[59],133:[134,135,136],61:[62],90:[91],120:[121],25:[26],44:[45],70:[71],102:[103],30:[31],33:[34],35:[36],39:[40]};

  const evolvedIds = new Set();
  Object.values(evoMap).forEach(id => evolvedIds.add(+id));
  Object.values(stoneEvo).forEach(arr => arr.forEach(id => evolvedIds.add(+id)));

  let changed=true;
  while(changed){
    changed=false;
    for(const [from,to] of Object.entries(evoMap)){
      if(obtainable.has(+from)&&!obtainable.has(+to)){
        obtainable.add(+to); changed=true;
      }
    }
    for(const [from,tos] of Object.entries(stoneEvo)){
      if(obtainable.has(+from)){
        for(const to of tos){
          if(!obtainable.has(+to)){ obtainable.add(+to); changed=true; }
        }
      }
    }
  }

  const market=[];
  for(let i=1;i<=151;i++){
    if([144,145,146,150,151].includes(i)) continue;
    if(!obtainable.has(i) && !evolvedIds.has(i)) market.push(i);
  }
  return market;
}
function getPokemonPrice(id){
  if(id===151) return 100000;
  if(id===150) return 75000;
  if([144,145,146].includes(id)) return 50000;
  const d=PD[id];
  if(!d) return 999999;
  const bst=d[3]+d[4]+d[5]+d[6];
  if([1,4,7].includes(id)) return 5000;
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
  const cats={starter:[],legendary:[],rare:[],other:[]};
  for(const id of ids){
    if([1,2,3,4,5,6,7,8,9].includes(id)) cats.starter.push(id);
    else if([144,145,146,150,151].includes(id)) continue;
    else if([138,139,140,141,142,147,148,149].includes(id)) cats.rare.push(id);
    else cats.other.push(id);
  }
  let html=`<div class="loc-title">${t('market_title')}</div>
  <div class="loc-sub" style="margin-bottom:10px">💰 ${isEn?'Your money':'Votre argent'} : <span style="color:var(--gold);font-weight:bold">${G.money.toLocaleString()}₽</span> · ${t('market_sub')}</div>`;
  const catLabels={starter:t('market_cat_starter'),legendary:t('market_cat_leg'),rare:t('market_cat_rare'),other:t('market_cat_other')};
  for(const cat of ['starter','legendary','rare','other']){
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
  if(G.money<price){notify('Pas assez d\'argent !','var(--red)');return;}
  if(speciesOwned(id)){notify('Vous possédez déjà cette espèce !','var(--red)');return;}
  G.money-=price;
  updateHeader();
  const d=PD[id];
  const isShiny = isSpeciesShiny(id);
  const p=createPoke(id,1,isShiny);
  if(!p){notify('Erreur lors de la création du Pokémon.','var(--red)');return;}
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

