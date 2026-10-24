/** @file FossilLabModal.js @brief Local Pewter-laboratory specialization of the common fossil chooser. */
import { FossilPickerModal } from './FossilPickerModal.js';
export class FossilLabModal extends FossilPickerModal {
  constructor() {
    super({ lab: true });
  }
}
