/**
 * @file BattleZoneEffects.js
 * @brief Displays live weather/terrain and finite turn counters between battle sides.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { t } from '../../localization/LocalizationManager.js';

const WEATHER_KEYS = Object.freeze({
  rain: 'weather_rainy', rainy: 'weather_rainy',
  sun: 'weather_sunny', sunny: 'weather_sunny',
  sand: 'weather_sandstorm', sandstorm: 'weather_sandstorm',
  hail: 'weather_hail', snow: 'weather_hail'
});
const TERRAIN_KEYS = Object.freeze({
  electric: 'terrain_electric',
  grassy: 'terrain_grassy',
  misty: 'terrain_misty',
  psychic: 'terrain_psychic'
});

/** @param {string|null} kind @param {number} turns @param {Record<string,string>} keys */
function effectText(kind, turns, keys) {
  if (!kind || kind === 'none') return '';
  const key = keys[kind];
  const label = key ? t(key) : kind;
  const value = Number(turns);
  if (Number.isFinite(value) && value > 0) return `${label} (${value} ${t('turns_abbrev')})`;
  return label;
}

export class BattleZoneEffects extends UIContainer {
  constructor() {
    super({ className: 'battle-zone-effects', name: 'BattleZoneEffects' });
    this._title = new UIText({ tagName: 'div', className: 'battle-zone-effects-title', text: t('active_zone_effects') });
    this._weather = new UIText({ tagName: 'span', className: 'battle-zone-chip battle-zone-weather' });
    this._terrain = new UIText({ tagName: 'span', className: 'battle-zone-chip battle-zone-terrain' });
    this._row = new UIContainer({ className: 'battle-zone-effects-row', children: [this._weather, this._terrain] });
    this.addChildren([this._title, this._row]);
    this.hide();
  }

  /** @param {{weather?:string|null, weatherTurns?:number, terrain?:string|null, terrainTurns?:number}|null} field */
  setField(field) {
    const weatherText = effectText(field?.weather, field?.weatherTurns, WEATHER_KEYS);
    const terrainText = effectText(field?.terrain, field?.terrainTurns, TERRAIN_KEYS);
    this._weather.setText(weatherText);
    this._terrain.setText(terrainText);
    this._weather.setVisible(!!weatherText);
    this._terrain.setVisible(!!terrainText);
    if (weatherText || terrainText) this.show();
    else this.hide();
  }
}
