import axios from 'axios';

export const api = axios.create({
  // Apuntamos directo al backend
  baseURL: 'http://localhost:3001', 
  // Eliminamos la linea de headers para que Axios detecte el tipo de contenido correcto
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (location.pathname !== '/login') {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);