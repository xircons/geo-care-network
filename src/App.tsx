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
import CctvView from "./pages/CctvView";
import NotifyAgencyView from "./pages/NotifyAgencyView";
import ReportsView from "./pages/ReportsView";

function AppShell() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: RouterLocation } | null;
  const backgroundLocation = state?.backgroundLocation;
  const { data: reports = [] } = useGetReportsQuery();
  const toast = useAppSelector((state) => state.ui.toastMessage);
  const dispatch = useAppDispatch();

  const openCount = reports.filter((report) => report.status !== "resolved").length;
  // Awaiting = CCTV-sourced reports still in "open" — these are what the
  // agency needs to triage and what the Notify alert badge counts.
  const awaitingCount = reports.filter(
    (r) => (r.source === "cctv" || r.reporter === "CCTV Auto-Detect") && r.status === "open"
  ).length;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dispatch(setToastMessage(null)), 2400);
    return () => window.clearTimeout(timer);
  }, [toast, dispatch]);

  return (
    <>
      <TopBar openCount={openCount} awaitingCount={awaitingCount} />
      <Routes location={backgroundLocation || location} key={(backgroundLocation || location).pathname}>
        <Route path="/" element={<MapView />} />
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/reports/new" element={<NewReportPage />} />
        <Route path="/reports/:id" element={<Navigate to="/reports" replace />} />
        <Route path="/reports/:id/edit" element={<EditReportPage />} />
        <Route path="/cctv" element={<CctvView />} />
        <Route path="/notify" element={<NotifyAgencyView />} />
        <Route path="/notify/archived" element={<NotifyAgencyView />} />
        <Route path="/pulse" element={<Navigate to="/cctv" replace />} />
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
