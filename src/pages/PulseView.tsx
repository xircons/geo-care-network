import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../app/hooks";
import LocationPickerMap from "../components/LocationPickerMap";
import { dismissToast, showToast } from "../features/ui/uiSlice";
import type { Severity } from "../types";
import styles from "./PulseView.module.css";

const INCIDENT_LAT = 18.7883;
const INCIDENT_LNG = 98.9853;

const SEVERITY_OPTIONS: Array<{
  value: Severity;
  label: string;
  hint: string;
  color: string;
}> = [
  { value: "safe", label: "Safe", hint: "Safe / resolved", color: "var(--safe)" },
  { value: "warning", label: "Warning", hint: "Needs attention", color: "var(--warn)" },
  { value: "danger", label: "Danger", hint: "Urgent / hazard", color: "var(--danger)" }
];

const parseCoord = (raw: string, fallback: number) => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export default function PulseView() {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [event, setEvent] = useState("Car crash");
  const [severity, setSeverity] = useState<Severity>("danger");
  const [latitude, setLatitude] = useState(String(INCIDENT_LAT));
  const [longitude, setLongitude] = useState(String(INCIDENT_LNG));
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoName(file.name);
    e.target.value = "";
  };

  const handleCancel = () => {
    dispatch(dismissToast());
  };

  const handleReport = () => {
    dispatch(
      showToast({
        message: "Incident reported successfully.",
        tone: "error"
      })
    );
  };

  const handleMapChange = (nextLat: number, nextLng: number) => {
    setLatitude(nextLat.toFixed(6));
    setLongitude(nextLng.toFixed(6));
  };

  return (
    <section className={styles.page}>
      <header className={styles.navbar}>
        <div className={styles.navSpacer} />
        <h1 className={styles.navTitle}>CCTV</h1>
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={handleUploadClick}
          title={videoName ?? undefined}
        >
          <span className={styles.uploadIcon} aria-hidden>
            +
          </span>
          <span className={styles.uploadLabel}>
            {videoName ?? "Upload Video"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </header>

      <div className={styles.preview}>
        {videoUrl ? (
          <>
            <video
              key={videoUrl}
              src={videoUrl}
              className={styles.videoEl}
              controls
              autoPlay
              playsInline
            />
            {videoName && (
              <span className={styles.videoName}>{videoName}</span>
            )}
          </>
        ) : (
          <span className={styles.previewLabel}>Video Preview</span>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="event">
            Event
          </label>
          <input
            id="event"
            className={styles.input}
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="Describe the event"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Severity</span>
          <div className={styles.severityGrid}>
            {SEVERITY_OPTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`${styles.severityOption} ${
                  severity === item.value ? styles.severityOptionActive : ""
                }`}
                onClick={() => setSeverity(item.value)}
              >
                <div className={styles.severityTop}>
                  <span
                    className={styles.severityDot}
                    style={{ background: item.color }}
                  />
                  {item.label}
                </div>
                <div className={styles.severityMeta}>{item.hint}</div>
              </button>
            ))}
          </div>
          <div className={styles.hint}>How urgent does this feel?</div>
        </div>

        <div className={styles.coords}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lat">
              Latitude
            </label>
            <input
              id="lat"
              className={styles.input}
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitude"
              inputMode="decimal"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lng">
              Longitude
            </label>
            <input
              id="lng"
              className={styles.input}
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitude"
              inputMode="decimal"
            />
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Location on map</span>
        <LocationPickerMap
          lat={parseCoord(latitude, INCIDENT_LAT)}
          lng={parseCoord(longitude, INCIDENT_LNG)}
          onChange={handleMapChange}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.reportBtn}
          onClick={handleReport}
        >
          File report
        </button>
      </div>
    </section>
  );
}
