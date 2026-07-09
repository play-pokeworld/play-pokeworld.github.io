// ============================================================
// HATCHERY — (split from hatchery.js)
// ============================================================
const FOSSIL_REVIVE_MAP = {
  fossil: 138,
  helix_fossil: 138,
  dome_fossil: 140,
  old_amber: 142,
  root_fossil: 138,
  claw_fossil: 140
};

function upgradeHatcherySlots(cost){
  if(G.money < cost){
    notify(t("n.pas_assez_dargent"), "var(--red)");
    return;
  }
  G.money -= cost;
  G.hatcheryMaxSlots = (G.hatcheryMaxSlots || 1) + 1;
  updateHeader();
  renderHatcheryWindow();
  notify(`🎉 Pension améliorée ! Vous avez maintenant ${G.hatcheryMaxSlots} slots d'œufs !`, "var(--green)");
}

function hatchEgg(slotIdx=0){
  if(!G.hatchery || !G.hatchery[slotIdx]) return;
  const slot = G.hatchery[slotIdx];
  if(slot.steps < slot.stepsReq) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';

  // Determine the resulting pokemon: either the deposited pokemon (egg)
  // or a newly-created pokemon from a fossil revive.
  let p;
  if(slot.isFossil){
    // Fossil revival: create a brand-new Lv.1 Pokemon from the fossil's reviveId
    const isShiny = rollShiny();
    p = createPoke(slot.reviveId, 1, isShiny);
    if(!p){ return; }
    G.pokedex[slot.reviveId] = {...(G.pokedex[slot.reviveId]||{}), seen:true, caught:true};
    if(isShiny){ p.shinyUnlocked=true; p.shinyActive=true; p.shiny=true; unlockShinyForSpecies(slot.reviveId); }
  } else {
    p = slot.poke;
  }

  if(!p.ivs) p.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const keys = ['hp','atk','def','spa','spd','spe'];
  const avail = keys.filter(k => (p.ivs[k]||0) < 6);
  let ivMsg = '';
  if(avail.length > 0){
    const picked = avail[rand(0, avail.length - 1)];
    p.ivs[picked] = (p.ivs[picked]||0) + 1;
    ivMsg = (isEn ? ` (+1 IV ${picked.toUpperCase()})` : ` (+1 IV ${picked.toUpperCase()})`);
  } else {
    G.money += 5000;
    ivMsg = (isEn ? ' (+5,000 bonus)' : ' (+5 000₽ bonus IV max)');
  }
  if(!slot.isFossil){
    const wasShiny = rollShiny();
    if(wasShiny){
      p.shinyUnlocked = true; p.shinyActive = true; p.shiny = true;
      unlockShinyForSpecies(p.id);
    }
  }
  p.level = 1;
  p.xp = xpForLevel(1);
  p.xpNext = xpForLevel(2);
  recalcPokeStats(p);
  p.currentHP = p.maxHP;
  // Authentic PokéClicker: Hatched Pokémon return to the PC Box so active combat teams are never disturbed!
  G.collection[String(p.id)] = p;
  G.hatchery[slotIdx] = null;
  
  if(G.automation && G.automation.autoSeedHatchery){
    const boxKeys = Object.keys(G.collection||{});
    const candKey = boxKeys.find(k => G.collection[k] && G.collection[k].uid !== p.uid);
    if(candKey){
      const cand = G.collection[candKey];
      if(cand){
        G.hatchery[slotIdx] = { poke: cand, steps: 0, stepsReq: clamp(Math.floor((cand.level||1)*1.2)+8, 10, 50) };
        delete G.collection[candKey];
      }
    }
  }

  updateHeader();
  renderTeamWindow();
  renderHatcheryWindow();
  const prefix = slot.isFossil ? '🧬' : '🎉';
  if((slot.isFossil && (p.shinyUnlocked||p.shinyActive||p.shiny)) || (!slot.isFossil && rollShiny())){
    notify(tr("m.hatchery.2", {p0:p.name}), "var(--yellow)");
  } else {
    notify(tr("m.hatchery.1", {p0:p.name, p1:ivMsg}), "var(--green)");
  }
}

// ============================================================
// FOSSIL LAB - Système PokéClicker

function getFossilInventory(){
  const inv = G.inventory || {};
  const list = [];
  for(const key in FOSSIL_REVIVE_MAP){
    const qty = inv[key] || 0;
    if(qty > 0){
      list.push({key, qty, reviveId: FOSSIL_REVIVE_MAP[key]});
    }
  }
  return list;
}

function reviveFossil(fossilKey){
  const lang = (G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';
  const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
  if(invQty < 1){
    notify(isEn ? 'No fossil left!' : 'Plus de fossile !','var(--red)');
    return;
  }
  const pokeId = FOSSIL_REVIVE_MAP[fossilKey];
  if(!pokeId){
    notify(isEn ? 'Unknown fossil.' : 'Fossile inconnu.','var(--red)');
    return;
  }
  // consume 1
  G.inventory[fossilKey]--;
  if(G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];

  const isShiny = rollShiny();
  const p = createPoke(pokeId, 1, isShiny);
  if(!p){
    notify(t("n.erreur_revival"),'var(--red)');
    return;
  }
  // add to team or box
  if(G.team.length < 6){
    G.team.push(p);
    notify((isEn ? `🧬 ${p.name} revived! Joined your party!` : `🧬 ${p.name} ranimé ! Il rejoint votre équipe !`), isShiny ? 'var(--yellow)' : 'var(--green)');
  } else {
    G.collection[pokeId] = p;
    notify((isEn ? `🧬 ${p.name} revived! Sent to PC Box.` : `🧬 ${p.name} ranimé ! Envoyé au PC.`), isShiny ? 'var(--yellow)' : 'var(--green)');
  }
  G.pokedex[pokeId] = {...(G.pokedex[pokeId]||{}), seen:true, caught:true};
  if(isShiny) G.pokedex[pokeId].shiny = true;
  saveGame();
  updateHeader();
  renderTeamWindow();
  // refresh fossil lab if open
  const el = document.getElementById('tab-content');
  if(el && _activeTab === 'fossil') renderFossilLab(el);
}

// Compact wrapper for hatchery window

