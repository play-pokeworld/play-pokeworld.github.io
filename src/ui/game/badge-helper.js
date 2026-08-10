// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.

// ─── Unified weather/status/terrain badge system ───
// Generates consistent colored badges across ALL info panels
const WEATHER_COLORS = {
  sunny:'#FBA64C', rainy:'#539DDF', sandstorm:'#DA7C4D', hail:'#76D1C1',
  electric:'#F2D94E', grassy:'#60BE58', misty:'#EF90E6', psychic:'#FA8582',
  burn:'#f08030', freeze:'#98d8d8', para:'#f8d030', poison:'#a040a0',
  sleep:'#705898', confuse:'#FA8582', flinch:'#d3524b', slow:'#539DDF'
};
function badgeHtml(text, type) {
  const color = WEATHER_COLORS[type] || WEATHER_COLORS[type.toLowerCase()] || '#888';
  return '<span class="move-desc-badge" data-style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;color:white;background:var(--type-color,#888);text-shadow:0 1px 2px rgba(0,0,0,0.3);" data-type-color="' + color + '">' + text + '</span>';
}
export const STATUS_BADGES = {
  burn: badgeHtml('Brûlure','burn'), freeze: badgeHtml('Gel','freeze'),
  para: badgeHtml('Paralysie','para'), poison: badgeHtml((typeof t==='function'?t('status_toxic'):'Toxic'),'poison'),
  sleep: badgeHtml('Sommeil','sleep'), confuse: badgeHtml('Confusion','confuse'),
  sunny: badgeHtml('Soleil','sunny'), rainy: badgeHtml('Pluie','rainy'),
  sand: badgeHtml((typeof t==='function'?t('weather_sandstorm'):'Sandstorm'),'sandstorm'), hail: badgeHtml('Grêle','hail'),
  eterrain: badgeHtml((typeof t==='function'?t('terrain_electric'):'Electric Terrain'),'electric'),
  gterrain: badgeHtml('Champ Herbu','grassy'),
  mterrain: badgeHtml('Champ Brumeux','misty'),
  pterrain: badgeHtml('Champ Psychique','psychic')
};
export const EN_STATUS_BADGES = {
  burn: badgeHtml('Burn','burn'), freeze: badgeHtml('Freeze','freeze'),
  para: badgeHtml('Paralysis','para'), poison: badgeHtml('Poisoned','poison'),
  sleep: badgeHtml('Sleep','sleep'), confuse: badgeHtml('Confused','confuse'),
  sunny: badgeHtml('Sunny','sunny'), rainy: badgeHtml('Rainy','rainy'),
  sand: badgeHtml('Sandstorm','sandstorm'), hail: badgeHtml('Hail','hail'),
  eterrain: badgeHtml('Electric Terrain','electric'),
  gterrain: badgeHtml('Grassy Terrain','grassy'),
  mterrain: badgeHtml('Misty Terrain','misty'),
  pterrain: badgeHtml('Psychic Terrain','psychic')
};
function getBadgeHtml(text, lang) {
  const lower = text.toLowerCase().replace(/[\s-]/g,'');
  const langKey = lang || (typeof currentLang === 'function' ? currentLang() : 'fr');
  const dict = langKey === 'en' ? EN_STATUS_BADGES : STATUS_BADGES;
  if (dict[lower]) return dict[lower];
  // Try partial match
  for (const k in dict) { if (lower.includes(k) || k.includes(lower)) return dict[k]; }
  return text;
}
// Phase 27: NEVER replace inside an HTML tag — descriptions already inject
// badges (<span data-buff="poison">…) and naive replacement ate the word
// INSIDE attributes (Toxic Orb/Flame Orb).
function _replaceOutsideTags(desc, regex, fn) {
  const parts = String(desc).split(/(<[^>]*>)/g);
  for (let i = 0; i < parts.length; i += 2) parts[i] = parts[i].replace(regex, fn);
  return parts.join('');
}
function replaceWeatherTerms(desc) {
  if (!desc || typeof desc !== 'string') return desc || '';
  let r = desc;
  // USE CALLBACK FUNCTIONS so $1 is the actual match! (not evaluated at array creation time)
  r = _replaceOutsideTags(r, /\b(Sunny|Soleil|soleil)\b/gi, function(m){ return badgeHtml(m,'sunny'); });
  r = _replaceOutsideTags(r, /\b(Rainy|Rain|Pluie|pluie)\b/gi, function(m){ return badgeHtml(m,'rainy'); });
  r = _replaceOutsideTags(r, /Sandstorm|sandstorm|T[eéèêë]mp[eéèêë]te d[eéèêë] Sabl[eéèêë]|t[eéèêë]mp[eéèêë]te d[eéèêë] sabl[eéèêë]/gi, function(m){ return badgeHtml(m,'sandstorm'); });
  r = _replaceOutsideTags(r, /\b(Hail|hail|Gr[eéèêë]l[eéèêë]|gr[eéèêë]l[eéèêë])\b/gi, function(m){ return badgeHtml(m,'hail'); });
  r = _replaceOutsideTags(r, /Electric Terrain|electric terrain|Champ [EeéèêëÉÈÊ]lectrifi[eéèêëÉÈÊ]|champ [eéèêë]lectrifi[eéèêë]/gi, function(m){ return badgeHtml(m,'electric'); });
  r = _replaceOutsideTags(r, /\b(Grassy Terrain|grassy terrain|Champ Herbu|champ herbu)\b/gi, function(m){ return badgeHtml(m,'grassy'); });
  r = _replaceOutsideTags(r, /\b(Misty Terrain|misty terrain|Champ Brumeux|champ brumeux)\b/gi, function(m){ return badgeHtml(m,'misty'); });
  r = _replaceOutsideTags(r, /\b(Psychic Terrain|psychic terrain|Champ Psychique|champ psychique)\b/gi, function(m){ return badgeHtml(m,'psychic'); });
  return r;
}
// Phase 24: same color treatment for STATUS words (burn, poison,
// paralysis, freeze, sleep, confusion) in descriptions — before, only
// weather and fields were colored. Covers conjugated forms
// ("brûler", "paralyser", "endormir", "geler", "empoisonner"…).
function replaceStatusTerms(desc) {
  if (!desc || typeof desc !== 'string') return desc || '';
  let r = desc;
  r = _replaceOutsideTags(r, /\b(Empoisonnement grave|empoisonnement grave)\b/g, function(m){ return badgeHtml(m,'poison'); });
  r = _replaceOutsideTags(r, /\b(Brûlure|brûlure|Brûlé|brûlé|Brûler|brûler|Burn|burn|Burned|burned)\b/g, function(m){ return badgeHtml(m,'burn'); });
  r = _replaceOutsideTags(r, /\b(Paralysie|paralysie|Paralyser|paralyser|Paralysé|paralysé|Paralysis|paralysis|Paralyzed|paralyzed)\b/g, function(m){ return badgeHtml(m,'para'); });
  // Phase 27b: (?![\p{L}]) instead of \b — the ASCII word boundary does not
  // match after an accented letter ("Empoisonné" stayed without a color badge).
  r = _replaceOutsideTags(r, /\b(Poisonned|Poisoned|Poison|poison|Empoisonnement|empoisonnement|Empoisonner|empoisonner|Empoisonné|empoisonné)(?![\p{L}])/gu, function(m){ return badgeHtml(m,'poison'); });
  r = _replaceOutsideTags(r, /\b(Geler|geler|Gelé|gelé|Freeze|freeze|Frozen|frozen|Gel)\b/gi, function(m){ return badgeHtml(m,'freeze'); });
  r = _replaceOutsideTags(r, /\b(Endormissement|endormissement|Endormir|endormir|Endormi|endormi|Sommeil|sommeil|Sleep|sleep|Asleep|asleep)\b/g, function(m){ return badgeHtml(m,'sleep'); });
  r = _replaceOutsideTags(r, /\b(Confusion|confusion|Confus|confus|Confuse|confuse|Confused|confused)\b/g, function(m){ return badgeHtml(m,'confuse'); });
  return r;
}
// Wave 41 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.badgeHtml = badgeHtml;
if (typeof globalThis !== 'undefined') globalThis.STATUS_BADGES = STATUS_BADGES;
if (typeof globalThis !== 'undefined') globalThis.EN_STATUS_BADGES = EN_STATUS_BADGES;
if (typeof globalThis !== 'undefined') globalThis.getBadgeHtml = getBadgeHtml;
if (typeof globalThis !== 'undefined') globalThis.replaceWeatherTerms = replaceWeatherTerms;
if (typeof globalThis !== 'undefined') globalThis.replaceStatusTerms = replaceStatusTerms;


// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  badgeHtml,
  getBadgeHtml,
  replaceWeatherTerms,
  replaceStatusTerms,
};
