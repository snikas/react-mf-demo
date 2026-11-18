import { useCallback, useSyncExternalStore } from 'react';
import { useStore, type EventRecord, type ShellEvent, type ShellSdk } from '@demo/shell-sdk';
import styles from './AuditApp.module.css';

function describe(e: ShellEvent): string {
  switch (e.type) {
    case 'policy.rule.updated':
      return `${e.payload.by} changed ${e.payload.dataElement} for ${e.payload.role}: ${e.payload.from} → ${e.payload.to}`;
    case 'auth.user.changed':
      return e.payload.userId ? `Signed in as ${e.payload.role} (${e.payload.userId})` : 'Signed out';
    case 'ui.theme.changed':
      return `Theme switched to ${e.payload.theme}`;
  }
}

function toCsv(records: readonly EventRecord[]): string {
  const rows = records.map((r) =>
    [new Date(r.at).toISOString(), r.event.type, `"${describe(r.event).replace(/"/g, '""')}"`].join(','),
  );
  return ['time,type,description', ...rows].join('\n');
}

export function AuditApp({ sdk }: { sdk: ShellSdk }) {
  // useSyncExternalStore straight on the event bus: `recent()` returns the same array until
  // the next publish, so it's a valid snapshot. `subscribe` must be stable (useCallback),
  // otherwise React unsubscribes and resubscribes on every render.
  const subscribe = useCallback((onChange: () => void) => sdk.events.subscribeAll(onChange), [sdk]);
  const records = useSyncExternalStore(subscribe, sdk.events.recent, sdk.events.recent);

  const showPayloads = useStore(sdk.store, (s) => s.flags['audit.showPayloads'] ?? false);
  useStore(sdk.store, (s) => s.user);
  const canExport = sdk.auth.can('audit:export');

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(records)], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
    sdk.ui.notify({ kind: 'info', message: `Exported ${records.length} audit events` });
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Audit log</h2>
        <span className={styles.count}>{records.length} events</span>
        {canExport && (
          <button type="button" className={styles.btn} onClick={exportCsv}>
            Export CSV
          </button>
        )}
      </header>
      <p className={styles.muted}>
        Separate build, separate React root, same bus. Listening with{' '}
        <code>sdk.events.subscribeAll</code>.
      </p>
      {records.length === 0 ? (
        <p className={styles.muted}>No events yet.</p>
      ) : (
        <ol className={styles.list} aria-live="polite">
          {[...records].reverse().map((r) => (
            <li key={r.id} className={styles.item}>
              <div className={styles.meta}>
                <time dateTime={new Date(r.at).toISOString()}>{new Date(r.at).toLocaleTimeString()}</time>
                <code className={styles.type}>{r.event.type}</code>
              </div>
              <div>{describe(r.event)}</div>
              {showPayloads && <pre className={styles.payload}>{JSON.stringify(r.event.payload, null, 2)}</pre>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
