import { api } from './client';

export const requestsApi = {
  list: () => api.get('/requests').then((r) => r.data),
  get: (id: string) => api.get(`/requests/${id}`).then((r) => r.data),
  create: (formDefinitionId: string, payload: any) =>
    api.post('/requests', { formDefinitionId, payload }).then((r) => r.data),
  changeStatus: (id: string, estado: string, comentario?: string) =>
    api.patch(`/requests/${id}/status`, { estado, comentario }).then((r) => r.data),
  resubmit: (id: string, payload: any) =>
    api.patch(`/requests/${id}/resubmit`, { payload }).then((r) => r.data),
};