import type { CSSProperties } from "react";
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

interface ReportCardProps {
  report: Report;
  onOpen?: (report: Report) => void;
  index?: number;
}

export default function ReportCard({ report, onOpen, index = 0 }: ReportCardProps) {
  /* Stagger matches MapView live feed: fadeUp from 0.35s + i * 0.06s */
  const cardStyle: CSSProperties = {
    "--card-delay": `${0.35 + Math.min(index, 24) * 0.06}s`,
    "--accent-color": severityColor[report.severity]
  } as CSSProperties;

  const severityText =
    report.severity === "safe" ? "Resolved" : report.severity === "warning" ? "Attention" : "Urgent";

  const content = (
    <>
      <div className={styles.accent} />
      <div className={styles.meta}>
        <div className={styles.badge}>
          <span className={styles.dot} />
          {severityText}
        </div>
        <span className={styles.metaRight}>{timeAgo(report.updated)}</span>
      </div>
      <h3 className={styles.title}>{report.title}</h3>
      <p className={styles.desc}>{report.description}</p>
      <div className={styles.footer}>
        <span>{report.address.split(",")[0]}</span>
        <span className={styles.open}>
          Open
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        className={styles.card}
        onClick={() => onOpen(report)}
        style={cardStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={`/reports/${report.id}`} className={styles.card} style={cardStyle}>
      {content}
    </Link>
  );
}
