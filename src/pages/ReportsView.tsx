import { useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import ReportCard from "../features/reports/ReportCard";
import { selectFilteredReports } from "../features/reports/selectors";
import { useDeleteReportMutation, useGetReportsQuery } from "../features/reports/reportsApi";
import { setCategoryFilter, setSearchQuery, setToastMessage } from "../features/ui/uiSlice";
import type { Report } from "../types";
import styles from "./ReportsView.module.css";

const openGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
};

export default function ReportsView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [deleteReport] = useDeleteReportMutation();
  const ui = useAppSelector((state) => state.ui);
  const filteredReports = useAppSelector(selectFilteredReports);
  const { data: reports = [], isLoading, isError, refetch } = useGetReportsQuery();
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(reports.map((r) => r.category)))],
    [reports]
  );

  if (isLoading) {
    return <LoadingState label="Loading reports" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load reports"
        message="We weren't able to fetch the latest community reports. Please try again."
        onRetry={() => refetch()}
      />
    );
  }

  const openDetail = (report: Report) => {
    setIsDetailClosing(false);
    setOpenReport(report);
  };

  const closeDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    window.setTimeout(() => {
      setOpenReport(null);
      setIsDetailClosing(false);
    }, 380);
  };

  return (
    <section className={styles.page}>
      <div className={styles.intro}>
        <div className={styles.eyebrow}>{filteredReports.length} reports</div>
        <h1 className={styles.hero}>
          The neighborhood, <em>in their own words.</em>
        </h1>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            className={styles.input}
            value={ui.searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            placeholder="Search by title or address"
          />
        </div>
        <div className={styles.vSep} />
        <div className={styles.chipGroup}>
          <span className={styles.groupLabel}>Category</span>
          {categories.map((category) => {
            const active = ui.categoryFilter === category;
            const count = category === "all" ? reports.length : reports.filter((r) => r.category === category).length;
            return (
              <button
                key={category}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() =>
                  dispatch(setCategoryFilter(category as "all" | "environment" | "infrastructure" | "safety"))
                }
              >
                {category}
                <span className={styles.chipCount}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.gridShell}>
        <div className={styles.grid}>
          {filteredReports.map((report, i) => (
            <ReportCard key={report.id} report={report} onOpen={openDetail} index={i} />
          ))}
        </div>
      </div>

      {openReport && (
        <div
          onClick={closeDetail}
          className={`${styles.drawerOverlay} ${isDetailClosing ? styles.drawerOverlayClosing : ""}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${styles.drawer} ${isDetailClosing ? styles.drawerClosing : ""}`}
          >
            <div className={styles.drawerHeader}>
              <button type="button" onClick={closeDetail} className={styles.drawerBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to map
              </button>
              <div className={styles.drawerActions}>
                <button
                  type="button"
                  className={styles.drawerBtn}
                  onClick={() =>
                    navigate(`/reports/${openReport.id}/edit`, { state: { backgroundLocation: location } })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.drawerBtnDanger}
                  onClick={async () => {
                    await deleteReport(openReport.id).unwrap();
                    dispatch(setToastMessage("Report deleted"));
                    closeDetail();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className={styles.drawerBody}>
              <h2 className={styles.drawerTitle}>{openReport.title}</h2>
              <div className={styles.drawerFiled}>
                Filed by <strong className={styles.drawerFiledStrong}>{openReport.reporter}</strong> · {fmtDate(openReport.filed)}
              </div>
              <p className={styles.drawerDescription}>{openReport.description}</p>

              <div className={styles.drawerMapWrap}>
                <ReportMap
                  reports={[openReport]}
                  selectedId={openReport.id}
                  interactive={false}
                  zoom={16}
                  onMapClick={() => openGoogleMaps(openReport.lat, openReport.lng)}
                />
              </div>

              <div className={styles.metaGrid}>
                <Meta label="Address" value={openReport.address} />
                <Meta label="Reporter" value={openReport.reporter} />
                <Meta label="Filed" value={fmtDate(openReport.filed)} />
                <Meta label="Last update" value={fmtDate(openReport.updated)} />
                <Meta label="Report ID" mono value={openReport.id.toUpperCase()} />
              </div>

              <div className={styles.activityWrap}>
                <div className={styles.activityTitle}>Activity</div>
                <Timeline report={openReport} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function fmtDate(s: string) {
  const d = new Date(s);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className={styles.metaTile}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={`${styles.metaValue} ${mono ? styles.metaValueMono : ""}`}>{value}</div>
    </div>
  );
}

function Timeline({ report }: { report: Report }) {
  const severityColor = report.severity === "danger" ? "#F43F5E" : report.severity === "warning" ? "#F59E0B" : "#22C55E";
  const events = [
    { label: "Report filed", at: report.filed, color: "var(--mute)" },
    { label: "Acknowledged by ward", at: new Date(new Date(report.filed).getTime() + 1000 * 60 * 60 * 8).toISOString(), color: "#F59E0B" },
    { label: report.status === "resolved" ? "Marked resolved" : "Latest update", at: report.updated, color: severityColor }
  ];

  return (
    <div className={styles.timeline}>
      {events.map((event, idx) => (
        <div key={idx} className={styles.timelineEvent}>
          <div
            className={styles.timelineDot}
            style={{ "--timeline-color": event.color } as CSSProperties}
          />
          <div className={styles.timelineLabel}>{event.label}</div>
          <div className={styles.timelineAt}>{fmtDate(event.at)}</div>
        </div>
      ))}
    </div>
  );
}
