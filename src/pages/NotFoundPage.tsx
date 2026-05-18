import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

const NOT_FOUND_GIF_URL =
  "https://i.pinimg.com/originals/55/04/06/550406f32c02b535131c26cf2cae5aed.gif";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <img
          src={NOT_FOUND_GIF_URL}
          alt=""
          className={styles.gif}
          width={280}
          height={280}
          decoding="async"
          referrerPolicy="no-referrer"
        />
        <p className={styles.title}>Page not found</p>
        <Link to="/" className={styles.backLink}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Go back to map
        </Link>
      </div>
    </div>
  );
}
