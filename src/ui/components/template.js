export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function html(strings, ...values) {
  return strings.reduce((result, part, index) => {
    const value = index < values.length ? values[index] : '';
    return result + part + value;
  }, '');
}

export function safeHtml(strings, ...values) {
  return strings.reduce((result, part, index) => {
    const value = index < values.length ? escapeHtml(values[index]) : '';
    return result + part + value;
  }, '');
}

export function joinHtml(items, renderer) {
  return (items || []).map(renderer).join('');
}

