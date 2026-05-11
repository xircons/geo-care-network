import { useMemo, useState } from "react";
import type { Report, ReportInput, ReportStatus, Severity } from "../../types";
import styles from "./ReportForm.module.css";

interface ReportFormProps {
  mode: "new" | "edit";
  initial?: Report;
  onCancel: () => void;
  onSave: (payload: ReportInput) => Promise<void> | void;
}

type FormState = ReportInput;

function toFormState(initial?: Report): FormState {
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "environment",
    status: initial?.status ?? "open",
    severity: initial?.severity ?? "warning",
    reporter: initial?.reporter ?? "",
    address: initial?.address ?? "",
    lat: initial?.lat ?? 18.7889,
    lng: initial?.lng ?? 98.9853
  };
}

export default function ReportForm({ mode, initial, onCancel, onSave }: ReportFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () =>
      form.title.trim().length > 2 &&
      form.description.trim().length > 5 &&
      form.address.trim().length > 2 &&
      form.reporter.trim().length > 1,
    [form]
  );

  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        try {
          await onSave(form);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div className={styles.row}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          className={styles.input}
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>
      <div className={styles.row}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          className={styles.textarea}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>
      <div className={styles.row}>
        <label htmlFor="address">Address</label>
        <input
          id="address"
          className={styles.input}
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          required
        />
      </div>
      <div className={styles.row}>
        <label htmlFor="reporter">Reporter</label>
        <input
          id="reporter"
          className={styles.input}
          value={form.reporter}
          onChange={(e) => setForm((prev) => ({ ...prev, reporter: e.target.value }))}
          required
        />
      </div>
      <div className={styles.row}>
        <label htmlFor="category">Category</label>
        <select
          id="category"
          className={styles.select}
          value={form.category}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              category: e.target.value as FormState["category"]
            }))
          }
        >
          <option value="environment">environment</option>
          <option value="infrastructure">infrastructure</option>
          <option value="safety">safety</option>
        </select>
      </div>
      <div className={styles.row}>
        <label htmlFor="severity">Severity</label>
        <select
          id="severity"
          className={styles.select}
          value={form.severity}
          onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value as Severity }))}
        >
          <option value="danger">danger</option>
          <option value="warning">warning</option>
          <option value="safe">safe</option>
        </select>
      </div>
      <div className={styles.row}>
        <label htmlFor="status">Status</label>
        <select
          id="status"
          className={styles.select}
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ReportStatus }))}
        >
          <option value="open">open</option>
          <option value="in progress">in progress</option>
          <option value="resolved">resolved</option>
        </select>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={!canSubmit || submitting}>
          {mode === "new" ? "Create report" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
