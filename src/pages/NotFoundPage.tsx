import { Link } from "react-router-dom";
import LoadingState from "../components/LoadingState";

export default function NotFoundPage() {
  return (
    <div
      style={{
        animation: "fadeUp 0.55s cubic-bezier(.2,.8,.2,1) both",
        padding: "32px 16px"
      }}
    >
      <LoadingState variant="illustrated" label="Page not found" />
      <div
        style={{
          textAlign: "center",
          animation: "fadeUp 0.55s 0.25s cubic-bezier(.2,.8,.2,1) both"
        }}
      >
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "var(--paper)",
            color: "var(--ink)",
            fontSize: 13,
            fontWeight: 600,
            transition:
              "transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .25s, border-color .2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.borderColor = "var(--ink)";
            e.currentTarget.style.boxShadow =
              "0 10px 20px -10px rgba(15,23,42,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Go back to map
        </Link>
      </div>
    </div>
  );
}
