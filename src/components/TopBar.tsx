import { useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import styles from "./TopBar.module.css";

interface TopBarProps {
  openCount: number;
}

const tabs = [
  { id: "map", label: "Live map", to: "/" },
  { id: "reports", label: "Reports", to: "/reports" },
  { id: "pulse", label: "Pulse", to: "/pulse" }
];

export default function TopBar({ openCount }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Logo />
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
              </button>
            );
          })}
        </nav>
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
      </div>
    </header>
  );
}
