import { api } from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, nombre: string, password: string) =>
    api.post('/auth/register', { email, nombre, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};