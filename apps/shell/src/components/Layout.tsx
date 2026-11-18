import { useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ROLES, useStore, type Role } from '@demo/shell-sdk';
import { useShell } from '../ShellContext';
import { Toaster } from './Toaster';

const STATIC_LINKS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/workspace', label: 'Workspace (composed)' },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  const { sdk, admin, registry } = useShell();
  const user = useStore(sdk.store, (s) => s.user);
  const theme = useStore(sdk.store, (s) => s.theme);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const prevPath = useRef(pathname);

  // Let modules navigate through the SDK without importing the shell's router.
  useEffect(() => {
    navBridge.navigate = navigate;
  }, [navigate]);

  // The shell owns theming: one attribute swap, every module's var(--token) follows.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // a11y: on SPA route change, move focus to <main> so keyboard and screen-reader users
  // land on the new content (WCAG 2.4.3). Guarded so StrictMode's re-run is a no-op.
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    mainRef.current?.focus();
  }, [pathname]);

  const onRoleChange = (value: string) => {
    if (value === 'signed-out') admin.signOut();
    else admin.signIn(value as Role);
  };

  return (
    <div className="shell">
      <a className="shell-skip" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <header className="shell-header">
        <div className="shell-brand">
          <span className="shell-brand__mark" aria-hidden="true">◆</span>
          Protection Console
          <span className="shell-badge">shell v{__APP_VERSION__} · SDK v{sdk.version}</span>
        </div>
        <div className="shell-row">
          <label className="shell-field-inline">
            <span>Signed in as</span>
            <select value={user?.role ?? 'signed-out'} onChange={(e) => onRoleChange(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value="signed-out">signed out</option>
            </select>
          </label>
          <button
            type="button"
            className="shell-btn shell-btn--ghost"
            aria-pressed={theme === 'dark'}
            onClick={() => admin.setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light' : 'Dark'} theme
          </button>
        </div>
      </header>

      <nav className="shell-nav" aria-label="Primary">
        <ul>
          {STATIC_LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={'end' in l}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <p className="shell-nav__heading">Remote modules</p>
        <ul>
          {registry.remotes.map((r) => (
            <li key={r.name}>
              <NavLink to={`/m/${r.name}`}>{r.title}</NavLink>
            </li>
          ))}
        </ul>
        <p className="shell-nav__heading">Learn</p>
        <ul>
          <li>
            <NavLink to="/lab">React 18 lab</NavLink>
          </li>
          <li>
            <NavLink to="/platform">Platform inspector</NavLink>
          </li>
        </ul>
        <p className="shell-nav__env">
          env: <code>{registry.environment}</code>
        </p>
      </nav>

      <main id="main" ref={mainRef} tabIndex={-1} className="shell-main">
        {children}
      </main>
      <Toaster />
    </div>
  );
}

/** Filled in by Layout once the router exists; the SDK's nav.navigate calls through it. */
export const navBridge: { navigate: (path: string) => void } = {
  navigate: (path) => {
    location.hash = `#${path}`;
  },
};
