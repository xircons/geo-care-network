import { useMemo } from "react";
import StatTile from "../components/StatTile";
import WhaleState from "../components/WhaleState";
import { useGetReportsQuery } from "../features/reports/reportsApi";
import styles from "./PulseView.module.css";

export default function PulseView() {
  const { data: reports = [], isLoading } = useGetReportsQuery();

  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status === "open").length;
    const inProgress = reports.filter((r) => r.status === "in progress").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const byCategory = reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.category] = (acc[report.category] ?? 0) + 1;
      return acc;
    }, {});
    return { open, inProgress, resolved, byCategory };
  }, [reports]);

  if (isLoading) {
    return <WhaleState label="Loading pulse analytics" />;
  }

  const maxCategory = Math.max(1, ...Object.values(stats.byCategory));

  return (
    <section className={styles.page}>
      <div className={styles.grid}>
        <StatTile label="Open" value={stats.open} />
        <StatTile label="In progress" value={stats.inProgress} />
        <StatTile label="Resolved" value={stats.resolved} accent="var(--safe)" />
      </div>
      <section className={styles.panel}>
        <h2>By category</h2>
        {Object.entries(stats.byCategory).map(([category, count]) => (
          <div key={category} className={styles.bar}>
            <div>{category}</div>
            <div className={styles.track}>
              <div className={styles.fill} style={{ width: `${(count / maxCategory) * 100}%` }} />
            </div>
            <strong>{count}</strong>
          </div>
        ))}
      </section>
    </section>
  );
}
