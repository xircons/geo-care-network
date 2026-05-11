import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';
import type { Report } from '../types/report';

/**
 * Build a memoised selector that filters an externally-provided list of
 * reports by the UI slice's search query, status and category filters.
 *
 * RTK Query owns the data cache, so we pass the data in as the first
 * argument and pull filters from Redux state. `createSelector` ensures the
 * returned array reference is stable as long as inputs do not change.
 */
const selectUiFilters = (state: RootState) => state.ui;

export const makeSelectFilteredReports = () =>
  createSelector(
    [(_state: RootState, reports: Report[] | undefined) => reports ?? [], selectUiFilters],
    (reports, ui): Report[] => {
      const q = ui.searchQuery.trim().toLowerCase();
      return reports.filter((r) => {
        if (ui.statusFilter !== 'all' && r.status !== ui.statusFilter)
          return false;
        if (ui.categoryFilter !== 'all' && r.category !== ui.categoryFilter)
          return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q) ||
          r.reporter.toLowerCase().includes(q)
        );
      });
    }
  );

/** Aggregate counts derived from the same input list. */
export const makeSelectReportCounts = () =>
  createSelector(
    [(_s: RootState, reports: Report[] | undefined) => reports ?? []],
    (reports) => ({
      total: reports.length,
      open: reports.filter((r) => r.status === 'open').length,
      inProgress: reports.filter((r) => r.status === 'in_progress').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
    })
  );
