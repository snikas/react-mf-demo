import { useId, useMemo, useState, useTransition } from 'react';
import { CONSUMER_ROLES, DATA_ELEMENTS, PEOPLE, protect, type ConsumerRole, type Rule } from './data';
import styles from './PoliciesApp.module.css';

const MAX_ROWS = 150;

/**
 * "What would this role see?" Re-rendering hundreds of protected rows is expensive, so the
 * filter and role updates run inside startTransition: the input stays responsive and the
 * table updates when React has time. isPending dims the stale table.
 */
export function AccessPreview({ rules }: { rules: Rule[] }) {
  const id = useId();
  const [role, setRole] = useState<ConsumerRole>('Analyst');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  // Derived, not stored: the policy for the chosen role.
  const policy = useMemo(
    () => Object.fromEntries(rules.filter((r) => r.role === role).map((r) => [r.dataElement, r.action])),
    [rules, role],
  );

  const q = filter.trim().toLowerCase();
  const rows = (q ? PEOPLE.filter((p) => p.name.toLowerCase().includes(q)) : PEOPLE).slice(0, MAX_ROWS);

  return (
    <section className={styles.preview} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className={styles.subtitle}>
        Access preview
      </h3>
      <div className={styles.controls}>
        <label htmlFor={`${id}-role`}>View as</label>
        <select
          id={`${id}-role`}
          className={styles.select}
          value={role}
          onChange={(e) => {
            const next = e.target.value as ConsumerRole;
            startTransition(() => setRole(next));
          }}
        >
          {CONSUMER_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <label htmlFor={`${id}-q`}>Name</label>
        <input
          id={`${id}-q`}
          className={styles.input}
          value={text}
          placeholder="e.g. patel"
          onChange={(e) => {
            setText(e.target.value);
            startTransition(() => setFilter(e.target.value));
          }}
        />
        {isPending && <span className={styles.muted}>updating…</span>}
      </div>
      <div className={styles.tableWrap} style={{ opacity: isPending ? 0.55 : 1 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              {DATA_ELEMENTS.map((el) => (
                <th key={el} scope="col">
                  {el} <small className={styles.muted}>({policy[el]})</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                {DATA_ELEMENTS.map((el) => (
                  <td key={el} className={styles.mono}>
                    {protect(p.values[el], policy[el] ?? 'tokenized')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
