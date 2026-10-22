/**
 * @file BattleTrainerCard.js
 * @brief Trainer portrait/name host displayed above the battle party for trainer challenges.
 */
import { UIContainer } from '../../ui/UIContainer.js';
import { UIText } from '../../ui/UIText.js';
import { UIImage } from '../../ui/UIImage.js';
import { AssetPaths } from '../../config/AssetPaths.js';
import { TrainerDB } from '../../data/trainers/TrainerDB.js';
import { LeagueDB } from '../../data/trainers/LeagueDB.js';
import { t } from '../../localization/LocalizationManager.js';

const ROLE_ALIASES = Object.freeze({ team_enemy: 'rocket', quest: 'trainer' });

export class BattleTrainerCard extends UIContainer {
  constructor() {
    super({ id: 'battle-trainer-host', className: 'trainer-visual-card', name: 'BattleTrainerCard' });
    this._roleClass = '';
    this._sprite = new UIImage({ className: 'trainer-sprite-img', pixelated: true });
    this._name = new UIText({ tagName: 'b' });
    this._role = new UIText({ tagName: 'span' });
    this.addChildren([
      new UIContainer({ className: 'trainer-sprite-placeholder', children: [this._sprite] }),
      new UIContainer({ className: 'trainer-visual-info', children: [this._name, this._role] })
    ]);
    this.hide();
  }

  /** @param {{id:string, trainerId:string, role:string, sprite:string|null}|null} presentation */
  setTrainer(presentation) {
    if (!presentation) {
      this.hide();
      return;
    }
    const league = LeagueDB.getInstance().getById(presentation.id);
    const trainer = TrainerDB.getInstance().getById(presentation.trainerId);
    const nameId = league ? league.id : (trainer?.id || presentation.id);
    const nameKey = `trainer.${nameId}.name`;
    const translatedName = t(nameKey);
    const fallbackKey = `trainer.${presentation.trainerId}.name`;
    const fallbackName = t(fallbackKey);
    const name = typeof presentation.displayName === 'string' && presentation.displayName
      ? presentation.displayName
      : translatedName !== nameKey
        ? translatedName
        : (fallbackName !== fallbackKey ? fallbackName : presentation.trainerId);
    const rawRole = String(presentation.role || 'trainer').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'trainer';
    const role = ROLE_ALIASES[rawRole] || rawRole;
    const roleKey = `trainer_role_${role}`;
    const translatedRole = t(roleKey);

    if (this._roleClass) this.removeClass(`role-${this._roleClass}`);
    this._roleClass = role;
    this.addClass(`role-${role}`);
    this._name.setText(name);
    this._role.setText(translatedRole === roleKey ? role : translatedRole);
    const sprite = presentation.sprite || league?.sprite || trainer?.sprite || null;
    this._sprite.setSource(AssetPaths.trainerSprite(sprite || undefined));
    this._sprite.setAlt(name);
    this.show();
  }
}
