import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { retry } from './retry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy itself is typed with any
export type PreloadableLazy<T extends ComponentType<any>> = LazyExoticComponent<T> & {
  /** Call on hover/focus so the chunk is warm before the click. */
  preload: () => Promise<{ default: T }>;
};

/**
 * React.lazy + retry + preload.
 *
 * - The factory must resolve to a module with a *default* export, and the component must
 *   render inside <Suspense>.
 * - After a deploy, old hashed chunks disappear and lazy imports fail with ChunkLoadError.
 *   We retry once (transient network blips), then let the error reach the error boundary,
 *   which offers a full reload (see ModuleError).
 * - A failed load clears the memoized promise so a later retry really refetches.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  { retries = 1, delayMs = 300 } = {},
): PreloadableLazy<T> {
  let pending: Promise<{ default: T }> | undefined;
  const load = () =>
    (pending ??= retry(factory, retries, delayMs).catch((err: unknown) => {
      pending = undefined;
      throw err;
    }));
  const Component = lazy(load) as PreloadableLazy<T>;
  Component.preload = load;
  return Component;
}
