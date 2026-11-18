import { useCallback, useEffect, useState } from 'react';
import type { AsyncState } from '../lib/async';

let requestSeq = 0;

function fakeFetch(id: number, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(`payload from request #${id}`), 700);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function Fetcher({ withCleanup, log }: { withCleanup: boolean; log: (line: string) => void }) {
  const [state, setState] = useState<AsyncState<string>>({ status: 'loading' });

  useEffect(() => {
    const id = ++requestSeq;
    log(`#${id} effect ran → request started`);
    if (!withCleanup) {
      // BUG: no cleanup. Under StrictMode's mount→unmount→mount, two requests race and both
      // call setState. In real life that's double POSTs, flicker, or stale data winning.
      fakeFetch(id).then((data) => {
        log(`#${id} resolved → setState`);
        setState({ status: 'ok', data });
      });
      return;
    }
    const ctrl = new AbortController();
    fakeFetch(id, ctrl.signal).then(
      (data) => {
        log(`#${id} resolved → setState`);
        setState({ status: 'ok', data });
      },
      () => log(`#${id} aborted, result ignored`),
    );
    return () => {
      log(`#${id} cleanup → abort()`);
      ctrl.abort(); // cleanup makes the double mount harmless
    };
  }, [withCleanup, log]);

  return (
    <p className="shell-mono">
      {state.status === 'ok' ? state.data : state.status === 'error' ? state.error : 'loading…'}
    </p>
  );
}

const IS_DEV = process.env.NODE_ENV !== 'production';

export function StrictModeFetchDemo() {
  const [withCleanup, setWithCleanup] = useState(true);
  const [mountKey, setMountKey] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const log = useCallback(
    (line: string) => setLines((prev) => [...prev.slice(-11), line]),
    [],
  );

  const remount = () => {
    setLines([]);
    setMountKey((k) => k + 1);
    // StrictMode is dev-only. In the production build we simulate its unmount/remount.
    if (!IS_DEV) setTimeout(() => setMountKey((k) => k + 1), 30);
  };

  return (
    <div>
      <p className="shell-muted">
        {IS_DEV
          ? 'Dev build: StrictMode really is mounting, unmounting and remounting this component.'
          : 'Production build: StrictMode checks are off here, so "Remount" simulates the double mount.'}
      </p>
      <div className="shell-row">
        <label className="shell-field-inline">
          <input
            type="checkbox"
            checked={withCleanup}
            onChange={(e) => {
              setWithCleanup(e.target.checked);
              setLines([]);
            }}
          />
          Effect returns cleanup (AbortController)
        </label>
        <button type="button" className="shell-btn" onClick={remount}>
          Remount
        </button>
      </div>
      <Fetcher key={`${mountKey}-${withCleanup}`} withCleanup={withCleanup} log={log} />
      <pre className="shell-pre" aria-live="polite">
        {lines.join('\n') || ' '}
      </pre>
    </div>
  );
}
