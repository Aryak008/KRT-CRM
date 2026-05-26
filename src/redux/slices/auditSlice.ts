import { createSlice } from '@reduxjs/toolkit';
import { AuditEntry } from '../../types/api';
import { createAuditEntryThunk, fetchAuditThunk } from '../thunks/auditThunks';

interface AuditState {
  items: AuditEntry[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: AuditState = {
  items: [],
  loading: false,
  submitting: false,
  error: null,
};

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    clearAuditError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch list ──────────────────────────────────────────────────────────
      .addCase(fetchAuditThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = (action.payload as AuditEntry[]) ?? [];
      })
      .addCase(fetchAuditThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unable to fetch audit log.';
      })

      // ── Create entry ──────────────────────────────────────────────────────
      .addCase(createAuditEntryThunk.pending, (state) => {
        state.submitting = true;
      })
      .addCase(createAuditEntryThunk.fulfilled, (state, action) => {
        state.submitting = false;
        const created = action.payload as AuditEntry[] | null;
        if (created?.length) state.items.unshift(created[0]);
      })
      .addCase(createAuditEntryThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? 'Unable to log audit entry.';
      });
  },
});

export const { clearAuditError } = auditSlice.actions;
export default auditSlice.reducer;
