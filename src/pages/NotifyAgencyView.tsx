import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import SyncBadge from "../components/SyncBadge";
import {
  useDeleteReportMutation,
  useGetReportsQuery,
  useUpdateReportMutation
} from "../features/reports/reportsApi";
import { showToast } from "../features/ui/uiSlice";
import type { ActivityLogEntry, Report, ReportStatus, Severity } from "../types";
import styles from "./NotifyAgencyView.module.css";

// 5-second polling — fast enough to feel live, gentle enough on the mock API.
const POLL_INTERVAL_MS = 5000;

// Resolved reports older than this drop out of the regular Notify tabs and
// are reachable only via /notify/archived. 24 hours per the product spec.
const ARCHIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const ARCHIVED_ROUTE = "/notify/archived";
const NOTIFY_ROUTE = "/notify";

/**
 * Returns the ISO timestamp at which the report transitioned to resolved.
 * Prefers the latest "Marked resolved" activity log entry; falls back to
 * `report.updated` for legacy resolved reports that pre-date the activity
 * log. Returns null when the report isn't resolved.
 */
function getResolvedAt(report: Report): string | null {
  if (report.status !== "resolved") return null;
  const log = report.activityLog ?? [];
  const resolvedEntries = log
    .filter((e) => e.label === "Marked resolved")
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (resolvedEntries.length > 0) return resolvedEntries[0].at;
  return report.updated;
}

/**
 * A report is archived once it has been resolved for more than 24h. Archived
 * reports disappear from every tab on /notify and are reachable only via
 * /notify/archived.
 */
function isArchived(report: Report, now: number = Date.now()): boolean {
  const resolvedAt = getResolvedAt(report);
  if (!resolvedAt) return false;
  return now - new Date(resolvedAt).getTime() > ARCHIVE_THRESHOLD_MS;
}

// sessionStorage key — used ONLY for auto-pop suppression ("show this report's
// drawer once per session"). It never hides reports from the sidebar list.
const SEEN_STORAGE_KEY = "notify_seen_report_ids";

const severityColor: Record<Severity, string> = {
  safe: "#22C55E",
  warning: "#F59E0B",
  danger: "#F43F5E"
};

const severityLabel: Record<Severity, string> = {
  safe: "Resolved",
  warning: "Attention",
  danger: "Urgent"
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Awaiting",
  "in progress": "In progress",
  resolved: "Resolved"
};

type Tab = "all" | "open" | "in progress" | "resolved" | "archived";

const TAB_DEFS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Awaiting" },
  { id: "in progress", label: "In progress" },
  { id: "resolved", label: "Resolved" }
];

// The Archived tab is a separate visual group rendered next to the main
// tab bar — it lives at /notify/archived rather than as a peer of the
// status tabs.
const ARCHIVED_TAB: { id: Tab; label: string } = { id: "archived", label: "Archived" };

const isCctvReport = (r: Report): boolean =>
  r.source === "cctv" || r.reporter === "CCTV Auto-Detect";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    /* fall through */
  }
  return new Set();
}

function saveSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    /* sessionStorage may be unavailable in private mode */
  }
}

const fmtDate = (s: string) => {
  const d = new Date(s);
  return (
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

const timeAgo = (s: string): string => {
  const delta = Date.now() - new Date(s).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const openGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
};

export default function NotifyAgencyView() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isArchivedRoute = location.pathname === ARCHIVED_ROUTE;

  const { data: reports = [], isLoading, isError, refetch } = useGetReportsQuery(
    undefined,
    {
      pollingInterval: POLL_INTERVAL_MS,
      refetchOnFocus: true,
      refetchOnReconnect: true
    }
  );
  // Single mutation hook drives both Acknowledge and Mark resolved — the
  // loading flag covers either operation.
  const [updateReport, { isLoading: isUpdating }] = useUpdateReportMutation();
  const [deleteReport, { isLoading: isDeleting }] = useDeleteReportMutation();

  const [tab, setTab] = useState<Tab>(isArchivedRoute ? "archived" : "open");
  const [seenIds, setSeenIds] = useState<Set<string>>(() => loadSeen());
  const [drawerReportId, setDrawerReportId] = useState<string | null>(null);
  // How the detail UI was triggered — auto-pop renders as a centered alert
  // modal, manual clicks open the right-side drawer. Same content, different
  // visual treatment.
  const [openSource, setOpenSource] = useState<"auto" | "manual">("manual");
  const [isClosing, setIsClosing] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  useEffect(() => {
    saveSeen(seenIds);
  }, [seenIds]);

  // Tick once a minute so resolved cards transition into the Archived view
  // even when no new data arrives from polling. `now` is read by every
  // isArchived() call via the memo dependency below.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Keep the internal tab state in sync with the URL — landing on
  // /notify/archived selects the Archived tab, and back-navigation to
  // /notify resets to "Awaiting".
  useEffect(() => {
    if (isArchivedRoute && tab !== "archived") {
      setTab("archived");
    } else if (!isArchivedRoute && tab === "archived") {
      setTab("open");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArchivedRoute]);

  const cctvReports = useMemo(() => reports.filter(isCctvReport), [reports]);

  // Split into "live" vs "archived" once — every downstream piece (counts,
  // tab list, map markers, auto-pop) reads from these two arrays so the
  // archived-only-on-/notify/archived rule is enforced in a single place.
  // `now` is in the dependency list so cards transition once the minute
  // tick fires past the 24h threshold without waiting on poll data.
  const { liveCctvReports, archivedReports } = useMemo(() => {
    const live: Report[] = [];
    const archived: Report[] = [];
    for (const r of cctvReports) {
      if (isArchived(r, now)) archived.push(r);
      else live.push(r);
    }
    return { liveCctvReports: live, archivedReports: archived };
  }, [cctvReports, now]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = {
      all: liveCctvReports.length,
      open: 0,
      "in progress": 0,
      resolved: 0,
      archived: archivedReports.length
    };
    for (const r of liveCctvReports) c[r.status]++;
    return c;
  }, [liveCctvReports, archivedReports]);

  const list = useMemo(() => {
    let filtered: Report[];
    if (tab === "archived") {
      filtered = archivedReports;
    } else if (tab === "all") {
      filtered = liveCctvReports;
    } else {
      filtered = liveCctvReports.filter((r) => r.status === tab);
    }
    return [...filtered].sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
  }, [liveCctvReports, archivedReports, tab]);

  // Auto-pop: if no detail UI is open and there's an awaiting CCTV report we
  // haven't shown this session, pop it as a centered alert modal. Skipped on
  // the archived route — that's a read-only history view, no triage needed.
  useEffect(() => {
    if (isArchivedRoute) return;
    if (drawerReportId) return;
    const next = liveCctvReports
      .filter((r) => r.status === "open" && !seenIds.has(r.id))
      .sort((a, b) => new Date(a.filed).getTime() - new Date(b.filed).getTime())[0];
    if (next) {
      setDrawerReportId(next.id);
      setOpenSource("auto");
    }
  }, [liveCctvReports, seenIds, drawerReportId, isArchivedRoute]);

  useEffect(() => {
    setIsClosing(false);
  }, [drawerReportId]);

  const drawerReport = drawerReportId
    ? cctvReports.find((r) => r.id === drawerReportId) ?? null
    : null;
  const drawerReportIsArchived = drawerReport ? isArchived(drawerReport, now) : false;

  // Tab clicks navigate when crossing the live/archived boundary, otherwise
  // they only change local state — same shell, two URLs.
  const handleTabChange = (id: Tab) => {
    if (id === "archived" && !isArchivedRoute) {
      navigate(ARCHIVED_ROUTE);
    } else if (id !== "archived" && isArchivedRoute) {
      navigate(NOTIFY_ROUTE);
    }
    setTab(id);
  };

  const closeDrawer = (markSeen: boolean) => {
    const id = drawerReportId;
    setIsClosing(true);
    window.setTimeout(() => {
      if (id && markSeen) {
        setSeenIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }
      setDrawerReportId(null);
    }, 380);
  };

  const openDrawerForId = (id: string) => {
    setDrawerReportId(id);
    setOpenSource("manual");
    setIsClosing(false);
  };

  const acknowledge = async (report: Report) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      label: "Acknowledged by agency",
      at: new Date().toISOString()
    };
    const nextLog: ActivityLogEntry[] = [...(report.activityLog ?? []), entry];
    try {
      await updateReport({
        id: report.id,
        status: "in progress",
        activityLog: nextLog
      }).unwrap();
      dispatch(showToast({ message: "Report acknowledged — status updated.", tone: "success" }));
      closeDrawer(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to acknowledge report.";
      dispatch(showToast({ message: msg, tone: "error" }));
    }
  };

  const markResolved = async (report: Report) => {
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      label: "Marked resolved",
      at: new Date().toISOString()
    };
    // Read-merge-append, same pattern as acknowledge.
    const nextLog: ActivityLogEntry[] = [...(report.activityLog ?? []), entry];
    try {
      await updateReport({
        id: report.id,
        status: "resolved",
        // Flip severity to "safe" so resolved reports render with the green
        // dot/badge across the app, matching the visual convention used by
        // every other view.
        severity: "safe",
        activityLog: nextLog
      }).unwrap();
      dispatch(showToast({ message: "Report marked resolved.", tone: "success" }));
      closeDrawer(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark resolved.";
      dispatch(showToast({ message: msg, tone: "error" }));
    }
  };

  const removeReport = async (report: Report) => {
    if (!window.confirm("Delete this report permanently? This can't be undone.")) return;
    try {
      await deleteReport(report.id).unwrap();
      dispatch(showToast({ message: "Report deleted.", tone: "success" }));
      closeDrawer(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete report.";
      dispatch(showToast({ message: msg, tone: "error" }));
    }
  };

  if (isLoading) return <LoadingState label="Loading agency dashboard" />;
  if (isError) {
    return (
      <ErrorState
        title="Couldn't load alerts"
        message="We weren't able to reach the reports service. Check the mock API and try again."
        onRetry={() => refetch()}
      />
    );
  }

  const mapReports = list;
  const highlightedId = drawerReportId ?? selectedMapId;

  return (
    <section className={styles.page}>
      <aside className={styles.sidebar}>
        <header className={styles.intro}>
          <div className={styles.eyebrow}>
            {isArchivedRoute ? "Agency desk · archive" : "Agency desk"}
          </div>
          <h1 className={styles.title}>
            {isArchivedRoute ? "Archived incidents" : "Incident monitor"}
          </h1>
          <p className={styles.lead}>
            {isArchivedRoute
              ? "Resolved incidents older than 24 hours. Read-only history."
              : "Live queue of CCTV incidents. New alerts pop up automatically."}
          </p>
        </header>

        <div className={styles.tabsBlock}>
          <div className={styles.tabsTopRow}>
            {isArchivedRoute ? (
              <button
                type="button"
                className={styles.archivedLink}
                onClick={() => handleTabChange("open")}
                title="Back to incident monitor"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 13 13"
                  aria-hidden
                  className={styles.archivedLinkIcon}
                >
                  <path
                    d="M8 2.5L3.5 6.5L8 10.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={styles.archivedLinkText}>Back</span>
              </button>
            ) : (
              <span className={styles.tabsTopRowSpacer} aria-hidden />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={tab === "archived"}
              className={`${styles.archivedLink} ${tab === "archived" ? styles.archivedLinkActive : ""}`}
              onClick={() => handleTabChange(ARCHIVED_TAB.id)}
              title="Resolved incidents older than 24 hours"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                aria-hidden
                className={styles.archivedLinkIcon}
              >
                <path
                  d="M1.5 3h10v2h-10zM2.5 5v5.5h8V5M5 7.5h3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.archivedLinkText}>{ARCHIVED_TAB.label}</span>
              <span className={styles.archivedLinkCount}>{counts.archived}</span>
            </button>
          </div>
          {!isArchivedRoute && (
            <div className={styles.tabs} role="tablist" aria-label="Filter by status">
              {TAB_DEFS.map(({ id, label }) => {
                const active = tab === id;
                // The Awaiting tab uses the red alert pill when there are
                // queued incidents — matches the topbar Notify badge so the
                // visual urgency signal is consistent.
                const isAlert = id === "open" && counts[id] > 0;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                    onClick={() => handleTabChange(id)}
                  >
                    {label}
                    <span
                      className={`${styles.tabCount} ${isAlert ? styles.tabCountAlert : ""}`}
                    >
                      {counts[id]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.listHeader}>
          <span className={styles.listLabel}>
            {tab === "all"
              ? "All CCTV reports"
              : tab === "archived"
              ? "Archived (older than 24h)"
              : `${TAB_DEFS.find((t) => t.id === tab)?.label}`}
          </span>
          <span className={styles.listCount}>
            {list.length} item{list.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className={`thinScroll ${styles.list}`}>
          {list.length === 0 ? (
            <div className={styles.empty}>
              {tab === "open"
                ? "All caught up — nothing awaiting."
                : tab === "in progress"
                ? "Nothing currently being handled."
                : tab === "resolved"
                ? "No resolved incidents yet."
                : tab === "archived"
                ? "No archived incidents yet. Resolved cards move here after 24 hours."
                : "No CCTV reports yet."}
            </div>
          ) : (
            list.map((r) => {
              const active = drawerReportId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.card} ${active ? styles.cardActive : ""}`}
                  onClick={() => openDrawerForId(r.id)}
                  onMouseEnter={() => setSelectedMapId(r.id)}
                  onMouseLeave={() => setSelectedMapId(null)}
                >
                  <div className={styles.cardMeta}>
                    <span
                      className={styles.cardSev}
                      style={
                        { "--sev-color": severityColor[r.severity] } as CSSProperties
                      }
                      aria-label={severityLabel[r.severity]}
                    />
                    <span
                      className={`${styles.cardStatus} ${styles[`cardStatus_${r.status.replace(" ", "_")}`] ?? ""}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    <span className={styles.cardAgo}>{timeAgo(r.filed)}</span>
                  </div>
                  <div className={styles.cardTitle}>{r.title}</div>
                  <div className={styles.cardAddress}>{r.address}</div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className={styles.mapShell}>
        <ReportMap
          reports={mapReports}
          selectedId={highlightedId}
          onSelect={openDrawerForId}
        />
        <SyncBadge synced={!isError} className={styles.pollBadge} />
      </div>

      {drawerReport &&
        createPortal(
          <>
            <div
              onClick={() => closeDrawer(true)}
              className={`${
                openSource === "auto" ? styles.modalOverlay : styles.drawerOverlay
              } ${
                isClosing
                  ? openSource === "auto"
                    ? styles.modalOverlayClosing
                    : styles.drawerOverlayClosing
                  : ""
              }`}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="notify-drawer-title"
              onClick={(e) => e.stopPropagation()}
              className={`${openSource === "auto" ? styles.modal : styles.drawer} ${
                isClosing
                  ? openSource === "auto"
                    ? styles.modalClosing
                    : styles.drawerClosing
                  : ""
              }`}
            >
              <header className={styles.drawerHeader}>
                <div className={styles.drawerHeading}>
                  <div className={styles.drawerKicker}>
                    {drawerReportIsArchived
                      ? `Archived · ${drawerReport.category}`
                      : openSource === "auto"
                      ? `New CCTV alert · ${drawerReport.category}`
                      : `Report · ${drawerReport.category}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => closeDrawer(true)}
                  className={styles.drawerCancel}
                  title="Close — stays in Awaiting list"
                >
                  Cancel
                </button>
              </header>

              <div className={styles.drawerBody}>
                <h1 id="notify-drawer-title" className={styles.drawerTitle}>
                  {drawerReport.title}
                </h1>

                <div className={styles.badgeRow}>
                  <span
                    className={styles.severityBadge}
                    style={
                      {
                        "--sev-color": severityColor[drawerReport.severity]
                      } as CSSProperties
                    }
                  >
                    {severityLabel[drawerReport.severity]}
                  </span>
                  <span className={styles.badge}>
                    {STATUS_LABEL[drawerReport.status]}
                  </span>
                  <span className={styles.badge}>{drawerReport.category}</span>
                  <span
                    className={`${styles.crashBadge} ${
                      drawerReport.cctvCrashDetected
                        ? styles.crashBadgeYes
                        : styles.crashBadgeNo
                    }`}
                  >
                    {drawerReport.cctvCrashDetected
                      ? "Crash detected"
                      : "No crash detected"}
                  </span>
                </div>

                <div className={styles.drawerFiled}>
                  Filed by{" "}
                  <strong className={styles.drawerFiledStrong}>
                    {drawerReport.reporter}
                  </strong>{" "}
                  · {fmtDate(drawerReport.filed)}
                </div>

                <p className={styles.drawerDescription}>
                  {drawerReport.description}
                </p>

                <div className={styles.drawerMapWrap}>
                  <ReportMap
                    reports={[drawerReport]}
                    selectedId={drawerReport.id}
                    interactive={false}
                    zoom={16}
                    onMapClick={() => openGoogleMaps(drawerReport.lat, drawerReport.lng)}
                  />
                </div>

                <div className={styles.metaGrid}>
                  <Meta label="Address" value={drawerReport.address} />
                  <Meta label="Reporter" value={drawerReport.reporter} />
                  <Meta label="Filed" value={fmtDate(drawerReport.filed)} />
                  <Meta label="Last update" value={fmtDate(drawerReport.updated)} />
                  <Meta
                    label="Report ID"
                    value={drawerReport.id.toUpperCase()}
                    mono
                  />
                </div>

                <div className={styles.activityWrap}>
                  <div className={styles.activityTitle}>Activity</div>
                  <Timeline report={drawerReport} />
                </div>
              </div>

              {(() => {
                const supportive = drawerReportIsArchived
                  ? "Archived — resolved more than 24 hours ago. Read-only history."
                  : drawerReport.status === "open"
                  ? "Cancel leaves this in Awaiting — acknowledge to start responding."
                  : drawerReport.status === "in progress"
                  ? "Currently being handled. Mark resolved when the incident is cleared."
                  : "This incident is resolved.";
                return (
                  <footer className={styles.drawerFooter}>
                    <span className={styles.supportiveLine}>{supportive}</span>
                    <div className={styles.drawerFooterActions}>
                    <button
                      type="button"
                      className={styles.drawerBtnDanger}
                      disabled={isDeleting || isUpdating}
                      onClick={() => removeReport(drawerReport)}
                    >
                      {isDeleting ? "Deleting…" : "Delete"}
                    </button>
                    {drawerReport.status === "open" && (
                      <button
                        type="button"
                        className={styles.drawerBtnPrimary}
                        disabled={isUpdating || isDeleting}
                        onClick={() => acknowledge(drawerReport)}
                      >
                        {isUpdating ? "Acknowledging…" : "Acknowledge"}
                      </button>
                    )}
                    {drawerReport.status === "in progress" && (
                      <button
                        type="button"
                        className={styles.drawerBtnResolve}
                        disabled={isUpdating || isDeleting}
                        onClick={() => markResolved(drawerReport)}
                      >
                        {isUpdating ? "Resolving…" : "Mark resolved"}
                      </button>
                    )}
                    </div>
                  </footer>
                );
              })()}
            </div>
          </>,
          document.body
        )}
    </section>
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
      <div className={`${styles.metaValue} ${mono ? styles.metaValueMono : ""}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * Renders the report's activity timeline. The first row is always
 * "Report filed" derived from `report.filed` (so legacy db.json reports
 * without an activityLog still show the initial event after they're
 * acknowledged). After that, every entry in activityLog appears in
 * chronological order — dedup happens if the log already contains its
 * own "Report filed" row.
 */
function Timeline({ report }: { report: Report }) {
  const events = buildTimelineEvents(report);
  return (
    <div className={styles.timeline}>
      {events.map((event, idx, arr) => {
        const color =
          idx === arr.length - 1 ? severityColor[report.severity] : "var(--mute)";
        return (
          <div key={`${event.label}-${event.at}-${idx}`} className={styles.timelineEvent}>
            <div
              className={styles.timelineDot}
              style={{ "--timeline-color": color } as CSSProperties}
            />
            <div className={styles.timelineLabel}>{event.label}</div>
            <div className={styles.timelineAt}>
              {fmtDate(event.at)} <span className={styles.timelineAgo}>({timeAgo(event.at)})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TimelineEvent {
  label: string;
  at: string;
}

function buildTimelineEvents(report: Report): TimelineEvent[] {
  const log = report.activityLog ?? [];
  const sorted = [...log].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
  const hasFiled = sorted.some((e) => e.label === "Report filed");
  const events: TimelineEvent[] = hasFiled
    ? sorted.map((e) => ({ label: e.label, at: e.at }))
    : [{ label: "Report filed", at: report.filed }, ...sorted.map((e) => ({ label: e.label, at: e.at }))];

  // Fallback for legacy reports with no log and a meaningful update time:
  // show "Latest update" so the timeline isn't a single-row stub.
  if (log.length === 0 && report.updated && report.updated !== report.filed) {
    events.push({
      label: report.status === "resolved" ? "Marked resolved" : "Latest update",
      at: report.updated
    });
  }

  return events;
}
