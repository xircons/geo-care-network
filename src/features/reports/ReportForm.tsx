import { useState, type FormEvent } from "react";
import type { NewReportPayload, Report } from "../../types";

const defaults: NewReportPayload = { title: "", description: "", category: "infrastructure", status: "open", severity: "warning", reporter: "", address: "", lat: 18.7883, lng: 98.9853 };

export default function ReportForm({ initial, onSubmit }: { initial?: Report; onSubmit: (data: NewReportPayload) => void }) {
  const [form, setForm] = useState<NewReportPayload>({ ...defaults, ...initial });
  return (
    <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(form); }}>
      <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input required placeholder="Reporter" value={form.reporter} onChange={(e) => setForm({ ...form, reporter: e.target.value })} />
      <input required placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      <button type="submit">Save report</button>
    </form>
  );
}
