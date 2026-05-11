import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import WhaleState from "../components/WhaleState";
import ReportCard from "../features/reports/ReportCard";
import ReportForm from "../features/reports/ReportForm";
import { useCreateReportMutation } from "../features/reports/reportsApi";
import { selectFilteredReports } from "../features/reports/selectors";
import { pushToast, setSearchQuery } from "../features/ui/uiSlice";
import type { NewReportPayload } from "../types";
import styles from "./ReportsView.module.css";

export default function ReportsView() {
  const [openForm, setOpenForm] = useState(false);
  const dispatch = useAppDispatch();
  const reports = useAppSelector(selectFilteredReports);
  const [createReport] = useCreateReportMutation();

  const onSubmit = async (payload: NewReportPayload) => {
    await createReport(payload).unwrap();
    dispatch(pushToast("Report submitted."));
    setOpenForm(false);
  };

  return <section className={styles.page}><div><input placeholder="Search reports" onChange={(e) => dispatch(setSearchQuery(e.target.value))} /><button onClick={() => setOpenForm((v) => !v)}>{openForm ? "Close" : "New report"}</button></div>{openForm ? <ReportForm onSubmit={onSubmit} /> : null}{reports.length === 0 ? <WhaleState label="No reports matched your filters." /> : null}<div className={styles.grid}>{reports.map((r) => <ReportCard key={r.id} report={r} />)}</div></section>;
}
