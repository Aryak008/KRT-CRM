import api from '../../utils/api';
import { createApiThunk } from '../../utils/apiThunk';
import { CreateUserPayload, PatchUserPayload } from '../../types/api';

export const fetchUsersThunk = createApiThunk(
  'users/fetchList',
  () => api.get('/users'),
  { disableSuccessToast: true },
);

export const createUserThunk = createApiThunk<unknown, CreateUserPayload>(
  'users/create',
  (payload) => api.post('/users', payload),
  { successMessage: 'User created successfully.' },
);

export const patchUserThunk = createApiThunk<unknown, PatchUserPayload>(
  'users/patch',
  ({ id, ...payload }) => api.patch(`/users/${id}`, payload),
  { successMessage: 'User updated.' },
);
