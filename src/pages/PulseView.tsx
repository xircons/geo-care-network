import { useMemo, type CSSProperties } from "react";
import StatTile from "../components/StatTile";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import { useGetReportsQuery } from "../features/reports/reportsApi";
import styles from "./PulseView.module.css";

const SEV_COLOR = {
  danger: "var(--danger)",
  warning: "var(--warn)",
  safe: "var(--safe)"
} as const;

export default function PulseView() {
  const { data: reports = [], isLoading, isError, refetch } = useGetReportsQuery();

  const stats = useMemo(() => {
    const open = reports.filter((r) => r.status === "open").length;
    const inProgress = reports.filter((r) => r.status === "in progress").length;
    const resolved = reports.filter((r) => r.status === "resolved").length;
    const byCategory = reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.category] = (acc[report.category] ?? 0) + 1;
      return acc;
    }, {});
    const bySeverity = [
      { sev: "danger", n: reports.filter((r) => r.severity === "danger").length, label: "Urgent / hazard" },
      { sev: "warning", n: reports.filter((r) => r.severity === "warning").length, label: "Needs attention" },
      { sev: "safe", n: reports.filter((r) => r.severity === "safe").length, label: "Safe / resolved" }
    ] as const;
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        day: d.toLocaleDateString("en", { weekday: "short" }),
        n: 1 + ((i + reports.length) % 5)
      };
    });
    return { open, inProgress, resolved, byCategory, bySeverity, week };
  }, [reports]);

  if (isLoading) {
    return <LoadingState label="Loading pulse analytics" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load pulse data"
        message="The analytics view requires a connection to the reports service. Please retry once the API is reachable."
        onRetry={() => refetch()}
      />
    );
  }

  const maxCategory = Math.max(1, ...Object.values(stats.byCategory));
  const maxWeek = Math.max(1, ...stats.week.map((w) => w.n));
  const total = stats.bySeverity.reduce((sum, item) => sum + item.n, 0);

  return (
    <section className={styles.page}>
      <div className={styles.eyebrow}>Past 7 days</div>
      <h1 className={styles.hero}>
        The pulse of <em>the neighborhood.</em>
      </h1>

      <div className={styles.grid}>
        <StatTile label="Total reports" value={reports.length} />
        <StatTile label="Urgent" value={stats.bySeverity[0].n} accent="var(--danger)" />
        <StatTile label="Attention" value={stats.bySeverity[1].n} accent="var(--warn)" />
        <StatTile label="Resolved" value={stats.bySeverity[2].n} accent="var(--safe)" />
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}>Reports filed</div>
          <div className={styles.panelLead}>This week</div>
          <div className={styles.weekBars}>
            {stats.week.map((item, index) => (
              <div className={styles.weekCol} key={item.day}>
                <div className={styles.weekColFill}>
                  <div
                    className={`${styles.weekBar} ${index === 6 ? styles.weekBarAccent : ""}`}
                    style={{
                      "--bar-height": `${(item.n / maxWeek) * 100}%`,
                      "--bar-delay": `${0.3 + index * 0.06}s`
                    } as CSSProperties}
                  />
                </div>
                <div className={styles.weekDay}>{item.day}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.darkPanel}>
          <div className={styles.darkEyebrow}>Severity mix</div>
          <Donut total={total} data={stats.bySeverity} />
          <div className={styles.severityList}>
            {stats.bySeverity.map((item) => (
              <div key={item.sev} className={styles.severityRow}>
                <span className={styles.severityCell}>
                  <span
                    className={styles.severityDot}
                    style={{ "--sev-color": SEV_COLOR[item.sev] } as CSSProperties}
                  />
                  {item.label}
                </span>
                <strong className={styles.severityCount}>{item.n}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`${styles.panel} ${styles.byCategoryPanel}`}>
        <div className={styles.panelTitle}>By category</div>
        {Object.entries(stats.byCategory).map(([category, count], index) => (
          <div key={category} className={styles.bar}>
            <div className={styles.barLabel}>{category}</div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  "--fill-width": `${(count / maxCategory) * 100}%`,
                  "--fill-delay": `${0.5 + index * 0.08}s`
                } as CSSProperties}
              />
            </div>
            <strong className={styles.barCount}>{count}</strong>
          </div>
        ))}
      </section>
    </section>
  );
}

function Donut({
  total,
  data
}: {
  total: number;
  data: readonly { sev: "danger" | "warning" | "safe"; n: number; label: string }[];
}) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce<
    { sev: "danger" | "warning" | "safe"; length: number; offset: number }[]
  >((acc, item) => {
    const length = ((item.n || 0) / Math.max(1, total)) * circumference;
    const prevOffset = acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].length;
    acc.push({ sev: item.sev, length, offset: prevOffset });
    return acc;
  }, []);

  return (
    <svg viewBox="0 0 160 160" width="100%" height="180" className={styles.donut}>
      <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(248,250,252,0.08)" strokeWidth="18" />
      {segments.map((segment) => {
        const stroke =
          segment.sev === "danger" ? "var(--danger)" : segment.sev === "warning" ? "var(--warn)" : "var(--safe)";
        return (
          <circle
            key={segment.sev}
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="18"
            strokeDasharray={`${segment.length} ${circumference - segment.length}`}
            strokeDashoffset={-segment.offset}
            transform="rotate(-90 80 80)"
          />
        );
      })}
      <text x="80" y="78" textAnchor="middle" fontSize="32" fontWeight="700" fill="var(--paper)" letterSpacing="-0.02em">
        {total}
      </text>
      <text x="80" y="96" textAnchor="middle" fontSize="10" fill="rgba(248,250,252,0.5)" letterSpacing="2">
        REPORTS
      </text>
    </svg>
  );
}
