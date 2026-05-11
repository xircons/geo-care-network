import { NavLink, Outlet, Link } from 'react-router-dom';
import styles from './Layout.module.css';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `${styles.link} ${isActive ? styles.active : ''}`.trim();

const Layout = () => {
  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Primary">
        <Link to="/" className={styles.brand}>
          <svg
            className={styles.brandMark}
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M5 18 C5 12, 14 9, 22 11 C27 12, 29 15, 30 17
                 C28 19, 25 20, 22 20 L22 22 C22 25, 20 26, 17 25
                 L17 22 C12 23, 8 22, 5 18 Z
                 M5 18 L1 14 L3 18 L1 22 Z"
              fill="currentColor"
            />
            <circle cx="24" cy="16" r="1.1" fill="#FFFFFF" />
          </svg>
          <span>Community Issue Tracker</span>
        </Link>
        <div className={styles.links}>
          <NavLink to="/" end className={linkClass}>
            Map
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>
        </div>
        <Link to="/reports/new" className={styles.cta}>
          New report
        </Link>
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        Community Issue Tracker · Built with React, Redux Toolkit &amp;
        react-leaflet
      </footer>
    </div>
  );
};

export default Layout;
