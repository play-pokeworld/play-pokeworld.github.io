export function createElement(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);
  const {
    className,
    text,
    html,
    attributes = {},
    dataset = {},
    events = {},
  } = options;
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  if (html != null) element.innerHTML = html;
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null || value === false) continue;
    if (value === true) element.setAttribute(name, '');
    else element.setAttribute(name, String(value));
  }
  for (const [name, value] of Object.entries(dataset)) {
    if (value != null) element.dataset[name] = String(value);
  }
  for (const [name, handler] of Object.entries(events)) {
    element.addEventListener(name, handler);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    element.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return element;
}

export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) element.removeChild(element.firstChild);
}

export function replaceChildren(element, children = []) {
  if (!element) return;
  clearElement(element);
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    element.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
}

export function createButton({ text, className = 'hbtn', action, dataset = {}, attributes = {} } = {}) {
  return createElement('button', {
    className,
    text,
    attributes,
    dataset: action ? { ...dataset, action } : dataset,
  });
}

