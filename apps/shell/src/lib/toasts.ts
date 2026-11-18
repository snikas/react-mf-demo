import { createStore, type Toast } from '@demo/shell-sdk';

export interface ToastItem extends Toast {
  id: number;
}

let nextId = 0;
export const toastStore = createStore<{ items: ToastItem[] }>({ items: [] });

export function pushToast(toast: Toast, ttlMs = 4000) {
  const id = ++nextId;
  toastStore.setState((s) => ({ items: [...s.items, { ...toast, id }].slice(-4) }));
  setTimeout(() => dismissToast(id), ttlMs);
}

export function dismissToast(id: number) {
  toastStore.setState((s) => ({ items: s.items.filter((t) => t.id !== id) }));
}
