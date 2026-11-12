import { api } from './client';

export const formsApi = {
  list: () => api.get('/forms').then((r) => r.data),
  get: (slug: string) => api.get(`/forms/${slug}`).then((r) => r.data),
  create: (data: any) => api.post('/forms', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/forms/${id}`, data).then((r) => r.data),
};