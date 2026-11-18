import { z } from 'zod';
import { PermissionSchema } from './auth';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * The module contract, part 1: what every remote declares about itself.
 * The shell validates this at load time, before rendering anything from the remote.
 */
export const ModuleManifestSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  version: z.string().regex(SEMVER),
  title: z.string().min(1),
  /** Shell uses these as a route guard. Backend still enforces. */
  requiredPermissions: z.array(PermissionSchema),
  /** Which shell SDK versions this module was built and tested against. */
  sdkVersionRange: z.string().min(1),
  /** Contract part 2: a React component taking `{ sdk }`, or framework-agnostic `mount(el, sdk)`. */
  entry: z.enum(['react', 'mount']),
});
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;

/**
 * The runtime (environment) manifest the shell fetches on boot. Pointing an entry at a new
 * URL *is* the release; pointing it back is the rollback. No shell rebuild.
 */
export const RuntimeManifestSchema = z.object({
  environment: z.string(),
  remotes: z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      title: z.string(),
      description: z.string().optional(),
    }),
  ),
});
export type RuntimeManifest = z.infer<typeof RuntimeManifestSchema>;
export type RemoteEntry = RuntimeManifest['remotes'][number];

type Triple = readonly [number, number, number];

function parse(v: string): Triple {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) throw new Error(`Invalid version "${v}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const cmp = (a: Triple, b: Triple) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * A tiny subset of semver range matching (^, ~, >=, exact). Enough for the demo;
 * in production use the `semver` package.
 */
export function satisfies(version: string, range: string): boolean {
  const v = parse(version);
  const r = range.trim();
  if (r.startsWith('^')) {
    const b = parse(r.slice(1));
    if (cmp(v, b) < 0) return false;
    return b[0] > 0 ? v[0] === b[0] : v[0] === 0 && v[1] === b[1];
  }
  if (r.startsWith('~')) {
    const b = parse(r.slice(1));
    return cmp(v, b) >= 0 && v[0] === b[0] && v[1] === b[1];
  }
  if (r.startsWith('>=')) return cmp(v, parse(r.slice(2))) >= 0;
  return cmp(v, parse(r)) === 0;
}
