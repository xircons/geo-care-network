import Count from "./Count";
import styles from "./StatTile.module.css";

interface StatTileProps {
  label: string;
  value: number;
  sub?: string;
  accent?: string;
  index?: number;
}

export default function StatTile({ label, value, sub, accent, index = 0 }: StatTileProps) {
  return (
    <div
      className={styles.tile}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={accent ? { color: accent } : undefined}>
        <Count to={value} />
      </div>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
    </div>
  );
}
