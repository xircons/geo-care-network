export type Severity = "safe" | "warning" | "danger";
export type ReportStatus = "open" | "in progress" | "resolved";
export type ReportCategory = "environment" | "infrastructure" | "safety";

/** Where a report originated — used by the agency dashboard to filter the queue. */
export type ReportSource = "cctv" | "manual";

/**
 * One row in a report's append-only activity timeline. The CCTV flow seeds
 * "Report filed"; the agency Acknowledge action appends "Acknowledged by agency".
 * `id` is just a stable React key (uuid is fine, but a timestamp suffix works too).
 */
export interface ActivityLogEntry {
  id: string;
  label: string;
  /** ISO-8601 timestamp. */
  at: string;
}

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
  /** Where the report came from. CCTV submissions set "cctv". */
  source?: ReportSource;
  /**
   * Mirrors the AI verdict's `is_crash` flag at the moment of filing. Kept as
   * a top-level field so the agency dashboard can sort/filter on it without
   * re-running analysis.
   */
  cctvCrashDetected?: boolean;
  /** JPEG data URL captured client-side from the CCTV video. */
  thumbnailUrl?: string;
  /** Append-only timeline of significant events on this report. */
  activityLog?: ActivityLogEntry[];
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
  source?: ReportSource;
  cctvCrashDetected?: boolean;
  thumbnailUrl?: string;
  activityLog?: ActivityLogEntry[];
}
