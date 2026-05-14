import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import { useEffect, useMemo, useState } from "react";
import { useCreateReportMutation } from "../features/reports/reportsApi";
import { setToastMessage, showToast } from "../features/ui/uiSlice";
import LocationPickerMap from "../components/LocationPickerMap";
import type { ReportCategory, ReportInput, ReportStatus, Severity } from "../types";
import styles from "./NewReportPage.module.css";

type FieldKey = "title" | "description" | "reporter" | "address";
type FieldErrors = Partial<Record<FieldKey, string>>;

function validate(form: ReportInput): FieldErrors {
  const errors: FieldErrors = {};
  if (form.title.trim().length < 3) {
    errors.title = "Title is required (at least 3 characters).";
  }
  if (form.description.trim().length < 6) {
    errors.description = "Please add a bit more detail (at least 6 characters).";
  }
  if (form.reporter.trim().length < 2) {
    errors.reporter = "Please tell us your name.";
  }
  if (form.address.trim().length < 3) {
    errors.address = "Add an address so responders can find the spot.";
  }
  return errors;
}

export default function NewReportPage() {
  const [createReport] = useCreateReportMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [submitting, setSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [form, setForm] = useState<ReportInput>({
    title: "",
    description: "",
    category: "infrastructure",
    status: "open",
    severity: "warning",
    reporter: "",
    address: "",
    lat: 18.7883,
    lng: 98.9853
  });

  const close = () => {
    if (isClosing) return;
    setIsPanelOpen(false);
    setIsClosing(true);
  };

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setIsPanelOpen(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      const state = location.state as { backgroundLocation?: { pathname: string } } | null;
      if (state?.backgroundLocation?.pathname) {
        navigate(state.backgroundLocation.pathname);
        return;
      }
      navigate("/");
    }, 380);
    return () => window.clearTimeout(timer);
  }, [isClosing, location.state, navigate]);

  // Derive errors during render so they clear as the user fixes each field
  // once they've attempted submit at least once.
  const errors: FieldErrors = useMemo(
    () => (showErrors ? validate(form) : {}),
    [form, showErrors]
  );

  const updateField = <K extends keyof ReportInput>(key: K, value: ReportInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveReport = async () => {
    if (submitting) return;
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setShowErrors(true);
      const firstMissing = Object.keys(nextErrors)[0] as FieldKey;
      const labels: Record<FieldKey, string> = {
        title: "title",
        description: "description",
        reporter: "your name",
        address: "address"
      };
      const missingList = (Object.keys(nextErrors) as FieldKey[])
        .map((k) => labels[k])
        .join(", ");
      dispatch(
        showToast({
          message:
            Object.keys(nextErrors).length === 1
              ? `Please fill in ${labels[firstMissing]}.`
              : `Please fill in: ${missingList}.`,
          tone: "error"
        })
      );
      // Focus first missing field for accessibility
      window.setTimeout(() => {
        const el = document.getElementById(firstMissing);
        if (el && typeof (el as HTMLElement).focus === "function") {
          (el as HTMLElement).focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }
    setSubmitting(true);
    try {
      await createReport(form).unwrap();
      dispatch(setToastMessage("Report filed"));
      close();
    } catch {
      dispatch(
        showToast({
          message: "Couldn't save the report. Please try again.",
          tone: "error"
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (key: FieldKey) =>
    `${styles.input} ${showErrors && errors[key] ? styles.inputError : ""}`;

  return (
    <div
      className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ""}`}
      onClick={close}
    >
      <div
        className={`${styles.panel} ${isPanelOpen ? styles.panelOpen : ""} ${isClosing ? styles.panelClosing : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <div className={styles.kicker}>New report</div>
            <h1 className={styles.title}>Tell the neighborhood</h1>
          </div>
          <button type="button" className={styles.cancelTop} onClick={close}>
            Cancel
          </button>
        </header>

        <form
          className={styles.form}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            await saveReport();
          }}
        >
          <div className={styles.field}>
            <label htmlFor="title">Title *</label>
            <input
              id="title"
              className={fieldClass("title")}
              placeholder="What's going on?"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              aria-invalid={Boolean(showErrors && errors.title)}
            />
            {showErrors && errors.title ? (
              <div className={styles.errorMsg}>{errors.title}</div>
            ) : (
              <div className={styles.hint}>A short headline neighbors will recognize.</div>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              className={`${styles.textarea} ${showErrors && errors.description ? styles.inputError : ""}`}
              placeholder="Add as much detail as helps the next person who looks at this..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              aria-invalid={Boolean(showErrors && errors.description)}
            />
            {showErrors && errors.description ? (
              <div className={styles.errorMsg}>{errors.description}</div>
            ) : (
              <div className={styles.hint}>What is happening, when, and any access notes for responders.</div>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.inlineLabel}>Severity</span>
            <div className={styles.severityGrid}>
              {[
                { value: "safe", label: "Safe", hint: "Safe / resolved", color: "var(--safe)" },
                { value: "warning", label: "Warning", hint: "Needs attention", color: "var(--warn)" },
                { value: "danger", label: "Danger", hint: "Urgent / hazard", color: "var(--danger)" }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`${styles.severityOption} ${form.severity === item.value ? styles.severityOptionActive : ""}`}
                  onClick={() => updateField("severity", item.value as Severity)}
                >
                  <div className={styles.severityTop}>
                    <span className={styles.dot} style={{ background: item.color }} />
                    {item.label}
                  </div>
                  <div className={styles.severityMeta}>{item.hint}</div>
                </button>
              ))}
            </div>
            <div className={styles.hint}>How urgent does this feel?</div>
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className={styles.select}
                value={form.category}
                onChange={(e) => updateField("category", e.target.value as ReportCategory)}
              >
                <option value="environment">Environment</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="safety">Safety</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                className={styles.select}
                value={form.status}
                onChange={(e) => updateField("status", e.target.value as ReportStatus)}
              >
                <option value="open">Open</option>
                <option value="in progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="reporter">Your name *</label>
            <input
              id="reporter"
              className={fieldClass("reporter")}
              placeholder="So responders can follow up"
              value={form.reporter}
              onChange={(e) => updateField("reporter", e.target.value)}
              aria-invalid={Boolean(showErrors && errors.reporter)}
            />
            {showErrors && errors.reporter ? (
              <div className={styles.errorMsg}>{errors.reporter}</div>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor="address">Address *</label>
            <input
              id="address"
              className={fieldClass("address")}
              placeholder="Street, sub-district, district"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              aria-invalid={Boolean(showErrors && errors.address)}
            />
            {showErrors && errors.address ? (
              <div className={styles.errorMsg}>{errors.address}</div>
            ) : null}
          </div>

          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="lat">Latitude</label>
              <input
                id="lat"
                className={styles.input}
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => updateField("lat", Number(e.target.value))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="lng">Longitude</label>
              <input
                id="lng"
                className={styles.input}
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => updateField("lng", Number(e.target.value))}
              />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.inlineLabel}>Location on map</span>
            <LocationPickerMap
              lat={form.lat}
              lng={form.lng}
              onChange={(nextLat, nextLng) =>
                setForm((prev) => ({
                  ...prev,
                  lat: Number(nextLat.toFixed(6)),
                  lng: Number(nextLng.toFixed(6))
                }))
              }
            />
          </div>
        </form>

        <footer className={styles.actions}>
          <button type="button" className={styles.btn} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={saveReport}
            disabled={submitting}
          >
            {submitting ? "Filing..." : "File report"}
          </button>
        </footer>
      </div>
    </div>
  );
}
