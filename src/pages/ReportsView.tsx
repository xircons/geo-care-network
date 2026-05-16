import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import ReportCard from "../features/reports/ReportCard";
import { selectFilteredReports } from "../features/reports/selectors";
import { useDeleteReportMutation, useGetReportsQuery } from "../features/reports/reportsApi";
import { setCategoryFilter, setSearchQuery, setToastMessage } from "../features/ui/uiSlice";
import type { Report, ReportCategory } from "../types";
import styles from "./ReportsView.module.css";

const ALL_CATEGORY_KEYS = ["all", "environment", "infrastructure", "safety"] as const;

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

  const categoryCounts = useMemo(() => {
    const byCat = { environment: 0, infrastructure: 0, safety: 0 } satisfies Record<
      ReportCategory,
      number
    >;
    for (const r of reports) {
      byCat[r.category]++;
    }
    return byCat;
  }, [reports]);

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
          {ALL_CATEGORY_KEYS.map((category) => {
            const active = ui.categoryFilter === category;
            const count =
              category === "all" ? reports.length : categoryCounts[category];
            return (
              <button
                key={category}
                type="button"
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                onClick={() =>
                  dispatch(setCategoryFilter(category as ReportCategory | "all"))
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

      {openReport &&
        createPortal(
          <>
            <div
              onClick={closeDetail}
              className={`${styles.drawerOverlay} ${isDetailClosing ? styles.drawerOverlayClosing : ""}`}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
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
          </>,
          document.body
        )}
    </section>
  );
}

function timeAgo(s: string): string {
  const delta = Date.now() - new Date(s).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
  const severityColor =
    report.severity === "danger" ? "#F43F5E" : report.severity === "warning" ? "#F59E0B" : "#22C55E";

  // Always start with "Report filed" derived from report.filed (so legacy
  // db.json rows show it even without an activityLog), then append every
  // persisted entry. Dedupe if the log already contains a "Report filed".
  const log = report.activityLog ?? [];
  const sorted = [...log].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const hasFiled = sorted.some((e) => e.label === "Report filed");
  const base = hasFiled
    ? sorted.map((e) => ({ label: e.label, at: e.at }))
    : [{ label: "Report filed", at: report.filed }, ...sorted.map((e) => ({ label: e.label, at: e.at }))];

  if (log.length === 0 && report.updated && report.updated !== report.filed) {
    base.push({
      label: report.status === "resolved" ? "Marked resolved" : "Latest update",
      at: report.updated
    });
  }

  const events = base.map((e, idx, arr) => ({
    ...e,
    color: idx === arr.length - 1 ? severityColor : "var(--mute)"
  }));

  return (
    <div className={styles.timeline}>
      {events.map((event, idx) => (
        <div key={idx} className={styles.timelineEvent}>
          <div
            className={styles.timelineDot}
            style={{ "--timeline-color": event.color } as CSSProperties}
          />
          <div className={styles.timelineLabel}>{event.label}</div>
          <div className={styles.timelineAt}>
            {fmtDate(event.at)} <span className={styles.timelineAgo}>({timeAgo(event.at)})</span>
          </div>
        </div>
      ))}
    </div>
  );
}
