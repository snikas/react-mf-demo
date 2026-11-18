import { useSyncExternalStore } from 'react';

export type Listener = () => void;

export interface ReadonlyStore<T> {
  getState(): T;
  subscribe(listener: Listener): () => void;
}

export interface Store<T> extends ReadonlyStore<T> {
  setState(update: Partial<T> | ((state: T) => Partial<T>)): void;
}

/**
 * A ~20-line external store. State is replaced immutably, so `getState()` returns the
 * same reference until something changes. That stability is exactly what
 * `useSyncExternalStore` needs from `getSnapshot`.
 */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(update) {
      const patch = typeof update === 'function' ? update(state) : update;
      const next = { ...state, ...patch };
      if (Object.keys(patch).every((k) => Object.is(state[k as keyof T], next[k as keyof T]))) {
        return; // no-op updates don't notify
      }
      state = next;
      [...listeners].forEach((l) => l());
    },
  };
}

/**
 * Subscribe a component to a slice of an external store, tear-free under concurrent
 * rendering. This is how every micro-frontend reads shell state (user, theme, flags).
 *
 * PITFALL: the selector must return a primitive or an already-existing reference.
 * `s => ({ user: s.user })` creates a new object on every call, so React sees a "changed"
 * snapshot forever and throws "Maximum update depth exceeded". Select fields separately
 * or memoize the selector's result.
 */
export function useStore<T, S>(store: ReadonlyStore<T>, selector: (state: T) => S): S {
  const getSnapshot = () => selector(store.getState());
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
