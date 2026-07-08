
// ===== extracted from src/scripts/gameplay/world.js =====
function itemEquippedOnTeam(key){
  return G.team.find(p=>p.heldItem===key)||null;
}
function getHeldBuff(p){
  const out={atk:0,def:0,spe:0,hpMax:0};
  if(!p||!p.heldItem) return out;
  const itm=ITEMS[p.heldItem];
  if(!itm||!itm.buff) return out;
  const count=Math.min(BAG_MAX, G.inventory[p.heldItem]||0);
  const ratio=count/BAG_MAX;
  for(const k of Object.keys(itm.buff)) out[k]=itm.buff[k]*ratio;
  return out;
}
function buffedStat(p, stat){
  const b=getHeldBuff(p);
  if(stat==='hpMax') return Math.floor(p.maxHP*(1+b.hpMax));
  return Math.floor(p[stat]*(1+(b[stat]||0)));
}
function equipItemOn(teamIdx, key){
  const p=G.team[teamIdx];
  if(!p) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!ITEMS[key]||!ITEMS[key].buff){ setMsg(lang==='en' ? "This item cannot be equipped." : "Cet objet n'est pas équipable."); return; }
  if(!(G.inventory[key]>0)){ setMsg(lang==='en' ? "You don't have this item." : "Vous n'avez pas cet objet."); return; }
  const other=itemEquippedOnTeam(key);
  if(other && other!==p){
    setMsg(lang==='en' ? `❌ ${getItemName(key)} is already equipped on ${other.name}.` : `❌ ${getItemName(key)} est déjà équipé sur ${other.name}.`);
    return;
  }
  p.heldItem=key;
  notify(lang==='en' ? `🎒 ${p.name} is now holding ${getItemName(key)}!` : `🎒 ${p.name} tient ${getItemName(key)} !`);
  saveGame();
  showTab('inventory');
}
function unequipItem(teamIdx){
  const p=G.team[teamIdx];
  if(!p||!p.heldItem) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const nm=getItemName(p.heldItem)||p.heldItem;
  p.heldItem=null;
  notify(lang==='en' ? `${p.name} is no longer holding ${nm}.` : `${p.name} ne tient plus ${nm}.`);
  saveGame();
  showTab('inventory');
}
function changePokeTalent(teamIdx, boxId, newTal){
  if(!newTal) return;
  let p = null;
  if(boxId && boxId !== 'undefined' && boxId !== 'null'){
    p = G.collection[boxId] || G.collection[String(boxId)];
  } else if(teamIdx !== null && teamIdx !== undefined && teamIdx >= 0){
    p = G.team[teamIdx];
  }
  if(!p) return;
  p.talent = newTal;
  saveGame();
  const lang = G.lang || 'fr';
  notify(lang === 'en' ? `🧬 ${p.name}'s talent changed to ${getTalentName(newTal)}!` : `🧬 Talent de ${p.name} changé pour ${getTalentName(newTal)} !`, 'var(--purple)');
  if(boxId && boxId !== 'undefined' && boxId !== 'null') openBoxPokeModal(boxId);
  else openPokeModal(teamIdx);
}

