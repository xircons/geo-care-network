import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L, { type DivIcon } from "leaflet";
import type { Report, Severity } from "../types";
import styles from "./ReportMap.module.css";

const severityColor: Record<Severity, string> = {
  safe: "#22C55E",
  warning: "#F59E0B",
  danger: "#F43F5E"
};

/** Approximate pill size for clamping (px). */
const MAP_ACTION_HINT_W = 196;
const MAP_ACTION_HINT_H = 40;
const MAP_ACTION_HINT_OFFSET = 14;

interface ReportMapProps {
  reports: Report[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  zoom?: number;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
  /** When false, no lat/lng text in the map corner (e.g. main Live map). Default true. */
  showCoordsHud?: boolean;
}

function timeAgo(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function severityLabel(severity: Severity): string {
  if (severity === "danger") return "Urgent";
  if (severity === "warning") return "Attention";
  return "Resolved";
}

function statusLabel(status: Report["status"]): string {
  if (status === "in progress") return "In progress";
  if (status === "resolved") return "Resolved";
  return "Open";
}

function FitToReports({ reports, zoom }: { reports: Report[]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length === 0) return;
    if (reports.length === 1) {
      map.setView([reports[0].lat, reports[0].lng], zoom, { animate: false });
      return;
    }
    const bounds = L.latLngBounds(reports.map((report) => [report.lat, report.lng]));
    map.fitBounds(bounds, { padding: [50, 50], animate: false, maxZoom: zoom });
  }, [map, reports, zoom]);

  return null;
}

function ClearTooltipOnMapClick({
  onClear
}: {
  onClear: () => void;
}) {
  useMapEvents({
    click: () => onClear(),
    zoomstart: () => onClear()
  });
  return null;
}

function HandleMapClick({
  enabled,
  onMapClick
}: {
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (!enabled) return;
      onMapClick(event.latlng.lat, event.latlng.lng);
    }
  });
  return null;
}

function CoordsHudTracker({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const c = map.getCenter();
    onMove(c.lat, c.lng);
  }, [map, onMove]);

  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove(c.lat, c.lng);
    },
    zoomend: () => {
      const c = map.getCenter();
      onMove(c.lat, c.lng);
    }
  });

  return null;
}

function createMarkerIcon(color: string, selected: boolean, severity: Severity): DivIcon {
  const selectedClass = selected ? styles.markerSelected : "";
  const resolvedClass = severity === "safe" ? styles.markerResolved : "";
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `
      <div class="${styles.markerWrap} ${selectedClass} ${resolvedClass}">
        <span class="${styles.markerRing}" style="background:${color};opacity:0.32"></span>
        <span class="${styles.markerRing} ${styles.markerRingAlt}" style="background:${color};opacity:0.2"></span>
        <span class="${styles.markerDot}" style="background:${color};box-shadow:0 0 0 3px #fff,0 0 0 4px ${color}40,0 4px 12px ${color}66"></span>
      </div>
    `
  });
}

export default function ReportMap({
  reports,
  selectedId = null,
  onSelect,
  interactive = true,
  zoom = 15,
  className,
  onMapClick,
  showCoordsHud = true
}: ReportMapProps) {
  const [hoveredReportId, setHoveredReportId] = useState<string | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const hostRef = useRef<HTMLDivElement>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const keepOpen = (id: string) => {
    clearHideTimer();
    setHoveredReportId(id);
  };

  const scheduleClose = () => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setHoveredReportId(null);
    }, 420);
  };

  useEffect(() => {
    return () => clearHideTimer();
  }, []);

  useEffect(() => {
    Object.entries(markerRefs.current).forEach(([id, marker]) => {
      if (hoveredReportId === id) {
        marker.openPopup();
      } else {
        marker.closePopup();
      }
    });
  }, [hoveredReportId]);

  const fallbackCenter: [number, number] = [18.7883, 98.9853];
  const center: [number, number] = reports[0] ? [reports[0].lat, reports[0].lng] : fallbackCenter;
  const enableHoverPopup = interactive && Boolean(onSelect);

  const [viewCenter, setViewCenter] = useState<{ lat: number; lng: number }>(() => ({
    lat: center[0],
    lng: center[1]
  }));

  const onViewCenterMove = useCallback((lat: number, lng: number) => {
    setViewCenter({ lat, lng });
  }, []);

  const displayCoords = useMemo(() => {
    if (reports.length === 0) {
      return { lat: fallbackCenter[0], lng: fallbackCenter[1] };
    }
    const selected = selectedId ? reports.find((r) => r.id === selectedId) : undefined;
    if (selected) return { lat: selected.lat, lng: selected.lng };
    const hovered = hoveredReportId ? reports.find((r) => r.id === hoveredReportId) : undefined;
    if (hovered) return { lat: hovered.lat, lng: hovered.lng };
    if (reports.length === 1) return { lat: reports[0].lat, lng: reports[0].lng };
    return { lat: viewCenter.lat, lng: viewCenter.lng };
  }, [reports, selectedId, hoveredReportId, viewCenter]);

  const googleMapsHref =
    onMapClick != null
      ? `https://www.google.com/maps?q=${displayCoords.lat},${displayCoords.lng}`
      : undefined;

  const [hintPos, setHintPos] = useState({ x: 12, y: 12 });

  const updateHintFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = hostRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 6;
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const o = MAP_ACTION_HINT_OFFSET;

    let left = relX + o;
    let top = relY + o;

    if (left + MAP_ACTION_HINT_W > rect.width - pad) {
      left = relX - MAP_ACTION_HINT_W - o;
    }
    if (top + MAP_ACTION_HINT_H > rect.height - pad) {
      top = relY - MAP_ACTION_HINT_H - o;
    }

    left = Math.min(Math.max(pad, left), Math.max(pad, rect.width - MAP_ACTION_HINT_W - pad));
    top = Math.min(Math.max(pad, top), Math.max(pad, rect.height - MAP_ACTION_HINT_H - pad));

    setHintPos({ x: left, y: top });
  }, []);

  const onHostPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!googleMapsHref || event.pointerType !== "mouse") return;
      updateHintFromPointer(event.clientX, event.clientY);
    },
    [googleMapsHref, updateHintFromPointer]
  );

  const onHostPointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!googleMapsHref || event.pointerType !== "mouse") return;
      updateHintFromPointer(event.clientX, event.clientY);
    },
    [googleMapsHref, updateHintFromPointer]
  );

  useEffect(() => {
    if (!googleMapsHref) return;
    const el = hostRef.current;
    if (!el) return;
    const pad = 6;
    const placeDefault = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      const left = Math.max(pad, (r.width - MAP_ACTION_HINT_W) / 2);
      const top = Math.max(pad, r.height - MAP_ACTION_HINT_H - 16);
      setHintPos({ x: left, y: top });
    };
    placeDefault();
    const ro = new ResizeObserver(placeDefault);
    ro.observe(el);
    return () => ro.disconnect();
  }, [googleMapsHref]);
  return (
    <div
      ref={hostRef}
      onPointerMove={onHostPointerMove}
      onPointerEnter={onHostPointerEnter}
      className={`${styles.host}${onMapClick ? ` ${styles.hostWithMapAction}` : ""}${className ? ` ${className}` : ""}`}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        className={`${styles.map}${onMapClick ? ` ${styles.mapClickable}` : ""}`}
        zoomControl={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        scrollWheelZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        touchZoom={interactive}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <FitToReports reports={reports} zoom={zoom} />
        {showCoordsHud && <CoordsHudTracker onMove={onViewCenterMove} />}
        {onMapClick && <HandleMapClick enabled={Boolean(onMapClick)} onMapClick={onMapClick} />}
        {enableHoverPopup && (
          <ClearTooltipOnMapClick
            onClear={() => {
              clearHideTimer();
              setHoveredReportId(null);
            }}
          />
        )}

        {reports.map((report) => (
          <Marker
            key={report.id}
            ref={(node) => {
              if (node) {
                markerRefs.current[report.id] = node;
              } else {
                delete markerRefs.current[report.id];
              }
            }}
            position={[report.lat, report.lng]}
            icon={createMarkerIcon(severityColor[report.severity], selectedId === report.id, report.severity)}
            eventHandlers={
              enableHoverPopup
                ? {
                    mouseover: () => {
                      keepOpen(report.id);
                    },
                    mouseout: () => {
                      scheduleClose();
                    },
                    click: () => {
                      keepOpen(report.id);
                      onSelect?.(report.id);
                    }
                  }
                : onSelect
                  ? {
                      click: () => onSelect(report.id)
                    }
                  : undefined
            }
          >
            {enableHoverPopup && (
              <Popup
                autoClose={false}
                closeOnClick={false}
                closeButton={false}
                className="report-hover-popup"
                offset={[0, -18]}
                eventHandlers={{
                  mouseover: () => {
                    keepOpen(report.id);
                  },
                  mouseout: () => {
                    scheduleClose();
                  }
                }}
              >
                <div
                  className={styles.tooltipCard}
                  onMouseEnter={() => keepOpen(report.id)}
                  onMouseLeave={() => scheduleClose()}
                >
                  <div className={styles.tooltipTop}>
                    <span className={styles.tooltipSeverity} style={{ color: severityColor[report.severity] }}>
                      <span
                        className={styles.tooltipSeverityDot}
                        style={{ background: severityColor[report.severity] }}
                      />
                      {severityLabel(report.severity)}
                    </span>
                    <span className={styles.tooltipStatus}>{statusLabel(report.status)}</span>
                  </div>

                  <h4 className={styles.tooltipTitle}>{report.title}</h4>
                  <p className={styles.tooltipDescription}>{report.description}</p>

                  <div className={styles.tooltipMetaGrid}>
                    <div>
                      <div className={styles.tooltipLabel}>Reporter</div>
                      <div className={styles.tooltipValue}>{report.reporter}</div>
                    </div>
                    <div>
                      <div className={styles.tooltipLabel}>Category</div>
                      <div className={styles.tooltipValue} style={{ textTransform: "capitalize" }}>
                        {report.category}
                      </div>
                    </div>
                  </div>

                  <div className={styles.tooltipWhereLabel}>Where</div>
                  <div className={styles.tooltipWhereValue}>{report.address}</div>

                  <div className={styles.tooltipFooter}>
                    <span className={styles.tooltipUpdated}>
                      <span
                        className={styles.tooltipSeverityDot}
                        style={{ background: severityColor[report.severity] }}
                      />
                      Updated {timeAgo(report.updated)}
                    </span>
                    <span className={styles.tooltipCoords}>
                      {report.lat.toFixed(3)}, {report.lng.toFixed(3)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={styles.tooltipAction}
                    onClick={(event) => {
                      event.stopPropagation();
                      keepOpen(report.id);
                      onSelect?.(report.id);
                    }}
                  >
                    Click marker to open full report
                  </button>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
      {showCoordsHud && (
        <span className={styles.coordsHud} aria-hidden>
          {displayCoords.lat.toFixed(4)}, {displayCoords.lng.toFixed(4)}
        </span>
      )}
      {googleMapsHref != null && (
        <div
          className={styles.mapActionHint}
          style={{ left: hintPos.x, top: hintPos.y }}
        >
          <a
            className={styles.mapActionLink}
            href={googleMapsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
