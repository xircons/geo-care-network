import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { dismissToast } from '../features/uiSlice';
import styles from './Toaster.module.css';

const TOAST_TIMEOUT_MS = 3200;

const toneClass: Record<'info' | 'success' | 'error', string> = {
  info: '',
  success: styles.toastSuccess,
  error: styles.toastError,
};

const Toaster = () => {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dispatch(dismissToast(t.id)), TOAST_TIMEOUT_MS)
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.host} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${toneClass[t.tone]}`} role="status">
          <span>{t.message}</span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => dispatch(dismissToast(t.id))}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
