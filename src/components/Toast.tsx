import styles from "./Toast.module.css";

interface ToastProps {
  msg: string | null;
}

export default function Toast({ msg }: ToastProps) {
  if (!msg) {
    return null;
  }
  return (
    <div className={styles.toast}>
      <span className={styles.dot} />
      {msg}
    </div>
  );
}
