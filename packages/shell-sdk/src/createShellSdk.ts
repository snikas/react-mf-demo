import { createMockJwt, decodeJwt, isExpired, permissionsFor, type Role } from './auth';
import { createEventBus } from './events';
import { createStore, type Store } from './store';
import type { ShellSdk, ShellState, ThemeName, Toast, User } from './types';
import { SDK_VERSION } from './version';

export const DEFAULT_FLAGS: Record<string, boolean> = {
  'policies.accessPreview': true,
  'audit.showPayloads': false,
};

const DEMO_USERS: Record<Role, Pick<User, 'id' | 'name'>> = {
  viewer: { id: 'u-100', name: 'Vera Viewer' },
  editor: { id: 'u-200', name: 'Eddie Editor' },
  admin: { id: 'u-300', name: 'Ada Admin' },
};

const TOKEN_TTL_S = 5 * 60; // short-lived access token

export interface CreateShellSdkOptions {
  navigate?: (path: string) => void;
  notify?: (toast: Toast) => void;
  theme?: ThemeName;
  flags?: Record<string, boolean>;
  now?: () => number;
}

/**
 * Privileged controls the shell keeps for itself. Modules never receive this:
 * capability separation means a module can *read* the user but can't sign anyone in.
 */
export interface ShellAdmin {
  store: Store<ShellState>;
  signIn(role: Role): void;
  signOut(): void;
  setTheme(theme: ThemeName): void;
  setFlag(key: string, value: boolean): void;
  /** For the Platform inspector only. */
  peekToken(): string | null;
}

export function createShellSdk(opts: CreateShellSdkOptions = {}): {
  sdk: ShellSdk;
  admin: ShellAdmin;
} {
  const now = opts.now ?? Date.now;
  const store = createStore<ShellState>({
    user: null,
    theme: opts.theme ?? 'light',
    flags: { ...DEFAULT_FLAGS, ...opts.flags },
  });
  const events = createEventBus({ now });

  // In memory only. A real app keeps the refresh token in an httpOnly, Secure, SameSite
  // cookie (or behind a BFF) and never writes tokens to localStorage (XSS).
  let token: string | null = null;

  const mint = (user: User) => {
    const iat = Math.floor(now() / 1000);
    return createMockJwt({
      iss: 'https://auth.demo.local',
      aud: 'protection-console',
      sub: user.id,
      name: user.name,
      tenant: user.tenant,
      roles: [user.role],
      iat,
      exp: iat + TOKEN_TTL_S,
    });
  };

  const sdk: ShellSdk = {
    version: SDK_VERSION,
    auth: {
      getUser: () => store.getState().user,
      async getToken() {
        const user = store.getState().user;
        if (!user || !token) throw new Error('Not authenticated');
        if (isExpired(decodeJwt(token), now())) token = mint(user); // "silent refresh"
        return token;
      },
      can: (permission) => store.getState().user?.permissions.includes(permission) ?? false,
    },
    nav: { navigate: (path) => opts.navigate?.(path) },
    events,
    ui: { notify: (t) => opts.notify?.(t) },
    flags: { isEnabled: (key) => store.getState().flags[key] ?? false },
    store: { getState: store.getState, subscribe: store.subscribe },
  };

  const admin: ShellAdmin = {
    store,
    signIn(role) {
      const user: User = {
        ...DEMO_USERS[role],
        role,
        tenant: 'acme-health',
        permissions: permissionsFor([role]),
      };
      token = mint(user);
      store.setState({ user });
      events.publish({ type: 'auth.user.changed', version: 1, payload: { userId: user.id, role } });
    },
    signOut() {
      token = null;
      store.setState({ user: null });
      events.publish({ type: 'auth.user.changed', version: 1, payload: { userId: null, role: null } });
    },
    setTheme(theme) {
      store.setState({ theme });
      events.publish({ type: 'ui.theme.changed', version: 1, payload: { theme } });
    },
    setFlag(key, value) {
      store.setState((s) => ({ flags: { ...s.flags, [key]: value } }));
    },
    peekToken: () => token,
  };

  return { sdk, admin };
}
