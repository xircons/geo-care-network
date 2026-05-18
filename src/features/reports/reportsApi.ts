import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Report, ReportInput } from "../../types";

const baseUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:3000" : "");
if (!baseUrl) {
  throw new Error(
    "VITE_API_URL is not set. Define it in your .env (see .env.example)."
  );
}

export const reportsApi = createApi({
  reducerPath: "reportsApi",
  baseQuery: fetchBaseQuery({ baseUrl }),
  tagTypes: ["Reports", "Report"],
  endpoints: (builder) => ({
    getReports: builder.query<Report[], void>({
      query: () => "/reports",
      providesTags: (result) =>
        result
          ? [
              ...result.map((report) => ({ type: "Report" as const, id: report.id })),
              { type: "Reports" as const, id: "LIST" }
            ]
          : [{ type: "Reports" as const, id: "LIST" }]
    }),
    getReportById: builder.query<Report, string>({
      query: (id) => `/reports/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Report", id }]
    }),
    createReport: builder.mutation<Report, ReportInput>({
      query: (payload) => {
        const now = new Date().toISOString();
        return {
          url: "/reports",
          method: "POST",
          body: {
            ...payload,
            id: crypto.randomUUID(),
            x: 50,
            y: 50,
            filed: now,
            updated: now
          }
        };
      },
      invalidatesTags: [{ type: "Reports", id: "LIST" }]
    }),
    updateReport: builder.mutation<Report, Pick<Report, "id"> & Partial<ReportInput>>({
      query: ({ id, ...payload }) => ({
        url: `/reports/${id}`,
        method: "PATCH",
        body: {
          ...payload,
          updated: new Date().toISOString()
        }
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "Report", id: arg.id },
        { type: "Reports", id: "LIST" }
      ]
    }),
    deleteReport: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/reports/${id}`,
        method: "DELETE"
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Report", id },
        { type: "Reports", id: "LIST" }
      ]
    })
  })
});

export const {
  useGetReportsQuery,
  useGetReportByIdQuery,
  useCreateReportMutation,
  useUpdateReportMutation,
  useDeleteReportMutation
} = reportsApi;
