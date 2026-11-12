import { api } from './client';

export const notificationsApi = {
  // Obtener todas las notificaciones del usuario
  list: () => api.get('/notifications').then((r) => r.data),
  
  // Marcar una notificación específica como leída
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  
  // Marcar todas como leídas
  markAllAsRead: () => api.patch('/notifications/read-all').then((r) => r.data),
};