import { useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useDeleteReportMutation,
  useGetReportQuery,
} from '../../features/reports/reportsApi';
import MapMarker from '../../components/MapMarker/MapMarker';
import WhaleLoader from '../../components/WhaleLoader/WhaleLoader';
import ErrorState from '../../components/ErrorState/ErrorState';
import type { Report } from '../../types/report';
import { useAppDispatch } from '../../app/hooks';
import { pushToast } from '../../features/ui/uiSlice';
import styles from './ReportDetailPage.module.css';

const severityBadge: Record<Report['severity'], string> = {
  safe: styles.badgeSafe,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { data, isLoading, isError, refetch } = useGetReportQuery(id ?? '', {
    skip: !id,
  });

  const [deleteReport, { isLoading: isDeleting }] = useDeleteReportMutation();

  if (!id) {
    return <ErrorState title="Missing report id" />;
  }

  if (isLoading) {
    return (
      <div style={{ padding: 32 }}>
        <WhaleLoader message="Fetching report details…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          title="Report not found"
          detail="We could not load this report. It may have been removed."
          onRetry={() => {
            void refetch();
          }}
        />
        <p style={{ marginTop: 12 }}>
          <Link to="/reports">Back to all reports</Link>
        </p>
      </div>
    );
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete report "${data.title}"? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteReport(data.id).unwrap();
      dispatch(
        pushToast({ message: 'Report deleted', tone: 'success' })
      );
      navigate('/reports');
    } catch {
      dispatch(
        pushToast({
          message: 'Could not delete report. Please try again.',
          tone: 'error',
        })
      );
    }
  };

  return (
    <section className={styles.wrap}>
      <div>
        <Link to="/reports" className={styles.back}>
          ← All reports
        </Link>

        <div className={styles.card} style={{ marginTop: 12 }}>
          <h1 className={styles.title}>{data.title}</h1>
          <div className={styles.metaRow}>
            <span className={`${styles.badge} ${severityBadge[data.severity]}`}>
              {data.severity}
            </span>
            <span className={styles.badge}>{data.status.replace('_', ' ')}</span>
            <span className={styles.badge}>{data.category}</span>
          </div>
          <p className={styles.description}>{data.description}</p>
          <div className={styles.actions}>
            <Link
              to={`/reports/${data.id}/edit`}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              Edit report
            </Link>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              onClick={() => {
                void handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      <aside className={styles.sidePanel}>
        <div className={styles.mapHost}>
          <MapContainer
            center={[data.latitude, data.longitude]}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapMarker report={data} />
          </MapContainer>
        </div>

        <dl className={styles.infoBlock}>
          <dt>Address</dt>
          <dd>{data.address}</dd>
          <dt>Reporter</dt>
          <dd>{data.reporter}</dd>
          <dt>Filed</dt>
          <dd>{formatDateTime(data.createdAt)}</dd>
          <dt>Last update</dt>
          <dd>{formatDateTime(data.updatedAt)}</dd>
          <dt>Coordinates</dt>
          <dd>
            {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
          </dd>
        </dl>
      </aside>
    </section>
  );
};

export default ReportDetailPage;
