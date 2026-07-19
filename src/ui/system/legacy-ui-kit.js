export function uiIconHtml(name, size = 14, fallback = '') {
  if (typeof globalThis.getIcon === 'function') {
    return globalThis.getIcon(name, size);
  }
  return fallback;
}

export function uiButtonHtml({
  label = '',
  icon = '',
  call = '',
  args = '',
  variant = 'secondary',
  active = false,
  extraClass = '',
  disabled = false,
  dataAction = 'legacy-call',
} = {}) {
  const attrs = [];
  const classes = ['hbtn', 'ui-btn', `ui-btn--${variant}`];
  if (active) classes.push('is-active');
  if (extraClass) classes.push(extraClass);
  if (disabled) attrs.push('disabled');
  if (dataAction) attrs.push(`data-action="${dataAction}"`);
  if (call) attrs.push(`data-call="${call}"`);
  if (args !== '') attrs.push(`data-call-args="${String(args).replace(/"/g, '&quot;')}"`);
  const iconHtml = icon ? `<span class="ui-btn-icon">${icon}</span>` : '';
  return `<button class="${classes.join(' ')}" ${attrs.join(' ')}>${iconHtml}<span class="ui-btn-label">${label}</span></button>`;
}

export function uiTabButtonHtml({ label = '', icon = '', call = '', args = '', active = false } = {}) {
  return uiButtonHtml({
    label,
    icon,
    call,
    args,
    variant: 'tab',
    active,
    extraClass: 'ui-tab-btn',
  });
}

export function uiStatChipHtml(label, value) {
  return `<span class="ui-stat-chip"><b>${value}</b><small>${label}</small></span>`;
}

if (typeof window !== 'undefined') {
  window.uiIconHtml = uiIconHtml;
  window.uiButtonHtml = uiButtonHtml;
  window.uiTabButtonHtml = uiTabButtonHtml;
  window.uiStatChipHtml = uiStatChipHtml;
}
