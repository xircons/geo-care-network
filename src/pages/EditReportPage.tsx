import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import WhaleState from "../components/WhaleState";
import ReportForm from "../features/reports/ReportForm";
import { useGetReportByIdQuery, useUpdateReportMutation } from "../features/reports/reportsApi";
import { setToastMessage } from "../features/ui/uiSlice";
import styles from "./ReportDetailPage.module.css";

export default function EditReportPage() {
  const { id = "" } = useParams();
  const { data: report, isLoading } = useGetReportByIdQuery(id);
  const [updateReport] = useUpdateReportMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  if (isLoading || !report) {
    return <WhaleState label="Loading report form" />;
  }

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <h1>Edit report</h1>
        <ReportForm
          mode="edit"
          initial={report}
          onCancel={() => navigate(`/reports/${id}`)}
          onSave={async (payload) => {
            await updateReport({ id, ...payload }).unwrap();
            dispatch(setToastMessage("Report updated"));
            navigate(`/reports/${id}`);
          }}
        />
      </div>
    </section>
  );
}
