# CLAUDE.md — Community Issue Tracker

This file orients future agents working in this repository. It mirrors the
public project rubric so review tooling can use the same source of truth.

## Architecture

- **Folder layout** — `src/app/`, `src/components/`, `src/features/`,
  `src/pages/`, `src/types/`, `src/styles/`. Each component owns its own
  CSS Module sibling.
- **Components** — React 18 functional components and hooks only. No
  class components anywhere in `src/`.
- **State** — Redux Toolkit `configureStore` with two slices:
  - `reportsApi` (RTK Query): full CRUD against the json-server mock
    (`/reports`). Uses `providesTags` / `invalidatesTags` for cache
    coherence.
  - `uiSlice`: filters (search, status, category), selection, toasts.
- **Derived data** — `makeSelectFilteredReports` and
  `makeSelectReportCounts` use `createSelector` so the filtered list and
  count objects keep stable references.
- **Routing** — `react-router-dom` v6 with routes `/`, `/reports`,
  `/reports/new`, `/reports/:id`, `/reports/:id/edit`, `/404`. The
  detail/edit pages read the id via `useParams`.
- **Forms** — Controlled components (`value` + `onChange`) with
  per-field validation, blur tracking and submit-attempt gating.
- **Map** — `react-leaflet` with the CartoDB Positron tile URL set in
  the rubric. Markers are CSS-Module-styled divIcons with a pulsing
  glow animation per severity.
- **Loading / error states** — Every async view renders a skeleton or
  the whale loader, plus a typed `ErrorState` with retry.
- **Environment** — `import.meta.env.VITE_API_URL` is required at
  startup; missing means we throw rather than silently fall back.

## Visual rubric

Strict light theme, no emojis, palette tokens in `src/index.css`:

| Token                   | Hex      |
| ----------------------- | -------- |
| `--color-bg`            | `#F8FAFC`|
| `--color-surface`       | `#FFFFFF`|
| `--color-border`        | `#CBD5E1`|
| `--color-primary`       | `#0EA5E9`|
| `--color-primary-glow`  | `#38BDF8`|
| `--color-danger`        | `#F43F5E`|
| `--color-warning`       | `#F59E0B`|
| `--color-safe`          | `#22C55E`|
| `--color-text-main`     | `#0F172A`|
| `--color-text-secondary`| `#475569`|

The whale motif is rendered with raw SVG paths and used in
`WhaleLoader`, `EmptyState`, `NotFoundPage` and the brand mark.

## Scripts

```
npm run mock           # json-server :3000 (db.json)
npm run dev            # Vite dev server
npm run start          # both, concurrently
npm run build          # tsc -b && vite build
npm run lint           # eslint flat config
```

## AI skill bundle

The `.claude/` directory ships with the project. Key skills:
- `react-best-practices`
- `senior-frontend`
- `frontend-design`
- `ui-ux-pro-max`
- `code-reviewer`

Future agents should consult these before introducing new patterns.

## Git workflow

Conventional commits, frequent and focused, ≥ 6 commits in history.
