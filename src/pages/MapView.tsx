import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useListReportsQuery } from "../features/reports/reportsApi";
import styles from "./MapView.module.css";

function icon(severity: "safe" | "warning" | "danger") {
  return L.divIcon({ className: "", html: `<span class="${styles.pulse} ${styles[severity]}"></span><span class="${styles.dot} ${styles[severity]}"></span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
}

export default function MapView() {
  const { data = [] } = useListReportsQuery();
  return <div className={styles.wrap}><MapContainer center={[18.7883, 98.9853]} zoom={13} className={styles.map}><TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />{data.map((r) => <Marker key={r.id} position={[r.lat, r.lng]} icon={icon(r.severity)}><Popup><strong>{r.title}</strong><div>{r.address}</div></Popup></Marker>)}</MapContainer></div>;
}
