import { useState } from "react";
import { useAppSelector } from "../app/hooks";
import type { ToastTone } from "../features/ui/uiSlice";
import styles from "./Toast.module.css";

interface ToastProps {
  msg: string | null;
}

interface ShownState {
  msg: string;
  tone: ToastTone;
}

export default function Toast({ msg }: ToastProps) {
  const tone = useAppSelector((state) => state.ui.toastTone);
  const [shown, setShown] = useState<ShownState | null>(null);

  // Render-time prop sync: when a new message arrives, swap in immediately.
  if (msg && (!shown || shown.msg !== msg || shown.tone !== tone)) {
    setShown({ msg, tone });
  }

  if (!shown) {
    return null;
  }

  const isLeaving = !msg;

  const toneClass =
    shown.tone === "error"
      ? styles.error
      : shown.tone === "info"
        ? styles.info
        : styles.success;
  const leavingClass = isLeaving
    ? shown.tone === "error"
      ? styles.errorLeaving
      : styles.successLeaving
    : "";

  return (
    <div
      className={`${styles.toast} ${toneClass} ${leavingClass}`.trim()}
      role={shown.tone === "error" ? "alert" : "status"}
      onAnimationEnd={(e) => {
        // Only unmount when the exit animation on the root finishes — ignore
        // child animations (dot pulse, icon wobble) that bubble up.
        if (isLeaving && e.target === e.currentTarget) {
          setShown(null);
        }
      }}
    >
      {shown.tone === "error" ? (
        <svg
          className={styles.icon}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
        </svg>
      ) : (
        <span className={styles.dot} />
      )}
      <span>{shown.msg}</span>
    </div>
  );
}
