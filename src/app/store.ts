import { configureStore } from "@reduxjs/toolkit";
import { reportsApi } from "../features/reports/reportsApi";
import uiReducer from "../features/ui/uiSlice";

export const store = configureStore({
  reducer: { ui: uiReducer, [reportsApi.reducerPath]: reportsApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(reportsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
