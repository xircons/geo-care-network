import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  ReportCategory,
  ReportStatus,
} from '../../types/report';

export type StatusFilter = 'all' | ReportStatus;
export type CategoryFilter = 'all' | ReportCategory;

export interface ToastState {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface UiState {
  /** Free-text search filter for the reports list. */
  searchQuery: string;
  /** Status facet filter. */
  statusFilter: StatusFilter;
  /** Category facet filter. */
  categoryFilter: CategoryFilter;
  /** Id of the currently focused/selected report on the map. */
  selectedReportId: string | null;
  /** Ephemeral toast messages. */
  toasts: ToastState[];
}

const initialState: UiState = {
  searchQuery: '',
  statusFilter: 'all',
  categoryFilter: 'all',
  selectedReportId: null,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setStatusFilter(state, action: PayloadAction<StatusFilter>) {
      state.statusFilter = action.payload;
    },
    setCategoryFilter(state, action: PayloadAction<CategoryFilter>) {
      state.categoryFilter = action.payload;
    },
    selectReport(state, action: PayloadAction<string | null>) {
      state.selectedReportId = action.payload;
    },
    clearFilters(state) {
      state.searchQuery = '';
      state.statusFilter = 'all';
      state.categoryFilter = 'all';
    },
    pushToast: {
      reducer(state, action: PayloadAction<ToastState>) {
        state.toasts.push(action.payload);
      },
      prepare(input: Omit<ToastState, 'id'>) {
        return {
          payload: {
            ...input,
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? crypto.randomUUID()
                : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          },
        };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  setCategoryFilter,
  selectReport,
  clearFilters,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export default uiSlice.reducer;
