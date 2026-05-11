import styles from './ErrorState.module.css';

interface ErrorStateProps {
  title?: string;
  detail?: string;
  onRetry?: () => void;
}

const ErrorState = ({
  title = 'Something went wrong',
  detail = 'We could not reach the reports service. Please check your connection and try again.',
  onRetry,
}: ErrorStateProps) => {
  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.title}>{title}</p>
      <p className={styles.detail}>{detail}</p>
      {onRetry ? (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
};

export default ErrorState;
