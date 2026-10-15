/**
 * PokéWorld UI — SettingsModalView (rebuilt from zero on the ECS DS)
 *
 * The settings modal body (language, theme, save profile, save management)
 * rendered as ONE virtual tree at open time — labels come from t() in the
 * CURRENT language, no more data-i18n dom surgery on static markup.
 *
 * Kept contracts (the classic layer drives them by id/class/dataset):
 *   - .lang-btn[data-lang]            — language buttons + active sync,
 *   - .theme-swatch[data-theme-btn]   — theme swatches + active sync,
 *     data-action="set-theme" data-theme-value,
 *   - #save-profile-section + every  #save-profile-* id — filled by
 *     updateSaveProfileControls() right after this view renders,
 *   - #delete-row / #delete-confirm-row (display toggled on open),
 *   - bridge actions: set-language, set-theme, save-game, load-game,
 *     export-save, import-save-file (file input change), confirm-delete,
 *     do-delete, cancel-delete, legacy-call applySaveProfileSettings /
 *     openSaveIconBoxSelector.
 *
 * Model (shaped by the classic adapter):
 * {
 *   currentLang, currentTheme,
 *   lang:  { heading, choices: [{ label, lang }] },
 *   theme: { heading, swatches: [{ label, theme }] },
 *   save:  { heading, saveLabel, loadLabel, exportLabel, importLabel,
 *            deleteLabel, deleteWarning, confirmLabel, cancelLabel },
 *   sound:     { heading, volumeLabel, buses: [{ id, label, on, vol }] }, // V7-R3c SND-07
 *   community: { heading, hint, discordLabel, discordUrl },      // V7-R1 #4
 *   advanced:  { heading, codeLabel, codePlaceholder, submitLabel, hint,
 *                debugOn, debugOnLabel, hideLabel },             // V7-R1 #8
 * }
 *
 * @module ui/views/SettingsModalView
 */
import { UIView } from './UIView.js';
import { UIRenderComponent } from '../../engine/components/UIRenderComponent.js';
import { h, toHTMLString } from '../../engine/render/vdom.js';
import { cx } from '../components/component-utils.js';
import { discordLinkVNode } from '../components/discord-link.js';

export class SettingsModalView extends UIView {
  constructor(model) {
    super({ name: 'SettingsModalView', model: model || {} });
  }

  windowVNode() {
    const m = this.model;
    return h(
      'div',
      { class: 'pw-settings-root' },
      // ── Language ────────────────────────────────────────────────────
      m.lang
        ? h(
            'div',
            { class: 'settings-section' },
            h('h3', null, m.lang.heading),
            h(
              'div',
              { class: 'pw-settings-choices' },
              ...(m.lang.choices || []).map((c) =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: cx(
                      'hbtn lang-btn pw-settings-choice',
                      m.currentLang === c.lang && 'active'
                    ),
                    dataset: { lang: c.lang, action: 'set-language' },
                  },
                  c.label
                )
              )
            )
          )
        : null,
      // ── Theme ───────────────────────────────────────────────────────
      m.theme
        ? h(
            'div',
            { class: 'settings-section' },
            h('h3', null, m.theme.heading),
            h(
              'div',
              { class: 'theme-grid' },
              ...(m.theme.swatches || []).map((s) =>
                h(
                  'button',
                  {
                    type: 'button',
                    class: cx(
                      'theme-swatch',
                      `theme-swatch--${s.theme}`,
                      m.currentTheme === s.theme && 'active'
                    ),
                    dataset: { themeBtn: s.theme, action: 'set-theme', themeValue: s.theme },
                  },
                  s.label
                )
              )
            )
          )
        : null,
      // ── Combat / animations ──────────────────────────────────────────
      m.combat
        ? h(
            'div',
            { class: 'settings-section' },
            h('h3', null, m.combat.heading),
            h(
              'button',
              {
                type: 'button',
                class: 'hbtn',
                dataset: { action: 'legacy-call', call: 'toggleCaptureAnimations', callArgs: '' },
              },
              (m.combat.animationsOn ? '✔ ' : '✖ ') + m.combat.animationsLabel
            ),
            // P3 · ANI-01 — un seul interrupteur coupe TOUS les retours visuels.
            h(
              'button',
              {
                type: 'button',
                class: 'hbtn',
                id: 'ui-animations-toggle',
                dataset: { action: 'legacy-call', call: 'toggleUiAnimations', callArgs: '' },
              },
              (m.combat.uiFxOn ? '✔ ' : '✖ ') + (m.combat.uiFxLabel || '')
            )
          )
        : null,
      // ── V7-R2 · SND-01 / V7-R3c · SND-07 — Son : musique / interface / cris,
      // coupure + curseur 0–100 par bus (branché via data-input-call : les
      // attributs oninput inline sont neutralisés par le moteur).
      m.sound && Array.isArray(m.sound.buses)
        ? h(
            'div',
            { class: 'settings-section settings-sound' },
            h('h3', null, m.sound.heading),
            ...m.sound.buses.map((bus) =>
              h(
                'div',
                { class: 'settings-sound-row' },
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'hbtn' + (bus.on ? ' active' : ''),
                    id: 'audio-' + bus.id + '-toggle',
                    'aria-pressed': bus.on ? 'true' : 'false',
                    dataset: {
                      action: 'legacy-call',
                      call: 'toggleAudioBus',
                      callArgs: `'${bus.id}'`,
                    },
                  },
                  bus.label
                ),
                h(
                  'label',
                  { class: 'settings-sound-volume' },
                  h('span', null, m.sound.volumeLabel),
                  h('input', {
                    type: 'range',
                    min: '0',
                    max: '100',
                    step: '1',
                    value: String(bus.vol),
                    id: 'audio-' + bus.id + '-volume',
                    'aria-label': bus.label,
                    dataset: {
                      action: 'stop-propagation',
                      inputCall: 'setAudioVolume',
                      inputArgs: `'${bus.id}',this.value`,
                    },
                  }),
                  h('output', { id: 'audio-' + bus.id + '-value' }, bus.vol + ' %')
                )
              )
            )
          )
        : null,
      // ── Save profile (skeleton — updateSaveProfileControls fills it) ──
      h(
        'div',
        { class: 'settings-section', id: 'save-profile-section' },
        h('h3', { id: 'save-profile-heading' }),
        h('div', { id: 'save-profile-preview', class: 'save-profile-preview' }),
        h(
          'label',
          { class: 'save-profile-field', for: 'save-profile-name' },
          h('span', { id: 'save-profile-name-label' }),
          h('input', {
            type: 'text',
            id: 'save-profile-name',
            maxlength: '32',
            autocomplete: 'off',
          })
        ),
        h(
          'label',
          { class: 'save-profile-field', for: 'save-profile-background' },
          h('span', { id: 'save-profile-background-label' }),
          h('select', { id: 'save-profile-background' })
        ),
        // Wave 28 (user feedback): no sprite + name recap under the label —
        // the chosen icon is already painted live on the save-card preview
        // just above, so the recap zone was pure duplicate. The picker
        // button stays; renderSaveProfileCurrentIcon() no-ops (target gone).
        h(
          'div',
          { class: 'save-profile-field' },
          h('span', { id: 'save-profile-icon-label' }),
          h('button', {
            type: 'button',
            id: 'save-profile-icon-btn',
            class: 'hbtn',
            dataset: { action: 'legacy-call', call: 'openSaveIconBoxSelector', callArgs: '' },
          })
        ),
        h(
          'div',
          { class: 'settings-row' },
          h('button', {
            type: 'button',
            id: 'save-profile-apply-btn',
            class: 'hbtn',
            dataset: { action: 'legacy-call', call: 'applySaveProfileSettings', callArgs: '' },
          })
        )
      ),
      // ── Save management ─────────────────────────────────────────────
      m.save
        ? h(
            'div',
            { class: 'settings-section' },
            h('h3', null, m.save.heading),
            h(
              'div',
              { class: 'settings-row' },
              h(
                'button',
                { type: 'button', class: 'hbtn', dataset: { action: 'save-game' } },
                m.save.saveLabel
              ),
              h(
                'button',
                { type: 'button', class: 'hbtn', dataset: { action: 'load-game' } },
                m.save.loadLabel
              )
            ),
            h(
              'div',
              { class: 'settings-row' },
              h(
                'button',
                { type: 'button', class: 'hbtn', dataset: { action: 'export-save' } },
                m.save.exportLabel
              ),
              h(
                'label',
                { class: 'hbtn pw-settings-import-label', for: 'import-file' },
                m.save.importLabel
              )
            ),
            h('input', {
              type: 'file',
              id: 'import-file',
              accept: '.json,application/json',
              class: 'pw-visually-hidden',
              dataset: { action: 'import-save-file' },
            }),
            h(
              'div',
              { class: 'settings-row', id: 'delete-row' },
              h(
                'button',
                {
                  type: 'button',
                  class: 'hbtn pw-btn-danger',
                  dataset: { action: 'confirm-delete' },
                },
                m.save.deleteLabel
              )
            ),
            h(
              'div',
              {
                class: 'settings-row delete-danger-zone',
                id: 'delete-confirm-row',
                style: { display: 'none' },
              },
              h('span', { class: 'delete-warn' }, m.save.deleteWarning),
              h(
                'button',
                { type: 'button', class: 'hbtn pw-btn-danger', dataset: { action: 'do-delete' } },
                m.save.confirmLabel
              ),
              h(
                'button',
                { type: 'button', class: 'hbtn', dataset: { action: 'cancel-delete' } },
                m.save.cancelLabel
              )
            )
          )
        : null,
      // ── Community (V7-R1 · retours joueurs #4) ───────────────────────
      m.community && m.community.discordUrl
        ? h(
            'div',
            { class: 'settings-section', id: 'community-section' },
            h('h3', null, m.community.heading),
            m.community.hint ? h('p', { class: 'settings-hint' }, m.community.hint) : null,
            discordLinkVNode(
              m.community.discordUrl,
              m.community.discordLabel,
              'settings-discord-btn'
            )
          )
        : null,
      // ── Advanced: debug access code (V7-R1 · retours joueurs #8) ─────
      m.advanced
        ? h(
            'div',
            { class: 'settings-section', id: 'advanced-section' },
            h('h3', null, m.advanced.heading),
            m.advanced.debugOn
              ? h(
                  'div',
                  { class: 'settings-row' },
                  h('span', { class: 'diag-count' }, m.advanced.debugOnLabel),
                  h(
                    'button',
                    {
                      type: 'button',
                      id: 'debug-hide-btn',
                      class: 'hbtn',
                      dataset: { action: 'legacy-call', call: 'hideDebugMode', callArgs: '' },
                    },
                    m.advanced.hideLabel
                  )
                )
              : h(
                  'div',
                  { class: 'settings-row pw-debug-code-row' },
                  h('label', { for: 'debug-code-input' }, m.advanced.codeLabel),
                  h('input', {
                    type: 'password',
                    id: 'debug-code-input',
                    class: 'pw-debug-code-input',
                    autocomplete: 'off',
                    autocapitalize: 'off',
                    spellcheck: 'false',
                    maxlength: '32',
                    placeholder: m.advanced.codePlaceholder || '',
                  }),
                  h(
                    'button',
                    {
                      type: 'button',
                      id: 'debug-code-submit',
                      class: 'hbtn',
                      dataset: { action: 'legacy-call', call: 'submitDebugCode', callArgs: '' },
                    },
                    m.advanced.submitLabel
                  )
                ),
            null
          )
        : null,
      // ── Diagnostics (V7 · OBS-01) ───────────────────────────────────
      m.diag
        ? h(
            'div',
            { class: 'settings-section', id: 'diag-section' },
            h('h3', null, m.diag.heading),
            h(
              'div',
              { class: 'settings-row' },
              h('span', { id: 'diag-count', class: 'diag-count' }, m.diag.countLabel)
            ),
            h(
              'div',
              { class: 'settings-row' },
              h(
                'button',
                {
                  type: 'button',
                  id: 'diag-copy-btn',
                  class: 'hbtn',
                  dataset: { action: 'legacy-call', call: 'copyErrorReport', callArgs: '' },
                },
                m.diag.copyLabel
              ),
              h(
                'button',
                {
                  type: 'button',
                  id: 'diag-clear-btn',
                  class: 'hbtn',
                  dataset: {
                    action: 'legacy-call',
                    call: 'clearDiagErrorsAndRefresh',
                    callArgs: '',
                  },
                },
                m.diag.clearLabel
              )
            )
          )
        : null
    );
  }

  onLoad() {
    this.windowEntity = this.spawn('ui:settings-body', []);
    this.windowEntity.addComponent(
      new UIRenderComponent({
        template: () => this.windowVNode(),
      })
    );
  }

  /**
   * DOM-free serialization for the classic adapter (settings.js).
   * @param {Object} model
   * @returns {string}
   */
  static toHTML(model) {
    const view = new SettingsModalView(model);
    view.enter();
    return toHTMLString(view.buildView());
  }
}
