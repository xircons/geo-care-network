import { Link } from 'react-router-dom';
import WhaleLoader from '../../components/WhaleLoader/WhaleLoader';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => {
  return (
    <section className={styles.wrap}>
      <WhaleLoader size="lg" message="" />
      <h1 className={styles.title}>Off the map</h1>
      <p className={styles.subtitle}>
        We could not find that page. Let us guide you back to the map or the
        full list of reports.
      </p>
      <Link to="/" className={styles.cta}>
        Back to the map
      </Link>
    </section>
  );
};

export default NotFoundPage;
