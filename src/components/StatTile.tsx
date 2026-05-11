import styles from "./StatTile.module.css";
export default function StatTile({ label, value }: { label: string; value: number }) {
  return <article className={styles.tile}><div>{label}</div><strong>{value}</strong></article>;
}
