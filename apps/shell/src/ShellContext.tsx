import { createContext, useContext } from 'react';
import type { RuntimeManifest, ShellAdmin, ShellSdk } from '@demo/shell-sdk';

export interface ShellContextValue {
  sdk: ShellSdk;
  admin: ShellAdmin;
  registry: RuntimeManifest;
}

/**
 * Context holds only *stable* references (created once in bootstrap). Fast-changing values
 * (user, theme, flags) are read with `useStore(sdk.store, selector)`, so a theme change
 * re-renders only the components that select `theme`, not every context consumer.
 */
const ShellContext = createContext<ShellContextValue | null>(null);

export const ShellProvider = ShellContext.Provider;

export function useShell(): ShellContextValue {
  const value = useContext(ShellContext);
  if (!value) throw new Error('useShell() must be used inside <ShellProvider>');
  return value;
}
