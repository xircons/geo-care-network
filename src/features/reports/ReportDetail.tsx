import { Link } from "react-router-dom";
import type { Report } from "../../types";

function fmtDate(s: string) {
  const d = new Date(s);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

interface ReportDetailProps {
  report: Report;
  onDelete?: (id: string) => void;
}

export default function ReportDetail({ report, onDelete }: ReportDetailProps) {
  return (
    <article>
      <h1>{report.title}</h1>
      <p>{report.description}</p>
      <p>
        Filed by {report.reporter} · {fmtDate(report.filed)}
      </p>
      <p>{report.address}</p>
      <p>
        {report.category} · {report.severity} · {report.status}
      </p>
      <div>
        <Link to={`/reports/${report.id}/edit`}>Edit</Link>
        {" · "}
        <button type="button" onClick={() => onDelete?.(report.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}
