import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import type { Report } from '../../types/report';
import styles from './MapMarker.module.css';

interface MapMarkerProps {
  report: Report;
  onSelect?: (id: string) => void;
}

const severityDotClass: Record<Report['severity'], string> = {
  safe: styles.dotSafe,
  warning: styles.dotWarning,
  danger: styles.dotDanger,
};

const severityPulseClass: Record<Report['severity'], string> = {
  safe: styles.pulseSafe,
  warning: styles.pulseWarning,
  danger: styles.pulseDanger,
};

/**
 * Build a Leaflet divIcon that wraps our CSS-Module–styled marker. We embed
 * the styles module class names into the markup at render time.
 */
const buildIcon = (severity: Report['severity']) =>
  L.divIcon({
    className: 'community-marker',
    html: `
      <div class="${styles.markerOuter}">
        <span class="${styles.pulse} ${severityPulseClass[severity]}"></span>
        <span class="${styles.dot} ${severityDotClass[severity]}"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

const MapMarker = ({ report, onSelect }: MapMarkerProps) => {
  const icon = useMemo(() => buildIcon(report.severity), [report.severity]);

  return (
    <Marker
      position={[report.latitude, report.longitude]}
      icon={icon}
      eventHandlers={
        onSelect
          ? {
              click: () => onSelect(report.id),
            }
          : undefined
      }
    >
      <Popup>
        <p className={styles.popupTitle}>{report.title}</p>
        <p className={styles.popupBody}>{report.address}</p>
        <Link className={styles.popupLink} to={`/reports/${report.id}`}>
          View details
        </Link>
      </Popup>
    </Marker>
  );
};

export default MapMarker;
