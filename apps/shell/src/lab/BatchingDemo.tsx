import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * React 18 automatic batching: setState calls inside timeouts, promises and native handlers
 * are batched into ONE render/commit (React 17 only batched inside React event handlers).
 * flushSync is the escape hatch that forces a synchronous commit.
 */
export function BatchingDemo() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);

  // Count commits without causing renders: write straight to the DOM from a layout effect.
  const commits = useRef(0);
  const before = useRef(0);
  const total = useRef<HTMLOutputElement>(null);
  const last = useRef<HTMLOutputElement>(null);
  useLayoutEffect(() => {
    commits.current += 1;
    if (total.current) total.current.textContent = String(commits.current);
    if (last.current) last.current.textContent = String(commits.current - before.current);
  });

  const batched = () => {
    before.current = commits.current;
    setTimeout(() => {
      setA((x) => x + 1);
      setB((x) => x + 1);
      setC((x) => x + 1);
    }, 0);
  };

  const forced = () => {
    before.current = commits.current;
    setTimeout(() => {
      flushSync(() => setA((x) => x + 1));
      flushSync(() => setB((x) => x + 1));
      flushSync(() => setC((x) => x + 1));
    }, 0);
  };

  return (
    <div>
      <div className="shell-row">
        <button type="button" className="shell-btn" onClick={batched}>
          3 updates in setTimeout
        </button>
        <button type="button" className="shell-btn shell-btn--ghost" onClick={forced}>
          Same, each wrapped in flushSync
        </button>
      </div>
      <p>
        a={a} b={b} c={c} · last click caused <output ref={last}>0</output> commit(s) · total
        commits <output ref={total}>0</output>
      </p>
      <p className="shell-muted">
        Expect 1 commit for the first button and 3 for the second. (In dev, StrictMode runs the
        mount effect twice, so the total starts at 2.)
      </p>
    </div>
  );
}
