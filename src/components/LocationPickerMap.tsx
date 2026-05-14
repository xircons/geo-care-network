import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import styles from "./LocationPickerMap.module.css";

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

type LocateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success" };

function SyncMapView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [map, lat, lng]);
  return null;
}

function MapClickPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function LocationPickerMap({ lat, lng, onChange }: LocationPickerMapProps) {
  const [locate, setLocate] = useState<LocateState>({ status: "idle" });

  const center: [number, number] = useMemo(() => {
    const la = Number.isFinite(lat) ? lat : 18.7883;
    const lo = Number.isFinite(lng) ? lng : 98.9853;
    return [la, lo];
  }, [lat, lng]);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div class="${styles.pickerDot}"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      }),
    []
  );

  const requestMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocate({ status: "error", message: "Geolocation is not supported by this browser." });
      return;
    }
    setLocate({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onChange(latitude, longitude);
        setLocate({ status: "success" });
        window.setTimeout(() => {
          setLocate((current) => (current.status === "success" ? { status: "idle" } : current));
        }, 2200);
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Permission denied. Enable location access in your browser."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Location unavailable. Try again in a moment."
              : err.code === err.TIMEOUT
                ? "Location request timed out. Try again."
                : "Could not get your location.";
        setLocate({ status: "error", message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  return (
    <div>
      <div className={styles.wrap}>
        <MapContainer
          center={center}
          zoom={16}
          className={styles.map}
          scrollWheelZoom
          doubleClickZoom
          dragging
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <SyncMapView lat={center[0]} lng={center[1]} />
          <MapClickPick onPick={onChange} />
          <Marker
            position={center}
            icon={icon}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng();
                onChange(p.lat, p.lng);
              }
            }}
          />
        </MapContainer>

        <button
          type="button"
          className={`${styles.locateBtn} ${locate.status === "loading" ? styles.locateBtnLoading : ""}`}
          onClick={requestMyLocation}
          disabled={locate.status === "loading"}
          aria-label="Use my current location"
        >
          {locate.status === "loading" ? (
            <svg
              className={styles.spin}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="40 100"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3.4" fill="currentColor" />
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span>
            {locate.status === "loading"
              ? "Locating…"
              : locate.status === "success"
                ? "Located"
                : "Use my location"}
          </span>
        </button>
      </div>

      {locate.status === "error" ? (
        <p className={`${styles.hint} ${styles.hintError}`}>{locate.message}</p>
      ) : (
        <p className={styles.hint}>
          Click the map, drag the pin, or hit <strong>Use my location</strong> to set latitude and longitude.
        </p>
      )}
    </div>
  );
}
