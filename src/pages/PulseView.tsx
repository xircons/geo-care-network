import StatTile from "../components/StatTile";
import { useListReportsQuery } from "../features/reports/reportsApi";

export default function PulseView() {
  const { data = [] } = useListReportsQuery();
  const open = data.filter((x) => x.status !== "resolved").length;
  const resolved = data.filter((x) => x.status === "resolved").length;
  return <section style={{ maxWidth: 1000, margin: "0 auto", padding: 20, display: "grid", gap: 12, gridTemplateColumns: "repeat(3,minmax(180px,1fr))" }}><StatTile label="Total" value={data.length} /><StatTile label="Open" value={open} /><StatTile label="Resolved" value={resolved} /></section>;
}
