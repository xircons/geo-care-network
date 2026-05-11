export type Severity = "safe" | "warning" | "danger";
export type ReportStatus = "open" | "in progress" | "resolved";
export type ReportCategory = "environment" | "infrastructure" | "safety";

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  severity: Severity;
  reporter: string;
  address: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  filed: string;
  updated: string;
}

export interface ReportInput {
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  severity: Severity;
  reporter: string;
  address: string;
  lat: number;
  lng: number;
}
