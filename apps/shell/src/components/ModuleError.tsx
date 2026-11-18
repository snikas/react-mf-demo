import type { FallbackProps } from 'react-error-boundary';
import { isChunkLoadError } from '../lib/retry';

export function ModuleError({
  error,
  resetErrorBoundary,
  moduleName,
}: FallbackProps & { moduleName: string }) {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : 'Error';
  const staleDeploy = isChunkLoadError(error);
  return (
    <div className="shell-callout shell-callout--danger" role="alert">
      <p>
        <strong>{moduleName} is unavailable.</strong> The rest of the console still works.
      </p>
      <p className="shell-mono">
        {name}: {message}
      </p>
      <div className="shell-row">
        <button type="button" className="shell-btn" onClick={resetErrorBoundary}>
          Try again
        </button>
        {staleDeploy && (
          <button type="button" className="shell-btn shell-btn--ghost" onClick={() => location.reload()}>
            A new version was deployed. Reload page
          </button>
        )}
      </div>
    </div>
  );
}
