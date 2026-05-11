import { Link } from "react-router-dom";
import type { Report } from "../../types";
import styles from "./ReportCard.module.css";

export default function ReportCard({ report }: { report: Report }) {
  return <Link to={`/reports/${report.id}`} className={styles.card}><h3>{report.title}</h3><p>{report.description}</p><small>{report.address}</small></Link>;
}
