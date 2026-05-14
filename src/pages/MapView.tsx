/* eslint-disable */
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import ReportMap from "../components/ReportMap";
import LoadingState from "../components/LoadingState";
import StatTile from "../components/StatTile";
import { useDeleteReportMutation, useGetReportsQuery } from "../features/reports/reportsApi";
import { setToastMessage } from "../features/ui/uiSlice";
import type { Report } from "../types";

const SEV = {
  safe: { color: "#22C55E", label: "Safe / resolved" },
  warning: { color: "#F59E0B", label: "Needs attention" },
  danger: { color: "#F43F5E", label: "Urgent / hazard" }
};
const STATUS_LABEL = { open: "Open", "in progress": "In progress", resolved: "Resolved" };

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
    <svg width="11" height="11" viewBox="0 0 24 24" style={{ animation: "spin 2s linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 100" strokeLinecap="round" opacity="0.6" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default function MapView() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [deleteReport] = useDeleteReportMutation();
  const { data: reports = [], isLoading } = useGetReportsQuery();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  const filtered = useMemo(() => {
    const list = filter === "all" ? reports : reports.filter((r: any) => r.severity === filter);
    return [...list].sort(
      (a: Report, b: Report) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    );
  }, [reports, filter]);

  const open = reports.filter((r: any) => r.status !== "resolved").length;
  const resolved = reports.filter((r: any) => r.status === "resolved").length;
  const openReport = reports.find((r: any) => r.id === openId) as Report | undefined;

  const closeDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    window.setTimeout(() => {
      setOpenId(null);
      setIsDetailClosing(false);
    }, 380);
  };

  if (isLoading) return <LoadingState label="Loading neighborhood map" />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, padding: 24, maxWidth: 1600, margin: "0 auto", height: "calc(100vh - 73px)" }}>
      <aside style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
        <div style={{ animation: "fadeUp .5s both" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500 }}>Neighborhood</div>
          <h1 style={{ margin: "6px 0 0", fontSize: 32, lineHeight: 1.05, letterSpacing: "-0.025em", fontWeight: 700 }}>
            What's happening
            <br />
            <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "var(--accent)" }}>around you</em>
          </h1>
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--mute)", lineHeight: 1.5 }}>
            Live view of community-reported issues. Markers pulse on areas needing attention.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <StatTile label="Total" value={reports.length} index={0} />
          <StatTile label="Open" value={open} accent="var(--accent)" index={1} />
          <StatTile label="Resolved" value={resolved} accent="var(--safe)" index={2} />
        </div>

        <div style={{ animation: "fadeUp .5s .2s both" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500, marginBottom: 8 }}>Filter by severity</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { id: "all", label: "Everything", c: "var(--ink)" },
              { id: "danger", label: "Urgent", c: SEV.danger.color },
              { id: "warning", label: "Attention", c: SEV.warning.color },
              { id: "safe", label: "Resolved", c: SEV.safe.color }
            ].map((f, idx) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  background: filter === f.id ? "var(--ink)" : "var(--paper)",
                  color: filter === f.id ? "var(--paper)" : "var(--ink)",
                  border: "1px solid " + (filter === f.id ? "var(--ink)" : "var(--line)"),
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  transition:
                    "transform .2s cubic-bezier(.2,.8,.2,1), background .2s, color .2s, border-color .2s, box-shadow .25s",
                  animation: `fadeUp .45s ${0.18 + idx * 0.05}s both`,
                  boxShadow:
                    filter === f.id ? "0 6px 16px -8px rgba(15,23,42,0.45)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (filter !== f.id) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = f.c;
                    e.currentTarget.style.boxShadow = `0 8px 18px -10px ${f.c}aa`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== f.id) {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.borderColor = "var(--line)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: f.c,
                    boxShadow: `0 0 0 0 ${f.c}66`,
                    animation: filter === f.id ? "pulseDot 1.6s ease-in-out infinite" : undefined
                  }}
                />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ animation: "fadeUp .5s .3s both", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, flexShrink: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500 }}>Live feed</div>
            <span style={{ fontSize: 11, color: "var(--mute)" }}>
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
          </div>
          <div
            className="thinScroll"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
              paddingRight: 14,
              paddingBottom: 6
            }}
          >
            {filtered.map((r: any, i: number) => (
              <button
                key={r.id}
                onMouseEnter={() => setSelected(r.id)}
                onMouseLeave={() => setSelected(null)}
                onClick={() => {
                  setIsDetailClosing(false);
                  setOpenId(r.id);
                }}
                style={{
                  textAlign: "left",
                  padding: 14,
                  background: selected === r.id ? "var(--ink)" : "var(--paper)",
                  color: selected === r.id ? "var(--paper)" : "var(--ink)",
                  border: "1px solid " + (selected === r.id ? "var(--ink)" : "var(--line)"),
                  borderRadius: 12,
                  transition:
                    "transform .25s cubic-bezier(.2,.8,.2,1), background .2s, color .2s, border-color .2s, box-shadow .25s",
                  animation: `fadeUp .5s ${0.35 + i * 0.06}s both`,
                  cursor: "pointer",
                  transform: selected === r.id ? "translateY(-2px)" : "none",
                  boxShadow:
                    selected === r.id
                      ? "0 14px 28px -16px rgba(15,23,42,0.45)"
                      : "0 1px 0 rgba(15,23,42,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: (SEV as any)[r.severity].color, boxShadow: `0 0 0 3px ${(SEV as any)[r.severity].color}33` }} />
                  <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: selected === r.id ? "rgba(248,250,252,0.6)" : "var(--mute)" }}>
                    {(STATUS_LABEL as any)[r.status]} · {r.category}
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: selected === r.id ? "rgba(248,250,252,0.5)" : "var(--mute)" }}>{timeAgo(r.updated)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em", lineHeight: 1.3 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: selected === r.id ? "rgba(248,250,252,0.55)" : "var(--mute)", marginTop: 4 }}>{r.address}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div style={{ position: "relative", animation: "fadeIn .6s both" }}>
        <ReportMap
          reports={filtered}
          selectedId={selected ?? openId}
          showCoordsHud={false}
          onSelect={(id) => {
            setIsDetailClosing(false);
            setOpenId(id);
          }}
        />
        <div style={{ position: "absolute", bottom: 20, left: 20, zIndex: 5, background: "rgba(248,250,252,0.92)", backdropFilter: "blur(10px)", border: "1px solid var(--line)", borderRadius: 14, padding: "12px 14px", boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 500, marginBottom: 8 }}>Severity</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(SEV).map(([k, v]: any) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.color, boxShadow: `0 0 0 3px ${v.color}33` }} />
                <span>{v.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", top: 18, right: 60, zIndex: 5, background: "rgba(248,250,252,0.92)", backdropFilter: "blur(10px)", border: "1px solid var(--line)", borderRadius: 999, padding: "6px 12px", fontSize: 11, color: "var(--mute)", letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Spinner />
          Syncing every 30s
        </div>
      </div>

      {openReport && (
        <div
          onClick={closeDetail}
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
              <button onClick={closeDetail} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--mute)", fontWeight: 500 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to map
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() =>
                    navigate(`/reports/${openReport.id}/edit`, { state: { backgroundLocation: location } })
                  }
                  style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, background: "var(--paper-2)", border: "1px solid var(--line)" }}
                >
                  Edit
                </button>
                <button
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", background: (SEV as any)[openReport.severity].color + "1a", color: (SEV as any)[openReport.severity].color }}>
                  {openReport.severity === "safe" ? "Resolved" : openReport.severity === "warning" ? "Attention" : "Urgent"}
                </span>
                <span style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "var(--paper-2)", border: "1px solid var(--line)" }}>
                  {(STATUS_LABEL as any)[openReport.status]}
                </span>
                <span style={{ padding: "5px 11px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: "var(--paper-2)", border: "1px solid var(--line)", textTransform: "capitalize" }}>
                  {openReport.category}
                </span>
              </div>

              <h2 style={{ margin: "18px 0 8px", fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {openReport.title}
              </h2>
              <div style={{ fontSize: 13, color: "var(--mute)" }}>
                Filed by <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{openReport.reporter}</strong> · {fmtDate(openReport.filed)}
              </div>
              <p style={{ marginTop: 20, fontSize: 32, lineHeight: 1.15, letterSpacing: "-0.015em", fontWeight: 500 }}>{openReport.description}</p>

              <div style={{ marginTop: 24, height: 220 }}>
                <ReportMap
                  reports={[openReport]}
                  selectedId={openReport.id}
                  interactive={false}
                  zoom={16}
                  onMapClick={() => openGoogleMaps(openReport.lat, openReport.lng)}
                />
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
    </div>
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
  const events = [
    { label: "Report filed", at: report.filed, color: "var(--mute)" },
    { label: "Acknowledged by ward", at: new Date(new Date(report.filed).getTime() + 1000 * 60 * 60 * 8).toISOString(), color: SEV.warning.color },
    { label: report.status === "resolved" ? "Marked resolved" : "Latest update", at: report.updated, color: (SEV as any)[report.severity].color }
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
