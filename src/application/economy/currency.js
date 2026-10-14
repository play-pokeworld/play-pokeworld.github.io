// PokeWorld — P0 · Portefeuille multi-monnaies (rebasé PokéClicker)
//
// Source de vérité des monnaies secondaires : Jetons de donjon (JD),
// Points de quête (PQ), Diamants (💎). Les Pokédollars restent G.money ;
// les Points de combat (PC) = G.atoll.tokens (nom canonique "PC" à l'affichage).
// Aucune migration destructive : les champs sont initialisés paresseusement.

const REGION_INDEX = { kanto: 0, johto: 1, hoenn: 2 };

// ── Sprites des monnaies (affichage standardisé, plus de symboles texte) ──
const CURRENCY_SPRITES = {
  money: 'src/assets/images/currency/money.svg',
  jd: 'src/assets/images/currency/dungeonToken.svg',
  dungeonTokens: 'src/assets/images/currency/dungeonToken.svg',
  pq: 'src/assets/images/currency/questPoint.svg',
  questPoints: 'src/assets/images/currency/questPoint.svg',
  diamond: 'src/assets/images/currency/diamond.svg',
  diamonds: 'src/assets/images/currency/diamond.svg',
  pc: 'src/assets/images/currency/battlePoint.svg',
  battlePoints: 'src/assets/images/currency/battlePoint.svg',
};
function currencySprite(kind, size) {
  const src = CURRENCY_SPRITES[kind];
  if (!src) return '';
  const s = size || 14;
  return '<img src="' + src + '" alt="" style="width:' + s + 'px;height:' + s + 'px;vertical-align:-2px;">';
}
function moneySpriteHtml(amount) { return currencySprite('money') + ' ' + formatNumber(Number(amount || 0)); }
function jdSpriteHtml(amount) { return currencySprite('jd') + ' ' + formatNumber(Number(amount || 0)); }
function pqSpriteHtml(amount) { return currencySprite('pq') + ' ' + formatNumber(Number(amount || 0)); }
function diamondSpriteHtml(amount) { return currencySprite('diamond') + ' ' + formatNumber(Number(amount || 0)); }
function pcSpriteHtml(amount) { return currencySprite('pc') + ' ' + formatNumber(Number(amount || 0)); }
function currencyAmountSpriteHtml(kind, amount) {
  if (kind === 'money') return moneySpriteHtml(amount);
  if (kind === 'questPoints' || kind === 'pq') return pqSpriteHtml(amount);
  if (kind === 'diamonds' || kind === 'diamond') return diamondSpriteHtml(amount);
  if (kind === 'battlePoints' || kind === 'pc') return pcSpriteHtml(amount);
  if (kind === 'dungeonTokens' || kind === 'jd') return jdSpriteHtml(amount);
  return formatNumber(Number(amount || 0));
}

// Péage des 43 donjons (par badgeReq).
// PASSE 39d — péages PLAFONNÉS : un donjon avancé (badgeReq 8) coûte 1000 JD
// au lieu de 50 000. Retour joueur : les donjons avancés ne rapportaient pas
// plus que les premiers et l'entrée coûtait une fortune — dépenser des jetons
// pour entrer ne devait pas être une punition. La récompense, elle, croît
// fortement avec les badges (dungeonWinLoot) : le risque est payant, l'entrée
// reste abordable.
const DUNGEON_TOLLS = [100, 150, 250, 350, 500, 650, 800, 900, 1000];

// Valeur en 💎 des trésors de la mine (à l'image de PokéClicker).
const DIAMOND_VALUES = {
  stardust: 70,
  iron_ball: 70,
  nugget: 100,
  rare_bone: 100,
  star_piece: 175,
  big_nugget: 250,
  heart_scale: 350,
};

function ensureWallet() {
  if (typeof G === 'undefined' || !G) return null;
  if (!G.wallet || typeof G.wallet !== 'object') G.wallet = {};
  if (typeof G.wallet.dungeonTokens !== 'number') G.wallet.dungeonTokens = 0;
  if (typeof G.wallet.questPoints !== 'number') G.wallet.questPoints = 0;
  if (typeof G.wallet.diamonds !== 'number') G.wallet.diamonds = 0;
  if (!G.wallet.revealed || typeof G.wallet.revealed !== 'object') G.wallet.revealed = {};
  return G.wallet;
}

// BUG (P3) : cette fonction s'appelait ELLE-MÊME (`typeof regionOfLoc ===
// 'function'` est toujours vrai à l'intérieur de sa propre déclaration) —
// récursion infinie → RangeError dès qu'un lieu était évalué. On délègue
// désormais à l'implémentation réelle de ui/game/map-logic.js, atteinte via
// la surface globale, avec repli sur la région courante.
function regionOfLoc(locId) {
  try {
    const impl = (typeof globalThis !== 'undefined') ? globalThis.regionOfLoc : null;
    if (typeof impl === 'function' && impl !== regionOfLoc) return impl(locId) || 'kanto';
  } catch (_) {}
  return (typeof G !== 'undefined' && G && G.region) || 'kanto';
}

// Rang de difficulté d'un lieu : 9 × région + badgeReq + 1  (1 → 27).
function locationRank(locId) {
  const id = locId || (G && G.location) || 'route1';
  const loc = (typeof getLocObj === 'function') ? getLocObj(id) : null;
  const region = regionOfLoc(id);
  const badgeReq = Math.max(0, Math.min(8, Number((loc && loc.badgeReq) || 0)));
  return (REGION_INDEX[region] || 0) * 9 + badgeReq + 1;
}

// Formule PokéClicker routeMoney (sans jitter) — ₽ par Pokémon sauvage vaincu.
function moneyPerKill(d) {
  d = Number(d) || 1;
  return Math.max(10, Math.round(3 * d + 5 * Math.pow(d, 1.15)));
}

// Formule PokéClicker routeDungeonTokens — JD par capture.
function tokensPerCatch(d, region) {
  d = Number(d) || 1;
  const ri = REGION_INDEX[region] || 0;
  return Math.max(1, Math.round(6 * Math.pow((2 * d) / (2.8 / (1 + ri / 3)), 1.08)));
}

function moneyPerKillForLocation(locId) { return moneyPerKill(locationRank(locId)); }
function tokensPerCatchForLocation(locId) { return tokensPerCatch(locationRank(locId), regionOfLoc(locId || G.location)); }

function dungeonToll(badgeReq) { return DUNGEON_TOLLS[Math.max(0, Math.min(8, Number(badgeReq) || 0))]; }
function diamondValueOf(itemKey) { return DIAMOND_VALUES[itemKey] || 0; }

// Récompense d'une victoire sauvage (le robinet principal de ₽).
function awardWildVictoryMoney() {
  const base = moneyPerKillForLocation();
  const amount = (typeof applySecretBaseMoneyBonus === 'function') ? applySecretBaseMoneyBonus(base) : base;
  G.money = (G.money || 0) + amount;
  return amount;
}

function gainDungeonTokens(n) { const w = ensureWallet(); if (!w) return; w.dungeonTokens += n; w.revealed.dungeonTokens = true; try { updateHeader(); } catch (_) {} }
function gainQuestPoints(n) { const w = ensureWallet(); if (!w) return; w.questPoints += n; w.revealed.questPoints = true; try { updateHeader(); } catch (_) {} }
function gainDiamonds(n) { const w = ensureWallet(); if (!w) return; w.diamonds += n; w.revealed.diamonds = true; try { updateHeader(); } catch (_) {} }

function spendDungeonTokens(n) { const w = ensureWallet(); if (!w || w.dungeonTokens < n) return false; w.dungeonTokens -= n; try { updateHeader(); } catch (_) {} return true; }
function spendQuestPoints(n) { const w = ensureWallet(); if (!w || w.questPoints < n) return false; w.questPoints -= n; try { updateHeader(); } catch (_) {} return true; }
function spendDiamonds(n) { const w = ensureWallet(); if (!w || w.diamonds < n) return false; w.diamonds -= n; try { updateHeader(); } catch (_) {} return true; }

function getBattlePoints() { return (G && G.atoll && typeof G.atoll.tokens === 'number') ? G.atoll.tokens : 0; }
function getFragments() { return (G && G.atoll && typeof G.atoll.fragments === 'number') ? G.atoll.fragments : 0; }
function getMineEnergy() { return (G && G.mine && typeof G.mine.energy === 'number') ? Math.round(G.mine.energy) : 0; }
function getMineMaxEnergy() { return (G && G.mine && typeof G.mine.maxEnergy === 'number') ? G.mine.maxEnergy : 100; }

// Prix en PQ d'un Pokémon du marché (échelle par région, comme PokéClicker :
// Kanto 1 000-4 000, Johto et Hoenn de plus en plus chers).
const PQ_MARKET_STARTERS = { 1:1000, 4:1000, 7:1000, 152:3000, 155:3000, 158:3000, 252:6000, 255:6000, 258:6000 };
function pqMarketPrice(id) {
  const n = Number(id);
  if (PQ_MARKET_STARTERS[n]) return PQ_MARKET_STARTERS[n];
  if (n >= 252) return 12000;  // Hoenn (rares/fossiles)
  if (n >= 152) return 6000;   // Johto
  return 2000;                 // Kanto (rares/fossiles)
}

// PQ gagnée par une quête répétable, selon son ancienne récompense en ₽.
function pqForMoney(money) {
  if (money >= 27000) return 2500;
  if (money >= 21000) return 1000;
  if (money >= 16000) return 500;
  if (money >= 9000) return 250;
  return 100;
}

// Instantané pour la fenêtre Monnaies (5 monnaies, pas d'énergie ni de fragments).
function currencySnapshot() {
  const w = ensureWallet();
  if (!w) return [];
  return [
    { id: 'money', symbol: '₽', labelKey: 'currency_money', amount: G.money || 0, revealed: true },
    { id: 'dungeonTokens', symbol: 'JD', labelKey: 'currency_dungeon_tokens', amount: w.dungeonTokens, revealed: !!w.revealed.dungeonTokens },
    { id: 'questPoints', symbol: 'PQ', labelKey: 'currency_quest_points', amount: w.questPoints, revealed: !!w.revealed.questPoints },
    { id: 'diamonds', symbol: '💎', labelKey: 'currency_diamonds', amount: w.diamonds, revealed: !!w.revealed.diamonds },
    { id: 'battlePoints', symbol: 'PC', labelKey: 'currency_battle_points', amount: getBattlePoints(), revealed: getBattlePoints() > 0 },
  ];
}

// --- Surface classique -----------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.ensureWallet = ensureWallet;
  window.moneyPerKill = moneyPerKill;
  window.tokensPerCatch = tokensPerCatch;
  window.moneyPerKillForLocation = moneyPerKillForLocation;
  window.tokensPerCatchForLocation = tokensPerCatchForLocation;
  window.dungeonToll = dungeonToll;
  window.diamondValueOf = diamondValueOf;
  window.awardWildVictoryMoney = awardWildVictoryMoney;
  window.gainDungeonTokens = gainDungeonTokens;
  window.gainQuestPoints = gainQuestPoints;
  window.gainDiamonds = gainDiamonds;
  window.spendDungeonTokens = spendDungeonTokens;
  window.spendQuestPoints = spendQuestPoints;
  window.spendDiamonds = spendDiamonds;
  window.getBattlePoints = getBattlePoints;
  window.getFragments = getFragments;
  window.getMineEnergy = getMineEnergy;
  window.getMineMaxEnergy = getMineMaxEnergy;
  window.pqForMoney = pqForMoney;
  window.pqMarketPrice = pqMarketPrice;
  window.currencySnapshot = currencySnapshot;
  window.currencySprite = currencySprite;
  window.moneySpriteHtml = moneySpriteHtml;
  window.jdSpriteHtml = jdSpriteHtml;
  window.pqSpriteHtml = pqSpriteHtml;
  window.diamondSpriteHtml = diamondSpriteHtml;
  window.pcSpriteHtml = pcSpriteHtml;
  window.currencyAmountSpriteHtml = currencyAmountSpriteHtml;
}
if (typeof globalThis !== 'undefined') {
  globalThis.ensureWallet = ensureWallet;
  globalThis.moneyPerKill = moneyPerKill;
  globalThis.tokensPerCatch = tokensPerCatch;
  globalThis.moneyPerKillForLocation = moneyPerKillForLocation;
  globalThis.tokensPerCatchForLocation = tokensPerCatchForLocation;
  globalThis.dungeonToll = dungeonToll;
  globalThis.diamondValueOf = diamondValueOf;
  globalThis.awardWildVictoryMoney = awardWildVictoryMoney;
  globalThis.gainDungeonTokens = gainDungeonTokens;
  globalThis.gainQuestPoints = gainQuestPoints;
  globalThis.gainDiamonds = gainDiamonds;
  globalThis.spendDungeonTokens = spendDungeonTokens;
  globalThis.spendQuestPoints = spendQuestPoints;
  globalThis.spendDiamonds = spendDiamonds;
  globalThis.getBattlePoints = getBattlePoints;
  globalThis.getFragments = getFragments;
  globalThis.getMineEnergy = getMineEnergy;
  globalThis.getMineMaxEnergy = getMineMaxEnergy;
  globalThis.pqForMoney = pqForMoney;
  globalThis.pqMarketPrice = pqMarketPrice;
  globalThis.currencySnapshot = currencySnapshot;
  globalThis.currencySprite = currencySprite;
  globalThis.moneySpriteHtml = moneySpriteHtml;
  globalThis.jdSpriteHtml = jdSpriteHtml;
  globalThis.pqSpriteHtml = pqSpriteHtml;
  globalThis.diamondSpriteHtml = diamondSpriteHtml;
  globalThis.pcSpriteHtml = pcSpriteHtml;
  globalThis.currencyAmountSpriteHtml = currencyAmountSpriteHtml;
}

export {
  REGION_INDEX, DUNGEON_TOLLS, DIAMOND_VALUES,
  ensureWallet, locationRank, moneyPerKill, tokensPerCatch,
  moneyPerKillForLocation, tokensPerCatchForLocation,
  dungeonToll, diamondValueOf, awardWildVictoryMoney,
  gainDungeonTokens, gainQuestPoints, gainDiamonds,
  spendDungeonTokens, spendQuestPoints, spendDiamonds,
  getBattlePoints, getFragments, getMineEnergy, getMineMaxEnergy,
  pqForMoney, pqMarketPrice, currencySnapshot,
  currencySprite, moneySpriteHtml, jdSpriteHtml, pqSpriteHtml,
  diamondSpriteHtml, pcSpriteHtml, currencyAmountSpriteHtml,
};

// Wave 42 — registre moteur.
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try { PokeActions.register('gainDungeonTokens', gainDungeonTokens); } catch (_) {}
  try { PokeActions.register('gainQuestPoints', gainQuestPoints); } catch (_) {}
  try { PokeActions.register('gainDiamonds', gainDiamonds); } catch (_) {}
}

