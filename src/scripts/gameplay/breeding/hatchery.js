
// ===== extracted from src/scripts/gameplay/battle.js =====
function renderHatcheryWindow(){
  const el = document.getElementById('hatchery-window-body');
  if(!el) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const unlocked = G.badges.includes('misty') || G.badges.length >= 2;
  if(!unlocked){
    el.innerHTML = `<div style="text-align:center;padding:14px;color:var(--dim);font-size:11px;">
      <div style="font-size:24px;margin-bottom:4px;">🔒</div>
      <b>${lang==='en'?'Hatchery Locked':'Pension & Couveuse verrouillées'}</b><br>
      ${lang==='en'?'Defeat Misty in Cerulean City (2 Badges) to unlock the Route 5 Hatchery!':'Battez Ondine à Azuria (2 Badges) pour débloquer la pension de la Route 5 !'}
    </div>`;
    return;
  }
  const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
  if(!G.hatchery) G.hatchery = [null];
  while(G.hatchery.length < maxSlots) G.hatchery.push(null);

  let html = `<div style="display:flex;flex-direction:column;gap:6px;">`;
  for(let i=0; i<maxSlots; i++){
    const slot = G.hatchery[i];
    if(!slot){
      html += `<button class="hbtn" style="width:100%;padding:10px;background:rgba(30,136,229,0.18);border:1px dashed var(--blue);color:#fff;font-weight:bold;font-size:12px;" onclick="openUnifiedSelectorModal('hatchery')">➕ ${lang==='en'?`Slot #${i+1}: Place Pokémon`:`Slot #${i+1} : Déposer un Pokémon`}</button>`;
    } else {
      const p = slot.poke;
      const steps = slot.steps || 0;
      const req = slot.stepsReq || 10;
      const done = steps >= req;
      const pct = clamp(Math.floor((steps / req) * 100), 0, 100);
      html += `<div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.25);padding:8px;border-radius:8px;border:1px solid ${done?'var(--green)':'#5a504a'};">
        <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:6px;cursor:pointer;" onclick="openUnifiedSelectorModal('box_view')">
          ${spriteImg(p.id, p.emoji, {size:42, shiny:p.shinyActive})}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:bold;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🥚 ${getPokeName(p.id)} <span style="font-size:10px;color:var(--dim)">Slot #${i+1}</span></div>
          <div style="font-size:10px;color:var(--dim);margin:4px 0;">${done ? (lang==='en'?'Ready to hatch!':'Prêt à éclore !') : (lang==='en'?`Incubating: ${steps} / ${req} KOs`:`Incubation : ${steps} / ${req} KO`)}</div>
          <div style="height:6px;background:#221e1c;border-radius:3px;overflow:hidden;border:1px solid #111;">
            <div style="width:${pct}%;background:${done?'var(--green)':'var(--blue)'};height:100%;transition:0.3s;"></div>
          </div>
        </div>
        ${done ? `<button class="hbtn" style="padding:6px 10px;background:var(--green);color:#fff;font-weight:bold;font-size:11px;" onclick="hatchEgg(${i})">🌟 Éclore</button>` : ''}
      </div>`;
    }
  }
  if(maxSlots < 4){
    const upgradeCost = maxSlots * 15000;
    html += `<button class="hbtn" style="width:100%;margin-top:4px;padding:7px;background:#2a2012;border:1px solid var(--gold);color:var(--gold);font-size:11px;font-weight:bold;" onclick="upgradeHatcherySlots(${upgradeCost})">⬆️ ${lang==='en'?`Upgrade Daycare: +1 Egg Slot (${upgradeCost.toLocaleString()}₽)`:`Améliorer Pension : +1 Slot (${upgradeCost.toLocaleString()}₽)`}</button>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}
function upgradeHatcherySlots(cost){
  if(G.money < cost){
    notify("Pas assez d'argent !", "var(--red)");
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
  const p = slot.poke;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(!p.ivs) p.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
  const keys = ['hp','atk','def','spa','spd','spe'];
  const avail = keys.filter(k => (p.ivs[k]||0) < 6);
  let ivMsg = '';
  if(avail.length > 0){
    const picked = avail[rand(0, avail.length - 1)];
    p.ivs[picked] = (p.ivs[picked]||0) + 1;
    ivMsg = ` (+1 IV ${picked.toUpperCase()})`;
  } else {
    G.money += 5000;
    ivMsg = ` (+5 000₽ bonus IV max)`;
  }
  const wasShiny = rollShiny();
  if(wasShiny){
    p.shinyUnlocked = true; p.shinyActive = true; p.shiny = true;
    unlockShinyForSpecies(p.id);
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
  if(wasShiny){
    notify(lang==='en' ? `✨ SHINY HATCH! ${p.name} hatched as Shiny ✨!` : `✨ ÉCLOSION SHINY ! ${p.name} est né Shiny ✨ !`, "var(--yellow)");
  } else {
    notify(lang==='en' ? `🌟 ${p.name} hatched at Lv.1${ivMsg}!` : `🌟 ${p.name} éclot Nv.1${ivMsg} !`, "var(--green)");
  }
}

