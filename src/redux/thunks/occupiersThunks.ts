import api from '../../utils/api';
import { createApiThunk } from '../../utils/apiThunk';
import { CreateOccupierPayload, UpdateOccupierPayload } from '../../types/api';

export const fetchOccupiersThunk = createApiThunk(
  'occupiers/fetchList',
  () => api.get('/occupiers'),
  { disableSuccessToast: true },
);

export const createOccupierThunk = createApiThunk<unknown, CreateOccupierPayload>(
  'occupiers/create',
  (payload) => api.post('/occupiers', payload),
  { successMessage: 'Occupier added.' },
);

export const updateOccupierThunk = createApiThunk<unknown, UpdateOccupierPayload>(
  'occupiers/update',
  ({ id, ...payload }) => api.put(`/occupiers/${id}`, payload),
  { successMessage: 'Occupier updated.' },
);
