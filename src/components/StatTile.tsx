import type { CSSProperties } from "react";
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
  const tileStyle: CSSProperties = {
    "--tile-delay": `${index * 80}ms`,
    ...(accent ? { "--accent-color": accent } : {})
  } as CSSProperties;

  return (
    <div className={styles.tile} style={tileStyle}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>
        <Count to={value} />
      </div>
      {sub ? <div className={styles.sub}>{sub}</div> : null}
    </div>
  );
}
