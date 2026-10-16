// V7-R3 · R3-08 — IMMUNITÉS PAR TALENT, UNE SEULE TABLE.
//
// Retour joueur : « si le Pokémon adverse a un talent d'immunité contre un
// type, cela devrait être visible sur le multiplicateur de l'attaque : un type
// Sol sur Lévitation affiche toujours ×2 au lieu de ×0 ». Le moteur annulait
// bien l'attaque (performAttack : Lévitation, Paratonnerre, talents
// d'absorption, talents « flash »), mais chaque affichage recalculait le
// multiplicateur avec la seule table des types. Cette table est désormais
// PARTAGÉE : le moteur et les trois affichages (boutons d'attaque, barres de
// l'adversaire, badge d'efficacité) lisent la même règle.
//
// Fichier combat sans import statique (DBT-04) : tout passe par les globaux.

/** Talent → type qu'il annule (dégâts ×0 ; absorptions et flash inclus). */
const TALENT_IMMUNE_TYPE = Object.freeze({
  levitate: 'Ground',
  lightningrod: 'Electric',
  waterabsorb: 'Water',
  stormdrain: 'Water',
  voltabsorb: 'Electric',
  flashfire: 'Fire',
  sapsipper: 'Grass',
  poisonabsorb: 'Poison',
  frostabsorb: 'Ice',
  psychicabsorb: 'Psychic',
  lightabsorb: 'Fairy',
  growthabsorb: 'Grass',
  flareabsorb: 'Fire',
  curseabsorb: 'Ghost',
  flashelectro: 'Electric',
  flashaqua: 'Water',
  flashpyro: 'Fire',
  flashumbra: 'Ghost',
  flashvenum: 'Poison',
  flashcryo: 'Ice',
  flashpsycha: 'Psychic',
  flashfae: 'Fairy',
  flashherba: 'Grass',
});

/** Les talents actifs d'un Pokémon (principal + caché PokéChill). */
function pokeActiveTalents(poke) {
  const out = [];
  if (!poke) return out;
  if (poke.talent) out.push(String(poke.talent));
  const hf = globalThis.getPokemonHiddenTalent;
  if (hf) {
    try {
      const h = hf(poke);
      if (h && !out.includes(String(h))) out.push(String(h));
    } catch (_) {}
  }
  return out;
}

/** Le talent du défenseur qui annule ce type d'attaque (null sinon). */
function talentImmunityFor(defender, moveType) {
  if (!defender || !moveType) return null;
  for (const tl of pokeActiveTalents(defender)) {
    if (TALENT_IMMUNE_TYPE[tl] === moveType) return tl;
  }
  return null;
}

/**
 * Multiplicateur dû au TALENT du défenseur, à combiner avec la table des
 * types : 0 (immunité), 0.2 (Garde Mystik hors coup super efficace — même
 * valeur que le moteur) ou 1.
 * @param {string} moveType
 * @param {object} defender
 * @param {number} [typeEff=1] efficacité de type déjà calculée
 */
function battleTalentTypeMult(moveType, defender, typeEff) {
  if (!defender || !moveType) return 1;
  if (talentImmunityFor(defender, moveType)) return 0;
  const eff = Number.isFinite(Number(typeEff)) ? Number(typeEff) : 1;
  if (eff > 0 && eff < 2 && pokeActiveTalents(defender).includes('wonderguard')) return 0.2;
  return 1;
}

/** Efficacité AFFICHÉE d'une capacité contre une cible : types × talent. */
function battleDisplayedEff(moveType, defender, attacker) {
  if (!defender || !moveType) return 1;
  const mt = String(moveType).toLowerCase();
  const d1 = String(defender.type1 || '').toLowerCase();
  const d2 = String(defender.type2 || '').toLowerCase();
  const isGhost = d1 === 'ghost' || d2 === 'ghost';
  const isNormalOrFight = mt === 'normal' || mt === 'fighting';
  const hasScrappy =
    attacker && (attacker.talent === 'scrappy' || pokeActiveTalents(attacker).includes('scrappy'));

  let base = 1;
  if (hasScrappy && isNormalOrFight && isGhost) {
    const te = globalThis.typeEff;
    const otherType = d1 === 'ghost' ? defender.type2 : defender.type1;
    base = otherType && te ? Number(te(moveType, otherType)) : 1;
    if (isNaN(base) || base <= 0) base = 1;
  } else {
    const te = globalThis.typeEff;
    const raw = te ? Number(te(moveType, defender.type1, defender.type2)) : 1;
    base = Number.isFinite(raw) ? raw : 1;
  }
  const eff = Number.isFinite(base) ? base : 1;
  return eff * battleTalentTypeMult(moveType, defender, eff);
}

const _talentImmunityGlobals = {
  TALENT_IMMUNE_TYPE,
  pokeActiveTalents,
  talentImmunityFor,
  battleTalentTypeMult,
  battleDisplayedEff,
};
if (typeof window !== 'undefined') Object.assign(window, _talentImmunityGlobals);
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _talentImmunityGlobals);

export {
  TALENT_IMMUNE_TYPE,
  pokeActiveTalents,
  talentImmunityFor,
  battleTalentTypeMult,
  battleDisplayedEff,
};
