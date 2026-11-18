import { Suspense } from 'react';
import { Link, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ModuleSkeleton } from './components/ModuleSkeleton';
import { RemoteSlot } from './federation/RemoteSlot';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { HomePage } from './pages/HomePage';
import { PlatformPage } from './pages/PlatformPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { useShell } from './ShellContext';

// Route-level code splitting. The magic comments name the chunk and add
// <link rel="prefetch"> so the browser fetches it when idle.
const LabPage = lazyWithRetry(
  () => import(/* webpackChunkName: "lab" */ /* webpackPrefetch: true */ './pages/LabPage'),
);

function RemoteRoute() {
  const { name } = useParams();
  const { registry } = useShell();
  const entry = registry.remotes.find((r) => r.name === name);
  if (!entry) return <NotFound />;
  return (
    <>
      <h1>{entry.title}</h1>
      {entry.description && <p className="shell-muted">{entry.description}</p>}
      <RemoteSlot key={entry.name} entry={entry} />
    </>
  );
}

function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        <Link to="/">Back to the overview</Link>
      </p>
    </>
  );
}

export function App() {
  return (
    <Layout>
      <Suspense fallback={<ModuleSkeleton title="page" />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/m/:name" element={<RemoteRoute />} />
          <Route path="/lab" element={<LabPage />} />
          <Route path="/platform" element={<PlatformPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
