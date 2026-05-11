import styles from "./Logo.module.css";

export default function Logo() {
  return (
    <div className={styles.root}>
      <div className={styles.iconWrap}>
        <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden>
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          <path
            d="M20 3 C11 3 4 10 4 19 C4 28 20 38 20 38 C20 38 36 28 36 19 C36 10 29 3 20 3 Z"
            fill="url(#lg1)"
          />
          <circle cx="20" cy="18" r="5.5" fill="#fff" />
          <circle cx="20" cy="18" r="2.4" fill="#0e1116" />
        </svg>
        <span className={styles.dot} />
      </div>
      <div className={styles.titleWrap}>
        <div className={styles.eyebrow}>Geo-Care</div>
        <div className={styles.title}>Community Tracker</div>
      </div>
    </div>
  );
}
