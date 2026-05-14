import styles from "./LoadingState.module.css";

export const LOADING_GIF_URL =
  "https://i.pinimg.com/originals/3d/53/e7/3d53e71011c2792de9fd6c82e9396730.gif";

interface LoadingStateProps {
  variant?: "loading" | "illustrated";
  /** Illustrated: visible title. Loading: `aria-label` context for assistive tech. */
  label?: string;
}

export default function LoadingState({
  variant = "loading",
  label = "Loading data"
}: LoadingStateProps) {
  if (variant === "loading") {
    return (
      <div
        className={styles.wrapLoading}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={label}
      >
        <div className={styles.innerLoading}>
          <img
            src={LOADING_GIF_URL}
            alt=""
            className={styles.gif}
            width={220}
            height={220}
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <p className={styles.loadingText}>loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <svg className={styles.whale} viewBox="0 0 240 120" role="img" aria-label={label}>
          <path
            d="M24 78c16-22 42-31 79-31 41 0 72 15 94 31-7 0-12 1-18 5-5 3-8 8-9 14H48c-7 0-13-7-13-15 0-2 0-3 1-4-5 1-8 4-12 10z"
            fill="#0EA5E9"
          />
          <path d="M167 58c8-11 17-18 26-19-2 8-4 15-3 21" fill="none" stroke="#38BDF8" strokeWidth="5" />
          <circle cx="70" cy="70" r="4" fill="#fff" />
          <circle cx="70" cy="70" r="2" fill="#0F172A" />
        </svg>
        <div className={styles.title}>{label}</div>
      </div>
    </div>
  );
}
