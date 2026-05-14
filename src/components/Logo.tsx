import { LOADING_GIF_URL } from "./LoadingState";
import styles from "./Logo.module.css";

export default function Logo() {
  return (
    <div className={styles.root}>
      <div className={styles.iconWrap} aria-hidden>
        <img
          src={LOADING_GIF_URL}
          alt=""
          className={styles.gif}
          width={34}
          height={34}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className={styles.titleWrap}>
        <div className={styles.eyebrow}>Geo-Care</div>
        <div className={styles.title}>Community Tracker</div>
      </div>
    </div>
  );
}
