import { useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import StatTile from "../components/StatTile";
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

function Spinner() {
  return (
    <svg className={styles.spinner} width="11" height="11" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 100" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [deleteReport] = useDeleteReportMutation();
  const { data: reports = [], isLoading, isError, refetch } = useGetReportsQuery();
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
                "--chip-delay": `${0.18 + idx * 0.05}s`
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
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className={`thinScroll ${styles.list}`}>
            {filtered.map((r: Report, i: number) => {
              const isActive = selected === r.id;
              const itemStyle = {
                "--item-delay": `${0.35 + i * 0.06}s`
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
                    <span className={styles.itemAgo}>{timeAgo(r.updated)}</span>
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
        <div className={styles.sync}>
          <Spinner />
          Syncing every 30s
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
  const events = [
    { label: "Report filed", at: report.filed, color: "var(--mute)" },
    {
      label: "Acknowledged by ward",
      at: new Date(new Date(report.filed).getTime() + 1000 * 60 * 60 * 8).toISOString(),
      color: SEV.warning.color
    },
    {
      label: report.status === "resolved" ? "Marked resolved" : "Latest update",
      at: report.updated,
      color: SEV[report.severity].color
    }
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
