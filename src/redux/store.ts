import { configureStore } from '@reduxjs/toolkit';
import usersReducer from './slices/usersSlice';
import occupiersReducer from './slices/occupiersSlice';
import meetingsReducer from './slices/meetingsSlice';
import auditReducer from './slices/auditSlice';

export const store = configureStore({
  reducer: {
    users: usersReducer,
    occupiers: occupiersReducer,
    meetings: meetingsReducer,
    audit: auditReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
