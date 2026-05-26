import api from '../../utils/api';
import { createApiThunk } from '../../utils/apiThunk';
import { CreateAuditPayload } from '../../types/api';

export const fetchAuditThunk = createApiThunk(
  'audit/fetchList',
  () => api.get('/audit'),
  { disableSuccessToast: true },
);

export const createAuditEntryThunk = createApiThunk<unknown, CreateAuditPayload>(
  'audit/create',
  (payload) => api.post('/audit', payload),
  { disableSuccessToast: true },
);
