import { z } from 'zod';

/** `as const` keeps literal types, so `Permission` is a union, not `string`. */
export const PERMISSIONS = [
  'policy:read',
  'policy:edit',
  'audit:read',
  'audit:export',
  'flags:manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const PermissionSchema = z.enum(PERMISSIONS);

export const ROLES = ['viewer', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/**
 * RBAC: users have roles, roles grant permissions. UI code checks *permissions*
 * (`sdk.auth.can('policy:edit')`), never role names, so this table can change without
 * touching any module. `satisfies` checks the shape without widening the literal types.
 * Remember: the UI only hides/disables. The backend always enforces.
 */
export const ROLE_PERMISSIONS = {
  viewer: ['policy:read'],
  editor: ['policy:read', 'policy:edit', 'audit:read'],
  admin: ['policy:read', 'policy:edit', 'audit:read', 'audit:export', 'flags:manage'],
} as const satisfies Record<Role, readonly Permission[]>;

export function permissionsFor(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((r) => ROLE_PERMISSIONS[r]))];
}

export const JwtClaimsSchema = z.object({
  iss: z.string(),
  aud: z.string(),
  sub: z.string(),
  name: z.string(),
  tenant: z.string(),
  roles: z.array(z.enum(ROLES)),
  iat: z.number(),
  exp: z.number(),
});
export type JwtClaims = z.infer<typeof JwtClaimsSchema>;

const toB64Url = (s: string) =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '='));
};

/**
 * A JWT is header.payload.signature, base64url-encoded. It is *signed, not encrypted*:
 * anyone can read the payload, so never put secrets in it. Real tokens use RS256/ES256
 * and the server validates signature, `exp`, `iss` and `aud`. This mock is unsigned.
 */
export function createMockJwt(claims: JwtClaims): string {
  const header = toB64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = toB64Url(JSON.stringify(claims));
  return `${header}.${payload}.demo-signature-not-verified`;
}

/** Decoding is not verifying. Validate at the boundary with zod so types match reality. */
export function decodeJwt(token: string): JwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) throw new Error('Malformed JWT');
  const json: unknown = JSON.parse(fromB64Url(parts[1]));
  return JwtClaimsSchema.parse(json);
}

export const isExpired = (claims: JwtClaims, nowMs: number) => claims.exp * 1000 <= nowMs;
