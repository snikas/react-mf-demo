import { describe, expect, it } from 'vitest';
import { createMockJwt, decodeJwt, isExpired, permissionsFor } from './auth';
import { createShellSdk } from './createShellSdk';

describe('RBAC', () => {
  it('maps roles to permissions', () => {
    expect(permissionsFor(['viewer'])).toEqual(['policy:read']);
    expect(permissionsFor(['editor'])).toContain('policy:edit');
    expect(permissionsFor(['editor'])).not.toContain('audit:export');
  });

  it('sdk.auth.can follows the signed-in role', () => {
    const { sdk, admin } = createShellSdk();
    expect(sdk.auth.can('policy:read')).toBe(false);
    admin.signIn('viewer');
    expect(sdk.auth.can('policy:edit')).toBe(false);
    admin.signIn('admin');
    expect(sdk.auth.can('flags:manage')).toBe(true);
  });
});

describe('JWT', () => {
  const claims = {
    iss: 'https://auth.test',
    aud: 'console',
    sub: 'u-1',
    name: 'Test',
    tenant: 't',
    roles: ['editor' as const],
    iat: 1000,
    exp: 1300,
  };

  it('round-trips claims through base64url', () => {
    const token = createMockJwt(claims);
    expect(token.split('.')).toHaveLength(3);
    expect(decodeJwt(token)).toEqual(claims);
  });

  it('rejects malformed tokens and detects expiry', () => {
    expect(() => decodeJwt('nope')).toThrow('Malformed JWT');
    expect(isExpired(claims, 1299_000)).toBe(false);
    expect(isExpired(claims, 1300_000)).toBe(true);
  });

  it('getToken silently refreshes an expired access token', async () => {
    let now = 1_000_000;
    const { sdk, admin } = createShellSdk({ now: () => now });
    await expect(sdk.auth.getToken()).rejects.toThrow('Not authenticated');
    admin.signIn('editor');
    const first = decodeJwt(await sdk.auth.getToken());
    now += 10 * 60 * 1000; // 10 minutes later: past the 5 minute TTL
    const second = decodeJwt(await sdk.auth.getToken());
    expect(second.exp).toBeGreaterThan(first.exp);
  });
});
