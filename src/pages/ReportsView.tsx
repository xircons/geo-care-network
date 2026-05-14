import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
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
  const { data: reports = [], isLoading } = useGetReportsQuery();
  const [openReport, setOpenReport] = useState<Report | null>(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(reports.map((r) => r.category)))],
    [reports]
  );

  if (isLoading) {
    return <LoadingState label="Loading reports" />;
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(6px)",
            animation: isDetailClosing ? "fadeOut .38s ease-in both" : "fadeIn .4s ease-out both",
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={closeDetail}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 96vw)",
              height: "100vh",
              position: "relative",
              zIndex: 2001,
              background: "var(--paper)",
              overflow: "auto",
              borderLeft: "1px solid var(--line)",
              animation: isDetailClosing
                ? "drawerOut .38s cubic-bezier(0.4, 0, 0.2, 1) both"
                : "drawerIn .42s cubic-bezier(0.16, 1, 0.3, 1) both"
            }}
          >
            <div
              style={{
                padding: "20px 32px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                background: "rgba(248,250,252,0.95)",
                backdropFilter: "blur(10px)",
                zIndex: 2
              }}
            >
              <button type="button" onClick={closeDetail} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--mute)", fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to map
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/reports/${openReport.id}/edit`, { state: { backgroundLocation: location } })
                  }
                  style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "var(--paper-2)", border: "1px solid var(--line)" }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteReport(openReport.id).unwrap();
                    dispatch(setToastMessage("Report deleted"));
                    closeDetail();
                  }}
                  style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "transparent", border: "1px solid rgba(244,63,94,0.4)", color: "var(--danger)" }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div style={{ padding: "28px 32px 40px" }}>
              <h2 style={{ margin: 0, fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {openReport.title}
              </h2>
              <div style={{ marginTop: 8, fontSize: 13, color: "var(--mute)" }}>
                Filed by <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{openReport.reporter}</strong> · {fmtDate(openReport.filed)}
              </div>
              <p style={{ marginTop: 22, fontSize: 16, lineHeight: 1.6, color: "var(--ink)" }}>{openReport.description}</p>

              <div style={{ marginTop: 18, height: 220 }}>
                <ReportMap
                  reports={[openReport]}
                  selectedId={openReport.id}
                  interactive={false}
                  zoom={16}
                  onMapClick={() => openGoogleMaps(openReport.lat, openReport.lng)}
                />
              </div>

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Meta label="Address" value={openReport.address} />
                <Meta label="Reporter" value={openReport.reporter} />
                <Meta label="Filed" value={fmtDate(openReport.filed)} />
                <Meta label="Last update" value={fmtDate(openReport.updated)} />
                <Meta label="Report ID" mono value={openReport.id.toUpperCase()} />
              </div>

              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500, marginBottom: 14 }}>
                  Activity
                </div>
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
    <div style={{ padding: 14, background: "var(--paper-2)", borderRadius: 12, border: "1px solid var(--line)" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 500, fontFamily: mono ? "'Geist Mono', monospace" : "Geist" }}>{value}</div>
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
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 1, background: "var(--line)" }} />
      {events.map((event, idx) => (
        <div key={idx} style={{ position: "relative", paddingBottom: idx === events.length - 1 ? 0 : 18 }}>
          <div style={{ position: "absolute", left: -22, top: 2, width: 13, height: 13, borderRadius: "50%", background: "var(--paper)", border: `2px solid ${event.color}` }}>
            <div style={{ position: "absolute", inset: 2, borderRadius: "50%", background: event.color }} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{event.label}</div>
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>{fmtDate(event.at)}</div>
        </div>
      ))}
    </div>
  );
}
