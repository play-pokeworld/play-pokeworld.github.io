import { describe, assert } from './TestRunner.js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const appConfig = JSON.parse(readFileSync(new URL('../apps/mobile/app.json', import.meta.url), 'utf8'));
const mobileRoot = resolve('apps/mobile');

describe('Android app launcher icon', (test) => {
  test('Expo points to local square launcher and adaptive foreground icons', () => {
    const iconPath = resolve(mobileRoot, appConfig.expo.icon);
    const adaptivePath = resolve(mobileRoot, appConfig.expo.android.adaptiveIcon.foregroundImage);
    assert.ok(existsSync(iconPath));
    assert.ok(existsSync(adaptivePath));
    assert.equal(appConfig.expo.android.adaptiveIcon.backgroundColor, '#171612');
  });
});
