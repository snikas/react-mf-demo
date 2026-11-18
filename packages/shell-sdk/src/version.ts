/**
 * Semver for the SDK. Modules declare `sdkVersionRange` in their manifest and the shell
 * refuses to mount a module whose range doesn't include this. A contract test keeps this
 * in sync with package.json.
 */
export const SDK_VERSION = '1.2.0';
