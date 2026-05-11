import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo";
import styles from "./TopBar.module.css";

export default function TopBar() {
  const { pathname } = useLocation();
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <div className={styles.brand}><Logo />Geo-Care Community Tracker</div>
        <nav className={styles.nav}>
          <Link className={pathname === "/" ? styles.active : ""} to="/">Map</Link>
          <Link className={pathname.startsWith("/reports") ? styles.active : ""} to="/reports">Reports</Link>
          <Link className={pathname === "/pulse" ? styles.active : ""} to="/pulse">Pulse</Link>
        </nav>
      </div>
    </header>
  );
}
