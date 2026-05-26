import { createSlice } from '@reduxjs/toolkit';
import { Meeting } from '../../types/api';
import {
  createMeetingThunk,
  deleteMeetingThunk,
  fetchMeetingsThunk,
} from '../thunks/meetingsThunks';

interface MeetingsState {
  items: Meeting[];
  loading: boolean;
  submitting: boolean;
  deletingId: number | null;
  error: string | null;
}

const initialState: MeetingsState = {
  items: [],
  loading: false,
  submitting: false,
  deletingId: null,
  error: null,
};

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    clearMeetingsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch list ──────────────────────────────────────────────────────────
      .addCase(fetchMeetingsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMeetingsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = (action.payload as Meeting[]) ?? [];
      })
      .addCase(fetchMeetingsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unable to fetch meetings.';
      })

      // ── Create ───────────────────────────────────────────────────────────
      .addCase(createMeetingThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createMeetingThunk.fulfilled, (state, action) => {
        state.submitting = false;
        const created = action.payload as Meeting[] | null;
        if (created?.length) state.items.unshift(created[0]);
      })
      .addCase(createMeetingThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? 'Unable to log meeting.';
      })

      // ── Delete ───────────────────────────────────────────────────────────
      .addCase(deleteMeetingThunk.pending, (state, action) => {
        state.deletingId = action.meta.arg;
        state.error = null;
      })
      .addCase(deleteMeetingThunk.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter((m) => m.id !== action.meta.arg);
      })
      .addCase(deleteMeetingThunk.rejected, (state, action) => {
        state.deletingId = null;
        state.error = (action.payload as string) ?? 'Unable to delete meeting.';
      });
  },
});

export const { clearMeetingsError } = meetingsSlice.actions;
export default meetingsSlice.reducer;
