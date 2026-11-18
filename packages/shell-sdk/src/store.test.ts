import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createStore, useStore } from './store';

describe('createStore', () => {
  it('notifies subscribers on change and skips no-op updates', () => {
    const store = createStore({ count: 0, label: 'a' });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 });
    store.setState({ count: 1 }); // no-op
    store.setState((s) => ({ count: s.count + 1 }));

    expect(store.getState()).toEqual({ count: 2, label: 'a' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps the snapshot reference stable between changes', () => {
    const store = createStore({ count: 0 });
    expect(store.getState()).toBe(store.getState());
  });
});

describe('useStore (useSyncExternalStore)', () => {
  it('re-renders only when the selected slice changes', () => {
    const store = createStore({ theme: 'light', count: 0 });
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useStore(store, (s) => s.theme);
    });
    expect(result.current).toBe('light');
    const before = renders;

    act(() => store.setState({ count: 5 })); // unrelated slice
    expect(renders).toBe(before);

    act(() => store.setState({ theme: 'dark' }));
    expect(result.current).toBe('dark');
    expect(renders).toBe(before + 1);
  });
});
