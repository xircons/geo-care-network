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

/**
 * Unified app-wide notification. Renders text only (no icon, no dot) inside a
 * pill at the bottom-left of the viewport, slides in from the left edge on
 * mount and back out the same way on dismiss. Tone tweaks the background and
 * border color; layout and motion stay identical across tones.
 */
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

  return (
    <div
      className={`${styles.toast} ${toneClass} ${isLeaving ? styles.leaving : ""}`.trim()}
      role={shown.tone === "error" ? "alert" : "status"}
      onAnimationEnd={(e) => {
        // Only unmount when the exit animation on the root finishes — ignore
        // child animations that might bubble up.
        if (isLeaving && e.target === e.currentTarget) {
          setShown(null);
        }
      }}
    >
      {shown.msg}
    </div>
  );
}
