import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Toaster from './components/Toaster/Toaster';
import HomePage from './pages/HomePage/HomePage';
import ReportsPage from './pages/ReportsPage/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage/ReportDetailPage';
import NewReportPage from './pages/ReportDetailPage/NewReportPage';
import EditReportPage from './pages/ReportDetailPage/EditReportPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/new" element={<NewReportPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="reports/:id/edit" element={<EditReportPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
};

export default App;
