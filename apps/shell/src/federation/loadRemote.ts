import type { RemoteEntry } from '@demo/shell-sdk';

/**
 * Loading a federated remote by hand: the four steps that `remotes: {...}` in webpack
 * config (or `loadRemote()` in Module Federation 2.0) does for you.
 *
 *   1. Inject <script src=".../remoteEntry.js">. It defines a global container `window[name]`.
 *   2. `__webpack_init_sharing__('default')` registers the host's shared modules.
 *   3. `container.init(shareScope)` lets the remote add its shared modules and agree on
 *      versions. With `singleton: true`, everyone ends up on ONE React.
 *   4. `container.get('./Module')` returns a factory for the exposed module.
 */

interface Container {
  init(shareScope: unknown): Promise<void> | void;
  get(module: string): Promise<() => unknown>;
}

export class RemoteLoadError extends Error {
  override name = 'RemoteLoadError';
}

const scripts = new Map<string, Promise<void>>();
const initialised = new Set<string>();

function loadScript(url: string, remoteName: string): Promise<void> {
  const cached = scripts.get(url);
  if (cached) return cached;
  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = url;
    el.async = true;
    el.dataset.remote = remoteName;
    el.onload = () => resolve();
    el.onerror = () => {
      el.remove();
      scripts.delete(url); // allow a retry to really refetch
      reject(new RemoteLoadError(`Could not load remote "${remoteName}" from ${url}`));
    };
    document.head.appendChild(el);
  });
  scripts.set(url, promise);
  return promise;
}

export async function loadRemoteModule(entry: RemoteEntry, exposed = './Module'): Promise<unknown> {
  await loadScript(entry.url, entry.name);
  await __webpack_init_sharing__('default');

  const container = (window as unknown as Record<string, Container | undefined>)[entry.name];
  if (!container) {
    throw new RemoteLoadError(`remoteEntry for "${entry.name}" loaded but window.${entry.name} is missing`);
  }
  if (!initialised.has(entry.name)) {
    await container.init(__webpack_share_scopes__.default);
    initialised.add(entry.name);
  }
  const factory = await container.get(exposed);
  return factory();
}
