import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { reportsApi } from '../features/reportsApi';
import uiReducer from '../features/uiSlice';

export const store = configureStore({
  reducer: {
    [reportsApi.reducerPath]: reportsApi.reducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(reportsApi.middleware),
});

// Enables refetchOnFocus / refetchOnReconnect behaviours.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
