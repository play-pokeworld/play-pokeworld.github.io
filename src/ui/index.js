/**
 * PokeWorld UI Design System — Hand Export
 *
 * Exposes generic presentation components for building UI screens
 * without coupling to domain or gameplay rules.
 *
 * @module ui
 */

export { Window } from './Window.js';
export { Panel } from './Panel.js';
export { Button } from './Button.js';
export { Layout } from './Layout.js';
export { TextBox } from './TextBox.js';
export { WriteBox } from './WriteBox.js';
export { Scroll } from './Scroll.js';
export { Text } from './Text.js';
export { Badge } from './Badge.js';
export { ProgressBar } from './ProgressBar.js';
export { List } from './List.js';
export { Tabs } from './Tabs.js';
export { Tooltip } from './Tooltip.js';
export { Toolbar } from './Toolbar.js';
export { Toggle } from './Toggle.js';
export { buildSpriteCircle } from './sprite-circle.js';

// ECS-native design system (objects rebuilt on the real engine ECS) and the
// views rebuilt from zero on top of it — windows/panels layered over the
// GameScene (the game itself has only 2 scenes: MainMenu + Game).
export * as components from './components/index.js';
export * as views from './views/index.js';
