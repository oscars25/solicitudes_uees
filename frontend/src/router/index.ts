import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/Login.vue') },
    { path: '/registro', component: () => import('../views/Register.vue') },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminHome.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/admin/formularios',
      component: () => import('../views/admin/AdminForms.vue'),
      meta: { roles: ['admin'] },
    },
    {
      path: '/solicitudes',
      component: () => import('../views/solicitante/MisSolicitudes.vue'),
      meta: { roles: ['solicitante'] },
    },
    {
      path: '/solicitudes/nueva/:slug',
      component: () => import('../views/solicitante/NuevaSolicitud.vue'),
      meta: { roles: ['solicitante'] },
    },
    {
      path: '/solicitudes/:id', // <-- NUEVA RUTA
      component: () => import('../views/solicitante/DetalleSolicitud.vue'),
      meta: { roles: ['solicitante'] },
    },
    {
      path: '/interno',
      component: () => import('../views/interno/InternoHome.vue'),
      meta: { roles: ['interno', 'admin'] },
    },
    {
      path: '/interno/:id',
      component: () => import('../views/interno/DetalleSolicitud.vue'),
      meta: { roles: ['interno', 'admin'] },
    },
    { path: '/', redirect: '/login' },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  auth.load();

  if (to.path === '/login' || to.path === '/registro') return true;
  if (!auth.isAuthenticated) return '/login';

  const roles = to.meta.roles as string[] | undefined;
  if (roles && auth.rol && !roles.includes(auth.rol)) {
    if (auth.rol === 'admin') return '/admin';
    if (auth.rol === 'interno') return '/interno';
    return '/solicitudes';
  }

  return true;
});

export default router;