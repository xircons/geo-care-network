import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useCreateReportMutation,
  useUpdateReportMutation,
} from './reportsApi';
import type {
  NewReportInput,
  Report,
  ReportCategory,
  ReportSeverity,
  ReportStatus,
} from '../types/report';
import { useAppDispatch } from '../app/hooks';
import { pushToast } from './uiSlice';
import ErrorState from '../components/ErrorState';
import styles from './ReportForm.module.css';

interface ReportFormProps {
  /** When provided, the form runs in edit mode. */
  initial?: Report;
}

interface FormState {
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  severity: ReportSeverity;
  latitude: string;
  longitude: string;
  address: string;
  reporter: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const CATEGORIES: ReportCategory[] = [
  'infrastructure',
  'environment',
  'safety',
  'community',
  'other',
];

const STATUSES: ReportStatus[] = ['open', 'in_progress', 'resolved'];
const SEVERITIES: ReportSeverity[] = ['safe', 'warning', 'danger'];

const initFromReport = (r?: Report): FormState => ({
  title: r?.title ?? '',
  description: r?.description ?? '',
  category: r?.category ?? 'infrastructure',
  status: r?.status ?? 'open',
  severity: r?.severity ?? 'warning',
  latitude: r ? String(r.latitude) : '18.7883',
  longitude: r ? String(r.longitude) : '98.9853',
  address: r?.address ?? '',
  reporter: r?.reporter ?? '',
});

const validate = (form: FormState): FieldErrors => {
  const errors: FieldErrors = {};
  if (!form.title.trim() || form.title.trim().length < 4) {
    errors.title = 'Title must be at least 4 characters.';
  }
  if (!form.description.trim() || form.description.trim().length < 12) {
    errors.description = 'Please describe the issue in at least 12 characters.';
  }
  if (!form.address.trim()) {
    errors.address = 'Address is required.';
  }
  if (!form.reporter.trim()) {
    errors.reporter = 'Please add your name (or a pseudonym).';
  }
  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.latitude = 'Latitude must be a number between -90 and 90.';
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.longitude = 'Longitude must be a number between -180 and 180.';
  }
  return errors;
};

const toPayload = (form: FormState): NewReportInput => ({
  title: form.title.trim(),
  description: form.description.trim(),
  category: form.category,
  status: form.status,
  severity: form.severity,
  latitude: Number(form.latitude),
  longitude: Number(form.longitude),
  address: form.address.trim(),
  reporter: form.reporter.trim(),
});

const ReportForm = ({ initial }: ReportFormProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [form, setForm] = useState<FormState>(() => initFromReport(initial));
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [createReport, createState] = useCreateReportMutation();
  const [updateReport, updateState] = useUpdateReportMutation();

  const errors = useMemo(() => validate(form), [form]);
  const isEdit = Boolean(initial);
  const isBusy = createState.isLoading || updateState.isLoading;
  const apiError = createState.error ?? updateState.error;

  const showError = (field: keyof FormState): string | undefined => {
    if (!errors[field]) return undefined;
    if (submitAttempted || touched[field]) return errors[field];
    return undefined;
  };

  const handleChange =
    <K extends keyof FormState>(field: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value as FormState[K];
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleBlur = (field: keyof FormState) => () =>
    setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (Object.keys(errors).length > 0) return;

    try {
      if (isEdit && initial) {
        await updateReport({ id: initial.id, ...toPayload(form) }).unwrap();
        dispatch(pushToast({ message: 'Report updated', tone: 'success' }));
        navigate(`/reports/${initial.id}`);
      } else {
        const created = await createReport(toPayload(form)).unwrap();
        dispatch(pushToast({ message: 'Report filed', tone: 'success' }));
        navigate(`/reports/${created.id}`);
      }
    } catch {
      dispatch(
        pushToast({
          message: 'The mock API rejected the request. Check json-server is running.',
          tone: 'error',
        })
      );
    }
  };

  return (
    <section className={styles.wrap}>
      <h1 className={styles.heading}>
        {isEdit ? 'Edit report' : 'File a new report'}
      </h1>
      <p className={styles.subhead}>
        Reports are persisted to the mock REST API powered by json-server.
      </p>

      {apiError ? (
        <ErrorState
          title="Submission failed"
          detail="The server returned an error. Double-check the data and try again."
        />
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label htmlFor="title" className={styles.label}>
            Title <span className={styles.required}>*</span>
          </label>
          <input
            id="title"
            className={`${styles.input} ${showError('title') ? styles.inputInvalid : ''}`}
            type="text"
            value={form.title}
            onChange={handleChange('title')}
            onBlur={handleBlur('title')}
            maxLength={120}
            aria-invalid={Boolean(showError('title'))}
            aria-describedby="title-error"
          />
          {showError('title') ? (
            <p className={styles.error} id="title-error">
              {showError('title')}
            </p>
          ) : (
            <p className={styles.help}>A short headline neighbors will recognise.</p>
          )}
        </div>

        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label htmlFor="description" className={styles.label}>
            Description <span className={styles.required}>*</span>
          </label>
          <textarea
            id="description"
            className={`${styles.textarea} ${showError('description') ? styles.inputInvalid : ''}`}
            value={form.description}
            onChange={handleChange('description')}
            onBlur={handleBlur('description')}
            maxLength={2000}
            aria-invalid={Boolean(showError('description'))}
          />
          {showError('description') ? (
            <p className={styles.error}>{showError('description')}</p>
          ) : (
            <p className={styles.help}>
              What is happening, when, and any access notes for responders.
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="category" className={styles.label}>
            Category
          </label>
          <select
            id="category"
            className={styles.select}
            value={form.category}
            onChange={handleChange('category')}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="status" className={styles.label}>
            Status
          </label>
          <select
            id="status"
            className={styles.select}
            value={form.status}
            onChange={handleChange('status')}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="severity" className={styles.label}>
            Severity
          </label>
          <select
            id="severity"
            className={styles.select}
            value={form.severity}
            onChange={handleChange('severity')}
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="reporter" className={styles.label}>
            Reporter <span className={styles.required}>*</span>
          </label>
          <input
            id="reporter"
            className={`${styles.input} ${showError('reporter') ? styles.inputInvalid : ''}`}
            type="text"
            value={form.reporter}
            onChange={handleChange('reporter')}
            onBlur={handleBlur('reporter')}
            aria-invalid={Boolean(showError('reporter'))}
          />
          {showError('reporter') ? (
            <p className={styles.error}>{showError('reporter')}</p>
          ) : null}
        </div>

        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label htmlFor="address" className={styles.label}>
            Address <span className={styles.required}>*</span>
          </label>
          <input
            id="address"
            className={`${styles.input} ${showError('address') ? styles.inputInvalid : ''}`}
            type="text"
            value={form.address}
            onChange={handleChange('address')}
            onBlur={handleBlur('address')}
            aria-invalid={Boolean(showError('address'))}
          />
          {showError('address') ? (
            <p className={styles.error}>{showError('address')}</p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="latitude" className={styles.label}>
            Latitude <span className={styles.required}>*</span>
          </label>
          <input
            id="latitude"
            className={`${styles.input} ${showError('latitude') ? styles.inputInvalid : ''}`}
            type="number"
            step="any"
            value={form.latitude}
            onChange={handleChange('latitude')}
            onBlur={handleBlur('latitude')}
            aria-invalid={Boolean(showError('latitude'))}
          />
          {showError('latitude') ? (
            <p className={styles.error}>{showError('latitude')}</p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="longitude" className={styles.label}>
            Longitude <span className={styles.required}>*</span>
          </label>
          <input
            id="longitude"
            className={`${styles.input} ${showError('longitude') ? styles.inputInvalid : ''}`}
            type="number"
            step="any"
            value={form.longitude}
            onChange={handleChange('longitude')}
            onBlur={handleBlur('longitude')}
            aria-invalid={Boolean(showError('longitude'))}
          />
          {showError('longitude') ? (
            <p className={styles.error}>{showError('longitude')}</p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <Link
            to={initial ? `/reports/${initial.id}` : '/reports'}
            className={styles.cancel}
          >
            Cancel
          </Link>
          <button
            type="submit"
            className={styles.submit}
            disabled={isBusy}
          >
            {isBusy ? 'Saving…' : isEdit ? 'Save changes' : 'File report'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ReportForm;
