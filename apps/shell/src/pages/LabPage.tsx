import type { ReactNode } from 'react';
import { BatchingDemo } from '../lab/BatchingDemo';
import { LazyDemo } from '../lab/LazyDemo';
import { StrictModeFetchDemo } from '../lab/StrictModeFetchDemo';
import { TransitionDemo } from '../lab/TransitionDemo';
import { UseIdDemo } from '../lab/UseIdDemo';

function Demo({
  title,
  file,
  children,
  takeaway,
}: {
  title: string;
  file: string;
  takeaway: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="shell-card">
      <h2>{title}</h2>
      <p className="shell-takeaway">{takeaway}</p>
      {children}
      <p className="shell-muted shell-mono">source: apps/shell/src/{file}</p>
    </section>
  );
}

/** Default export: required by React.lazy. This page is its own "lab" chunk. */
export default function LabPage() {
  return (
    <>
      <h1>React 18 lab</h1>
      <p className="shell-lead">
        Each demo isolates one React 18 idea from the prep sheet. Read the source next to it.
      </p>

      <Demo
        title="useTransition vs useDeferredValue"
        file="lab/TransitionDemo.tsx"
        takeaway="Transitions don't make work faster; they make it interruptible, so urgent updates (typing) win. useDeferredValue does the same for a value you don't own the setter for."
      >
        <TransitionDemo />
      </Demo>

      <Demo
        title="Automatic batching and flushSync"
        file="lab/BatchingDemo.tsx"
        takeaway="React 18 batches updates everywhere: timeouts, promises, native handlers. flushSync opts out."
      >
        <BatchingDemo />
      </Demo>

      <Demo
        title="StrictMode double mount and effect cleanup"
        file="lab/StrictModeFetchDemo.tsx"
        takeaway='"My API call fires twice in dev" is StrictMode exposing a missing cleanup. Fix the effect (AbortController) or use a data library. Never remove StrictMode.'
      >
        <StrictModeFetchDemo />
      </Demo>

      <Demo
        title="Lazy loading, preload on intent, ChunkLoadError retry"
        file="lab/LazyDemo.tsx + lib/lazyWithRetry.ts"
        takeaway="Split by route, then heavy widgets. Preload on hover/focus. After a deploy old chunks vanish: retry once, then offer a reload."
      >
        <LazyDemo />
      </Demo>

      <Demo
        title="useId"
        file="lab/UseIdDemo.tsx"
        takeaway="SSR-safe unique IDs for accessibility wiring (htmlFor, aria-describedby)."
      >
        <UseIdDemo />
      </Demo>

      <section className="shell-card">
        <h2>Also in this repo</h2>
        <ul className="shell-list">
          <li>
            <strong>useSyncExternalStore</strong>: <code>packages/shell-sdk/src/store.ts</code> (shell
            store) and <code>apps/audit/src/AuditApp.tsx</code> (subscribing to the event bus).
          </li>
          <li>
            <strong>Error boundaries + Suspense per remote</strong>:{' '}
            <code>apps/shell/src/federation/RemoteSlot.tsx</code>.
          </li>
          <li>
            <strong>useReducer + discriminated unions</strong>:{' '}
            <code>apps/policies/src/PoliciesApp.tsx</code>.
          </li>
          <li>
            Read next:{' '}
            <a href="https://react.dev/learn/you-might-not-need-an-effect" target="_blank" rel="noreferrer">
              You Might Not Need an Effect
            </a>
            ,{' '}
            <a href="https://react.dev/reference/react/Suspense" target="_blank" rel="noreferrer">
              Suspense
            </a>
            ,{' '}
            <a href="https://react.dev/reference/react/StrictMode" target="_blank" rel="noreferrer">
              StrictMode
            </a>
            .
          </li>
        </ul>
      </section>
    </>
  );
}
