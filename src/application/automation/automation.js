// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
function renderAutomationWindow(){
 const el = document.getElementById('automation-window-body');
 if(el) el.replaceChildren();
}
export const AUTOMATION_UPGRADE_COSTS = {autoHatch:1000000, autoSeedHatchery:1000000};
// FIX (2026-08): hatchery-ui.js reads the automation costs from here.
if (typeof globalThis !== 'undefined') globalThis.AUTOMATION_UPGRADE_COSTS = AUTOMATION_UPGRADE_COSTS;
if (typeof globalThis !== 'undefined') globalThis.AUTOMATION_UPGRADE_COSTS = AUTOMATION_UPGRADE_COSTS;
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
 {id:'manager_daisy', type:'hatchery', loc:'cerulean', cost:1200000, bonus:'hatchery_speed', perLevel:0.01, maxLevel:100},
 {id:'manager_celadon', type:'hatchery', loc:'celadon', cost:2200000, bonus:'hatchery_cost', perLevel:0.005, maxLevel:100},
 {id:'manager_saffron', type:'hatchery', loc:'saffron', cost:3200000, bonus:'hatchery_shiny', perLevel:0.01, maxLevel:100},
 {id:'manager_cinnabar', type:'hatchery', loc:'cinnabar', cost:4200000, bonus:'hatchery_exp', perLevel:0.01, maxLevel:100},
 {id:'manager_goldenrod', type:'hatchery', loc:'goldenrod', cost:5200000, bonus:'hatchery_double_iv_level', perLevel:0.002, maxLevel:100},
 {id:'trainer_vermilion', type:'training', loc:'vermilion', cost:1200000, bonus:'training_exp', perLevel:0.01, maxLevel:100},
 {id:'trainer_saffron', type:'training', loc:'saffron', cost:2500000, bonus:'training_kill_reduction', perLevel:0.03, maxLevel:100},
 {id:'trainer_fuchsia', type:'training', loc:'fuchsia', cost:3400000, bonus:'training_cost', perLevel:0.005, maxLevel:100},
 {id:'trainer_indigo', type:'training', loc:'indigo', cost:5000000, bonus:'training_crit', perLevel:0.003, maxLevel:100},
 {id:'trainer_blackthorn', type:'training', loc:'blackthorn', cost:6500000, bonus:'training_drop', perLevel:0.002, maxLevel:100},
 {id:'miner_pewter', type:'mine', loc:'pewter', cost:1200000, bonus:'mine_energy_cost', perLevel:0.005, maxLevel:100},
 {id:'miner_cerulean', type:'mine', loc:'cerulean', cost:2000000, bonus:'mine_energy_regen', perLevel:0.01, maxLevel:100},
 {id:'miner_cinnabar', type:'mine', loc:'cinnabar', cost:2600000, bonus:'mine_value', perLevel:0.01, maxLevel:100},
 {id:'miner_mahogany', type:'mine', loc:'mahogany', cost:4200000, bonus:'mine_extra_items', perLevel:0.03, maxLevel:100},
 {id:'miner_blackthorn', type:'mine', loc:'blackthorn', cost:6000000, bonus:'mine_energy_max', perLevel:1, maxLevel:100}
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
function staffLevel(id){ ensureStaffState(); return clamp(G.staff.level[id] || 1, 1, (getStaffDef(id)?.maxLevel || 100)); }

// Exponential XP formula
function staffXpNeed(id){
 const lvl = staffLevel(id);
 return Math.floor(40 + 12 * lvl + 0.25 * (lvl * lvl));
}

// Sector-based discount and fee calculations
function getStaffSectorDiscount(type) {
 ensureStaffState();
 const staff = G.staff || {};
 const owned = staff.owned || {};
 const level = staff.level || {};
 
 const defs = STAFF_DEFS.filter(s => s.type === type);
 let sum = 0;
 for(const def of defs){
  if(owned[def.id]) {
   sum += clamp(level[def.id] || 1, 1, 100);
  }
 }
 const maxPossible = defs.length * 100; // 500
 return sum / maxPossible;
}

function getStaffSectorLevelsCombined(type) {
 ensureStaffState();
 const staff = G.staff || {};
 const owned = staff.owned || {};
 const level = staff.level || {};
 
 const defs = STAFF_DEFS.filter(s => s.type === type);
 let sum = 0;
 for(const def of defs){
  if(owned[def.id]) sum += clamp(level[def.id] || 1, 1, 100);
 }
 return sum;
}

function getHatcheryAutomationFee() {
 if(!G.automation || !G.automation.autoHatch) return 0;
 const baseFee = 1000; // 1000₽ per hatch base
 const discount = getStaffSectorDiscount('hatchery');
 return Math.max(0, Math.ceil(baseFee * (1 - discount)));
}

function getTrainingAutomationFee() {
 if(!G.trainingAutomation || !G.trainingAutomation.slots || !G.trainingAutomation.slots.some(s => s && s.enabled)) return 0;
 const baseFee = 500; // 500₽ per battle base
 const discount = getStaffSectorDiscount('training');
 return Math.max(0, Math.ceil(baseFee * (1 - discount)));
}

function getHatcheryLevelUpFee() {
 if(!G.automation || (!G.automation.autoHatch && !G.automation.autoSeedHatchery)) return 0;
 const baseFee = 100; // 100₽ per level
 const discount = getStaffSectorDiscount('hatchery');
 return Math.max(0, Math.ceil(baseFee * (1 - discount)));
}

function getMineAutomationFee() {
 if(!G.mine || !G.mine.automation || !G.mine.automation.enabled) return 0;
 const baseFee = 500; // 500₽ per tile
 const discount = getStaffSectorDiscount('mine');
 return Math.max(0, Math.ceil(baseFee * (1 - discount)));
}

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
  const max = def.maxLevel || 100;
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
 return Math.min(0.85, total);
}
function staffBonusHtml(def){
 const lvl = staffLevel(def.id);
 if(def.bonus === 'training_kill_reduction') {
   const cur = Math.round(3 * (lvl - 1) / 99 * 10) / 10;
   const next = Math.round(3 * lvl / 99 * 10) / 10;
   return `<div class="staff-bonus"><b>${t('staff_bonus')}</b> ${t('staff_bonus_'+def.bonus)} : -${cur} K.O.${lvl < (def.maxLevel||100) ? ` → -${next} K.O.` : ''}</div>`;
 }
 if(def.bonus === 'mine_extra_items') {
   const cur = Math.floor(3 * (lvl - 1) / 99);
   const next = Math.floor(3 * lvl / 99);
   return `<div class="staff-bonus"><b>${t('staff_bonus')}</b> ${t('staff_bonus_'+def.bonus)} : +${cur} obj.${lvl < (def.maxLevel||100) ? ` → +${next} obj.` : ''}</div>`;
 }
 if(def.bonus === 'mine_energy_max') {
   const cur = (lvl - 1) * (def.perLevel || 1);
   const next = lvl * (def.perLevel || 1);
   return `<div class="staff-bonus"><b>${t('staff_bonus')}</b> ${t('staff_bonus_'+def.bonus)} : +${cur} pt${lvl < (def.maxLevel||100) ? ` → +${next} pt` : ''}</div>`;
 }
 const cur = Math.round(Math.max(0, (lvl - 1) * (def.perLevel || 0)) * 1000) / 10;
 const next = Math.round((lvl * (def.perLevel || 0)) * 1000) / 10;
 return `<div class="staff-bonus"><b>${t('staff_bonus')}</b> ${t('staff_bonus_'+def.bonus)} : ${cur}%${lvl < (def.maxLevel||100) ? ` → ${next}%` : ''}</div>`;
}
function refreshStaffManagement(type){
 if(type === 'hatchery' && typeof openHatcheryManagementMenu === 'function') openHatcheryManagementMenu('trainers');
 else if(type === 'training' && typeof openTrainingManagementMenu === 'function') openTrainingManagementMenu('trainers');
 else if(type === 'mine' && typeof openMineManagementMenu === 'function') openMineManagementMenu('miners');
}
// The staff list is a structured model rendered by the DS component
// (ui/components/staff.js) — this adapter only shapes localized data.
function staffListModel(type){
 ensureStaffState();
 const defs = STAFF_DEFS.filter(s => s.type === type);
 const max = G.staff.maxActive[type] || 1;
 const active = G.staff.active[type] || [];

 // Sector fee info
 const sectorName = type === 'hatchery' ? (typeof t==='function'?t('sector_hatchery'):'Daycare') : type === 'training' ? (typeof t==='function'?t('sector_training'):'Training') : (typeof t==='function'?t('sector_mine'):'Mine');
 const feeLabel = type === 'hatchery' ? (typeof t==='function'?t('fee_hatchery'):'auto-hatch') : type === 'training' ? (typeof t==='function'?t('fee_training'):'auto-battle') : (typeof t==='function'?t('fee_mine'):'tile mined');
 const baseFeeVal = type === 'hatchery' ? 1000 : type === 'training' ? 500 : 500;
 const disc = getStaffSectorDiscount(type);
 const curFee = Math.max(0, Math.ceil(baseFeeVal * (1 - disc)));
 const combinedLv = getStaffSectorLevelsCombined(type);

 return {
  activeCount: active.length, max, activeLabel: t('staff_active'),
  tipLines: [
   `💡 ${typeof t==='function'?t('sector_fee_label'):'<b>Fees for'} ${sectorName} :</b> ${curFee}₽ ${typeof t==='function'?t('sector_fee_per'):'per'} ${feeLabel}.`,
   `<i>${typeof t==='function'?t('sector_fee_desc'):'Level all staff to 100 (Max) to reduce fees to 0₽!'} (${typeof t==='function'?t('sector_fee_levels'):'Combined sector levels'} : ${combinedLv}/500)</i>`,
  ],
  cards: defs.map(def=>{
   const owned = !!G.staff.owned[def.id];
   const isActive = active.includes(def.id);
   const lvl = staffLevel(def.id);
   const xp = G.staff.xp[def.id] || 0;
   const need = staffXpNeed(def.id);
   const pct = Math.max(0, Math.min(100, Math.floor((xp / Math.max(1, need)) * 100)));
   const unlocked = canAccessStaffLocation(def);
   if(owned){
    return {
     id: def.id, owned: true, active: isActive,
     spriteHtml: (typeof staffSpriteImg === 'function' ? staffSpriteImg(def.id, 48) : '<span>👤</span>'),
     name: getStaffName(def.id), location: getLocName(def.loc), desc: getStaffDesc(def.id),
     bonusHtml: staffBonusHtml(def),
     xp: { label: tr('staff_xp_bar', {xp:xp, need:need}), pct },
     levelLabel: tr('staff_level_short', {level:lvl}),
     toggleCall: 'toggleStaff', toggleArgs: `'${def.id}'`,
    };
   }
   return {
    id: def.id, owned: false, active: false,
    spriteHtml: (typeof staffSpriteImg === 'function' ? staffSpriteImg(def.id, 48) : '<span>👤</span>'),
    name: getStaffName(def.id), location: getLocName(def.loc), desc: getStaffDesc(def.id),
    // Locked location: informational label (no dead button — user rule).
    hire: unlocked
     ? { label: tr('staff_hire_price', {price:def.cost.toLocaleString()}), call: 'buyStaff', args: `'${def.id}'` }
     : { lockedLabel: `🔒 ${tr('staff_unlock_at', {loc:getLocName(def.loc)})}` },
   };
  }),
 };
}
function renderStaffList(type){
 const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
 if(!comp || typeof comp.staffListHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (staffList)');
 return comp.staffListHTML(staffListModel(type));
}

if (typeof ensureStaffState !== 'undefined') { if (typeof window !== 'undefined') window.ensureStaffState = ensureStaffState; if (typeof globalThis !== 'undefined') globalThis.ensureStaffState = ensureStaffState; }
if (typeof buyStaff !== 'undefined') { if (typeof window !== 'undefined') window.buyStaff = buyStaff; if (typeof globalThis !== 'undefined') globalThis.buyStaff = buyStaff; }
if (typeof toggleStaff !== 'undefined') { if (typeof window !== 'undefined') window.toggleStaff = toggleStaff; if (typeof globalThis !== 'undefined') globalThis.toggleStaff = toggleStaff; }
if (typeof addStaffXp !== 'undefined') { if (typeof window !== 'undefined') window.addStaffXp = addStaffXp; if (typeof globalThis !== 'undefined') globalThis.addStaffXp = addStaffXp; }
if (typeof getStaffBonus !== 'undefined') { if (typeof window !== 'undefined') window.getStaffBonus = getStaffBonus; if (typeof globalThis !== 'undefined') globalThis.getStaffBonus = getStaffBonus; }
if (typeof renderStaffList !== 'undefined') { if (typeof window !== 'undefined') window.renderStaffList = renderStaffList; if (typeof globalThis !== 'undefined') globalThis.renderStaffList = renderStaffList; }
if (typeof staffListModel !== 'undefined') { if (typeof window !== 'undefined') window.staffListModel = staffListModel; if (typeof globalThis !== 'undefined') globalThis.staffListModel = staffListModel; }
if (typeof refreshStaffManagement !== 'undefined') { if (typeof window !== 'undefined') window.refreshStaffManagement = refreshStaffManagement; if (typeof globalThis !== 'undefined') globalThis.refreshStaffManagement = refreshStaffManagement; }
if (typeof getStaffSectorDiscount !== 'undefined') { if (typeof window !== 'undefined') window.getStaffSectorDiscount = getStaffSectorDiscount; if (typeof globalThis !== 'undefined') globalThis.getStaffSectorDiscount = getStaffSectorDiscount; }
if (typeof getStaffSectorLevelsCombined !== 'undefined') { if (typeof window !== 'undefined') window.getStaffSectorLevelsCombined = getStaffSectorLevelsCombined; if (typeof globalThis !== 'undefined') globalThis.getStaffSectorLevelsCombined = getStaffSectorLevelsCombined; }
if (typeof getHatcheryAutomationFee !== 'undefined') { if (typeof window !== 'undefined') window.getHatcheryAutomationFee = getHatcheryAutomationFee; if (typeof globalThis !== 'undefined') globalThis.getHatcheryAutomationFee = getHatcheryAutomationFee; }
if (typeof getHatcheryLevelUpFee !== 'undefined') { if (typeof window !== 'undefined') window.getHatcheryLevelUpFee = getHatcheryLevelUpFee; if (typeof globalThis !== 'undefined') globalThis.getHatcheryLevelUpFee = getHatcheryLevelUpFee; }
if (typeof getTrainingAutomationFee !== 'undefined') { if (typeof window !== 'undefined') window.getTrainingAutomationFee = getTrainingAutomationFee; if (typeof globalThis !== 'undefined') globalThis.getTrainingAutomationFee = getTrainingAutomationFee; }
if (typeof getMineAutomationFee !== 'undefined') { if (typeof window !== 'undefined') window.getMineAutomationFee = getMineAutomationFee; if (typeof globalThis !== 'undefined') globalThis.getMineAutomationFee = getMineAutomationFee; }


// --- Migrated to ES module, globals exposed ---
if (typeof renderAutomationWindow !== 'undefined') { if (typeof window !== 'undefined') window.renderAutomationWindow = renderAutomationWindow; if (typeof globalThis !== 'undefined') globalThis.renderAutomationWindow = renderAutomationWindow; }
if (typeof isAutomationPurchased !== 'undefined') { if (typeof window !== 'undefined') window.isAutomationPurchased = isAutomationPurchased; if (typeof globalThis !== 'undefined') globalThis.isAutomationPurchased = isAutomationPurchased; }
if (typeof buyAutomationUpgrade !== 'undefined') { if (typeof window !== 'undefined') window.buyAutomationUpgrade = buyAutomationUpgrade; if (typeof globalThis !== 'undefined') globalThis.buyAutomationUpgrade = buyAutomationUpgrade; }
if (typeof toggleAutomationButton !== 'undefined') { if (typeof window !== 'undefined') window.toggleAutomationButton = toggleAutomationButton; if (typeof globalThis !== 'undefined') globalThis.toggleAutomationButton = toggleAutomationButton; }
if (typeof getAutomationUpgradeLabelSuffix !== 'undefined') { if (typeof window !== 'undefined') window.getAutomationUpgradeLabelSuffix = getAutomationUpgradeLabelSuffix; if (typeof globalThis !== 'undefined') globalThis.getAutomationUpgradeLabelSuffix = getAutomationUpgradeLabelSuffix; }
if (typeof toggleAutomation !== 'undefined') { if (typeof window !== 'undefined') window.toggleAutomation = toggleAutomation; if (typeof globalThis !== 'undefined') globalThis.toggleAutomation = toggleAutomation; }



// --- Exported globals ---
if (typeof canAccessStaffLocation !== 'undefined') { if (typeof window !== 'undefined') window.canAccessStaffLocation = canAccessStaffLocation; if (typeof globalThis !== 'undefined') globalThis.canAccessStaffLocation = canAccessStaffLocation; }
if (typeof getStaffDef !== 'undefined') { if (typeof window !== 'undefined') window.getStaffDef = getStaffDef; if (typeof globalThis !== 'undefined') globalThis.getStaffDef = getStaffDef; }
if (typeof getStaffDesc !== 'undefined') { if (typeof window !== 'undefined') window.getStaffDesc = getStaffDesc; if (typeof globalThis !== 'undefined') globalThis.getStaffDesc = getStaffDesc; }
if (typeof getStaffName !== 'undefined') { if (typeof window !== 'undefined') window.getStaffName = getStaffName; if (typeof globalThis !== 'undefined') globalThis.getStaffName = getStaffName; }
if (typeof purchaseAutomationIfNeeded !== 'undefined') { if (typeof window !== 'undefined') window.purchaseAutomationIfNeeded = purchaseAutomationIfNeeded; if (typeof globalThis !== 'undefined') globalThis.purchaseAutomationIfNeeded = purchaseAutomationIfNeeded; }
if (typeof staffBonusHtml !== 'undefined') { if (typeof window !== 'undefined') window.staffBonusHtml = staffBonusHtml; if (typeof globalThis !== 'undefined') globalThis.staffBonusHtml = staffBonusHtml; }
if (typeof staffLevel !== 'undefined') { if (typeof window !== 'undefined') window.staffLevel = staffLevel; if (typeof globalThis !== 'undefined') globalThis.staffLevel = staffLevel; }
if (typeof staffXpNeed !== 'undefined') { if (typeof window !== 'undefined') window.staffXpNeed = staffXpNeed; if (typeof globalThis !== 'undefined') globalThis.staffXpNeed = staffXpNeed; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  ensureStaffState,
  buyStaff,
  toggleStaff,
  addStaffXp,
  getStaffBonus,
  renderStaffList,
  staffListModel,
  refreshStaffManagement,
  getStaffSectorDiscount,
  getStaffSectorLevelsCombined,
  getHatcheryAutomationFee,
  getHatcheryLevelUpFee,
  getTrainingAutomationFee,
  getMineAutomationFee,
  renderAutomationWindow,
  isAutomationPurchased,
  buyAutomationUpgrade,
  toggleAutomationButton,
  getAutomationUpgradeLabelSuffix,
  toggleAutomation,
  canAccessStaffLocation,
  getStaffDef,
  getStaffDesc,
  getStaffName,
  purchaseAutomationIfNeeded,
  staffBonusHtml,
  staffLevel,
  staffXpNeed,
};

