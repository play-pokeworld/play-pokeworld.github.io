/**
 * @file BattleLootStrip.js
 * @brief Widget-rendered loot chips shared by the live battle footer and its summary.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIImage } from '../../ui/UIImage.js';
import { UIText } from '../../ui/UIText.js';
import { UIPokemonSprite, PokemonSpriteSizes } from '../../ui/UIPokemonSprite.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { ItemDB } from '../../data/items/ItemDB.js';
import { TextFormatter } from '../../core/TextFormatter.js';
import { t } from '../../localization/LocalizationManager.js';

/**
 * @param {Array<Object>} catches
 * @returns {Array<Object>}
 */
export function groupBattleCaptures(catches = []) {
  const groups = new Map();
  for (const caught of catches) {
    if (!caught?.species) continue;
    const key = `${caught.species}:${caught.form || ''}:${caught.shiny ? 'shiny' : 'normal'}`;
    const group = groups.get(key) || {
      species: caught.species,
      form: caught.form || '',
      name: caught.name || t(`pokemon.${caught.species}`),
      shiny: !!caught.shiny,
      count: 0,
      duplicateCount: 0
    };
    group.count++;
    if (caught.duplicate) group.duplicateCount++;
    groups.set(key, group);
  }
  return [...groups.values()];
}

export class BattleLootStrip extends UIContainer {
  /** @param {Object} [options] */
  constructor(options = {}) {
    super({
      id: options.id || '',
      className: `pw-battle-loot-chips ${options.className || ''}`.trim(),
      name: 'BattleLootStrip'
    });
    this.setAttribute('aria-live', 'polite');
    this.render(options.run ?? null);
  }

  /** @param {Object|null} run */
  render(run) {
    this.clearChildren();
    if (!run || !(run.battles > 0 || run.moneyGained > 0 || run.tokensGained > 0 || run.catches?.length || run.items?.length)) {
      this.addChild(new UIText({ tagName: 'div', className: 'pw-text-sm pw-light1', text: t('no_loot_yet') }));
      return;
    }

    if (run.moneyGained > 0) {
      this.addChild(BattleLootStrip._currencyChip(
        'money',
        t('battle_loot_money_title'),
        `+${TextFormatter.formatNumber(run.moneyGained)}`
      ));
    }
    if (run.tokensGained > 0) {
      this.addChild(BattleLootStrip._currencyChip(
        'dungeonToken',
        t('dungeon_loot_bag_tokens'),
        TextFormatter.formatNumber(run.tokensGained)
      ));
    }
    for (const group of groupBattleCaptures(run.catches)) {
      const chip = new UIContainer({ className: 'loot-item' });
      chip.setTooltip(`${group.name}${group.shiny ? ` — ${t('battle_summary_shiny')}` : ''}`);
      chip.addChild(new UIPokemonSprite({
        species: group.species,
        form: group.form,
        shiny: group.shiny,
        alt: group.name,
        size: PokemonSpriteSizes.CONTEXT
      }));
      if (group.count > 1) chip.addChild(new UIText({ tagName: 'span', className: 'loot-count', text: `×${group.count}` }));
      this.addChild(chip);
    }
    for (const entry of run.items || []) {
      if (!entry?.itemId || !(entry.quantity > 0)) continue;
      const chip = new UIContainer({ className: 'loot-item' });
      const nameKey = `item.${entry.itemId}.name`;
      const itemName = t(nameKey);
      chip.setTooltip(itemName === nameKey ? entry.itemId : itemName);
      chip.addChild(new UIImage({ src: ItemDB.getInstance().getImagePath(entry.itemId), alt: itemName, pixelated: true }));
      if (entry.quantity > 1) chip.addChild(new UIText({ tagName: 'span', className: 'loot-count', text: `×${TextFormatter.formatNumber(entry.quantity)}` }));
      this.addChild(chip);
    }
  }

  /** @private @param {string} currencyId @param {string} title @param {string} amount */
  static _currencyChip(currencyId, title, amount) {
    const chip = new UIContainer({ className: 'loot-item loot-currency' });
    chip.setTooltip(title);
    chip.addChild(new UIImage({ src: AssetPaths.currency(currencyId), alt: '', className: 'loot-currency-icon' }));
    chip.addChild(new UIText({ tagName: 'span', className: 'loot-count', text: amount }));
    return chip;
  }
}
