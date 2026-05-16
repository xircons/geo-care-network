import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import styles from "./TopBar.module.css";

interface TopBarProps {
  openCount: number;
  /** Number of CCTV reports still in status="open" — drives the red alert
   * badge on the Notify tab. */
  awaitingCount: number;
}

const tabs = [
  { id: "map", label: "Live map", to: "/" },
  { id: "reports", label: "Reports", to: "/reports" },
  { id: "cctv", label: "CCTV", to: "/cctv" },
  { id: "notify", label: "Notify", to: "/notify" }
];

export default function TopBar({ openCount, awaitingCount }: TopBarProps) {
  const headerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const hideFileReport =
    location.pathname === "/cctv" ||
    location.pathname.startsWith("/cctv/") ||
    location.pathname === "/notify" ||
    location.pathname.startsWith("/notify/");

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncTopbarHeight = () => {
      document.documentElement.style.setProperty("--topbar-height", `${header.offsetHeight}px`);
    };

    syncTopbarHeight();
    const observer = new ResizeObserver(syncTopbarHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.side}>
          <Logo />
        </div>
        <nav className={styles.nav}>
          {tabs.map((tab) => {
            const active =
              tab.to === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.to);
            return (
              <button
                key={tab.id}
                type="button"
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                onClick={() => navigate(tab.to)}
              >
                {tab.label}
                {tab.id === "reports" && openCount > 0 && (
                  <span className={`${styles.badge} ${active ? styles.badgeActive : ""}`}>
                    {openCount}
                  </span>
                )}
                {tab.id === "notify" && awaitingCount > 0 && (
                  <span
                    className={styles.badgeAlert}
                    aria-label={`${awaitingCount} awaiting`}
                  >
                    {awaitingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className={styles.side}>
          {!hideFileReport && (
            <button
              type="button"
              className={styles.cta}
              onClick={() => navigate("/reports/new", { state: { backgroundLocation: location } })}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              File a report
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
