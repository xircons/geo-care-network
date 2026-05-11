import { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { store } from "./app/store";
import Toast from "./components/Toast";
import TopBar from "./components/TopBar";
import { clearToast } from "./features/ui/uiSlice";
import MapView from "./pages/MapView";
import PulseView from "./pages/PulseView";
import ReportDetail from "./pages/ReportDetail";
import ReportsView from "./pages/ReportsView";

function Shell() {
  const dispatch = useAppDispatch();
  const message = useAppSelector((state) => state.ui.toastMessage);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => dispatch(clearToast()), 2200);
    return () => window.clearTimeout(timer);
  }, [dispatch, message]);

  return <BrowserRouter><TopBar /><Routes><Route path="/" element={<MapView />} /><Route path="/reports" element={<ReportsView />} /><Route path="/reports/:id" element={<ReportDetail />} /><Route path="/pulse" element={<PulseView />} /></Routes><Toast message={message} /></BrowserRouter>;
}

export default function App() {
  return <Provider store={store}><Shell /></Provider>;
}
