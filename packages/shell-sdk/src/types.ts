import type { ComponentType } from 'react';
import type { Permission, Role } from './auth';
import type { EventBus, Unsubscribe } from './events';
import type { ModuleManifest } from './manifest';
import type { ReadonlyStore } from './store';

export interface User {
  id: string;
  name: string;
  tenant: string;
  role: Role;
  permissions: readonly Permission[];
}

export type ThemeName = 'light' | 'dark';

export interface Toast {
  kind: 'info' | 'success' | 'error';
  message: string;
}

/** The small amount of state that is genuinely cross-cutting. Everything else stays local. */
export interface ShellState {
  user: User | null;
  theme: ThemeName;
  flags: Record<string, boolean>;
}

/**
 * The shell SDK: a typed, versioned API that modules call instead of reaching into
 * globals. This object is the *only* thing the shell hands to a module.
 */
export interface ShellSdk {
  readonly version: string;
  auth: {
    getUser(): User | null;
    /** Access token from memory; silently refreshed if expired. Never from localStorage. */
    getToken(): Promise<string>;
    can(permission: Permission): boolean;
  };
  nav: { navigate(path: string): void };
  events: EventBus;
  ui: { notify(toast: Toast): void };
  flags: { isEnabled(key: string): boolean };
  /** Read-only view; subscribe with `useStore(sdk.store, selector)`. */
  store: ReadonlyStore<ShellState>;
}

export interface ModuleProps {
  sdk: ShellSdk;
}

/** What a remote's exposed `./Module` must export, by `manifest.entry`. */
export interface ReactRemoteModule {
  manifest: ModuleManifest & { entry: 'react' };
  default: ComponentType<ModuleProps>;
}
export interface MountRemoteModule {
  manifest: ModuleManifest & { entry: 'mount' };
  mount(el: HTMLElement, sdk: ShellSdk): Unsubscribe;
}
export type RemoteModule = ReactRemoteModule | MountRemoteModule;
