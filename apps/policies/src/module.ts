import type { ModuleManifest } from '@demo/shell-sdk';
import pkg from '../package.json';

/**
 * The module contract this remote exposes as './Module'.
 * `satisfies` checks against the SDK type without widening `entry` to a plain string.
 */
export const manifest = {
  name: 'policies',
  version: pkg.version,
  title: 'Protection Policies',
  requiredPermissions: ['policy:read'],
  sdkVersionRange: '^1.1.0',
  entry: 'react',
} satisfies ModuleManifest;

export { default } from './PoliciesApp';
