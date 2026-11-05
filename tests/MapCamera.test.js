import { describe, assert } from './TestRunner.js';
import { UIMapView } from '../src/ui/UIMapView.js';

describe('Interactive map camera', (test) => {
  test('builds accessible zoom controls and keeps the full canvas as the initial view', () => {
    const map = new UIMapView({ width: 1600, height: 960, svgId: 'camera-test-map' });
    const root = map.getDomElement();
    const svg = root.querySelector('#camera-test-map');
    assert.ok(svg, 'map SVG exists');
    assert.equal(svg.getAttribute('viewBox'), '0 0 1600 960');
    assert.ok(root.querySelector('#pw-map-zoom-in').getAttribute('aria-label'));
    assert.ok(root.querySelector('#pw-map-zoom-out').getAttribute('aria-label'));
    assert.ok(root.querySelector('#pw-map-zoom-reset').getAttribute('aria-label'));
    assert.equal(root.querySelectorAll('.pw-map-zoom-btn').length, 3);
    map.destroy();
  });
});
