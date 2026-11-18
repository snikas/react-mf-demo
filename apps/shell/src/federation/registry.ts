import { RuntimeManifestSchema, type RuntimeManifest } from '@demo/shell-sdk';

/**
 * Dynamic remotes: the shell learns *where* each remote lives at runtime, per environment.
 * Teams deploy a new remote version by changing this file (a pointer), not the shell.
 * Fetched with no-store because it must never be stale; everything it points at is
 * immutable and content-hashed.
 */
export async function fetchRegistry(url: string = __REMOTES_MANIFEST__): Promise<RuntimeManifest> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load runtime manifest ${url} (${res.status})`);
  const manifest = RuntimeManifestSchema.parse(await res.json());
  return {
    ...manifest,
    // Relative URLs resolve against the page, so the same build works on any base path.
    remotes: manifest.remotes.map((r) => ({ ...r, url: new URL(r.url, document.baseURI).href })),
  };
}
