/**
 * PokeGame — Unified Style Constants
 * 
 * Single source of truth for all visual parameters.
 * Every component should reference these values.
 */
window.PokeStyles = {
  // ─── Colors ───
  colors: {
    bg:        { primary: '#36342F', secondary: '#444138', tertiary: '#524f48' },
    text:      { primary: '#ECDEB7', secondary: '#94886B', muted: '#6B6352' },
    accent:    '#94886B',
    hp:        { high: '#60BE58', mid: '#FBA64C', low: '#D3425F' },
    xp:        '#539DDF',
    shiny:     '#FF4444',
    types: {
      bug:'#92BD2D', dark:'#595761', dragon:'#0C6AC8', electric:'#F2D94E',
      fairy:'#EF90E6', fighting:'#D3425F', fire:'#FBA64C', flying:'#A1BBEC',
      ghost:'#5F6DBC', grass:'#60BE58', ground:'#DA7C4D', ice:'#76D1C1',
      normal:'#A0A29F', poison:'#B763CF', psychic:'#FA8582', rock:'#C9BC8A',
      steel:'#5795A3', water:'#539DDF'
    }
  },

  // ─── Typography ───
  fonts: {
    body: "'Winky Sans','Segoe UI',system-ui,sans-serif",
    title: "'Winky Sans','Segoe UI',system-ui,sans-serif",
    letterSpacing: '0.5px'
  },
  fontSizes: {
    xs: '10px', sm: '11px', md: '13px', lg: '15px', xl: '20px',
    badge: '10px', stat: '11px', hp: '11px', label: '13px'
  },

  // ─── Spacing ───
  spacing: {
    xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px',
    padding: '10px', gap: '8px'
  },

  // ─── Sizes ───
  sizes: {
    sprite: { card: 72, large: 96, small: 48, icon: 40 },
    icon: { sm: 14, md: 18, lg: 22 },
    button: { sm: '28px', md: '34px', lg: '40px' },
    progress: { hp: 8, xp: 4, bar: 12 }
  },

  // ─── Border Radius ───
  radius: {
    sm: '4px', md: '8px', lg: '12px', full: '50%',
    pill: '999px'
  },

  // ─── Shadows ───
  shadows: {
    card: '0 2px 8px rgba(0,0,0,0.3)',
    hover: '0 4px 16px rgba(0,0,0,0.4)',
    modal: '0 8px 32px rgba(0,0,0,0.6)',
    glow: '0 0 15px rgba(236,222,183,0.4)',
    text: '0 1px 3px rgba(0,0,0,0.3)'
  },

  // ─── Transitions ───
  transition: {
    default: 'all 0.2s',
    slow: 'all 0.3s',
    hp: 'width 0.3s ease'
  },

  // ─── Z-Index layers ───
  z: {
    bg: -10, game: 0, ui: 10, overlay: 20,
    modal: 900, tooltip: 1000
  },

  // ─── CSS helper: generate inline style string ───
  css(props) {
    return Object.entries(props)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
      .join(';');
  }
};
