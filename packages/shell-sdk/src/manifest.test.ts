import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { satisfies } from './manifest';
import { SDK_VERSION } from './version';

describe('satisfies (semver subset)', () => {
  it.each([
    ['1.2.0', '^1.1.0', true],
    ['1.9.9', '^1.1.0', true],
    ['2.0.0', '^1.1.0', false],
    ['1.0.9', '^1.1.0', false],
    ['0.3.4', '^0.3.0', true],
    ['0.4.0', '^0.3.0', false],
    ['1.2.5', '~1.2.0', true],
    ['1.3.0', '~1.2.0', false],
    ['3.0.0', '>=1.0.0', true],
    ['1.2.0', '1.2.0', true],
  ])('%s satisfies %s → %s', (version, range, expected) => {
    expect(satisfies(version, range)).toBe(expected);
  });
});

describe('SDK version', () => {
  it('matches package.json (the published contract)', () => {
    expect(SDK_VERSION).toBe(pkg.version);
  });
});
