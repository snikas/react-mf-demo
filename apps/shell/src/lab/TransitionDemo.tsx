import { memo, useDeferredValue, useId, useState, useTransition } from 'react';

type Mode = 'urgent' | 'transition' | 'deferred';

const WORDS = ['ssn', 'email', 'iban', 'passport', 'dob', 'phone', 'address', 'card'];
const ITEMS = Array.from(
  { length: 5000 },
  (_, i) => `record-${String(i).padStart(4, '0')} ${WORDS[i % WORDS.length]} ${WORDS[(i * 7) % WORDS.length]}`,
);
const MAX_ROWS = 250;

/** Artificially slow row (~1ms each) so the cost of re-rendering the list is visible. */
function SlowRow({ text }: { text: string }) {
  const end = performance.now() + 1;
  while (performance.now() < end) {
    /* burn CPU */
  }
  return <li>{text}</li>;
}

/**
 * memo() matters for useDeferredValue: while the deferred value is stale, React re-renders
 * this with the *old* query, and memo lets it skip the work entirely.
 */
const SlowList = memo(function SlowList({ query }: { query: string }) {
  // Derived during render. No useEffect + setState ("You Might Not Need an Effect").
  const q = query.trim().toLowerCase();
  const matches = q ? ITEMS.filter((i) => i.includes(q)) : ITEMS;
  return (
    <>
      <p className="shell-muted">
        {matches.length} matches, rendering {Math.min(matches.length, MAX_ROWS)} slow rows
      </p>
      <ul className="lab-list">
        {matches.slice(0, MAX_ROWS).map((m) => (
          <SlowRow key={m} text={m} />
        ))}
      </ul>
    </>
  );
});

export function TransitionDemo() {
  const [mode, setMode] = useState<Mode>('transition');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredText = useDeferredValue(text);
  const id = useId();

  const onType = (value: string) => {
    setText(value); // urgent: the input must reflect every keystroke immediately
    if (mode === 'urgent') setQuery(value);
    else if (mode === 'transition') startTransition(() => setQuery(value)); // interruptible
  };

  const listQuery = mode === 'deferred' ? deferredText : query;
  const stale = mode === 'deferred' ? deferredText !== text : isPending;

  return (
    <div>
      <fieldset className="lab-fieldset">
        <legend>Update strategy</legend>
        {(
          [
            ['urgent', 'Urgent (no transition): typing janks'],
            ['transition', 'startTransition: list update is interruptible'],
            ['deferred', 'useDeferredValue: list lags behind a deferred copy'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="shell-field-inline">
            <input
              type="radio"
              name={`${id}-mode`}
              value={value}
              checked={mode === value}
              onChange={() => {
                setMode(value);
                setQuery(text);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <label htmlFor={`${id}-q`} className="lab-label">
        Filter 5,000 records (type fast, e.g. &quot;passport&quot;)
      </label>
      <input
        id={`${id}-q`}
        className="lab-input"
        value={text}
        onChange={(e) => onType(e.target.value)}
        autoComplete="off"
      />
      <div style={{ opacity: stale ? 0.5 : 1, transition: 'opacity 120ms' }} aria-busy={stale}>
        {stale && <span className="shell-badge">updating…</span>}
        <SlowList query={listQuery} />
      </div>
    </div>
  );
}
