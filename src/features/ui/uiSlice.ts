import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ReportCategory, Severity } from "../../types";

type SeverityFilter = Severity | "all";
type CategoryFilter = ReportCategory | "all";

export interface UiState {
  severityFilter: SeverityFilter;
  categoryFilter: CategoryFilter;
  searchQuery: string;
  toastMessage: string | null;
}

const initialState: UiState = {
  severityFilter: "all",
  categoryFilter: "all",
  searchQuery: "",
  toastMessage: null
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
    }
  }
});

export const { setSeverityFilter, setCategoryFilter, setSearchQuery, setToastMessage } =
  uiSlice.actions;

export default uiSlice.reducer;
