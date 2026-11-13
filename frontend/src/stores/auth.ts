import { defineStore } from 'pinia';
import { authApi } from '../api/auth';

// Agregamos los nuevos roles
export type Rol = 'docente' | 'coordinador' | 'interno' | 'admin' | 'solicitante';

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  carreraCoordinada?: string | null;
  formularioAsignado?: string | null; // <-- NUEVO CAMPO
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    rol: (s) => s.user?.rol ?? null,
  },
  actions: {
    load() {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token && user) {
        this.token = token;
        this.user = JSON.parse(user);
      }
    },
    async login(email: string, password: string) {
      const data = await authApi.login(email, password);
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});