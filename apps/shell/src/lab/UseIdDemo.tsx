import { useId } from 'react';

/**
 * useId generates IDs that match between server and client render (SSR-safe), unlike
 * Math.random() or a module counter. Ideal for label/aria wiring in reusable components.
 * Not for list keys.
 */
function Field({ label, hint }: { label: string; hint: string }) {
  const id = useId();
  return (
    <div className="lab-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={`${id}-hint`} className="lab-input" />
      <small id={`${id}-hint`} className="shell-muted">
        {hint} <code>id=&quot;{id}&quot;</code>
      </small>
    </div>
  );
}

export function UseIdDemo() {
  return (
    <div className="shell-grid-2">
      <Field label="Data element name" hint="Two instances of one component," />
      <Field label="Tokenization alphabet" hint="each with a unique, stable" />
    </div>
  );
}
