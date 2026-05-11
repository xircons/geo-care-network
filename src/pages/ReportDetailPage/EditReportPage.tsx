import { useParams, Link } from 'react-router-dom';
import { useGetReportQuery } from '../../features/reports/reportsApi';
import ReportForm from '../../features/reports/ReportForm';
import WhaleLoader from '../../components/WhaleLoader/WhaleLoader';
import ErrorState from '../../components/ErrorState/ErrorState';

const EditReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useGetReportQuery(id ?? '', {
    skip: !id,
  });

  if (!id) return <ErrorState title="Missing report id" />;

  if (isLoading) {
    return (
      <div style={{ padding: 32 }}>
        <WhaleLoader message="Pulling the latest version…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          title="Could not load report"
          detail="The report you are trying to edit was not found."
          onRetry={() => {
            void refetch();
          }}
        />
        <p style={{ marginTop: 12 }}>
          <Link to="/reports">Back to all reports</Link>
        </p>
      </div>
    );
  }

  return <ReportForm initial={data} />;
};

export default EditReportPage;
