import Count from "./Count";
import styles from "./StatTile.module.css";

interface StatTileProps {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
}

export default function StatTile({ label, value, sub, accent }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={accent ? { color: accent } : undefined}>
        <Count to={value} />
      </div>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
    </div>
  );
}
