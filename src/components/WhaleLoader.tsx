import styles from './WhaleLoader.module.css';

interface WhaleLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass: Record<NonNullable<WhaleLoaderProps['size']>, string> = {
  sm: styles.sm,
  md: '',
  lg: styles.lg,
};

/**
 * Minimalist whale motif used for loading / empty states.
 * Pure SVG paths — no emojis, no raster art.
 */
const WhaleLoader = ({
  message = 'Listening for community signals…',
  size = 'md',
}: WhaleLoaderProps) => {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <svg
        className={`${styles.whale} ${sizeClass[size]}`}
        viewBox="0 0 120 80"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* bubbles */}
        <circle className={styles.bubble} cx="22" cy="22" r="3" />
        <circle className={`${styles.bubble} ${styles.b2}`} cx="14" cy="34" r="2" />
        <circle className={`${styles.bubble} ${styles.b3}`} cx="26" cy="14" r="2.2" />

        {/* whale body */}
        <path
          d="M30 52
             C30 36, 52 28, 70 32
             C88 36, 104 40, 110 46
             C108 50, 102 54, 92 54
             L92 58
             C92 64, 88 66, 82 64
             L82 60
             C72 60, 60 60, 52 62
             C44 64, 36 62, 32 58
             Z"
          fill="currentColor"
        />
        {/* tail */}
        <path
          d="M30 52 L18 44 L22 54 L18 64 Z"
          fill="currentColor"
        />
        {/* eye */}
        <circle cx="92" cy="46" r="1.8" fill="#FFFFFF" />
        <circle cx="92" cy="46" r="0.9" fill="#0F172A" />
        {/* belly highlight */}
        <path
          d="M44 60 C56 66, 76 64, 88 60 C76 62, 56 62, 44 60 Z"
          fill="rgba(255,255,255,0.45)"
        />
      </svg>
      <p className={styles.message}>{message}</p>
    </div>
  );
};

export default WhaleLoader;
