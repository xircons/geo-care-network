import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UiState } from "../../types";

const initialState: UiState = { severityFilter: "all", searchQuery: "", toastMessage: null };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSeverityFilter: (state, action: PayloadAction<UiState["severityFilter"]>) => {
      state.severityFilter = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    pushToast: (state, action: PayloadAction<string>) => {
      state.toastMessage = action.payload;
    },
    clearToast: (state) => {
      state.toastMessage = null;
    },
  },
});

export const { setSeverityFilter, setSearchQuery, pushToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;
