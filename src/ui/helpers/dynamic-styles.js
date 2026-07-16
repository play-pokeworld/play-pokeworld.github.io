/**
 * Helper to apply dynamic styles from data attributes without using data-style bridges.
 * Replaces width/background/display etc. with CSS variables or direct style properties.
 * This allows us to eliminate data-style attributes while keeping dynamic visuals.
 */

export function applyDynamicStyles(root = document) {
  if (!root) return;
  // stat-fill, progress bars
  const pctEls = root.querySelectorAll ? root.querySelectorAll('[data-pct]') : [];
  pctEls.forEach(el => {
    const pct = el.dataset.pct;
    if (pct != null) {
      // Use CSS variable --pct and also direct width for fallback
      el.style.setProperty('--pct', pct + '%');
      // For elements that expect width percentage
      if (el.classList.contains('stat-fill') || el.classList.contains('location-progress-bar') || el.classList.contains('hatchery-progress') || el.classList.contains('mine-energy-fill') || el.classList.contains('quest-progress-bar') || el.classList.contains('xp-fill') || el.classList.contains('hp-fill')) {
        el.style.width = pct + '%';
      }
    }
    if (el.dataset.bg) {
      el.style.setProperty('--bg', el.dataset.bg);
      el.style.background = el.dataset.bg;
    }
  });



  // Generic background bridge used by mine tiles and revealed item cells
  root.querySelectorAll && root.querySelectorAll('[data-bg]').forEach(el => {
    if (!el.dataset.pct) {
      el.style.setProperty('--bg', el.dataset.bg);
      el.style.background = el.dataset.bg;
    }
  });

  // Background color for mine tiles
  root.querySelectorAll && root.querySelectorAll('[data-bg-color]').forEach(el => {
    el.style.background = el.dataset.bgColor;
  });

  // Type color
  root.querySelectorAll && root.querySelectorAll('[data-type-color]').forEach(el => {
    const color = el.dataset.typeColor;
    if (!color) return;
    el.style.setProperty('--type-color', color);
    if (el.classList.contains('legendary-sprite')) {
      if (!el.classList.contains('is-shiny')) {
        el.style.borderColor = color;
        el.style.backgroundColor = color + '22';
      }
    }
    if (el.classList.contains('box-move-card') || el.classList.contains('box-move-card--learnable') || el.classList.contains('poke-move') || el.classList.contains('auto-move')) {
      el.style.borderLeftColor = color;
      el.style.setProperty('--type-color', color);
    }
  });

  // Grid columns
  root.querySelectorAll && root.querySelectorAll('[data-grid-cols]').forEach(el => {
    el.style.gridTemplateColumns = `repeat(${el.dataset.gridCols}, 1fr)`;
  });

  // Color vars
  root.querySelectorAll && root.querySelectorAll('[data-color]').forEach(el => {
    el.style.setProperty('--starter-color', el.dataset.color);
  });
}

if (typeof window !== 'undefined') {
  window.applyDynamicStyles = applyDynamicStyles;
  // Auto-apply on DOM changes via MutationObserver for legacy renderers
  try {
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1) applyDynamicStyles(node);
          });
        }
        if (m.type === 'attributes' && (m.attributeName === 'data-pct' || m.attributeName === 'data-bg')) {
          applyDynamicStyles(m.target.parentElement || m.target);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-pct', 'data-bg', 'data-bg-color', 'data-type-color', 'data-grid-cols'] });
  } catch (_) {}
}
