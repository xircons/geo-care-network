# Community Issue Tracker

A light-themed React + TypeScript single-page app for reporting and exploring
community issues on a map. Built for a university term project against a
strict architectural rubric.

## Stack

- Vite + React + TypeScript (functional components only)
- Redux Toolkit + RTK Query (`reportsApi` + `uiSlice`)
- `createSelector` for memoised, filtered derived data
- React Router v6 (`/`, `/reports`, `/reports/:id`, plus create/edit)
- React Leaflet with CartoDB Positron tiles
- CSS Modules per component (no global layout styles)
- json-server backed by `db.json` as the mock REST API

## Folder layout

```
src/
├── app/                # store, typed hooks
├── components/         # flat: Layout.tsx, MapMarker.tsx, WhaleLoader.tsx, …
│                       # each component owns its CSS Module sibling
├── features/           # flat: reportsApi.ts, uiSlice.ts, selectors.ts,
│                       # ReportForm.tsx (+ ReportForm.module.css)
├── pages/              # flat: HomePage.tsx, ReportsPage.tsx,
│                       # ReportDetailPage.tsx, NewReportPage.tsx,
│                       # EditReportPage.tsx, NotFoundPage.tsx
├── index.css           # theme variables + minimal resets (no layout)
└── types/              # shared TS types (report.ts)
```

## Environment

Copy `.env.example` to `.env` and adjust if you change the mock API port.

```
VITE_API_URL=http://localhost:3000
```

The mock API URL is read via `import.meta.env.VITE_API_URL` and never
hard-coded.

## Scripts

```
npm install            # install
npm run mock           # start json-server on :3000 (seeded from db.json)
npm run dev            # start the Vite dev server
npm run start          # run mock + dev concurrently
npm run build          # type-check + production bundle
npm run lint           # eslint flat config
```

## Design rules implemented

- Light theme only, strict palette (see `src/index.css`).
- No emojis anywhere in the UI.
- Whale SVG motif used for loading and empty states.
- Smooth CSS transitions and pulsing glow on map markers.
- All async views render a loading skeleton / spinner and an error state.

## Mock data

`db.json` seeds three reports around Chiang Mai with varying severity so the
map shows the marker palette in action.
