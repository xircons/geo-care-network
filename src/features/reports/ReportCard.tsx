import { Link } from "react-router-dom";
import type { Report } from "../../types";
import styles from "./ReportCard.module.css";

const severityColor: Record<Report["severity"], string> = {
  safe: "var(--safe)",
  warning: "var(--warn)",
  danger: "var(--danger)"
};

function timeAgo(s: string) {
  const ms = Date.now() - new Date(s).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ReportCard({ report }: { report: Report }) {
  return (
    <Link to={`/reports/${report.id}`} className={styles.card}>
      <div className={styles.meta}>
        <span className={styles.dot} style={{ background: severityColor[report.severity] }} />
        <span>{report.status}</span>
        <span>•</span>
        <span>{timeAgo(report.updated)}</span>
      </div>
      <h3 className={styles.title}>{report.title}</h3>
      <p className={styles.desc}>{report.description}</p>
      <div className={styles.footer}>
        <span>{report.address}</span>
        <span>{report.category}</span>
      </div>
    </Link>
  );
}
