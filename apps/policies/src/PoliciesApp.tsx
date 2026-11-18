import { useEffect, useReducer, useState } from 'react';
import {
  ProtectionActionSchema,
  useStore,
  type ModuleProps,
  type ProtectionAction,
} from '@demo/shell-sdk';
import { AccessPreview } from './AccessPreview';
import { CONSUMER_ROLES, DATA_ELEMENTS, fetchRules, type Rule } from './data';
import styles from './PoliciesApp.module.css';

/** Discriminated union: the reducer can't produce "loading with rules" or "ok with error". */
type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ok'; rules: Rule[] };

type Action =
  | { type: 'loaded'; rules: Rule[] }
  | { type: 'failed'; error: string }
  | { type: 'set-action'; ruleId: string; action: ProtectionAction };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { status: 'ok', rules: action.rules };
    case 'failed':
      return { status: 'error', error: action.error };
    case 'set-action':
      if (state.status !== 'ok') return state;
      return {
        status: 'ok',
        rules: state.rules.map((r) => (r.id === action.ruleId ? { ...r, action: action.action } : r)),
      };
  }
}

const ACTIONS = ProtectionActionSchema.options;

export default function PoliciesApp({ sdk }: ModuleProps) {
  // Subscribing to `user` re-renders us on role change; then sdk.auth.can() is current.
  const user = useStore(sdk.store, (s) => s.user);
  const previewEnabled = useStore(sdk.store, (s) => s.flags['policies.accessPreview'] ?? false);
  const canEdit = sdk.auth.can('policy:edit');

  const [state, dispatch] = useReducer(reducer, { status: 'loading' });
  const [crash, setCrash] = useState<Error | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchRules(ctrl.signal).then(
      (rules) => dispatch({ type: 'loaded', rules }),
      (err: unknown) => {
        if (!ctrl.signal.aborted) dispatch({ type: 'failed', error: String(err) });
      },
    );
    return () => ctrl.abort(); // StrictMode-safe
  }, []);

  // Error boundaries only catch errors thrown during render. Throwing here (from state
  // set in an event handler) is how you route a handler/async error to the boundary.
  if (crash) throw crash;

  if (state.status === 'loading') return <p role="status">Loading policies…</p>;
  if (state.status === 'error') return <p role="alert">Could not load policies: {state.error}</p>;

  const rules = state.rules;
  const byKey = new Map(rules.map((r) => [`${r.dataElement}|${r.role}`, r]));

  const change = (rule: Rule, to: ProtectionAction) => {
    if (to === rule.action || !user) return;
    dispatch({ type: 'set-action', ruleId: rule.id, action: to });
    sdk.events.publish({
      type: 'policy.rule.updated',
      version: 1,
      payload: { ruleId: rule.id, dataElement: rule.dataElement, role: rule.role, from: rule.action, to, by: user.name },
    });
    sdk.ui.notify({ kind: 'success', message: `${rule.dataElement} for ${rule.role}: ${rule.action} → ${to}` });
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Protection policy</h2>
        <span className={canEdit ? styles.pillEdit : styles.pillRead}>
          {canEdit ? 'can edit' : 'read only'}
        </span>
      </header>
      <p className={styles.muted}>
        Who sees cleartext, masked or tokenized values for each data element.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>Protection action by data element and consumer role</caption>
          <thead>
            <tr>
              <th scope="col">Data element</th>
              {CONSUMER_ROLES.map((role) => (
                <th key={role} scope="col">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DATA_ELEMENTS.map((el) => (
              <tr key={el}>
                <th scope="row">{el}</th>
                {CONSUMER_ROLES.map((role) => {
                  const rule = byKey.get(`${el}|${role}`)!;
                  return (
                    <td key={role}>
                      <select
                        aria-label={`${el} for ${role}`}
                        className={`${styles.select} ${styles[rule.action]}`}
                        value={rule.action}
                        disabled={!canEdit}
                        title={canEdit ? undefined : 'Requires policy:edit'}
                        onChange={(e) => change(rule, e.target.value as ProtectionAction)}
                      >
                        {ACTIONS.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewEnabled ? (
        <AccessPreview rules={rules} />
      ) : (
        <p className={styles.muted}>
          Access preview is behind the <code>policies.accessPreview</code> flag (off).
        </p>
      )}

      <details className={styles.chaos}>
        <summary>Chaos testing</summary>
        <p className={styles.muted}>
          Prove the shell isolates this module. The shell&apos;s error boundary catches the crash and
          offers a retry; the Audit module next door keeps working.
        </p>
        <button
          type="button"
          className={styles.dangerBtn}
          onClick={() => {
            try {
              throw new Error('Policies crashed in an event handler (rethrown into render)');
            } catch (err) {
              setCrash(err as Error);
            }
          }}
        >
          Crash this module
        </button>
      </details>
    </div>
  );
}
