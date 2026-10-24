/** @file SortableListRules.js @brief Shared hold, movement and interactive-target vocabulary for reorderable cards. */
export const SortableListRules = Object.freeze({
  HOLD_MS: 400,
  DRAG_THRESHOLD: 5,
  EDGE_PX: 80,
  MAX_SCROLL_STEP: 22,
  MOVE_SLOP: 8,
  CLICK_SUPPRESSION_MS: 250,
  BLOCKING_TARGETS:
    'button, a, input, select, textarea, [contenteditable="true"], [role="button"], [data-stop-drag="true"]',
});
