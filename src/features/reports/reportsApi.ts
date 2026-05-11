import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { NewReportPayload, Report } from "../../types";

export const reportsApi = createApi({
  reducerPath: "reportsApi",
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_API_URL }),
  tagTypes: ["Report"],
  endpoints: (builder) => ({
    listReports: builder.query<Report[], void>({
      query: () => "/reports",
      providesTags: (result) =>
        result
          ? [...result.map((r) => ({ type: "Report" as const, id: r.id })), { type: "Report" as const, id: "LIST" }]
          : [{ type: "Report" as const, id: "LIST" }],
    }),
    getReportById: builder.query<Report, string>({
      query: (id) => `/reports/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Report", id }],
    }),
    createReport: builder.mutation<Report, NewReportPayload>({
      query: (payload) => ({
        url: "/reports",
        method: "POST",
        body: { ...payload, filed: new Date().toISOString(), updated: new Date().toISOString() },
      }),
      invalidatesTags: [{ type: "Report", id: "LIST" }],
    }),
    updateReport: builder.mutation<Report, Partial<Report> & Pick<Report, "id">>({
      query: ({ id, ...payload }) => ({ url: `/reports/${id}`, method: "PUT", body: { ...payload, updated: new Date().toISOString() } }),
      invalidatesTags: (_r, _e, arg) => [{ type: "Report", id: arg.id }],
    }),
    deleteReport: builder.mutation<void, string>({
      query: (id) => ({ url: `/reports/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Report", id: "LIST" }],
    }),
  }),
});

export const { useListReportsQuery, useGetReportByIdQuery, useCreateReportMutation, useUpdateReportMutation } = reportsApi;
