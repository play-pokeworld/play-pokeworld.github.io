/** @file ModalCloseRequestedEvent.js @brief Typed close requests keep systems independent of modal widgets. */
import { BaseEvent } from '../BaseEvent.js';
export class ModalCloseRequestedEvent extends BaseEvent {
  static TYPE='ModalCloseRequestedEvent';
  constructor(modalId){super(ModalCloseRequestedEvent.TYPE);this.modalId=modalId;}
}
