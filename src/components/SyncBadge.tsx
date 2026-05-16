import styles from "./SyncBadge.module.css";

interface SyncBadgeProps {
  /** When false, the badge flips to the red "Not sync" state. Drive from the
   * RTK Query `isError` flag (synced = !isError). Defaults to true. */
  synced?: boolean;
  /** Extra className applied to the outer pill — used by host pages to
   * absolute-position the badge over the map. */
  className?: string;
}

/**
 * Live-sync status pill rendered in the map corner on /, /notify, and any
 * future page that polls reports. Green dot + pulse = synced; red dot = not.
 */
export default function SyncBadge({ synced = true, className }: SyncBadgeProps) {
  const stateClass = synced ? styles.synced : styles.notSynced;
  return (
    <div
      className={`${styles.badge} ${stateClass}${className ? ` ${className}` : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.dot} aria-hidden />
      {synced ? "Sync" : "Not sync"}
    </div>
  );
}
