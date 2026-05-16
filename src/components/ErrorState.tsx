import styles from "./ErrorState.module.css";

interface ErrorStateProps {
  /** Visible heading shown to the user. */
  title?: string;
  /** Optional supporting message. */
  message?: string;
  /** Optional retry handler — when provided, renders a "Try again" button. */
  onRetry?: () => void;
}

/**
 * Generic, clean error UI for failed async operations.
 * Light-theme only. Uses the project color palette via CSS variables.
 */
export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this view. Please check your connection and try again.",
  onRetry
}: ErrorStateProps) {
  return (
    <div className={styles.wrap} role="alert" aria-live="assertive">
      <div className={styles.inner}>
        <div className={styles.iconWrap} aria-hidden>
          <svg viewBox="0 0 56 56" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#F43F5E" strokeWidth="2.5" opacity="0.7" />
            <path
              d="M28 16v16"
              stroke="#F43F5E"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="28" cy="40" r="2.2" fill="#F43F5E" />
          </svg>
        </div>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
        {onRetry ? (
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
