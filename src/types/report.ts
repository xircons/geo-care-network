export type ReportCategory =
  | 'infrastructure'
  | 'environment'
  | 'safety'
  | 'community'
  | 'other';

export type ReportStatus = 'open' | 'in_progress' | 'resolved';

export type ReportSeverity = 'safe' | 'warning' | 'danger';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  address: string;
  reporter: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a new report (server assigns id + timestamps). */
export type NewReportInput = Omit<
  Report,
  'id' | 'createdAt' | 'updatedAt'
>;

/** Payload for editing a report. */
export type ReportUpdateInput = Partial<NewReportInput> & { id: string };
