import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { ModuleManifest, ShellSdk } from '@demo/shell-sdk';
import pkg from '../package.json';
import { AuditApp } from './AuditApp';

export const manifest = {
  name: 'audit',
  version: pkg.version,
  title: 'Audit Log',
  requiredPermissions: ['audit:read'],
  sdkVersionRange: '^1.2.0',
  entry: 'mount',
} satisfies ModuleManifest;

/**
 * Framework-agnostic contract: `mount(el, sdk)` returns an unmount function. The shell
 * doesn't need to know this module uses React; it could be Vue, Svelte or a Web Component.
 * Trade-off: this is a separate React root, so shell context and the shell's error
 * boundaries don't reach inside. Everything goes through the SDK.
 */
export function mount(el: HTMLElement, sdk: ShellSdk): () => void {
  const root = createRoot(el);
  root.render(
    <StrictMode>
      <AuditApp sdk={sdk} />
    </StrictMode>,
  );
  // Defer: unmounting a root synchronously while the host React tree is mid-commit warns.
  return () => queueMicrotask(() => root.unmount());
}
