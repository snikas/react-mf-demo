import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  useStore,
  type ModuleManifest,
  type ModuleProps,
  type MountRemoteModule,
  type RemoteEntry,
  type RemoteModule,
  type ShellSdk,
} from '@demo/shell-sdk';
import { useShell } from '../ShellContext';
import { ModuleError } from '../components/ModuleError';
import { ModuleSkeleton } from '../components/ModuleSkeleton';
import { retry } from '../lib/retry';
import { validateModule } from './contract';
import { loadRemoteModule } from './loadRemote';
import { platformStore, reportError, setModuleStatus } from './platformStore';

type LazyModule = LazyExoticComponent<ComponentType<ModuleProps>>;

/** One lazy component per remote. Deleted on reset so "Try again" really reloads. */
const lazyCache = new Map<string, LazyModule>();

const isMount = (m: RemoteModule): m is MountRemoteModule => m.manifest.entry === 'mount';

/**
 * Adapter for the framework-agnostic contract: the remote owns its own render root inside
 * a div we give it. It could be React, Vue or a Web Component; the shell doesn't care.
 */
function MountAdapter({ sdk, mount }: { sdk: ShellSdk; mount: MountRemoteModule['mount'] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = document.createElement('div');
    ref.current?.appendChild(host);
    const unmount = mount(host, sdk);
    // StrictMode mounts, unmounts and remounts in dev. Cleanup makes that harmless.
    return () => {
      unmount();
      host.remove();
    };
  }, [sdk, mount]);
  return <div ref={ref} />;
}

/** Route guard driven by the module's own manifest (`requiredPermissions`). */
function PermissionGate({
  sdk,
  manifest,
  children,
}: {
  sdk: ShellSdk;
  manifest: ModuleManifest;
  children: React.ReactNode;
}) {
  useStore(sdk.store, (s) => s.user); // re-check when the user/role changes
  const missing = manifest.requiredPermissions.filter((p) => !sdk.auth.can(p));
  if (missing.length > 0) {
    return (
      <div className="shell-callout shell-callout--warning" role="status">
        <strong>Not authorised for {manifest.title}.</strong> Missing permission
        {missing.length > 1 ? 's' : ''}: <code>{missing.join(', ')}</code>. Switch role in the
        header. (The UI hides it; a real backend would also reject the API calls.)
      </div>
    );
  }
  return <>{children}</>;
}

function getLazyModule(entry: RemoteEntry, sdkVersion: string): LazyModule {
  const cached = lazyCache.get(entry.name);
  if (cached) return cached;

  const component = lazy(async () => {
    setModuleStatus(entry.name, { state: 'loading' });
    try {
      const raw = await retry(() => loadRemoteModule(entry), 1, 400);
      const mod = validateModule(raw, entry, sdkVersion);
      setModuleStatus(entry.name, { state: 'loaded', manifest: mod.manifest, loadedAt: Date.now() });

      const Inner: ComponentType<ModuleProps> = isMount(mod)
        ? ({ sdk }) => <MountAdapter sdk={sdk} mount={mod.mount} />
        : mod.default;

      function FederatedModule({ sdk }: ModuleProps) {
        return (
          <PermissionGate sdk={sdk} manifest={mod.manifest}>
            <Inner sdk={sdk} />
          </PermissionGate>
        );
      }
      FederatedModule.displayName = `Remote(${entry.name})`;
      return { default: FederatedModule };
    } catch (err) {
      setModuleStatus(entry.name, { state: 'failed', error: (err as Error).message });
      throw err;
    }
  });
  lazyCache.set(entry.name, component);
  return component;
}

function RemoteInner({ entry, sdk }: { entry: RemoteEntry; sdk: ShellSdk }) {
  const Module = getLazyModule(entry, sdk.version);
  return <Module sdk={sdk} />;
}

/**
 * The isolation unit for one team's module: ErrorBoundary (failed state) around Suspense
 * (loading state). One broken remote shows a scoped fallback with a retry button and is
 * reported with its name and version. The rest of the shell keeps working.
 */
export function RemoteSlot({ entry }: { entry: RemoteEntry }) {
  const { sdk } = useShell();
  return (
    <section className="shell-slot" aria-label={entry.title}>
      <ErrorBoundary
        resetKeys={[entry.url]}
        onReset={() => lazyCache.delete(entry.name)}
        onError={(error) => {
          const status = platformStore.getState().modules[entry.name];
          const version = status?.state === 'loaded' ? status.manifest.version : undefined;
          reportError(error, { module: entry.name, version });
        }}
        fallbackRender={(props) => <ModuleError {...props} moduleName={entry.title} />}
      >
        <Suspense fallback={<ModuleSkeleton title={entry.title} />}>
          <RemoteInner entry={entry} sdk={sdk} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
}
