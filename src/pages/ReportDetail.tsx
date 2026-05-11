import { useState } from "react";
import { useParams } from "react-router-dom";
import ReportForm from "../features/reports/ReportForm";
import Timeline from "../features/reports/Timeline";
import { useGetReportByIdQuery, useUpdateReportMutation } from "../features/reports/reportsApi";
import type { NewReportPayload } from "../types";

export default function ReportDetail() {
  const { id = "" } = useParams();
  const [editing, setEditing] = useState(false);
  const { data } = useGetReportByIdQuery(id);
  const [updateReport] = useUpdateReportMutation();
  if (!data) return null;

  const onSubmit = async (payload: NewReportPayload) => {
    await updateReport({ ...data, ...payload, id: data.id }).unwrap();
    setEditing(false);
  };

  return <section style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}><h1>{data.title}</h1><p>{data.description}</p><button onClick={() => setEditing((v) => !v)}>{editing ? "Close edit" : "Edit report"}</button>{editing ? <ReportForm initial={data} onSubmit={onSubmit} /> : null}<Timeline report={data} /></section>;
}
