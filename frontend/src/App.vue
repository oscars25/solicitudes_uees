<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { notificationsApi } from './api/notifications';
import ueesLogo from './assets/uees-logo.png';
import dteLogo from './assets/dte-logo.png';

const auth = useAuthStore();
const router = useRouter();
auth.load();

const showNav = computed(() => auth.isAuthenticated);

// --- Variables para las notificaciones ---
const notificaciones = ref<any[]>([]);
const mostrarNotificaciones = ref(false);
let intervalId: any = null;

// Contar cuántas no se han leído
const noLeidas = computed(() => notificaciones.value.filter(n => !n.isRead).length);

async function cargarNotificaciones() {
  if (!auth.isAuthenticated) return;
  try {
    notificaciones.value = await notificationsApi.list();
  } catch (e) {
    console.error('Error al cargar notificaciones');
  }
}

// Solo marcamos como leida, la navegacion la hace el router-link
async function marcarLeida(n: any) {
  mostrarNotificaciones.value = false;
  if (!n.isRead) {
    try {
      await notificationsApi.markAsRead(n.id);
      n.isRead = true;
    } catch (e) {
      console.error(e);
    }
  }
}

async function marcarTodasLeidas() {
  await notificationsApi.markAllAsRead();
  notificaciones.value.forEach(n => n.isRead = true);
}

// Ciclo de vida
onMounted(() => {
  cargarNotificaciones();
  // Revisar cada 30 segundos si hay nuevas notificaciones
  intervalId = setInterval(cargarNotificaciones, 30000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-container">
    
    <!-- HEADER -->
    <header v-if="showNav" class="main-header">
      <div class="header-content">
        
        <router-link to="/" class="brand-section">
          <img :src="ueesLogo" alt="UEES" class="header-logo" />
          <div class="brand-divider"></div>
          <span class="brand-name">Sistema de Solicitudes</span>
        </router-link>

        <nav class="nav-links">
          <router-link v-if="auth.rol === 'admin'" to="/admin">Dashboard</router-link>
          <router-link v-if="auth.rol === 'admin'" to="/admin/formularios">Gestionar Formularios</router-link>
          
          <!-- NUEVO ENLACE AGREGADO AQUI -->
          <router-link v-if="auth.rol === 'admin'" to="/admin/usuarios">Usuarios</router-link>
          
          <router-link v-if="auth.rol === 'interno'" to="/interno">Bandeja de Entrada</router-link>
        </nav>

        <div class="user-section">
          
          <!-- CAMPANITA DE NOTIFICACIONES -->
          <div class="notif-container">
            <button class="btn-notif" @click="mostrarNotificaciones = !mostrarNotificaciones">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span v-if="noLeidas > 0" class="notif-badge">{{ noLeidas }}</span>
            </button>

            <!-- MENU DESPLEGABLE DE NOTIFICACIONES -->
            <div v-if="mostrarNotificaciones" class="notif-dropdown">
              <div class="notif-header">
                <h4>Notificaciones</h4>
                <button v-if="noLeidas > 0" @click="marcarTodasLeidas" class="btn-mark-read">Marcar leídas</button>
              </div>
              <div class="notif-list">
                <div v-if="notificaciones.length === 0" class="notif-empty">
                  No tienes notificaciones
                </div>
                
                <!-- CAMBIO AQUI: Usamos router-link en lugar de div -->
                <router-link 
                  v-for="n in notificaciones" 
                  :key="n.id" 
                  :to="n.link"
                  @click="marcarLeida(n)"
                  class="notif-item"
                  :class="{ 'unread': !n.isRead }"
                >
                  <div class="notif-icon" :class="{ 'unread-icon': !n.isRead }">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div class="notif-body">
                    <p class="notif-title">{{ n.title }}</p>
                    <p class="notif-msg">{{ n.message }}</p>
                    <p class="notif-date">{{ new Date(n.createdAt).toLocaleString() }}</p>
                  </div>
                </router-link>
              </div>
            </div>
          </div>
          <!-- FIN CAMPANITA -->

          <span class="user-name">{{ auth.user?.nombre }} <span class="user-role">({{ auth.rol }})</span></span>
          <button @click="logout" class="btn-logout">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="logout-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Salir
          </button>
        </div>
      </div>
      <div class="header-accent"></div>
    </header>
    
    <main class="main-content">
      <router-view />
    </main>

    <footer class="main-footer">
      <div class="footer-content">
        <div class="footer-left">
          <p class="university-name">Universidad Evangélica de El Salvador</p>
          <p class="copyright">© {{ new Date().getFullYear() }} Todos los derechos reservados</p>
        </div>
        <div class="footer-right">
          <img :src="dteLogo" alt="Dirección de Tecnología Educativa" class="footer-logo" />
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* Estilos Globales */
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; background-color: #f4f7f9; color: #334155; }
.app-container { display: flex; flex-direction: column; min-height: 100vh; }

/* HEADER */
.main-header { background: white; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.header-content { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 2rem; box-sizing: border-box; }
.brand-section { display: flex; align-items: center; gap: 1rem; text-decoration: none; cursor: pointer; }
.header-logo { height: 45px; object-fit: contain; }
.brand-divider { width: 1px; height: 24px; background: #cbd5e1; }
.brand-name { font-weight: 700; font-size: 1.1rem; color: #1e293b; letter-spacing: 0.5px; }

/* NAVEGACION */
.nav-links { display: flex; gap: 2rem; }
.nav-links a { color: #64748b; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: color 0.2s; padding: 0.5rem 0; border: none !important; background: transparent !important; outline: none !important; }
.nav-links a:hover { color: #1e293b; }
.nav-links a.router-link-active { color: #1e293b; border-bottom: 3px solid #FBDA05 !important; }

/* SECCION USUARIO Y NOTIFICACIONES */
.user-section { display: flex; align-items: center; gap: 1.5rem; }
.user-name { font-size: 0.9rem; color: #1e293b; font-weight: 600; }
.user-role { color: #64748b; font-weight: 400; font-size: 0.85rem; text-transform: capitalize; }

/* ESTILOS DE LA CAMPANITA */
.notif-container { position: relative; }
.btn-notif { background: transparent; border: none; cursor: pointer; position: relative; padding: 0.5rem; color: #64748b; transition: color 0.2s; display: flex; align-items: center; }
.btn-notif:hover { color: #074E8C; }
.btn-notif svg { width: 1.5rem; height: 1.5rem; }

.notif-badge { position: absolute; top: 0; right: 0; background: #ef4444; color: white; font-size: 0.7rem; font-weight: bold; width: 1.2rem; height: 1.2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; }

.notif-dropdown { position: absolute; top: 100%; right: -2rem; width: 350px; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; margin-top: 1rem; z-index: 100; overflow: hidden; }
.notif-header { padding: 1rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
.notif-header h4 { margin: 0; font-size: 0.95rem; color: #1e293b; }
.btn-mark-read { background: transparent; border: none; color: #074E8C; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-mark-read:hover { text-decoration: underline; }

.notif-list { max-height: 400px; overflow-y: auto; }
.notif-empty { padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.9rem; }

/* CAMBIO AQUI: Quitamos estilos de texto por defecto para el router-link */
.notif-item { display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; text-decoration: none; color: inherit; }
.notif-item:hover { background: #f8fafc; }
.notif-item.unread { background: #eff6ff; }
.notif-item.unread:hover { background: #dbeafe; }

.notif-icon { width: 2rem; height: 2rem; border-radius: 50%; background: #f1f5f9; color: #94a3b8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.notif-icon.unread-icon { background: #074E8C; color: white; }
.notif-icon svg { width: 1.2rem; height: 1.2rem; }

.notif-body p { margin: 0; }
.notif-title { font-size: 0.9rem; font-weight: 700; color: #1e293b; }
.notif-msg { font-size: 0.85rem; color: #475569; margin-top: 0.2rem !important; line-height: 1.3; }
.notif-date { font-size: 0.75rem; color: #94a3b8; margin-top: 0.4rem !important; }

/* BOTON SALIR */
.btn-logout { display: flex; align-items: center; gap: 0.5rem; background: white; border: 1px solid #cbd5e1; color: #475569; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
.btn-logout:hover { background: #f8fafc; border-color: #94a3b8; color: #1e293b; }
.logout-icon { width: 1.1rem; height: 1.1rem; }

.header-accent { height: 4px; background: #FBDA05; width: 100%; }

/* CONTENIDO PRINCIPAL */
.main-content { flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 2rem; box-sizing: border-box; }

/* FOOTER */
.main-footer { background: #f1f5f9; border-top: 1px solid #e2e8f0; padding: 2rem; margin-top: auto; }
.footer-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
.footer-left { display: flex; flex-direction: column; gap: 0.25rem; }
.university-name { margin: 0; font-weight: 700; color: #475569; font-size: 0.95rem; }
.copyright { margin: 0; color: #94a3b8; font-size: 0.85rem; }
.footer-right { display: flex; align-items: center; }
.footer-logo { height: 45px; object-fit: contain; opacity: 0.8; }

@media (max-width: 768px) {
  .header-content { flex-direction: column; gap: 1rem; padding: 1rem; }
  .brand-divider { display: none; }
  .nav-links { width: 100%; justify-content: center; flex-wrap: wrap; gap: 1rem; }
  .user-section { width: 100%; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
  .footer-content { flex-direction: column; text-align: center; }
  .notif-dropdown { right: -1rem; width: 300px; }
}
</style>