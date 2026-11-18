import { useStore } from '@demo/shell-sdk';
import { dismissToast, toastStore } from '../lib/toasts';

/** Toasts raised by any module through `sdk.ui.notify()`. aria-live announces them. */
export function Toaster() {
  const items = useStore(toastStore, (s) => s.items);
  return (
    <div className="shell-toaster" aria-live="polite" aria-atomic="false">
      {items.map((t) => (
        <div key={t.id} className={`shell-toast shell-toast--${t.kind}`}>
          <span>{t.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
