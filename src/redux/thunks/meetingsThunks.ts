import api from '../../utils/api';
import { createApiThunk } from '../../utils/apiThunk';
import { CreateMeetingPayload } from '../../types/api';

export const fetchMeetingsThunk = createApiThunk(
  'meetings/fetchList',
  () => api.get('/meetings'),
  { disableSuccessToast: true },
);

export const createMeetingThunk = createApiThunk<unknown, CreateMeetingPayload>(
  'meetings/create',
  (payload) => api.post('/meetings', payload),
  { successMessage: 'Meeting logged.' },
);

export const deleteMeetingThunk = createApiThunk<unknown, number>(
  'meetings/delete',
  (id) => api.delete(`/meetings/${id}`),
  { successMessage: 'Meeting deleted.' },
);
