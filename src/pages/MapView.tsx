import { useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import StatTile from "../components/StatTile";
import SyncBadge from "../components/SyncBadge";
import { useDeleteReportMutation, useGetReportsQuery } from "../features/reports/reportsApi";
import { setToastMessage } from "../features/ui/uiSlice";
import type { Report, ReportStatus, Severity } from "../types";
import styles from "./MapView.module.css";

type SeverityFilter = Severity | "all";

interface SeverityMeta {
  color: string;
  label: string;
}

const SEV: Record<Severity, SeverityMeta> = {
  safe: { color: "#22C55E", label: "Safe / resolved" },
  warning: { color: "#F59E0B", label: "Needs attention" },
  danger: { color: "#F43F5E", label: "Urgent / hazard" }
};
const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Open",
  "in progress": "In progress",
  resolved: "Resolved"
};

const FILTERS: { id: SeverityFilter; label: string; color: string }[] = [
  { id: "all", label: "Everything", color: "var(--ink)" },
  { id: "danger", label: "Urgent", color: SEV.danger.color },
  { id: "warning", label: "Attention", color: SEV.warning.color },
  { id: "safe", label: "Resolved", color: SEV.safe.color }
];

const timeAgo = (s: string) => {
  const ms = Date.now() - new Date(s).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const fmtDate = (s: string) => {
  const d = new Date(s);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

const openGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
};

export default function MapView() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [deleteReport] = useDeleteReportMutation();
  const { data: reports = [], isLoading, isError, refetch } = useGetReportsQuery(
    undefined,
    {
      // Honest polling so the SyncBadge text matches reality and the Live
      // feed stays fresh when an agency operator resolves a report elsewhere.
      pollingInterval: 30_000,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const filtered = useMemo(() => {
    const list =
      filter === "all" ? reports : reports.filter((r: Report) => r.severity === filter);
    return [...list].sort(
      (a: Report, b: Report) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
  }, [reports, filter]);

  // Live feed list shows only currently-active incidents — resolved ones drop
  // off unless the user explicitly clicks the "Resolved" chip. Map markers
  // still include resolved (with the green dot) so the spatial view stays
  // historically complete; the Severity legend explains the colors.
  const feedReports = useMemo(() => {
    if (filter === "safe") return filtered;
    return filtered.filter((r: Report) => r.severity !== "safe");
  }, [filtered, filter]);

  const open = reports.filter((r: Report) => r.status !== "resolved").length;
  const resolved = reports.filter((r: Report) => r.status === "resolved").length;
  const openReport = reports.find((r: Report) => r.id === openId);

  const closeDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    window.setTimeout(() => {
      setOpenId(null);
      setIsDetailClosing(false);
    }, 380);
  };

  if (isLoading) return <LoadingState label="Loading neighborhood map" />;
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load the map"
        message="We weren't able to reach the reports service. Check that the mock API is running and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className={styles.page}>
      <aside className={styles.side}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Neighborhood</div>
          <h1 className={styles.hero}>
            What's happening
            <br />
            <em className={styles.heroAccent}>around you</em>
          </h1>
          <p className={styles.lead}>
            Live view of community-reported issues. Markers pulse on areas needing attention.
          </p>
        </div>

        <div className={styles.stats}>
          <StatTile label="Total" value={reports.length} index={0} />
          <StatTile label="Open" value={open} accent="var(--accent)" index={1} />
          <StatTile label="Resolved" value={resolved} accent="var(--safe)" index={2} />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterLabel}>Filter by severity</div>
          <div className={styles.chips}>
            {FILTERS.map((f, idx) => {
              const active = filter === f.id;
              const chipStyle = {
                "--chip-color": f.color,
                "--chip-delay": `${0.34 + idx * 0.06}s`
              } as CSSProperties;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                  style={chipStyle}
                >
                  <span
                    className={`${styles.chipDot} ${active ? styles.chipDotPulse : ""}`}
                  />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.listSection}>
          <div className={styles.listHeaderRow}>
            <div className={styles.listHeader}>Live feed</div>
            <span className={styles.listCount}>
              {feedReports.length} item{feedReports.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className={`thinScroll ${styles.list}`}>
            {feedReports.map((r: Report, i: number) => {
              const isActive = selected === r.id;
              const itemStyle = {
                "--card-delay": `${0.35 + i * 0.06}s`
              } as CSSProperties;
              return (
                <button
                  key={r.id}
                  type="button"
                  onMouseEnter={() => setSelected(r.id)}
                  onMouseLeave={() => setSelected(null)}
                  onClick={() => {
                    setIsDetailClosing(false);
                    setOpenId(r.id);
                  }}
                  className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                  style={itemStyle}
                >
                  <div className={styles.itemMeta}>
                    <span
                      className={styles.metaDot}
                      style={{ "--dot-color": SEV[r.severity].color } as CSSProperties}
                    />
                    <span className={styles.itemMetaText}>
                      {STATUS_LABEL[r.status]} · {r.category}
                    </span>
                    <span className={styles.itemAgo}>{timeAgo(r.filed)}</span>
                  </div>
                  <div className={styles.itemTitle}>{r.title}</div>
                  <div className={styles.itemAddress}>{r.address}</div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <div className={styles.mapPane}>
        <ReportMap
          reports={filtered}
          selectedId={selected ?? openId}
          showCoordsHud={false}
          onSelect={(id) => {
            setIsDetailClosing(false);
            setOpenId(id);
          }}
        />
        <div className={styles.legend}>
          <div className={styles.legendTitle}>Severity</div>
          <div className={styles.legendCol}>
            {(Object.entries(SEV) as [Severity, SeverityMeta][]).map(([k, v]) => (
              <div key={k} className={styles.legendRow}>
                <span
                  className={styles.legendDot}
                  style={{ "--dot-color": v.color } as CSSProperties}
                />
                <span>{v.label}</span>
              </div>
            ))}
          </div>
        </div>
        <SyncBadge synced={!isError} className={styles.sync} />
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
            <header className={styles.drawerHeader}>
              <div className={styles.drawerHeading}>
                <div className={styles.drawerKicker}>Report · {openReport.category}</div>
                <h1 className={styles.drawerTitle}>{openReport.title}</h1>
              </div>
              <button type="button" onClick={closeDetail} className={styles.drawerCancel}>
                Cancel
              </button>
            </header>

            <div className={styles.drawerBody}>
              <div className={styles.badgeRow}>
                <span
                  className={styles.severityBadge}
                  style={{ "--sev-color": SEV[openReport.severity].color } as CSSProperties}
                >
                  {openReport.severity === "safe"
                    ? "Resolved"
                    : openReport.severity === "warning"
                    ? "Attention"
                    : "Urgent"}
                </span>
                <span className={styles.badge}>{STATUS_LABEL[openReport.status]}</span>
                <span className={styles.badge}>{openReport.category}</span>
              </div>

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

            <footer className={styles.drawerFooter}>
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
              <button
                type="button"
                className={styles.drawerBtnPrimary}
                onClick={() =>
                  navigate(`/reports/${openReport.id}/edit`, { state: { backgroundLocation: location } })
                }
              >
                Edit report
              </button>
            </footer>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

interface MetaProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Meta({ label, value, mono }: MetaProps) {
  return (
    <div className={styles.metaTile}>
      <div className={styles.metaLabel}>{label}</div>
      <div className={`${styles.metaValue} ${mono ? styles.metaValueMono : ""}`}>{value}</div>
    </div>
  );
}

function Timeline({ report }: { report: Report }) {
  // Always start with "Report filed" derived from report.filed (so legacy
  // db.json reports still show it even when their activityLog is empty),
  // then append every persisted entry in chronological order. Dedupe if
  // the log already contains its own "Report filed" row.
  const log = report.activityLog ?? [];
  const sorted = [...log].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const hasFiled = sorted.some((e) => e.label === "Report filed");
  const base = hasFiled
    ? sorted.map((e) => ({ label: e.label, at: e.at }))
    : [{ label: "Report filed", at: report.filed }, ...sorted.map((e) => ({ label: e.label, at: e.at }))];

  // Legacy reports with no log: also surface the last update row.
  if (log.length === 0 && report.updated && report.updated !== report.filed) {
    base.push({
      label: report.status === "resolved" ? "Marked resolved" : "Latest update",
      at: report.updated
    });
  }

  const events = base.map((e, idx, arr) => ({
    ...e,
    color: idx === arr.length - 1 ? SEV[report.severity].color : "var(--mute)"
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
