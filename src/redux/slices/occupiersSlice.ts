import { createSlice } from '@reduxjs/toolkit';
import { Occupier } from '../../types/api';
import {
  createOccupierThunk,
  fetchOccupiersThunk,
  updateOccupierThunk,
} from '../thunks/occupiersThunks';

interface OccupiersState {
  items: Occupier[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: OccupiersState = {
  items: [],
  loading: false,
  submitting: false,
  error: null,
};

const occupiersSlice = createSlice({
  name: 'occupiers',
  initialState,
  reducers: {
    clearOccupiersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch list ──────────────────────────────────────────────────────────
      .addCase(fetchOccupiersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOccupiersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = (action.payload as Occupier[]) ?? [];
      })
      .addCase(fetchOccupiersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unable to fetch occupiers.';
      })

      // ── Create ───────────────────────────────────────────────────────────
      .addCase(createOccupierThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createOccupierThunk.fulfilled, (state, action) => {
        state.submitting = false;
        const created = action.payload as Occupier[] | null;
        if (created?.length) state.items.push(created[0]);
      })
      .addCase(createOccupierThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? 'Unable to create occupier.';
      })

      // ── Full update (PUT) ─────────────────────────────────────────────────
      .addCase(updateOccupierThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateOccupierThunk.fulfilled, (state, action) => {
        state.submitting = false;
        const updated = action.payload as Occupier[] | null;
        if (updated?.length) {
          const occ = updated[0];
          state.items = state.items.map((o) => (o.id === occ.id ? occ : o));
        }
      })
      .addCase(updateOccupierThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? 'Unable to update occupier.';
      });
  },
});

export const { clearOccupiersError } = occupiersSlice.actions;
export default occupiersSlice.reducer;
