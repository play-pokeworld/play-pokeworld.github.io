/**
 * @file FacilityPanels.js
 * @brief Stable presentation identities shared by the three facility management windows.
 */
import { ModalIds } from './ModalIds.js';
export const FACILITY_PANELS = Object.freeze({
  hatchery: Object.freeze({ modalId: ModalIds.HATCHERY_MANAGEMENT, titleKey: 'hatchery_management_title', icon: 'egg' }),
  training: Object.freeze({ modalId: ModalIds.TRAINING_MANAGEMENT, titleKey: 'training_center_title', icon: 'swords' }),
  mine: Object.freeze({ modalId: ModalIds.MINE_MANAGEMENT, titleKey: 'mine_management_title', icon: 'pickaxe' })
});
