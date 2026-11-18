import { decodeJwt, DEFAULT_FLAGS, useStore, type JwtClaims } from '@demo/shell-sdk';
import { useEffect, useState } from 'react';
import { platformStore } from '../federation/platformStore';
import { useShell } from '../ShellContext';

export function PlatformPage() {
  const { sdk, admin, registry } = useShell();
  const user = useStore(sdk.store, (s) => s.user);
  const flags = useStore(sdk.store, (s) => s.flags);
  const modules = useStore(platformStore, (s) => s.modules);
  const errors = useStore(platformStore, (s) => s.errors);
  const canManageFlags = user?.permissions.includes('flags:manage') ?? false;

  const [claims, setClaims] = useState<JwtClaims | null>(null);
  useEffect(() => {
    // Re-read when the user changes. getToken() would silently refresh an expired token.
    let cancelled = false;
    sdk.auth
      .getToken()
      .then((t) => !cancelled && setClaims(decodeJwt(t)))
      .catch(() => !cancelled && setClaims(null));
    return () => {
      cancelled = true;
    };
  }, [sdk, user]);

  const token = admin.peekToken();

  return (
    <>
      <h1>Platform inspector</h1>

      <section className="shell-card">
        <h2>Session</h2>
        {user ? (
          <dl className="shell-dl">
            <dt>User</dt>
            <dd>
              {user.name} ({user.id}), tenant <code>{user.tenant}</code>
            </dd>
            <dt>Role</dt>
            <dd>
              <code>{user.role}</code>
            </dd>
            <dt>Permissions</dt>
            <dd>
              {user.permissions.map((p) => (
                <code key={p} className="shell-chip">
                  {p}
                </code>
              ))}
            </dd>
          </dl>
        ) : (
          <p>Signed out.</p>
        )}
        <h3>Access token (decoded)</h3>
        <p className="shell-muted">
          Kept in a closure inside the SDK, not in localStorage. A JWT is signed, not encrypted:
          anyone can read these claims, so never put secrets in them.
        </p>
        {token && <p className="shell-mono shell-wrap">{token}</p>}
        {claims ? (
          <pre className="shell-pre">{JSON.stringify(claims, null, 2)}</pre>
        ) : (
          <p>No token.</p>
        )}
      </section>

      <section className="shell-card">
        <h2>Feature flags</h2>
        {!canManageFlags && (
          <p className="shell-muted">
            Read-only. Requires <code>flags:manage</code> (sign in as admin).
          </p>
        )}
        <ul className="shell-list">
          {Object.keys(DEFAULT_FLAGS).map((key) => (
            <li key={key}>
              <label className="shell-field-inline">
                <input
                  type="checkbox"
                  checked={flags[key] ?? false}
                  disabled={!canManageFlags}
                  onChange={(e) => admin.setFlag(key, e.target.checked)}
                />
                <code>{key}</code>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="shell-card">
        <h2>Remote modules ({registry.environment})</h2>
        <div className="shell-table-wrap">
          <table className="shell-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">remoteEntry URL</th>
                <th scope="col">Status</th>
                <th scope="col">Manifest</th>
              </tr>
            </thead>
            <tbody>
              {registry.remotes.map((r) => {
                const status = modules[r.name];
                return (
                  <tr key={r.name}>
                    <td>
                      <code>{r.name}</code>
                    </td>
                    <td className="shell-mono shell-wrap">{r.url}</td>
                    <td>{status?.state ?? 'not loaded yet'}</td>
                    <td className="shell-mono">
                      {status?.state === 'loaded'
                        ? `v${status.manifest.version} · ${status.manifest.entry} · sdk ${status.manifest.sdkVersionRange} · needs [${status.manifest.requiredPermissions.join(', ')}]`
                        : status?.state === 'failed'
                          ? status.error
                          : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="shell-card">
        <h2>Error telemetry</h2>
        {errors.length === 0 ? (
          <p className="shell-muted">No errors reported. Visit the broken Reports module to create one.</p>
        ) : (
          <ul className="shell-list">
            {errors.map((e) => (
              <li key={`${e.at}-${e.message}`} className="shell-mono">
                {new Date(e.at).toLocaleTimeString()} · {e.module}@{e.version ?? '?'} · {e.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
