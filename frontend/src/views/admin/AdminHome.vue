<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { formsApi } from '../../api/forms';
import { requestsApi } from '../../api/requests';

const formularios = ref<any[]>([]);
const solicitudes = ref<any[]>([]);
const cargando = ref(true);

// Estados para la ventana modal
const mostrarModal = ref(false);
const formSeleccionado = ref<any>(null);
const solicitudesFiltradas = ref<any[]>([]);

onMounted(async () => {
  try {
    const [f, s] = await Promise.all([formsApi.list(), requestsApi.list()]);
    formularios.value = f;
    solicitudes.value = s;
  } finally {
    cargando.value = false;
  }
});

const totalSolicitudes = computed(() => solicitudes.value.length);

const solicitudesPorFormulario = computed(() => {
  return formularios.value.map(form => {
    const cantidad = solicitudes.value.filter(s => s.formDefinitionId === form.id).length;
    return {
      id: form.id,
      titulo: form.titulo,
      cantidad: cantidad
    };
  });
});

// Funcion que se ejecuta al dar clic en una tarjeta
function abrirModal(formulario: any) {
  formSeleccionado.value = formulario;
  // Filtramos las solicitudes que pertenecen a este formulario
  solicitudesFiltradas.value = solicitudes.value.filter(
    s => s.formDefinitionId === formulario.id
  );
  mostrarModal.value = true;
}
</script>

<template>
  <div class="container">
    <div class="header-section">
      <h1>Panel de Administrador</h1>
      <p class="subtitle">Resumen general del sistema de solicitudes.</p>
    </div>

    <div v-if="cargando" class="loading">Cargando métricas...</div>

    <div v-else class="dashboard-content">
      
      <!-- Tarjeta Principal -->
      <div class="hero-card">
        <div class="hero-info">
          <h2>Solicitudes Totales Recibidas</h2>
          <p class="hero-number">{{ totalSolicitudes }}</p>
          <p class="hero-desc">En todos los formularios del sistema</p>
        </div>
        <div class="hero-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
      </div>

      <!-- Grid de Métricas por Formulario (Ahora son clickeables) -->
      <h3 class="section-title">Solicitudes por Categoría</h3>
      <div class="stats-grid">
        <div 
          v-for="form in solicitudesPorFormulario" 
          :key="form.id" 
          class="stat-card"
          @click="abrirModal(form)"
        >
          <div class="stat-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <div class="stat-info">
            <h4>{{ form.titulo }}</h4>
            <p class="stat-number">{{ form.cantidad }}</p>
          </div>
        </div>
      </div>

      <div class="actions-section">
        <router-link to="/admin/formularios" class="btn-action">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Gestionar Formularios
        </router-link>
      </div>

    </div>

    <!-- VENTANA MODAL DE SOLICITUDES -->
    <div v-if="mostrarModal" class="modal-overlay" @click.self="mostrarModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Solicitudes: {{ formSeleccionado?.titulo }}</h2>
          <button @click="mostrarModal = false" class="btn-close">&times;</button>
        </div>
        
        <div class="modal-body">
          <div v-if="solicitudesFiltradas.length === 0" class="empty-modal">
            No hay solicitudes registradas en esta categoría todavía.
          </div>
          
          <table v-else class="modal-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>ID Solicitud</th>
                <th>Estado</th>
                <th class="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in solicitudesFiltradas" :key="s.id">
                <td>{{ new Date(s.createdAt).toLocaleDateString() }}</td>
                <td><code class="id-badge">#{{ s.id.slice(0, 8) }}</code></td>
                <td><span class="status-badge" :class="s.estado">{{ s.estado }}</span></td>
                <td class="text-right">
                  <router-link :to="`/interno/${s.id}`" class="btn-revisar">Revisar</router-link>
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
.container { max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 1rem; }
.header-section { margin-bottom: 2rem; }
.header-section h1 { color: #074E8C; font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem 0; }
.subtitle { color: #64748b; font-size: 1.05rem; margin: 0; }

/* Tarjeta Principal */
.hero-card { background: linear-gradient(135deg, #074E8C 0%, #0a64b5 100%); border-radius: 20px; padding: 2.5rem; display: flex; justify-content: space-between; align-items: center; color: white; box-shadow: 0 10px 25px -5px rgba(7, 78, 140, 0.4); margin-bottom: 3rem; }
.hero-info h2 { margin: 0; font-size: 1.25rem; font-weight: 500; opacity: 0.9; }
.hero-number { margin: 0.5rem 0; font-size: 4rem; font-weight: 800; line-height: 1; letter-spacing: -2px; }
.hero-desc { margin: 0; font-size: 0.95rem; opacity: 0.8; }
.hero-icon { width: 5rem; height: 5rem; background: rgba(255, 255, 255, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.hero-icon svg { width: 2.5rem; height: 2.5rem; color: white; }

/* Seccion de estadisticas */
.section-title { color: #1e293b; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
.section-title::before { content: ''; display: block; width: 6px; height: 20px; background: #FBDA05; border-radius: 4px; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 3rem; }

.stat-card { background: white; border-radius: 16px; padding: 1.5rem; display: flex; align-items: center; gap: 1.25rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: all 0.2s; cursor: pointer; }
.stat-card:hover { transform: translateY(-3px); border-color: #074E8C; box-shadow: 0 10px 15px -3px rgba(7,78,140,0.1); }

.stat-icon-wrapper { width: 3rem; height: 3rem; background: #eff6ff; color: #074E8C; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-icon-wrapper svg { width: 1.5rem; height: 1.5rem; }
.stat-info h4 { margin: 0 0 0.25rem 0; color: #64748b; font-size: 0.9rem; font-weight: 600; line-height: 1.2; }
.stat-number { margin: 0; font-size: 1.8rem; font-weight: 800; color: #1e293b; line-height: 1; }

/* Acciones */
.actions-section { display: flex; justify-content: flex-start; }
.btn-action { display: inline-flex; align-items: center; gap: 0.75rem; background: white; color: #074E8C; padding: 0.875rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 700; border: 1px solid #cbd5e1; transition: all 0.2s; }
.btn-action:hover { border-color: #074E8C; background: #eff6ff; }
.btn-icon { width: 1.25rem; height: 1.25rem; }

/* MODAL (Ventana Flotante) */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
.modal-content { background: white; border-radius: 16px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { margin: 0; color: #074E8C; font-size: 1.3rem; }
.btn-close { background: transparent; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; transition: color 0.2s; }
.btn-close:hover { color: #ef4444; }
.modal-body { padding: 1.5rem; overflow-y: auto; }

.modal-table { width: 100%; border-collapse: collapse; }
.modal-table th { text-align: left; padding: 0.75rem; color: #64748b; font-size: 0.8rem; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.modal-table td { padding: 1rem 0.75rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
.text-right { text-align: right; }

.id-badge { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; color: #64748b; font-size: 0.85rem; }
.status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
.recibido { background: #fef08a; color: #854d0e; }
.observado { background: #fed7aa; color: #9a3412; }
.aprobado { background: #bbf7d0; color: #166534; }
.finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

.btn-revisar { background: #074E8C; color: white; padding: 0.4rem 0.8rem; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: background 0.2s; }
.btn-revisar:hover { background: #053b6a; }
.empty-modal { text-align: center; padding: 3rem; color: #64748b; }
</style>