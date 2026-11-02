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
  hail: 'weather_hail', snow: 'weather_hail',
  fog: 'weather_fog',
  somber: 'weather_somber',
  reflect: 'weather_reflect',
  lightscreen: 'weather_lightscreen',
  safeguard: 'weather_safeguard',
  trickroom: 'weather_trickroom',
  weirdroom: 'weather_weirdroom',
  crossroom: 'weather_crossroom'
});

const TERRAIN_KEYS = Object.freeze({
  electric: 'terrain_electric',
  grassy: 'terrain_grassy',
  misty: 'terrain_misty',
  psychic: 'terrain_psychic'
});

/**
 * @param {string|null} kind
 * @param {number|null} turns
 * @param {Record<string,string>} keys
 * @param {string} fallbackPrefix
 * @returns {string}
 */
function effectText(kind, turns, keys, fallbackPrefix) {
  if (!kind || kind === 'none') return '';
  const key = keys[kind];
  let label = key ? t(key) : '';
  if (!label || label === key) {
    label = t(`${fallbackPrefix}${kind}`);
  }
  if (!label || label === `${fallbackPrefix}${kind}`) {
    label = kind;
  }
  const value = Number(turns);
  if (Number.isFinite(value) && value > 0 && value < 900) {
    return `${label} (${value} ${t('turns_abbrev')})`;
  }
  return `${label} (${t('weather_permanent')})`;
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

  /** @param {{weather?:string|null, weatherTurns?:number|null, terrain?:string|null, terrainTurns?:number|null}|null} field */
  setField(field) {
    const weather = field?.weather;
    const terrain = field?.terrain;
    const weatherText = effectText(weather, field?.weatherTurns, WEATHER_KEYS, 'battle_log.weather.');
    const terrainText = effectText(terrain, field?.terrainTurns, TERRAIN_KEYS, 'battle_log.terrain.');

    this._weather.setText(weatherText ? `${t('weather_label')} : ${weatherText}` : '');
    this._terrain.setText(terrainText ? `${t('terrain_label')} : ${terrainText}` : '');

    this._weather.getDomElement().className = `pw-text battle-zone-chip battle-zone-weather${weather ? ` battle-zone-chip--${weather}` : ''}`;
    this._terrain.getDomElement().className = `pw-text battle-zone-chip battle-zone-terrain${terrain ? ` battle-zone-chip--${terrain}` : ''}`;

    this._weather.setVisible(!!weatherText);
    this._terrain.setVisible(!!terrainText);

    if (weatherText || terrainText) {
      this.show();
    } else {
      this.hide();
    }
  }
}
