import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useListReportsQuery } from '../../features/reports/reportsApi';
import { makeSelectFilteredReports } from '../../features/reports/selectors';
import {
  clearFilters,
  setCategoryFilter,
  setSearchQuery,
  setStatusFilter,
} from '../../features/ui/uiSlice';
import type {
  CategoryFilter,
  StatusFilter,
} from '../../features/ui/uiSlice';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ReportCard from '../../components/ReportCard/ReportCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import styles from './ReportsPage.module.css';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'environment', label: 'Environment' },
  { value: 'safety', label: 'Safety' },
  { value: 'community', label: 'Community' },
  { value: 'other', label: 'Other' },
];

const ReportsPage = () => {
  const dispatch = useAppDispatch();
  const { data, isLoading, isFetching, isError, refetch } =
    useListReportsQuery();

  const selectFiltered = useMemo(makeSelectFilteredReports, []);
  const filtered = useAppSelector((state) => selectFiltered(state, data));
  const ui = useAppSelector((state) => state.ui);

  const showSkeletons = isLoading || (isFetching && !data);
  const showEmpty = !showSkeletons && !isError && filtered.length === 0;

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>All reports</h1>
          <p className={styles.subtitle}>
            Browse, search and filter every issue logged by the community.
          </p>
        </div>
        <Link to="/reports/new" className={styles.clear} style={{ background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }}>
          New report
        </Link>
      </header>

      <div className={styles.toolbar} role="search">
        <input
          className={styles.input}
          type="search"
          placeholder="Search by title, description, address or reporter…"
          value={ui.searchQuery}
          onChange={(e) => dispatch(setSearchQuery(e.target.value))}
          aria-label="Search reports"
        />
        <select
          className={styles.select}
          value={ui.statusFilter}
          onChange={(e) =>
            dispatch(setStatusFilter(e.target.value as StatusFilter))
          }
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={ui.categoryFilter}
          onChange={(e) =>
            dispatch(setCategoryFilter(e.target.value as CategoryFilter))
          }
          aria-label="Filter by category"
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.clear}
          onClick={() => dispatch(clearFilters())}
        >
          Reset
        </button>
      </div>

      {isError ? (
        <ErrorState
          onRetry={() => {
            void refetch();
          }}
        />
      ) : null}

      {showSkeletons ? (
        <div className={styles.skeletons} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : null}

      {showEmpty ? (
        <EmptyState
          title={
            data && data.length > 0
              ? 'No reports match your filters'
              : 'No reports yet'
          }
          message={
            data && data.length > 0
              ? 'Try clearing the search or status filter.'
              : 'When neighbors file a report, it will show up here.'
          }
          action={
            <Link to="/reports/new" className={styles.clear}>
              File the first report
            </Link>
          }
        />
      ) : null}

      {!showSkeletons && filtered.length > 0 ? (
        <div className={styles.grid}>
          {filtered.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default ReportsPage;
