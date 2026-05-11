import { Link } from 'react-router-dom';
import type { Report } from '../types/report';
import styles from './ReportCard.module.css';

interface ReportCardProps {
  report: Report;
}

const severityClass: Record<Report['severity'], string> = {
  safe: styles.badgeSafe,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
};

const formatStatus = (status: Report['status']) =>
  status === 'in_progress' ? 'in progress' : status;

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

const ReportCard = ({ report }: ReportCardProps) => {
  return (
    <Link to={`/reports/${report.id}`} className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{report.title}</h3>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${severityClass[report.severity]}`}>
            {report.severity}
          </span>
          <span className={styles.badge}>{formatStatus(report.status)}</span>
        </div>
      </div>
      <p className={styles.snippet}>{report.description}</p>
      <div className={styles.meta}>
        <span className={styles.metaItem}>{report.address}</span>
        <span className={styles.metaItem}>Reporter: {report.reporter}</span>
        <span className={styles.metaItem}>Filed {formatDate(report.createdAt)}</span>
      </div>
    </Link>
  );
};

export default ReportCard;
