export function installTouchContextMenuBridge(root = document) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const LONG_PRESS_MS = 560;
  const MOVE_CANCEL_PX = 12;

  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch') return;
    const target = event.target.closest('[oncontextmenu], [data-context-action], .auto-move, .move-row, .inv-item, .box-card, .poke-sprite');
    if (!target) return;
    startX = event.clientX;
    startY = event.clientY;
    clear();
    timer = window.setTimeout(() => {
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: startX,
        clientY: startY,
      }));
    }, LONG_PRESS_MS);
  }, { passive: true });

  root.addEventListener('pointermove', (event) => {
    if (!timer) return;
    if (Math.abs(event.clientX - startX) > MOVE_CANCEL_PX || Math.abs(event.clientY - startY) > MOVE_CANCEL_PX) clear();
  }, { passive: true });
  root.addEventListener('pointerup', clear, { passive: true });
  root.addEventListener('pointercancel', clear, { passive: true });
}
