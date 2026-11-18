import { Link } from 'react-router-dom';
import { useShell } from '../ShellContext';

const TOUR = [
  {
    to: '/workspace',
    title: 'Two teams, one page',
    body: 'Policies (React entry) and Audit (mount entry) composed in one shell. Change a rule and watch the audit log receive a typed policy.rule.updated event.',
  },
  {
    to: '/m/reports',
    title: 'A broken remote, contained',
    body: 'The registry points "reports" at a URL that does not exist. Its error boundary shows a scoped fallback with retry; nothing else breaks.',
  },
  {
    to: '/workspace',
    title: 'RBAC from the manifest',
    body: 'Switch the header role to "viewer". Audit declares requiredPermissions: ["audit:read"], so the shell gates it; policy edits become read-only.',
  },
  {
    to: '/lab',
    title: 'React 18 lab',
    body: 'useTransition vs useDeferredValue, automatic batching vs flushSync, StrictMode double-mount with AbortController, lazy loading with preload and ChunkLoadError retry, useId.',
  },
  {
    to: '/platform',
    title: 'Platform inspector',
    body: 'The SDK version, decoded JWT claims (in memory, never localStorage), feature flags, loaded module manifests and error telemetry.',
  },
] as const;

export function HomePage() {
  const { registry } = useShell();
  return (
    <>
      <h1>React Micro-frontends Architecture Demo</h1>
      <p className="shell-lead">
        A host <strong>shell</strong> loads independently deployed <strong>remotes</strong> at
        runtime from an environment manifest (<code>{registry.environment}</code>). React is a
        shared singleton; modules talk to the shell only through a typed, versioned{' '}
        <strong>shell SDK</strong>.
      </p>

      <div className="shell-arch" aria-label="Architecture overview">
        <div className="shell-arch__box shell-arch__box--shell">
          <strong>Shell (host)</strong>
          <span>routing · auth/session · layout · theme · flags · telemetry · error isolation</span>
        </div>
        <div className="shell-arch__arrow" aria-hidden="true">
          ↓ fetch remotes manifest → inject remoteEntry.js → init share scope → get(&apos;./Module&apos;)
        </div>
        <div className="shell-arch__row">
          {registry.remotes.map((r) => (
            <div key={r.name} className="shell-arch__box">
              <strong>{r.title}</strong>
              <span className="shell-mono">{new URL(r.url).pathname}</span>
            </div>
          ))}
        </div>
        <div className="shell-arch__arrow" aria-hidden="true">
          ↕ shared singletons: react · react-dom · @demo/shell-sdk
        </div>
      </div>

      <h2>Take the tour</h2>
      <ol className="shell-tour">
        {TOUR.map((t) => (
          <li key={t.title}>
            <Link to={t.to}>{t.title}</Link>
            <p>{t.body}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
