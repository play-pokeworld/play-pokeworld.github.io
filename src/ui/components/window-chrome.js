/**
 * PokéWorld UI — window chrome (Wave 30, user feedback)
 *
 * ONE window template for every panel hosted in #poke-modal (info sheets
 * move/item/talent, PC & NPC base dialogs, NPC editor, preset editor and
 * its pickers). Before, each family glued its own header/footer rendering
 * onto the shared modal (sticky pills, bare-span crosses, transparent
 * action rows) — hence "the header differs from the other menus" and, in
 * the NPC editor, content visibly travelling ABOVE the sticky title and
 * UNDER the transparent footer.
 *
 * pwApplyWindowChrome(inner) re-roots any of those panels into the
 * canonical quest-window architecture:
 *
 *   .pw-panel-shell            flex column filling the modal inner box
 *     ├─ .modal-title          flat, opaque header pinned at the TOP of the
 *     │                        shell (the universal `.modal-title` rule IS
 *     │                        the look of the other menus — zero custom
 *     │                        geometry here, identical by construction)
 *     ├─ .pw-panel-body        the ONLY scroller
 *     └─ .pw-panel-foot        flat, opaque footer pinned at the BOTTOM
 *                              (optional — absent when the panel has no
 *                              action row)
 *
 * Head and foot live OUTSIDE the scroll flow, so content can never show
 * above the title nor under the footer, at any scroll depth. Idempotent:
 * the classic adapters call it right after every innerHTML refresh.
 *
 * @module ui/components/window-chrome
 */

const _PW_FOOT_SELECTOR = '.pw-actions, .pw-btn-group, .pw-base-npced-actions, .pw-info-actions';

function _pwWindowCloseButton(oldBtn) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = oldBtn.className || 'modal-close';
  // Copy every data-* hook (action/call/callArgs…) exactly — the delegated
  // dispatcher must see the same contract, only the tag changes.
  for (const attr of Array.from(oldBtn.attributes || [])) {
    if (attr.name === 'class' || attr.name === 'type') continue;
    btn.setAttribute(attr.name, attr.value);
  }
  if (!oldBtn.dataset || !oldBtn.dataset.action) btn.setAttribute('data-action', (oldBtn.dataset && oldBtn.dataset.action) || 'close-modal');
  // The CSS draws the glyph for empty .modal-close (::before '✕'); keep any
  // existing text content otherwise.
  if (oldBtn.textContent && oldBtn.textContent.trim()) btn.textContent = oldBtn.textContent;
  oldBtn.replaceWith(btn);
  return btn;
}

export function pwApplyWindowChrome(inner) {
  if (!inner || !inner.querySelector) return null;
  const title = inner.querySelector('.modal-title');
  if (!title) return null;

  // The shell is the node that OWNS the title — for the view-backed panels
  // it is their root (.pw-base-dialog / .pw-base-npced / the framework's
  // .pw-view); for the string-built preset panels it is the inner itself,
  // wrapped once in a dedicated re-root div.
  let shell = title.parentElement;
  if (!shell) return null;
  if (shell === inner) {
    const reroot = inner.querySelector(':scope > .pw-panel-shell');
    if (reroot) {
      shell = reroot;
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'pw-panel-shell';
      while (inner.firstChild) wrap.appendChild(inner.firstChild);
      inner.appendChild(wrap);
      shell = wrap;
    }
  }
  shell.classList.add('pw-panel-shell');

  // Canonical close control: a real <button> like the other menus —
  // the bare <span class="modal-close"> rendered a different (unframed) ✕.
  const close = title.querySelector('.modal-close');
  if (close && close.tagName !== 'BUTTON') _pwWindowCloseButton(close);

  // Footer = the LAST direct child acting as an action row (kept classes).
  const kids = Array.from(shell.children);
  let foot = null;
  for (let i = kids.length - 1; i >= 0; i--) {
    const el = kids[i];
    if (el !== title && el.matches && el.matches(_PW_FOOT_SELECTOR) && !el.classList.contains('pw-panel-body')) { foot = el; break; }
  }
  if (foot) foot.classList.add('pw-panel-foot');

  // Body = the single scroller. The NPC editor already owns a dedicated
  // scroller (.pw-base-npced-scroll) — adopt it; everywhere else, move the
  // nodes sitting between the title and the footer into a fresh wrapper.
  let body = shell.querySelector(':scope > .pw-base-npced-scroll');
  if (body) {
    body.classList.add('pw-panel-body');
  } else {
    const existing = shell.querySelector(':scope > .pw-panel-body');
    if (existing) {
      body = existing;
    } else {
      body = document.createElement('div');
      body.className = 'pw-panel-body';
      Array.from(shell.children).forEach((el) => {
        if (el === title || el === foot) return;
        body.appendChild(el);
      });
      if (foot) shell.insertBefore(body, foot);
      else shell.appendChild(body);
    }
  }
  return shell;
}

// The classic adapters (prefix-less scripts, not modules) reach the helper
// through window; the ECS graph can also import it directly.
if (typeof window !== 'undefined') window.pwApplyWindowChrome = pwApplyWindowChrome;
if (typeof globalThis !== 'undefined') globalThis.pwApplyWindowChrome = pwApplyWindowChrome;

