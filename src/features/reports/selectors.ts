import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { reportsApi } from "./reportsApi";

const selectUi = (state: RootState) => state.ui;
const selectReportsResult = reportsApi.endpoints.listReports.select();
const selectReports = createSelector(selectReportsResult, (result) => result.data ?? []);

export const selectFilteredReports = createSelector([selectReports, selectUi], (reports, ui) =>
  reports.filter((report) => {
    const severityMatch = ui.severityFilter === "all" || report.severity === ui.severityFilter;
    const q = ui.searchQuery.toLowerCase().trim();
    const queryMatch = !q || report.title.toLowerCase().includes(q) || report.address.toLowerCase().includes(q);
    return severityMatch && queryMatch;
  })
);
