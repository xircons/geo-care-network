import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import LocationPickerMap from "../components/LocationPickerMap";
import { showToast } from "../features/ui/uiSlice";
import { useCreateReportMutation } from "../features/reports/reportsApi";
import {
  analyzeVideoWithGemini,
  MAX_INLINE_BYTES,
  type CrashAnalysisResult
} from "../features/cctv/geminiAnalyze";
import { extractVideoGps } from "../features/cctv/extractVideoGps";
import { reverseGeocode } from "../features/cctv/reverseGeocode";
import type {
  ActivityLogEntry,
  ReportCategory,
  ReportStatus,
  Severity
} from "../types";
import styles from "./CctvView.module.css";

const THUMBNAIL_MAX_WIDTH = 640;
const THUMBNAIL_JPEG_QUALITY = 0.75;

/**
 * Grab the current frame of a `<video>` element and return it as a JPEG data
 * URL, downscaled so it doesn't bloat the JSON we POST to json-server.
 * Returns null if the video hasn't decoded a frame yet or canvas read fails.
 */
function captureVideoFrameToDataUrl(video: HTMLVideoElement | null): string | null {
  if (!video) return null;
  // readyState >= 2 (HAVE_CURRENT_DATA) means at least one frame is decoded.
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

  const sourceW = video.videoWidth;
  const sourceH = video.videoHeight;
  const scale = sourceW > THUMBNAIL_MAX_WIDTH ? THUMBNAIL_MAX_WIDTH / sourceW : 1;
  const targetW = Math.max(1, Math.round(sourceW * scale));
  const targetH = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, targetW, targetH);
    return canvas.toDataURL("image/jpeg", THUMBNAIL_JPEG_QUALITY);
  } catch {
    // toDataURL throws if the source is tainted (cross-origin). Our blob: URLs
    // from a user-selected File are same-origin, but we still guard for safety.
    return null;
  }
}

const INCIDENT_LAT = 18.7883;
const INCIDENT_LNG = 98.9853;
const DEFAULT_REPORTER = "CCTV Auto-Detect";

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

const fmt = (n: number) => n.toFixed(6);

export default function CctvView() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [createReport, { isLoading: isSubmitting }] = useCreateReportMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("danger");
  const [category, setCategory] = useState<ReportCategory>("infrastructure");
  const [status, setStatus] = useState<ReportStatus>("open");
  const [reporter, setReporter] = useState(DEFAULT_REPORTER);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(fmt(INCIDENT_LAT));
  const [longitude, setLongitude] = useState(fmt(INCIDENT_LNG));

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Persistent error (e.g. quota exceeded, oversized file, missing API key) —
  // stays as a banner so the user can read it while they fix the issue.
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Latest aggregated AI verdict — kept around so the File-report flow can
  // persist `cctvCrashDetected` and the agency dashboard knows whether this
  // clip was flagged by the model.
  const [lastAnalysis, setLastAnalysis] = useState<CrashAnalysisResult | null>(null);

  const [isGeocoding, setIsGeocoding] = useState(false);
  // Latches when the user types in the Address field so the AI flow stops
  // overwriting their manual input on subsequent re-analyzes.
  const addressEditedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setVideoFile(file);
    setVideoName(file.name);
    setAnalysisError(null);
    setLastAnalysis(null);

    // Auto-extract GPS from the file's embedded metadata.
    const gps = await extractVideoGps(file);
    if (gps.latitude != null && gps.longitude != null) {
      setLatitude(fmt(gps.latitude));
      setLongitude(fmt(gps.longitude));
    }
  };

  const handleAnalyze = async () => {
    if (!videoFile || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result: CrashAnalysisResult = await analyzeVideoWithGemini(videoFile);
      setTitle(result.title);
      setDescription(result.description);
      setSeverity(result.severity);
      setCategory(result.category);
      setLastAnalysis(result);
      // Surface the verdict + ensemble agreement as a transient toast — the
      // populated form fields are the lasting feedback, the toast is just the
      // "I'm done, here's what I found" confirmation.
      const verdict = result.is_crash
        ? "Crash detected — fields populated. Review and file."
        : "No crash detected — fields populated. Review and file.";
      dispatch(
        showToast({
          message: `${verdict} ${result.agreementNote}`,
          tone: result.is_crash ? "info" : "success"
        })
      );

      // Reverse-geocode the current coordinates into a human-readable address
      // and drop it into the Address field, unless the user has already typed
      // something there. Fire-and-forget — failure leaves Address untouched.
      const lat = parseCoord(latitude, INCIDENT_LAT);
      const lng = parseCoord(longitude, INCIDENT_LNG);
      if (Number.isFinite(lat) && Number.isFinite(lng) && !addressEditedRef.current) {
        setIsGeocoding(true);
        try {
          const place = await reverseGeocode(lat, lng);
          if (place && !addressEditedRef.current) {
            setAddress(place.shortAddress || place.displayName);
          }
        } finally {
          setIsGeocoding(false);
        }
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleReport = async () => {
    if (isSubmitting) return;

    // Collect every missing field up-front so we can show one combined toast
    // (mirrors the validation UX from the NewReport panel).
    const missing: Array<{ id: string; label: string }> = [];
    if (title.trim().length < 3) missing.push({ id: "title", label: "title" });
    if (description.trim().length < 6) missing.push({ id: "description", label: "description" });
    if (reporter.trim().length < 2) missing.push({ id: "reporter", label: "your name" });
    if (address.trim().length < 3) missing.push({ id: "address", label: "address" });

    if (missing.length > 0) {
      const labels = missing.map((m) => m.label).join(", ");
      dispatch(
        showToast({
          message:
            missing.length === 1
              ? `Please fill in ${labels}.`
              : `Please fill in: ${labels}.`,
          tone: "error"
        })
      );
      window.setTimeout(() => {
        const el = document.getElementById(missing[0].id);
        if (el && typeof (el as HTMLElement).focus === "function") {
          (el as HTMLElement).focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 0);
      return;
    }

    const lat = parseCoord(latitude, INCIDENT_LAT);
    const lng = parseCoord(longitude, INCIDENT_LNG);

    // Grab the current frame from the preview so the agency dashboard has
    // something to render in its incoming-incident modal. Null is fine —
    // the modal falls back to a placeholder.
    const thumbnailUrl = captureVideoFrameToDataUrl(videoRef.current) ?? undefined;

    const nowIso = new Date().toISOString();
    const activityLog: ActivityLogEntry[] = [
      {
        id: crypto.randomUUID(),
        label: "Report filed",
        at: nowIso
      }
    ];

    try {
      await createReport({
        title: title.trim(),
        description: description.trim(),
        category,
        status,
        severity,
        reporter: reporter.trim(),
        address: address.trim(),
        lat,
        lng,
        source: "cctv",
        cctvCrashDetected: lastAnalysis?.is_crash ?? false,
        thumbnailUrl,
        activityLog
      }).unwrap();
      dispatch(showToast({ message: "Incident reported successfully.", tone: "success" }));
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to file report.";
      dispatch(showToast({ message, tone: "error" }));
    }
  };

  const handleMapChange = (nextLat: number, nextLng: number) => {
    setLatitude(fmt(nextLat));
    setLongitude(fmt(nextLng));
  };

  const fileSizeOk = !videoFile || videoFile.size <= MAX_INLINE_BYTES;
  const canAnalyze = Boolean(videoFile) && !isAnalyzing && fileSizeOk;

  return (
    <section className={styles.page}>
      <div className={styles.previewShell}>
        <div className={styles.preview}>
          <div className={styles.uploadRow}>
            <button
              type="button"
              className={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              title={
                !videoFile
                  ? "Upload a video first"
                  : !fileSizeOk
                  ? `Video too large (max ${MAX_INLINE_BYTES / (1024 * 1024)} MB)`
                  : "Run AI analysis"
              }
            >
              {isAnalyzing ? (
                <>
                  <span className={styles.spinner} aria-hidden />
                  Analyzing…
                </>
              ) : (
                <>
                  <span className={styles.sparkle} aria-hidden>
                    AI
                  </span>
                  Analyze with AI
                </>
              )}
            </button>
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
              accept="video/*,.mp4,.mov,.m4v,.webm,.avi,.mkv"
              className={styles.fileInput}
              onChange={handleFileChange}
            />
          </div>
          {videoUrl ? (
            <>
              <video
                ref={videoRef}
                key={videoUrl}
                src={videoUrl}
                className={styles.videoEl}
                controls
                autoPlay
                playsInline
              />
              {/* {videoName && (
                <span className={styles.videoName}>{videoName}</span>
              )} */}
            </>
          ) : (
            <span className={styles.previewLabel}>Video Preview</span>
          )}
        </div>
        {analysisError && (
          <div className={`${styles.banner} ${styles.bannerError}`}>
            <strong>AI analysis failed:</strong> {analysisError}
          </div>
        )}
      </div>

      <div className={styles.formShell}>
        <div className={styles.formLayout}>
          <div className={styles.details}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's going on?"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about the incident"
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

            <div className={styles.metaRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="category">
                  Category
                </label>
                <select
                  id="category"
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ReportCategory)}
                >
                  <option value="environment">Environment</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="safety">Safety</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  className={styles.select}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReportStatus)}
                >
                  <option value="open">Open</option>
                  <option value="in progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className={styles.metaRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reporter">
                  Reporter
                </label>
                <input
                  id="reporter"
                  className={styles.input}
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  placeholder="Who's filing this?"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="address">
                  Address
                  {isGeocoding && (
                    <span className={styles.fieldHint}> · looking up…</span>
                  )}
                </label>
                <input
                  id="address"
                  className={styles.input}
                  value={address}
                  onChange={(e) => {
                    addressEditedRef.current = true;
                    setAddress(e.target.value);
                  }}
                  placeholder="Street, sub-district, district"
                />
              </div>
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

          <div className={styles.mapPanel}>
            <span className={styles.label}>Location on map</span>
            <LocationPickerMap
              lat={parseCoord(latitude, INCIDENT_LAT)}
              lng={parseCoord(longitude, INCIDENT_LNG)}
              onChange={handleMapChange}
              wrapClassName={styles.mapWrap}
              hintClassName={styles.mapHint}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.reportBtn}
            onClick={handleReport}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Filing…" : "File report"}
          </button>
        </div>
      </div>
    </section>
  );
}
