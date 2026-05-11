import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  NewReportInput,
  Report,
  ReportUpdateInput,
} from '../../types/report';

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  // Strict rule: API URL must come from the env, never hardcoded.
  throw new Error(
    'VITE_API_URL is not defined. Copy .env.example to .env before starting Vite.'
  );
}

/**
 * RTK Query slice for the `reports` resource exposed by the mock REST API
 * (json-server backed by `db.json`).
 *
 * Cache invalidation strategy:
 *  - `providesTags` on read endpoints declares which entities are returned.
 *  - `invalidatesTags` on write endpoints triggers automatic refetch of the
 *    affected list / detail queries.
 */
export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL }),
  tagTypes: ['Report'],
  endpoints: (builder) => ({
    listReports: builder.query<Report[], void>({
      query: () => '/reports',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Report' as const, id })),
              { type: 'Report' as const, id: 'LIST' },
            ]
          : [{ type: 'Report' as const, id: 'LIST' }],
    }),

    getReport: builder.query<Report, string>({
      query: (id) => `/reports/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Report', id }],
    }),

    createReport: builder.mutation<Report, NewReportInput>({
      query: (body) => {
        const now = new Date().toISOString();
        return {
          url: '/reports',
          method: 'POST',
          body: { ...body, createdAt: now, updatedAt: now },
        };
      },
      invalidatesTags: [{ type: 'Report', id: 'LIST' }],
    }),

    updateReport: builder.mutation<Report, ReportUpdateInput>({
      query: ({ id, ...patch }) => ({
        url: `/reports/${id}`,
        method: 'PATCH',
        body: { ...patch, updatedAt: new Date().toISOString() },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Report', id: arg.id },
        { type: 'Report', id: 'LIST' },
      ],
    }),

    deleteReport: builder.mutation<{ success: true; id: string }, string>({
      query: (id) => ({ url: `/reports/${id}`, method: 'DELETE' }),
      transformResponse: (_response, _meta, id) => ({
        success: true as const,
        id,
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Report', id },
        { type: 'Report', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListReportsQuery,
  useGetReportQuery,
  useCreateReportMutation,
  useUpdateReportMutation,
  useDeleteReportMutation,
} = reportsApi;
