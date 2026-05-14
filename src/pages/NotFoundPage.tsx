import { Link } from "react-router-dom";
import LoadingState from "../components/LoadingState";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <LoadingState variant="illustrated" label="Page not found" />
      <div className={styles.actions}>
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
