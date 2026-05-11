import type { ReactNode } from 'react';
import WhaleLoader from '../WhaleLoader/WhaleLoader';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: ReactNode;
}

const EmptyState = ({
  title = 'No reports yet',
  message = 'Be the first to report something happening in your community.',
  action,
}: EmptyStateProps) => {
  return (
    <div className={styles.wrap}>
      <WhaleLoader size="sm" message="" />
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {action ? <div className={styles.cta}>{action}</div> : null}
    </div>
  );
};

export default EmptyState;
