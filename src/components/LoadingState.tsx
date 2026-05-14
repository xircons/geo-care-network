import styles from "./LoadingState.module.css";

export const LOADING_GIF_URL =
  "https://i.pinimg.com/originals/3d/53/e7/3d53e71011c2792de9fd6c82e9396730.gif";

interface LoadingStateProps {
  variant?: "loading" | "illustrated";
  /** Illustrated: visible title. Loading: `aria-label` context for assistive tech. */
  label?: string;
}

interface WhaleIconProps {
  size?: number;
  className?: string;
  decorative?: boolean;
}

/**
 * Minimalist Whale motif — SVG paths only. Used by the illustrated empty-state.
 * Exported so Logo and other UI surfaces can reuse the same motif if needed.
 */
export function WhaleIcon({ size = 180, className, decorative = true }: WhaleIconProps) {
  const ratio = size / 160;
  const height = 90 * ratio;
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 160 90"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      className={className}
    >
      <path
        d="M22 58 C22 36, 58 30, 92 36 C112 39, 124 48, 138 44 L132 58 L140 68 L120 64 C100 74, 60 75, 36 68 C26 65, 22 62, 22 58 Z"
        fill="#0EA5E9"
      />
      <path
        d="M40 64 Q60 70 90 67"
        stroke="#38BDF8"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.65"
      />
      <circle cx="44" cy="50" r="2.4" fill="#0F172A" />
      <path
        d="M58 30 Q56 20 58 14 M66 30 Q70 22 74 16"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
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
        <WhaleIcon size={180} className={styles.whale} decorative={false} />
        <div className={styles.title}>{label}</div>
      </div>
    </div>
  );
}
