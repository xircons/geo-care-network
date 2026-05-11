import type { Report } from "../../types";
export default function Timeline({ report }: { report: Report }) {
  return <div><p>Filed: {new Date(report.filed).toLocaleString()}</p><p>Updated: {new Date(report.updated).toLocaleString()}</p><p>Status: {report.status}</p></div>;
}
