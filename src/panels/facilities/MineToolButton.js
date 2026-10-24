/** @file MineToolButton.js @brief Distinct tool glyph, name and energy-cost glyph with accessible selection. */
import { UIButton } from '../../ui/UIButton.js';
import { UIContainer } from '../../ui/UIContainer.js';
import { UIIcon } from '../../ui/UIIcon.js';
import { UIText } from '../../ui/UIText.js';
import { MineUiRules } from '../../config/MineUiRules.js';
import { t } from '../../localization/LocalizationManager.js';
export class MineToolButton extends UIButton {
  /** @param {string} id @param {Function} onClick */
  constructor(id, onClick) {
    super({
      text: t(`mine_tool_${id}`),
      icon: MineUiRules.TOOL_ICONS[id],
      size: 'sm',
      className:'hbtn mine-tool-btn',
      onClick,
    });
    this._cost = new UIText();
    this.addChild(
      new UIContainer({
        tagName: 'span',
        className: 'mine-tool-cost',
        children: [new UIIcon({ name: 'zap' }), this._cost],
      }),
    );
    this.setAriaLabel(t(`mine_tool_${id}`));
    this.setData('tool', id);
  }
  /** @param {Object} tool @param {string} selected */
  setTool(tool, selected) {
    this.setVisible(tool.unlocked);
    this.setActive(selected === tool.id);
    this.setAttribute('aria-pressed', String(selected === tool.id));
    this._cost.setText(String(tool.energyCost));
    this.setTooltip(
      t('mine_tool_cost_hint', { cost: tool.energyCost, power: tool.power }),
    );
  }
}
