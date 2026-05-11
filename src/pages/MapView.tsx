import "leaflet/dist/leaflet.css";
import L, { DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import WhaleState from "../components/WhaleState";
import { useGetReportsQuery } from "../features/reports/reportsApi";
import type { Report } from "../types";
import styles from "./MapView.module.css";

const center: [number, number] = [18.7889, 98.9853];

function markerIcon(report: Report): DivIcon {
  const severityClass =
    report.severity === "warning" ? styles.warning : report.severity === "safe" ? styles.safe : "";
  const html = `<span class="${styles.marker} ${severityClass} ${styles.pulseRing}"></span>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

export default function MapView() {
  const { data: reports = [], isLoading } = useGetReportsQuery();

  if (isLoading) {
    return <WhaleState label="Loading neighborhood map" />;
  }

  return (
    <section className={styles.page}>
      <div className={styles.grid}>
        <article className={styles.mapCard}>
          <MapContainer className={styles.map} center={center} zoom={13} scrollWheelZoom>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {reports.map((report) => (
              <Marker key={report.id} position={[report.lat, report.lng]} icon={markerIcon(report)}>
                <Popup>
                  <strong>{report.title}</strong>
                  <div>{report.address}</div>
                  <Link to={`/reports/${report.id}`}>Open detail</Link>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </article>

        <aside className={styles.side}>
          <section className={styles.listCard}>
            <div className={styles.listHeader}>
              <span>Live feed</span>
              <span>{reports.length} reports</span>
            </div>
            {reports.slice(0, 6).map((report) => (
              <Link className={styles.item} key={report.id} to={`/reports/${report.id}`}>
                <h3 className={styles.itemTitle}>{report.title}</h3>
                <div>{report.address}</div>
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </section>
  );
}
