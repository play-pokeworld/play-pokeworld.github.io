const INLINE_EVENTS = ['click', 'contextmenu', 'change', 'mousedown', 'input', 'mouseover', 'mouseout'];
const dynamicStyleMap = new Map();
let dynamicStyleSheet = null;
let dynamicStyleCount = 0;

function getDynamicStyleSheet() {
  if (dynamicStyleSheet) return dynamicStyleSheet;
  const style = document.createElement('style');
  style.id = 'pokeworld-runtime-extracted-inline-styles';
  style.textContent = '/* Runtime-extracted legacy inline styles. */\n';
  document.head.appendChild(style);
  dynamicStyleSheet = style;
  return dynamicStyleSheet;
}

function classForInlineStyle(styleText) {
  const normalized = styleText.trim().replace(/;\s*/g, ';').replace(/\s*:\s*/g, ':');
  if (!normalized) return '';
  if (!dynamicStyleMap.has(normalized)) {
    const className = `runtime-style-${++dynamicStyleCount}`;
    dynamicStyleMap.set(normalized, className);
    getDynamicStyleSheet().appendChild(document.createTextNode(`.${className}{${normalized}}\n`));
  }
  return dynamicStyleMap.get(normalized);
}

function extractInlineStyle(element) {
  const styleText = element.getAttribute?.('style') || element.getAttribute?.('data-style') || element.getAttribute?.('data-inline-css');
  if (!styleText) return;
  const className = classForInlineStyle(styleText);
  if (!className) return;
  element.classList.add(className);
  element.removeAttribute('style');
  element.removeAttribute('data-style');
  element.removeAttribute('data-inline-css');
}

function getHandlerCode(element, eventName) {
  return element.getAttribute(`on${eventName}`) || element.getAttribute(`data-code-${eventName}`) || element.getAttribute(`data-inline-${eventName}`);
}

function removeHandlerAttributes(element, eventName) {
  element.removeAttribute(`on${eventName}`);
  element.removeAttribute(`data-code-${eventName}`);
  element.removeAttribute(`data-inline-${eventName}`);
}

function bindInlineHandler(element, eventName) {
  const code = getHandlerCode(element, eventName);
  if (!code) return;
  removeHandlerAttributes(element, eventName);
  element.addEventListener(eventName, function inlineHandlerBridge(event) {
    try {
      const result = Function('event', code).call(element, event);
      if (result === false) {
        event.preventDefault();
        event.stopPropagation();
      }
    } catch (error) {
      console.error(`[PokeWorld] Inline ${eventName} bridge failed`, error);
    }
  });
}

function sanitizeNode(node) {
  if (!node || node.nodeType !== 1) return;
  extractInlineStyle(node);
  for (const eventName of INLINE_EVENTS) bindInlineHandler(node, eventName);
  const selector = [
    '[data-style]',
    '[data-inline-css]',
    ...INLINE_EVENTS.flatMap((eventName) => [`[on${eventName}]`, `[data-code-${eventName}]`, `[data-inline-${eventName}]`]),
  ].join(',');
  node.querySelectorAll?.(selector).forEach((element) => {
    extractInlineStyle(element);
    for (const eventName of INLINE_EVENTS) bindInlineHandler(element, eventName);
  });
}

export function installInlineHandlerSanitizer(root = document) {
  sanitizeNode(root.documentElement || root);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(sanitizeNode);
      } else if (mutation.type === 'attributes') {
        sanitizeNode(mutation.target);
      }
    }
  });
  observer.observe(root.documentElement || root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-style',
      'data-inline-css',
      ...INLINE_EVENTS.flatMap((eventName) => [`on${eventName}`, `data-code-${eventName}`, `data-inline-${eventName}`]),
    ],
  });
  return observer;
}

