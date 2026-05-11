import { useNavigate, useParams } from "react-router-dom";
import WhaleState from "../components/WhaleState";
import ReportDetail from "../features/reports/ReportDetail";
import { useDeleteReportMutation, useGetReportByIdQuery } from "../features/reports/reportsApi";
import { setToastMessage } from "../features/ui/uiSlice";
import { useAppDispatch } from "../app/hooks";
import styles from "./ReportDetailPage.module.css";

export default function ReportDetailPage() {
  const { id = "" } = useParams();
  const { data: report, isLoading } = useGetReportByIdQuery(id);
  const [deleteReport] = useDeleteReportMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  if (isLoading || !report) {
    return <WhaleState label="Loading report detail" />;
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <ReportDetail
          report={report}
          onDelete={async (reportId) => {
            await deleteReport(reportId).unwrap();
            dispatch(setToastMessage("Report deleted"));
            navigate("/reports");
          }}
        />
      </div>
    </section>
  );
}
