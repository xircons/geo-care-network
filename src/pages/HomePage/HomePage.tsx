import { useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useListReportsQuery } from '../../features/reports/reportsApi';
import {
  makeSelectFilteredReports,
  makeSelectReportCounts,
} from '../../features/reports/selectors';
import { useAppSelector } from '../../app/hooks';
import MapMarker from '../../components/MapMarker/MapMarker';
import WhaleLoader from '../../components/WhaleLoader/WhaleLoader';
import ErrorState from '../../components/ErrorState/ErrorState';
import styles from './HomePage.module.css';

const CHIANG_MAI_CENTER: [number, number] = [18.7883, 98.9853];

const HomePage = () => {
  const { data, isLoading, isError, refetch } = useListReportsQuery();

  // createSelector instances are stable per-component-instance.
  const selectFiltered = useMemo(makeSelectFilteredReports, []);
  const selectCounts = useMemo(makeSelectReportCounts, []);
  const filtered = useAppSelector((state) => selectFiltered(state, data));
  const counts = useAppSelector((state) => selectCounts(state, data));

  return (
    <section className={styles.wrap}>
      <aside className={styles.sidebar} aria-label="Map summary">
        <h1 className={styles.heading}>Neighborhood map</h1>
        <p className={styles.subhead}>
          Live view of community-reported issues. Markers pulse to draw the
          eye to active areas.
        </p>

        <div className={styles.counts} aria-label="Report counts">
          <div className={styles.count}>
            <span className={styles.countNum}>{counts.total}</span>
            <span className={styles.countLabel}>Total</span>
          </div>
          <div className={styles.count}>
            <span className={styles.countNum}>{counts.open}</span>
            <span className={styles.countLabel}>Open</span>
          </div>
          <div className={styles.count}>
            <span className={styles.countNum}>{counts.resolved}</span>
            <span className={styles.countLabel}>Resolved</span>
          </div>
        </div>

        <div className={styles.legend}>
          <strong style={{ color: 'var(--color-text-main)' }}>Severity</strong>
          <div className={styles.legendRow}>
            <span className={`${styles.dot} ${styles.dotSafe}`} /> Safe / resolved
          </div>
          <div className={styles.legendRow}>
            <span className={`${styles.dot} ${styles.dotWarn}`} /> Needs attention
          </div>
          <div className={styles.legendRow}>
            <span className={`${styles.dot} ${styles.dotDanger}`} /> Urgent / hazard
          </div>
        </div>

        {isError ? (
          <ErrorState
            title="Could not load reports"
            detail="The mock API returned an error. Make sure json-server is running on the port configured in VITE_API_URL."
            onRetry={() => {
              void refetch();
            }}
          />
        ) : null}
      </aside>

      <div className={styles.mapArea}>
        <div className={styles.mapHost}>
          <MapContainer
            center={CHIANG_MAI_CENTER}
            zoom={14}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            {filtered.map((report) => (
              <MapMarker key={report.id} report={report} />
            ))}
          </MapContainer>
          {isLoading ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(248, 250, 252, 0.7)',
                pointerEvents: 'none',
              }}
            >
              <WhaleLoader message="Sounding out the depths…" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default HomePage;
