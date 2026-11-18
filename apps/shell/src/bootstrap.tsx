import '@demo/shell-sdk/tokens.css';
import './shell.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { createShellSdk } from '@demo/shell-sdk';
import { App } from './App';
import { navBridge } from './components/Layout';
import { fetchRegistry } from './federation/registry';
import { pushToast } from './lib/toasts';
import { ShellProvider, type ShellContextValue } from './ShellContext';

// React 18: createRoot (not ReactDOM.render) turns on concurrent rendering.
const root = createRoot(document.getElementById('root')!);

const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
const { sdk, admin } = createShellSdk({
  navigate: (path) => navBridge.navigate(path),
  notify: (toast) => pushToast(toast),
  theme: prefersDark ? 'dark' : 'light',
});

// The shell owns login. A real shell would run OIDC Authorization Code + PKCE here.
admin.signIn('editor');

fetchRegistry()
  .then((registry) => {
    const value: ShellContextValue = { sdk, admin, registry };
    root.render(
      // StrictMode is dev-only: double render + mount/unmount/remount to surface impure
      // renders and effects without cleanup. Never "fix" double fetches by removing it.
      <StrictMode>
        {/* HashRouter: static hosting (GitHub Pages) can't rewrite deep links to index.html.
            v7_startTransition wraps navigations in startTransition, so going to a lazy
            route keeps showing the current page instead of flashing a fallback. */}
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ShellProvider value={value}>
            <App />
          </ShellProvider>
        </HashRouter>
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    root.render(
      <div className="shell-callout shell-callout--danger" role="alert" style={{ margin: 24 }}>
        <strong>Shell failed to boot.</strong> {String(err)}
      </div>,
    );
  });
