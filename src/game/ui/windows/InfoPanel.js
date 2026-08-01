/**
 * PokeGame — Base Info Panel
 * 
 * Template Method pattern for all information panels.
 * Subclasses override _buildContent() to provide specific data.
 * 
 * Subclasses:
 *   ItemInfoPanel   — items/held items/CT/CS
 *   MoveInfoPanel   — attack details
 *   TalentInfoPanel — ability details  
 *   PokemonInfoPanel — pokemon summary
 * 
 * Usage:
 *   const panel = new ItemInfoPanel('life_orb');
 *   panel.open();
 */
(function() {
'use strict';

class InfoPanel {
  constructor(key, options = {}) {
    this.key = key;
    this.options = options;
    this._panel = null;
    this._lang = (window.G && window.G.lang) || 'fr';
    
    // Built automatically by _buildContent()
    this._data = {};
    this._sections = [];
  }

  /**
   * Build and open the panel
   */
  open() {
    this._buildContent();
    
    const title = this._getTitle();
    const html = this._sections.map(s => this._renderSection(s)).join('');
    const source = this._getSource();
    
    this._panel = new window.PokePanel({
      title: title,
      content: this._wrapContent(html, source),
      variant: 'modal',
      w: 520,
      onClose: () => this._onClose()
    });
    this._panel.open();
  }

  /**
   * Override in subclasses — fills this._sections
   */
  _buildContent() {
    // Subclass must override
  }

  /**
   * Override — returns panel title
   */
  _getTitle() { return this.key; }

  /**
   * Override — returns source/location info HTML or ''
   */
  _getSource() { return ''; }

  _wrapContent(bodyHtml, sourceHtml) {
    return `<div class="poke-info-panel" data-style="color:var(--light2);">
      ${bodyHtml}
      ${sourceHtml ? `<div class="info-section info-source" data-style="margin-top:12px;padding:8px 10px;background:var(--dark3);border-radius:6px;font-size:11px;color:var(--light1);">${sourceHtml}</div>` : ''}
    </div>`;
  }

  _renderSection(s) {
    if (!s) return '';
    return `<div class="info-section" data-style="margin-bottom:var(--ip-sec-margin);" style="--ip-sec-margin:${s.margin || '12px'};">
      ${s.title ? `<div class="info-section-title" data-style="font-size:13px;font-weight:bold;color:var(--light2);margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--dark3);">${s.title}</div>` : ''}
      ${s.body || ''}
    </div>`;
  }

  _renderRow(label, value, options = {}) {
    return `<div class="info-row" data-style="display:flex;justify-content:space-between;align-items:center;padding:var(--ip-row-pad);font-size:var(--ip-row-fs);" style="--ip-row-pad:${options.padding || '4px 0'};--ip-row-fs:${options.fontSize || '12px'};">
      <span data-style="color:var(--ip-label-c);" style="--ip-label-c:${options.labelColor || 'var(--light1)'};">${label}</span>
      <span data-style="color:var(--ip-value-c);font-weight:var(--ip-value-fw);" style="--ip-value-c:${options.valueColor || 'var(--light2)'};--ip-value-fw:${options.bold ? 'bold' : '400'};">${value}</span>
    </div>`;
  }

  _renderTag(text, color) {
    return `<span data-style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;color:white;background:var(--ip-badge-bg,#888);text-shadow:0 1px 2px rgba(0,0,0,0.3);" style="--ip-badge-bg:${color || '#888'};">${text}</span>`;
  }

  _getTypeColor(type) {
    const colors = window.PokeStyles?.colors?.types || {};
    return colors[type?.toLowerCase()] || '#888';
  }

  _typeBadge(type) {
    return this._renderTag(type, this._getTypeColor(type));
  }

  _t(key, ...args) {
    if (typeof window.t === 'function') return window.t(key, ...args);
    return key;
  }

  _tr(key, vars) {
    if (typeof window.tr === 'function') return window.tr(key, vars);
    return key;
  }

  _onClose() {}

  close() { if (this._panel) this._panel.close(); }
  isOpen() { return this._panel?.isOpen() || false; }
  get panel() { return this._panel; }
}

window.InfoPanel = InfoPanel;

// ─── ITEM INFO PANEL ───
class ItemInfoPanel extends InfoPanel {
  _buildContent() {
    const itm = window.ITEMS?.[this.key];
    if (!itm) return;
    
    const qty = (window.G?.inventory?.[this.key]) || 0;
    const lang = this._lang;
    
    // Section 1: Effect (core description)
    let effectText = '';
    if (typeof window.ItemEngine?.generateItemDesc === 'function') {
      effectText = window.ItemEngine.generateItemDesc(this.key, lang);
    }
    if (effectText) {
      this._sections.push({
        title: this._t('description') || 'Description',
        body: `<div class="item-effect-box" data-style="padding:10px 12px;background:var(--dark3);border-radius:8px;font-size:12px;line-height:1.6;color:var(--light2);">${effectText}</div>`
      });
    }

    // Section 2: Power display
    let powerDisplay = '';
    if (typeof window.ItemEngine?.getPowerDisplay === 'function') {
      powerDisplay = window.ItemEngine.getPowerDisplay(this.key);
    }
    if (powerDisplay) {
      this._sections.push({
        title: (typeof t==='function'?t('power_label'):'Power'),
        body: `<div data-style="padding:8px 10px;background:rgba(77,166,255,0.1);border-radius:6px;font-size:11px;color:var(--light1);">⚡ ${powerDisplay}</div>`
      });
    }

    // Section 3: Details (type, price, quantity)
    const typeLabels = {
      stone: (typeof t==='function'?t('evo_stone'):'Evolution Stone'),
      treasure: (typeof t==='function'?t('cat_treasure'):'Treasure'),
      fossil: (typeof t==='function'?t('cat_fossil'):'Fossil'),
      evolution: (typeof t==='function'?t('cat_evolution_item'):'Evolution Item'),
      held: (typeof t==='function'?t('cat_held_item'):'Held Item'),
      key: (typeof t==='function'?t('cat_key_item'):'Key Item'),
      ct: (typeof t==='function'?t('cat_tm'):'TM'),
      cs: (typeof t==='function'?t('cat_hm'):'HM'),
      candy: (typeof t==='function'?t('cat_candy'):'Candy'),
      memory: 'Memory', z_crystal: 'Z-Crystal',
      keystone: 'Keystone', stone: 'Stone',
    };
    const typeLabel = typeLabels[itm.type] || (typeof t==='function'?t('cat_item'):'Item');

    let detailsHtml = this._renderRow(this._t('price') || 'Prix', (itm.price || 0).toLocaleString() + '₽');
    detailsHtml += this._renderRow(this._t('owned') || 'Possédé', `×${qty}`);
    detailsHtml += this._renderRow(this._t('item_type') || 'Type', typeLabel);
    
    if (itm.typeBoost) {
      detailsHtml += this._renderRow(
        (typeof t==='function'?t('boosted_type'):'Boosted Type'),
        this._typeBadge(itm.typeBoost)
      );
    }
    if (itm.resistType) {
      detailsHtml += this._renderRow(
        (typeof t==='function'?t('resistance'):'Resistance'),
        `${this._typeBadge(itm.resistType)} ${itm.resistPercent || 30}%`
      );
    }
    if (itm.revive) {
      detailsHtml += this._renderRow(
        (typeof t==='function'?t('revives'):'Revives'),
        `#${itm.revive}`
      );
    }
    if (itm.evolution) {
      detailsHtml += this._renderRow(
        (typeof t==='function'?t('cat_evolution2'):'Evolution'),
        '✓ ' + (typeof t==='function'?t('evolves_some_pokemon'):'Evolves certain Pokemon')
      );
    }

    this._sections.push({ title: this._t('details') || 'Détails', body: detailsHtml });
  }

  _getTitle() {
    const lang = this._lang;
    if (typeof window.ItemEngine?.getItemNameLocalized === 'function') {
      return window.ItemEngine.getItemNameLocalized(this.key, lang);
    }
    return this.key.replace(/_/g, ' ');
  }

  _getSource() {
    const lang = this._lang;
    if (typeof window.getItemSource === 'function') {
      return window.getItemSource(this.key, lang);
    }
    const db = window.ItemDB?.[this.key];
    if (!db) return '';
    return (typeof t==='function'?t('where_to_find2'):'📍 Where to find: ') + (db.source || db.shop || 'various locations');
    return (typeof t==='function'?t('where_to_find2'):'📍 Where to find: ') + (db.source || db.shop || 'divers endroits');
  }
}

window.ItemInfoPanel = ItemInfoPanel;

// ─── MOVE INFO PANEL ───
class MoveInfoPanel extends InfoPanel {
  _buildContent() {
    const mv = window.MOVES?.[this.key];
    if (!mv) return;
    
    // Type badge + category
    const typeBadge = this._typeBadge(mv.type || 'Normal');
    const catLabel = mv.category === 'physical' ? (typeof t==='function'?t('move_cat_physical'):'Physical')
      : mv.category === 'special' ? (typeof t==='function'?t('move_cat_special'):'Special')
      : (typeof t==='function'?t('move_cat_status'):'Status');
    
    const power = mv.power || 0;
    const acc = mv.accuracy || 100;
    const pp = mv.pp || '∞';
    
    // Core stats
    let html = `<div data-style="display:flex;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
      ${typeBadge}
      <span data-style="font-size:12px;color:var(--light1);padding:2px 8px;background:var(--dark3);border-radius:4px;">${catLabel}</span>
    </div>`;
    
    html += this._renderRow(this._t('stat_power') || 'Puissance', power === 0 ? '—' : power, { bold: true });
    html += this._renderRow(this._t('stat_accuracy') || 'Précision', acc + '%');
    html += this._renderRow(this._t('stat_pp') || 'PP', String(pp));
    
    if (mv.priority) html += this._renderRow(this._t('priority') || 'Priorité', '+' + mv.priority);
    if (mv.crit) html += this._renderRow(this._t('crit_chance') || 'Taux Critique', 'Élevé');
    if (mv.recoil) html += this._renderRow(this._t('recoil') || 'Recul', Math.round(mv.recoil * 100) + '%');
    if (mv.heal) html += this._renderRow(this._t('heal') || 'Soin', Math.round(mv.heal * 100) + '%');
    if (mv.drain) html += this._renderRow(this._t('drain') || 'Absorption', 'Oui');
    if (mv.recharge) html += this._renderRow(this._t('recharge') || 'Recharge', (typeof t==='function'?t('needs_recharge'):'Needs recharge'));
    if (mv.multihit) html += this._renderRow(this._t('multihit') || 'Multi-coups', mv.multihit.join('-'));
    
    // Effects
    if (mv.eff) {
      const effNames = { burn: (typeof t==='function'?t('status_burn'):'Burn'), para: 'Paralysie', poison: 'Poison', sleep: 'Sommeil', freeze: 'Gel', confuse: 'Confusion', flinch: (typeof t==='function'?t('status_scared'):'Scared'), slow: 'Ralentissement' };
      var effEN = { burn: (typeof t==='function'?t('status_burn'):'Burn'), para: (typeof t==='function'?t('status_para'):'Paralysis'), poison: (typeof t==='function'?t('status_poison'):'Poison'), sleep: (typeof t==='function'?t('status_sleep'):'Sleep'), freeze: (typeof t==='function'?t('status_freeze'):'Freeze'), confuse: (typeof t==='function'?t('status_confuse'):'Confusion'), flinch: (typeof t==='function'?t('status_scared'):'Scared'), slow: (typeof t==='function'?t('status_slow'):'Slow') };
      const effName = (typeof t==='function'?t('status_' + mv.eff):(effEN[mv.eff] || effNames[mv.eff] || mv.eff));
      const pct = mv.effPct || mv.effChance || 0;
      html += this._renderRow(
        this._t('effect') || 'Effet',
        `${effName}${pct > 0 ? ' (' + pct + '%)' : ''}`
      );
    }
    
    // Description from localization
    const desc = this._t('moves.' + this.key + '.desc') || mv.desc || '';
    // Apply weather/terrain badges
    var enriched = typeof replaceWeatherTerms === 'function' ? replaceWeatherTerms(desc) : desc;
    if (desc && desc !== 'moves.' + this.key + '.desc') {
      this._sections.push({ title: this._t('description') || 'Description', body: `<div data-style="font-size:12px;line-height:1.5;">${desc}</div>` });
    }
    
    this._sections.push({ title: this._t('details') || 'Détails', body: html });
  }

  _getTitle() {
    const name = this._t('moves.' + this.key + '.name') || this.key.replace(/_/g, ' ');
    return name;
  }
}
window.MoveInfoPanel = MoveInfoPanel;

// ─── TALENT INFO PANEL ───
class TalentInfoPanel extends InfoPanel {
  _buildContent() {
    const tal = window.TALENTS?.[this.key] || window.ABILITIES?.[this.key];
    if (!tal) return;
    
    const desc = tal.desc || tal.info || this._t('talents.' + this.key + '.desc') || '';
    const types = tal.types || tal.type || [];
    const rarity = tal.rarity || 1;
    
    let html = '';
    if (types.length) {
      html += `<div data-style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">`;
      for (const t of types) {
        if (t !== 'all') html += this._typeBadge(t.charAt(0).toUpperCase() + t.slice(1));
      }
      html += `</div>`;
    }
    
    html += this._renderRow(
      this._t('rarity') || 'Rareté',
      '★'.repeat(rarity),
      { valueColor: 'var(--yellow,#F2D94E)' }
    );
    
    if (desc && desc !== 'talents.' + this.key + '.desc') {
      this._sections.push({ title: this._t('description') || 'Description', body: `<div data-style="font-size:12px;line-height:1.5;padding:8px;background:var(--dark3);border-radius:6px;">${desc}</div>` });
    }
    
    this._sections.push({ title: this._t('details') || 'Détails', body: html });
  }

  _getTitle() {
    return this._t('talents.' + this.key + '.name') || this.key.replace(/_/g, ' ');
  }
}
window.TalentInfoPanel = TalentInfoPanel;

// ─── POKEMON INFO PANEL ───
class PokemonInfoPanel extends InfoPanel {
  _buildContent() {
    const pokemon = this.options.pokemon || (window.PD?.[this.key]);
    if (!pokemon) return;
    
    const p = pokemon;
    const types = p.type || p.types || [];
    const bst = p.bst || p.stats || {};
    
    // Type badges
    let html = `<div data-style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">`;
    for (const t of types) html += this._typeBadge(t);
    html += `</div>`;
    
    // Stats
    const statLabels = { hp: 'HP', atk: 'Atk', def: 'Def', satk: 'SpA', sdef: 'SpD', spe: 'Spe' };
    for (const [s, label] of Object.entries(statLabels)) {
      const val = bst[s] || 0;
      html += this._renderRow(label, String(val));
    }
    
    // Total BST
    const total = Object.values(bst).reduce((a, b) => a + (b || 0), 0);
    html += this._renderRow('BST', String(total), { bold: true, valueColor: 'var(--light2)' });
    
    this._sections.push({ title: this._t('stat_base') || 'Stats de Base', body: html });
  }

  _getTitle() {
    return this._t('pokemon_names.' + this.key) || this.key;
  }
}
window.PokemonInfoPanel = PokemonInfoPanel;

})();

