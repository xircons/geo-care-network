import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ReportCategory, Severity } from "../../types";

type SeverityFilter = Severity | "all";
type CategoryFilter = ReportCategory | "all";

export type ToastTone = "success" | "error" | "info";

export interface UiState {
  severityFilter: SeverityFilter;
  categoryFilter: CategoryFilter;
  searchQuery: string;
  toastMessage: string | null;
  toastTone: ToastTone;
}

const initialState: UiState = {
  severityFilter: "all",
  categoryFilter: "all",
  searchQuery: "",
  toastMessage: null,
  toastTone: "success"
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSeverityFilter: (state, action: PayloadAction<SeverityFilter>) => {
      state.severityFilter = action.payload;
    },
    setCategoryFilter: (state, action: PayloadAction<CategoryFilter>) => {
      state.categoryFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setToastMessage: (state, action: PayloadAction<string | null>) => {
      state.toastMessage = action.payload;
      if (action.payload) {
        state.toastTone = "success";
      }
    },
    showToast: (
      state,
      action: PayloadAction<{ message: string; tone?: ToastTone }>
    ) => {
      state.toastMessage = action.payload.message;
      state.toastTone = action.payload.tone ?? "info";
    },
    dismissToast: (state) => {
      state.toastMessage = null;
    }
  }
});

export const {
  setSeverityFilter,
  setCategoryFilter,
  setSearchQuery,
  setToastMessage,
  showToast,
  dismissToast
} = uiSlice.actions;

export default uiSlice.reducer;
