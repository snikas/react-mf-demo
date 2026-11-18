import { Suspense, useCallback, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ModuleError } from '../components/ModuleError';
import { lazyWithRetry } from '../lib/lazyWithRetry';

type FailMode = 'none' | 'once' | 'always';

function chunkError() {
  const err = new Error('Loading chunk heavy-chart failed. (simulated stale deploy)');
  err.name = 'ChunkLoadError';
  return err;
}

function makeHeavyChart(failMode: FailMode, log: (s: string) => void) {
  let attempt = 0;
  return lazyWithRetry(
    async () => {
      attempt += 1;
      log(`import() attempt ${attempt}`);
      if (failMode === 'always' || (failMode === 'once' && attempt === 1)) {
        log(`attempt ${attempt} failed with ChunkLoadError`);
        throw chunkError();
      }
      const mod = await import(/* webpackChunkName: "heavy-chart" */ './HeavyChart');
      log(`attempt ${attempt} succeeded`);
      return mod;
    },
    { retries: 1, delayMs: 500 },
  );
}

export function LazyDemo() {
  const [lines, setLines] = useState<string[]>([]);
  const log = useCallback((s: string) => setLines((p) => [...p, s]), []);
  const [failMode, setFailMode] = useState<FailMode>('none');
  const [Chart, setChart] = useState(() => makeHeavyChart('none', log));
  const [show, setShow] = useState(false);

  const reset = (mode: FailMode) => {
    setFailMode(mode);
    setLines([]);
    setShow(false);
    setChart(() => makeHeavyChart(mode, log));
  };

  return (
    <div>
      <fieldset className="lab-fieldset">
        <legend>Simulate the network</legend>
        {(
          [
            ['none', 'Chunk loads fine'],
            ['once', 'First attempt fails (retry recovers)'],
            ['always', 'Every attempt fails (error boundary)'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="shell-field-inline">
            <input
              type="radio"
              name="lazy-fail"
              checked={failMode === value}
              onChange={() => reset(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="shell-row">
        <button
          type="button"
          className="shell-btn"
          // Preload on intent: the chunk starts downloading on hover/focus, before the click.
          onMouseEnter={() => {
            log('hover → preload()');
            Chart.preload().catch(() => {});
          }}
          onFocus={() => Chart.preload().catch(() => {})}
          onClick={() => setShow(true)}
        >
          Show chart
        </button>
        <button type="button" className="shell-btn shell-btn--ghost" onClick={() => reset(failMode)}>
          Reset
        </button>
      </div>
      {show && (
        <ErrorBoundary
          resetKeys={[Chart]}
          fallbackRender={(p) => <ModuleError {...p} moduleName="Heavy chart" />}
          onReset={() => reset(failMode)}
        >
          <Suspense fallback={<p role="status">Loading chart chunk…</p>}>
            <Chart />
          </Suspense>
        </ErrorBoundary>
      )}
      <pre className="shell-pre">{lines.join('\n') || ' '}</pre>
    </div>
  );
}
