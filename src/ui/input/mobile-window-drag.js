export function applyMobileWindowDragPolicy() {
  const update = () => {
    const dragEnabled = window.matchMedia('(pointer: fine) and (min-width: 851px)').matches;
    document.documentElement.classList.toggle('window-drag-disabled', !dragEnabled);
  };
  update();
  window.addEventListener('resize', update, { passive: true });
}

