import { describe, expect, it } from 'vitest';
import { ContractError, validateModule } from './contract';

const entry = { name: 'policies', url: 'http://x/remoteEntry.js', title: 'Policies' };
const manifest = {
  name: 'policies',
  version: '1.0.0',
  title: 'Policies',
  requiredPermissions: ['policy:read'],
  sdkVersionRange: '^1.0.0',
  entry: 'react',
};
const Component = () => null;

describe('validateModule', () => {
  it('accepts a module that meets the contract', () => {
    const mod = validateModule({ manifest, default: Component }, entry, '1.2.0');
    expect(mod.manifest.name).toBe('policies');
  });

  it.each([
    ['non-object export', 42, /not an object/],
    ['bad manifest', { manifest: { ...manifest, requiredPermissions: ['root'] } }, /invalid manifest/],
    ['name mismatch', { manifest: { ...manifest, name: 'other' }, default: Component }, /does not match/],
    ['SDK too old', { manifest: { ...manifest, sdkVersionRange: '^2.0.0' }, default: Component }, /needs shell SDK/],
    ['missing default', { manifest }, /default-exported component/],
    ['missing mount', { manifest: { ...manifest, entry: 'mount' } }, /mount\(el, sdk\)/],
  ])('rejects %s', (_label, mod, message) => {
    expect(() => validateModule(mod, entry, '1.2.0')).toThrow(ContractError);
    expect(() => validateModule(mod, entry, '1.2.0')).toThrow(message);
  });
});
