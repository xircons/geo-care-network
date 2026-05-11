import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { reportsApi } from "./reportsApi";

const selectUi = (state: RootState) => state.ui;
const selectReportsResult = reportsApi.endpoints.getReports.select();

export const selectReports = createSelector(selectReportsResult, (result) => result.data ?? []);

export const selectFilteredReports = createSelector(
  [selectReports, selectUi],
  (reports, ui) => {
    const query = ui.searchQuery.trim().toLowerCase();

    return reports.filter((report) => {
      if (ui.severityFilter !== "all" && report.severity !== ui.severityFilter) {
        return false;
      }
      if (ui.categoryFilter !== "all" && report.category !== ui.categoryFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      return [report.title, report.description, report.address, report.reporter]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }
);
