import { createStore, type ModuleManifest } from '@demo/shell-sdk';

export type ModuleStatus =
  | { state: 'loading' }
  | { state: 'loaded'; manifest: ModuleManifest; loadedAt: number }
  | { state: 'failed'; error: string };

export interface ErrorReport {
  at: number;
  module: string;
  version?: string;
  message: string;
}

/** Shell-internal observability: what loaded, what failed. Shown on the Platform page. */
export const platformStore = createStore<{
  modules: Record<string, ModuleStatus>;
  errors: ErrorReport[];
}>({ modules: {}, errors: [] });

export function setModuleStatus(name: string, status: ModuleStatus) {
  platformStore.setState((s) => ({ modules: { ...s.modules, [name]: status } }));
}

/** Stand-in for Sentry/APM: report with module name + version so alerts can group by release. */
export function reportError(error: unknown, ctx: { module: string; version?: string }) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[telemetry] ${ctx.module}@${ctx.version ?? '?'}:`, error);
  platformStore.setState((s) => ({
    errors: [{ at: Date.now(), message, ...ctx }, ...s.errors].slice(0, 20),
  }));
}
