<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { requestsApi } from '../../api/requests';

const solicitudes = ref<any[]>([]);
const cargando = ref(true);
const filtro = ref('todas');

async function cargar() {
  cargando.value = true;
  try {
    solicitudes.value = await requestsApi.list();
  } finally {
    cargando.value = false;
  }
}

// Contadores para las tarjetas de KPIs
const stats = computed(() => {
  const total = solicitudes.value.length;
  const recibidas = solicitudes.value.filter(s => s.estado === 'recibido').length;
  const observadas = solicitudes.value.filter(s => s.estado === 'observado').length;
  const aprobadas = solicitudes.value.filter(s => s.estado === 'aprobado').length;
  return { total, recibidas, observadas, aprobadas };
});

// Filtrar la tabla
const solicitudesFiltradas = computed(() => {
  if (filtro.value === 'todas') return solicitudes.value;
  return solicitudes.value.filter(s => s.estado === filtro.value);
});

// Obtener iniciales para el avatar
function getInitials(nombre: string) {
  if (!nombre) return '?';
  const parts = nombre.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
}

onMounted(cargar);
</script>

<template>
  <div class="container">
    
    <!-- Header -->
    <div class="header-section">
      <h1>Bandeja de Entrada</h1>
      <p class="subtitle">Gestiona y revisa las solicitudes que tienes asignadas.</p>
    </div>

    <div v-if="cargando" class="loading">Cargando bandeja...</div>

    <div v-else>
      <!-- Tarjetas de KPI -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon blue">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div class="kpi-info">
            <p class="kpi-title">Total</p>
            <p class="kpi-value">{{ stats.total }}</p>
          </div>
        </div>
        
        <div class="kpi-card">
          <div class="kpi-icon yellow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div class="kpi-info">
            <p class="kpi-title">Recibidas</p>
            <p class="kpi-value">{{ stats.recibidas }}</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon orange">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div class="kpi-info">
            <p class="kpi-title">Observadas</p>
            <p class="kpi-value">{{ stats.observadas }}</p>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon green">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div class="kpi-info">
            <p class="kpi-title">Aprobadas</p>
            <p class="kpi-value">{{ stats.aprobadas }}</p>
          </div>
        </div>
      </div>

      <!-- Panel Principal -->
      <div class="panel">
        
        <!-- Pestañas de Filtro -->
        <div class="tabs">
          <button :class="{ active: filtro === 'todas' }" @click="filtro = 'todas'">Todas</button>
          <button :class="{ active: filtro === 'recibido' }" @click="filtro = 'recibido'">Recibidas</button>
          <button :class="{ active: filtro === 'observado' }" @click="filtro = 'observado'">Observadas</button>
          <button :class="{ active: filtro === 'aprobado' }" @click="filtro = 'aprobado'">Aprobadas</button>
        </div>

        <!-- Tabla -->
        <div v-if="solicitudesFiltradas.length === 0" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          <p>No hay solicitudes en este estado.</p>
        </div>

        <div v-else class="table-responsive">
          <table class="modern-table">
            <thead>
              <tr>
                <th>Solicitante</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th class="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in solicitudesFiltradas" :key="s.id">
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ getInitials(s.solicitanteNombre) }}</div>
                    <div class="user-info">
                      <span class="user-name">{{ s.solicitanteNombre || 'Desconocido' }}</span>
                      <span class="user-email">{{ s.solicitanteEmail }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="date-text">{{ new Date(s.createdAt).toLocaleDateString() }}</span>
                  <span class="time-text">{{ new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
                </td>
                <td><span class="status-badge" :class="s.estado">{{ s.estado }}</span></td>
                <td class="text-right">
                  <router-link :to="`/interno/${s.id}`" class="btn-action">Revisar</router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 1rem; }

.header-section { margin-bottom: 2rem; }
.header-section h1 { color: #074E8C; font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem 0; }
.subtitle { color: #64748b; font-size: 1.05rem; margin: 0; }

/* Tarjetas KPI */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
.kpi-card { background: white; padding: 1.5rem; border-radius: 16px; display: flex; align-items: center; gap: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.kpi-icon { width: 3rem; height: 3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.kpi-icon svg { width: 1.5rem; height: 1.5rem; }
.kpi-icon.blue { background: #eff6ff; color: #074E8C; }
.kpi-icon.yellow { background: #fefce8; color: #ca8a04; }
.kpi-icon.orange { background: #fff7ed; color: #ea580c; }
.kpi-icon.green { background: #f0fdf4; color: #16a34a; }
.kpi-info { display: flex; flex-direction: column; }
.kpi-title { margin: 0; color: #64748b; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.kpi-value { margin: 0; color: #1e293b; font-size: 1.8rem; font-weight: 800; line-height: 1; }

/* Panel Principal */
.panel { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; overflow: hidden; }

/* Tabs de Filtro */
.tabs { display: flex; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; background: #f8fafc; flex-wrap: wrap; }
.tabs button { background: transparent; border: none; padding: 0.5rem 1rem; font-size: 0.95rem; font-weight: 600; color: #64748b; cursor: pointer; border-radius: 8px; transition: all 0.2s; }
.tabs button:hover { background: #e2e8f0; color: #1e293b; }
.tabs button.active { background: white; color: #074E8C; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

/* Tabla Moderna */
.table-responsive { overflow-x: auto; }
.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; padding: 1rem 1.5rem; color: #64748b; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
.modern-table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }

/* Celda de Usuario */
.user-cell { display: flex; align-items: center; gap: 1rem; }
.avatar { width: 2.5rem; height: 2.5rem; background: #e0f2fe; color: #074E8C; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; flex-shrink: 0; }
.user-info { display: flex; flex-direction: column; gap: 0.15rem; }
.user-name { color: #1e293b; font-weight: 600; font-size: 0.95rem; }
.user-email { color: #64748b; font-size: 0.85rem; }

/* Fecha */
.date-text { display: block; color: #1e293b; font-weight: 600; font-size: 0.9rem; }
.time-text { display: block; color: #94a3b8; font-size: 0.8rem; margin-top: 0.1rem; }

/* Badges de Estado */
.status-badge { display: inline-block; padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.recibido { background: #fef08a; color: #854d0e; }
.observado { background: #fed7aa; color: #9a3412; }
.aprobado { background: #bbf7d0; color: #166534; }
.finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

/* Boton de accion */
.btn-action { display: inline-block; background: #074E8C; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; }
.btn-action:hover { background: #053b6a; }
.text-right { text-align: right; }

.empty-state { text-align: center; padding: 4rem 2rem; color: #94a3b8; }
.empty-state svg { width: 3rem; height: 3rem; margin-bottom: 1rem; color: #cbd5e1; }
.loading { text-align: center; padding: 4rem; color: #64748b; font-size: 1.1rem; }
</style>