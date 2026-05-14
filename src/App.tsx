import { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { Location as RouterLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { store } from "./app/store";
import Toast from "./components/Toast";
import TopBar from "./components/TopBar";
import { useGetReportsQuery } from "./features/reports/reportsApi";
import { setToastMessage } from "./features/ui/uiSlice";
import EditReportPage from "./pages/EditReportPage";
import MapView from "./pages/MapView";
import NewReportPage from "./pages/NewReportPage";
import NotFoundPage from "./pages/NotFoundPage";
import PulseView from "./pages/PulseView";
import ReportsView from "./pages/ReportsView";

function AppShell() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: RouterLocation } | null;
  const backgroundLocation = state?.backgroundLocation;
  const { data: reports = [] } = useGetReportsQuery();
  const toast = useAppSelector((state) => state.ui.toastMessage);
  const dispatch = useAppDispatch();

  const openCount = reports.filter((report) => report.status !== "resolved").length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dispatch(setToastMessage(null)), 2400);
    return () => window.clearTimeout(timer);
  }, [toast, dispatch]);

  return (
    <>
      <TopBar openCount={openCount} />
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<MapView />} />
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/reports/new" element={<NewReportPage />} />
        <Route path="/reports/:id" element={<Navigate to="/reports" replace />} />
        <Route path="/reports/:id/edit" element={<EditReportPage />} />
        <Route path="/pulse" element={<PulseView />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {backgroundLocation && (
        <Routes>
          <Route path="/reports/new" element={<NewReportPage />} />
          <Route path="/reports/:id/edit" element={<EditReportPage />} />
        </Routes>
      )}
      <Toast msg={toast} />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </Provider>
  );
}
