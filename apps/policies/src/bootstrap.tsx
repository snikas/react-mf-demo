import '@demo/shell-sdk/tokens.css';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createShellSdk, ROLES, type Role } from '@demo/shell-sdk';
import PoliciesApp from './PoliciesApp';

/**
 * Standalone dev harness: the team runs and tests its module without the real shell,
 * using the same SDK factory with a fake login. Open http://localhost:3001.
 */
const { sdk, admin } = createShellSdk({
  notify: (t) => console.info(`[toast:${t.kind}]`, t.message),
});
admin.signIn('editor');
sdk.events.subscribeAll((r) => console.info('[event]', r.event));

function Harness() {
  const [role, setRole] = useState<Role>('editor');
  return (
    <div style={{ padding: 24, background: 'var(--color-bg)', minHeight: '100vh' }}>
      <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        Standalone harness for <strong>policies</strong> ·{' '}
        <label>
          role{' '}
          <select
            value={role}
            onChange={(e) => {
              const r = e.target.value as Role;
              setRole(r);
              admin.signIn(r);
            }}
          >
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
      </p>
      <PoliciesApp sdk={sdk} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
