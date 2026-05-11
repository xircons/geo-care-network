import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import WhaleState from "../components/WhaleState";
import ReportCard from "../features/reports/ReportCard";
import { selectFilteredReports } from "../features/reports/selectors";
import { useGetReportsQuery } from "../features/reports/reportsApi";
import { setCategoryFilter, setSearchQuery, setSeverityFilter } from "../features/ui/uiSlice";
import styles from "./ReportsView.module.css";

export default function ReportsView() {
  const dispatch = useAppDispatch();
  const ui = useAppSelector((state) => state.ui);
  const filteredReports = useAppSelector(selectFilteredReports);
  const { data: reports = [], isLoading } = useGetReportsQuery();

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(reports.map((r) => r.category)))],
    [reports]
  );

  if (isLoading) {
    return <WhaleState label="Loading reports" />;
  }

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <input
          className={styles.input}
          value={ui.searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          placeholder="Search title, description, address"
        />
        <select
          className={styles.select}
          value={ui.severityFilter}
          onChange={(e) => dispatch(setSeverityFilter(e.target.value as "all" | "safe" | "warning" | "danger"))}
        >
          <option value="all">All severities</option>
          <option value="danger">Danger</option>
          <option value="warning">Warning</option>
          <option value="safe">Safe</option>
        </select>
        <select
          className={styles.select}
          value={ui.categoryFilter}
          onChange={(e) =>
            dispatch(setCategoryFilter(e.target.value as "all" | "environment" | "infrastructure" | "safety"))
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.grid}>
        {filteredReports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </section>
  );
}
