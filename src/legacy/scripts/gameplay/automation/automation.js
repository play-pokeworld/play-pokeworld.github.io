function renderAutomationWindow(){
 const el = document.getElementById('automation-window-body');
 if(el) el.innerHTML = '';
}
const AUTOMATION_UPGRADE_COSTS = {autoHatch:1000000, autoSeedHatchery:1000000};
function isAutomationPurchased(key){
 if(!AUTOMATION_UPGRADE_COSTS[key]) return true;
 if(!G.automationUpgrades || typeof G.automationUpgrades !== 'object') G.automationUpgrades = {};
 if(G.automation && G.automation[key] === true && !G.automationUpgrades[key]) G.automationUpgrades[key] = true;
 return !!G.automationUpgrades[key];
}
function getAutomationUpgradeLabelSuffix(key){
 const cost = AUTOMATION_UPGRADE_COSTS[key] || 0;
 return (!isAutomationPurchased(key) && cost) ? ` · ${cost.toLocaleString()}₽` : '';
}
function purchaseAutomationIfNeeded(key){
 const cost = AUTOMATION_UPGRADE_COSTS[key] || 0;
 if(!cost || isAutomationPurchased(key)) return true;
 if(G.money < cost){ notify(tr('automation_upgrade_need_money', {price:cost.toLocaleString()}), 'var(--red)'); return false; }
 G.money -= cost;
 if(!G.automationUpgrades || typeof G.automationUpgrades !== 'object') G.automationUpgrades = {};
 G.automationUpgrades[key] = true;
 updateHeader();
 notify(tr('automation_upgrade_bought', {name:t('automation_'+key), price:cost.toLocaleString()}), 'var(--green)');
 return true;
}
function buyAutomationUpgrade(key){
 if(isAutomationPurchased(key)){ notify(t('automation_already_bought'), 'var(--green)'); return; }
 if(purchaseAutomationIfNeeded(key)){
  saveGame();
  try{ openHatcheryManagementMenu('automation'); }catch(_){}
 }
}
function toggleAutomationButton(key){
 if(!G.automation) G.automation = {};
 if(!isAutomationPurchased(key)){
  buyAutomationUpgrade(key);
  return;
 }
 toggleAutomation(key, !G.automation[key]);
 try{ openHatcheryManagementMenu('automation'); }catch(_){}
}
function toggleAutomation(key, val){
 if(!G.automation) G.automation = {};
 if(val && !purchaseAutomationIfNeeded(key)){
  G.automation[key] = false;
  try{ renderHatcheryWindow(); }catch(_){}
  return;
 }
 G.automation[key] = val;
 notify(` ${t('automation_'+key) || key} ${val ? (t("m.automation.2")) : (t("m.automation.1"))}`, val ? 'var(--green)' : 'var(--light1)');
 saveGame();
 if(key === 'autoSeedHatchery' && val){
   try {
     if(typeof processHatcheryQueue === 'function') processHatcheryQueue();
     if(typeof renderHatcheryWindow === 'function') renderHatcheryWindow();
     if(typeof renderTeamWindow === 'function') renderTeamWindow();
     if(typeof updateHeader === 'function') updateHeader();
   } catch(e){ console.error(e); }
 }
}


const STAFF_DEFS = [
 {id:'manager_daisy', type:'hatchery', loc:'cerulean', cost:1200000, bonus:'hatchery_speed', perLevel:0.006, maxLevel:20},
 {id:'manager_celadon', type:'hatchery', loc:'celadon', cost:2200000, bonus:'hatchery_queue', perLevel:0.004, maxLevel:20},
 {id:'manager_saffron', type:'hatchery', loc:'saffron', cost:3200000, bonus:'hatchery_speed', perLevel:0.005, maxLevel:20},
 {id:'manager_cinnabar', type:'hatchery', loc:'cinnabar', cost:4200000, bonus:'hatchery_queue', perLevel:0.005, maxLevel:20},
 {id:'manager_goldenrod', type:'hatchery', loc:'goldenrod', cost:5200000, bonus:'hatchery_speed', perLevel:0.004, maxLevel:25},
 {id:'trainer_vermilion', type:'training', loc:'vermilion', cost:1200000, bonus:'training_ease', perLevel:0.005, maxLevel:20},
 {id:'trainer_saffron', type:'training', loc:'saffron', cost:2500000, bonus:'training_mastery', perLevel:0.004, maxLevel:20},
 {id:'trainer_fuchsia', type:'training', loc:'fuchsia', cost:3400000, bonus:'training_ease', perLevel:0.004, maxLevel:20},
 {id:'trainer_indigo', type:'training', loc:'indigo', cost:5000000, bonus:'training_mastery', perLevel:0.005, maxLevel:25},
 {id:'trainer_blackthorn', type:'training', loc:'blackthorn', cost:6500000, bonus:'training_ease', perLevel:0.004, maxLevel:25},
 {id:'miner_pewter', type:'mine', loc:'pewter', cost:1200000, bonus:'mine_efficiency', perLevel:0.005, maxLevel:20},
 {id:'miner_cerulean', type:'mine', loc:'cerulean', cost:2000000, bonus:'mine_efficiency', perLevel:0.004, maxLevel:20},
 {id:'miner_cinnabar', type:'mine', loc:'cinnabar', cost:2600000, bonus:'mine_energy', perLevel:0.004, maxLevel:20},
 {id:'miner_mahogany', type:'mine', loc:'mahogany', cost:4200000, bonus:'mine_efficiency', perLevel:0.004, maxLevel:25},
 {id:'miner_blackthorn', type:'mine', loc:'blackthorn', cost:6000000, bonus:'mine_energy', perLevel:0.005, maxLevel:25}
];
function ensureStaffState(){
 if(!G.staff || typeof G.staff !== 'object') G.staff = {};
 if(!G.staff.owned || typeof G.staff.owned !== 'object') G.staff.owned = {};
 if(!G.staff.active || typeof G.staff.active !== 'object') G.staff.active = {hatchery:[], training:[], mine:[]};
 if(!Array.isArray(G.staff.active.hatchery)) G.staff.active.hatchery = [];
 if(!Array.isArray(G.staff.active.training)) G.staff.active.training = [];
 if(!Array.isArray(G.staff.active.mine)) G.staff.active.mine = [];
 if(!G.staff.xp || typeof G.staff.xp !== 'object') G.staff.xp = {};
 if(!G.staff.level || typeof G.staff.level !== 'object') G.staff.level = {};
 if(!G.staff.maxActive || typeof G.staff.maxActive !== 'object') G.staff.maxActive = {hatchery:1, training:1, mine:1};
 if(!G.staff.maxActive.hatchery) G.staff.maxActive.hatchery = 1;
 if(!G.staff.maxActive.training) G.staff.maxActive.training = 1;
 if(!G.staff.maxActive.mine) G.staff.maxActive.mine = 1;
 return G.staff;
}
function getStaffDef(id){ return STAFF_DEFS.find(s => s.id === id) || null; }
function getStaffName(id){ return t('staff_name_'+id) || id; }
function getStaffDesc(id){ return t('staff_desc_'+id) || ''; }
function staffLevel(id){ ensureStaffState(); return clamp(G.staff.level[id] || 1, 1, (getStaffDef(id)?.maxLevel || 20)); }
function staffXpNeed(id){ return 8 + (staffLevel(id) * 4); }
function canAccessStaffLocation(def){
 if(!def || !def.loc) return true;
 if(G.location === def.loc) return true;
 if(G.visitedMaps && G.visitedMaps[def.loc]) return true;
 const loc = (typeof getLocObj === 'function') ? getLocObj(def.loc) : null;
 if(!loc) return false;
 const have = (typeof regionBadgeCount === 'function') ? regionBadgeCount(typeof regionOfLoc === 'function' ? regionOfLoc(def.loc) : (G.region||'kanto')) : (G.badges||[]).length;
 return (loc.badgeReq || 0) <= have;
}
function buyStaff(id){
 ensureStaffState();
 const def = getStaffDef(id);
 if(!def) return;
 if(G.staff.owned[id]){ notify(t('staff_already_owned'), 'var(--green)'); return; }
 if(!canAccessStaffLocation(def)){ notify(tr('staff_location_locked', {loc:getLocName(def.loc)}), 'var(--red)'); return; }
 if(G.money < def.cost){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= def.cost;
 G.staff.owned[id] = true;
 G.staff.level[id] = 1;
 G.staff.xp[id] = 0;
 updateHeader();
 saveGame();
 notify(tr('staff_hired', {name:getStaffName(id)}), 'var(--green)');
 try{ refreshStaffManagement(def.type); }catch(_){}
}
function toggleStaff(id){
 ensureStaffState();
 const def = getStaffDef(id);
 if(!def || !G.staff.owned[id]) return;
 const arr = G.staff.active[def.type] || [];
 if(arr.includes(id)){
  G.staff.active[def.type] = arr.filter(x=>x!==id);
 } else {
  const max = G.staff.maxActive[def.type] || 1;
  if(arr.length >= max){ notify(tr('staff_active_limit', {count:max}), 'var(--red)'); return; }
  arr.push(id);
  G.staff.active[def.type] = arr;
 }
 saveGame();
 try{ refreshStaffManagement(def.type); }catch(_){}
}
function addStaffXp(type, amount=1){
 ensureStaffState();
 const arr = G.staff.active[type] || [];
 for(const id of arr){
  const def = getStaffDef(id);
  if(!def) continue;
  const max = def.maxLevel || 20;
  G.staff.level[id] = staffLevel(id);
  if(G.staff.level[id] >= max) continue;
  G.staff.xp[id] = (G.staff.xp[id] || 0) + amount;
  while(G.staff.level[id] < max && G.staff.xp[id] >= staffXpNeed(id)){
   G.staff.xp[id] -= staffXpNeed(id);
   G.staff.level[id]++;
   notify(tr('staff_level_up', {name:getStaffName(id), level:G.staff.level[id]}), 'var(--green)');
  }
 }
 saveGame();
}
function getStaffBonus(type, bonus){
 ensureStaffState();
 let total = 0;
 for(const id of (G.staff.active[type] || [])){
  const def = getStaffDef(id);
  if(def && def.bonus === bonus) total += (staffLevel(id) - 1) * (def.perLevel || 0);
 }
 return Math.min(0.35, total);
}
function staffBonusHtml(def){
 const lvl = staffLevel(def.id);
 const cur = Math.round(Math.max(0, (lvl - 1) * (def.perLevel || 0)) * 1000) / 10;
 const next = Math.round((lvl * (def.perLevel || 0)) * 1000) / 10;
 return `<div class="staff-bonus"><b>${t('staff_bonus')}</b> ${t('staff_bonus_'+def.bonus)} : ${cur}%${lvl < (def.maxLevel||20) ? ` → ${next}%` : ''}</div>`;
}
function refreshStaffManagement(type){
 if(type === 'hatchery' && typeof openHatcheryManagementMenu === 'function') openHatcheryManagementMenu('trainers');
 else if(type === 'training' && typeof openTrainingManagementMenu === 'function') openTrainingManagementMenu('trainers');
 else if(type === 'mine' && typeof openMineManagementMenu === 'function') openMineManagementMenu('miners');
}
function renderStaffList(type){
 ensureStaffState();
 const defs = STAFF_DEFS.filter(s => s.type === type);
 const max = G.staff.maxActive[type] || 1;
 const active = G.staff.active[type] || [];
 let html = `<div class="staff-summary"><b>${t('staff_active')}</b> ${active.length}/${max}</div>`;
 html += `<div class="staff-list staff-card-grid">`;
 html += defs.map(def=>{
  const owned = !!G.staff.owned[def.id];
  const isActive = active.includes(def.id);
  const lvl = staffLevel(def.id);
  const xp = G.staff.xp[def.id] || 0;
  const need = staffXpNeed(def.id);
  const pct = Math.max(0, Math.min(100, Math.floor((xp / Math.max(1, need)) * 100)));
  const unlocked = canAccessStaffLocation(def);
  const activeAttrs = owned ? `data-action="legacy-call" data-call="toggleStaff" data-call-args="'${def.id}'"` : '';
  return `<div class="staff-card ${owned?'is-owned':'is-unowned'} ${isActive?'is-active':''}" ${activeAttrs}>
   <div class="staff-card-sprite">${typeof staffSpriteImg === 'function' ? staffSpriteImg(def.id, 48) : '<span>👤</span>'}</div>
   <div class="staff-card-head"><b>${getStaffName(def.id)}</b><span>${getLocName(def.loc)}</span></div>
   <div class="staff-card-desc">${getStaffDesc(def.id)}</div>
   ${owned?`${staffBonusHtml(def)}<div class="staff-xp"><div class="staff-xp-label">${tr('staff_xp_bar', {xp:xp, need:need})}</div><div class="staff-xp-bar"><div data-pct="${pct}"></div></div></div><div class="staff-level-pill">${tr('staff_level_short', {level:lvl})}</div>`:''}
   ${owned?'':`<button class="hbtn automation-buy-btn" ${unlocked?`data-action="legacy-call" data-call="buyStaff" data-call-args="'${def.id}'"`:'disabled'}>${unlocked?tr('staff_hire_price', {price:def.cost.toLocaleString()}):tr('staff_unlock_at', {loc:getLocName(def.loc)})}</button>`}
  </div>`;
 }).join('');
 html += `</div>`;
 return html;
}

if (typeof ensureStaffState !== 'undefined' && typeof window !== 'undefined') window.ensureStaffState = ensureStaffState;
if (typeof buyStaff !== 'undefined' && typeof window !== 'undefined') window.buyStaff = buyStaff;
if (typeof toggleStaff !== 'undefined' && typeof window !== 'undefined') window.toggleStaff = toggleStaff;
if (typeof addStaffXp !== 'undefined' && typeof window !== 'undefined') window.addStaffXp = addStaffXp;
if (typeof getStaffBonus !== 'undefined' && typeof window !== 'undefined') window.getStaffBonus = getStaffBonus;
if (typeof renderStaffList !== 'undefined' && typeof window !== 'undefined') window.renderStaffList = renderStaffList;
if (typeof refreshStaffManagement !== 'undefined' && typeof window !== 'undefined') window.refreshStaffManagement = refreshStaffManagement;



// --- Migrated to ES module, globals exposed ---
if (typeof renderAutomationWindow !== 'undefined' && typeof window !== 'undefined') window.renderAutomationWindow = renderAutomationWindow;
if (typeof isAutomationPurchased !== 'undefined' && typeof window !== 'undefined') window.isAutomationPurchased = isAutomationPurchased;
if (typeof buyAutomationUpgrade !== 'undefined' && typeof window !== 'undefined') window.buyAutomationUpgrade = buyAutomationUpgrade;
if (typeof toggleAutomationButton !== 'undefined' && typeof window !== 'undefined') window.toggleAutomationButton = toggleAutomationButton;
if (typeof getAutomationUpgradeLabelSuffix !== 'undefined' && typeof window !== 'undefined') window.getAutomationUpgradeLabelSuffix = getAutomationUpgradeLabelSuffix;
if (typeof toggleAutomation !== 'undefined' && typeof window !== 'undefined') window.toggleAutomation = toggleAutomation;


