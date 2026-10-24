/** @file FieldJournalPanel.js @brief Sample-only stable, localized dashboard view. */
import { DraggablePanel } from '../ui/DraggablePanel.js';
import { UIContainer } from '../ui/UIContainer.js';
import { UIText } from '../ui/UIText.js';
import { UIButton } from '../ui/UIButton.js';
import { WindowIds } from '../config/DashboardLayout.js';
import { FieldJournalSystem } from '../systems/FieldJournalSystem.js';
import { FieldJournalChangedEvent } from '../core/events/FieldJournalChangedEvent.js';
import { PokemonDefeatedEvent } from '../core/events/PokemonDefeatedEvent.js';
import { BattleStartedEvent } from '../core/events/BattleStartedEvent.js';
import { BattleEndedEvent } from '../core/events/BattleEndedEvent.js';
import { LocationChangedEvent } from '../core/events/LocationChangedEvent.js';
import { SaveCreatedEvent } from '../core/events/SaveCreatedEvent.js';
import { SaveLoadedEvent } from '../core/events/SaveLoadedEvent.js';
import { SaveDeletedEvent } from '../core/events/SaveDeletedEvent.js';
import { LanguageChangedEvent } from '../core/events/LanguageChangedEvent.js';
import { t } from '../localization/LocalizationManager.js';
export class FieldJournalPanel extends DraggablePanel {
  constructor(column) {
    super({
      id: WindowIds.FIELD_JOURNAL,
      column,
      title: t('fieldjournal_title'),
      icon: 'book',
      name: 'FieldJournalPanel',
    });
    this._summary = new UIText({ tagName: 'p' });
    this._state = new UIText({ tagName: 'p' });
    this._survey = new UIButton({
      className: 'hbtn',
      text: t('fieldjournal_survey'),
      onClick: () => FieldJournalSystem.getInstance().survey(),
    });
    this.addChild(
      new UIContainer({
        className: 'pw-field-journal',
        children: [this._summary, this._state, this._survey],
      }),
    );
    for (const type of [
      FieldJournalChangedEvent,
      PokemonDefeatedEvent,
      BattleStartedEvent,
      BattleEndedEvent,
      LocationChangedEvent,
      SaveCreatedEvent,
      SaveLoadedEvent,
      SaveDeletedEvent,
    ])
      this.listen(type, () => this._refresh());
    this.listen(LanguageChangedEvent, () => {
      this.setTitle(t('fieldjournal_title'));
      this._survey.setText(t('fieldjournal_survey'));
      this._refresh();
    });
    this._refresh();
  }
  _refresh() {
    const model = FieldJournalSystem.getInstance().getSnapshot();
    this.setVisible(model.visible);
    this._summary.setText(
      t('fieldjournal_summary', { total: model.total, reward: model.reward }),
    );
    this._state.setText(
      t(`fieldjournal_state_${model.reason}`, {
        wins: model.wins,
        required: model.required,
      }),
    );
    this._survey.setVisible(model.canSurvey);
  }
}
