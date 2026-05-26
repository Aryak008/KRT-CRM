import { createSlice } from '@reduxjs/toolkit';
import { User } from '../../types/api';
import {
  createUserThunk,
  fetchUsersThunk,
  patchUserThunk,
} from '../thunks/usersThunks';

interface UsersState {
  items: User[];
  loading: boolean;
  submitting: boolean;
  statusLoadingId: number | null;
  error: string | null;
}

const initialState: UsersState = {
  items: [],
  loading: false,
  submitting: false,
  statusLoadingId: null,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearUsersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Fetch list ──────────────────────────────────────────────────────────
      .addCase(fetchUsersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = (action.payload as User[]) ?? [];
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Unable to fetch users.';
      })

      // ── Create ───────────────────────────────────────────────────────────
      .addCase(createUserThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createUserThunk.fulfilled, (state, action) => {
        state.submitting = false;
        const created = action.payload as User[] | null;
        if (created?.length) state.items.push(created[0]);
      })
      .addCase(createUserThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) ?? 'Unable to create user.';
      })

      // ── Patch (role / is_admin / is_active / password_hash) ─────────────
      .addCase(patchUserThunk.pending, (state, action) => {
        state.statusLoadingId = action.meta.arg.id;
        state.error = null;
      })
      .addCase(patchUserThunk.fulfilled, (state, action) => {
        state.statusLoadingId = null;
        const updated = action.payload as User[] | null;
        if (updated?.length) {
          const user = updated[0];
          state.items = state.items.map((u) => (u.id === user.id ? user : u));
        }
      })
      .addCase(patchUserThunk.rejected, (state, action) => {
        state.statusLoadingId = null;
        state.error = (action.payload as string) ?? 'Unable to update user.';
      });
  },
});

export const { clearUsersError } = usersSlice.actions;
export default usersSlice.reducer;
