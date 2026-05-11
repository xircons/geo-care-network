import styles from "./WhaleState.module.css";

interface WhaleStateProps {
  label?: string;
}

export default function WhaleState({ label = "Loading data" }: WhaleStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <svg className={styles.whale} viewBox="0 0 240 120" role="img" aria-label="Loading">
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
