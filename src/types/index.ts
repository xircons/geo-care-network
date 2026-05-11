export type Severity = "safe" | "warning" | "danger";
export type Category = "infrastructure" | "safety" | "environment" | "other";
export type ReportStatus = "open" | "in progress" | "resolved";

export interface Report {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: ReportStatus;
  severity: Severity;
  reporter: string;
  address: string;
  lat: number;
  lng: number;
  filed: string;
  updated: string;
}

export type NewReportPayload = Omit<Report, "id" | "filed" | "updated">;

export interface UiState {
  severityFilter: Severity | "all";
  searchQuery: string;
  toastMessage: string | null;
}
