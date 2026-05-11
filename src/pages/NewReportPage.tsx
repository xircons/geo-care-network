import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../app/hooks";
import ReportForm from "../features/reports/ReportForm";
import { useCreateReportMutation } from "../features/reports/reportsApi";
import { setToastMessage } from "../features/ui/uiSlice";
import styles from "./ReportDetailPage.module.css";

export default function NewReportPage() {
  const [createReport] = useCreateReportMutation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <h1>New report</h1>
        <ReportForm
          mode="new"
          onCancel={() => navigate("/reports")}
          onSave={async (payload) => {
            await createReport(payload).unwrap();
            dispatch(setToastMessage("Report filed"));
            navigate("/reports");
          }}
        />
      </div>
    </section>
  );
}
