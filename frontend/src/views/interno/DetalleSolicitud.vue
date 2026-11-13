<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { requestsApi } from '../../api/requests';
import { formsApi } from '../../api/forms';

const route = useRoute();
const data = ref<any>(null);
const formTitle = ref<string>('Cargando...');
const error = ref('');
const nuevoEstado = ref('');
const comentario = ref('');
const actualizando = ref(false);

// Agrupamos los campos por secciones
const groups = computed(() => {
  if (!data.value) return [];
  const fields = data.value.formDefinition.schemaJson.fields.filter((f: any) => f.type !== 'info');
  const g = fields.map((f: any) => f.group || 'Información General');
  return [...new Set(g)] as string[];
});

function fieldsForGroup(groupName: string) {
  if (!data.value) return [];
  return data.value.formDefinition.schemaJson.fields.filter(
    (f: any) => (f.group || 'Información General') === groupName && f.type !== 'info'
  );
}

async function cargar() {
  try {
    data.value = await requestsApi.get(route.params.id as string);
    
    // Buscamos el título real del formulario
    const forms = await formsApi.list();
    const form = forms.find((f: any) => f.id === data.value.formDefinitionId);
    if (form) formTitle.value = form.titulo;

    const transiciones = data.value.formDefinition?.schemaJson?.transiciones ?? {};
    const permitidas: string[] = transiciones[data.value.estado] ?? [];
    nuevoEstado.value = permitidas[0] ?? '';
  } catch {
    error.value = 'No se pudo cargar la solicitud';
  }
}

async function cambiarEstado() {
  if (!nuevoEstado.value) return;
  error.value = '';
  actualizando.value = true;
  try {
    await requestsApi.changeStatus(data.value.id, nuevoEstado.value, comentario.value || undefined);
    comentario.value = '';
    await cargar();
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Error al cambiar estado';
  } finally {
    actualizando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="container">
    <router-link to="/interno" class="back">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="back-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Volver a la bandeja
    </router-link>
    
    <div v-if="data" class="detail-layout">
      
      <!-- Panel Izquierdo: Información del Formulario -->
      <div class="info-panel">
        <div class="panel-header">
          <div class="title-area">
            <h1>{{ formTitle }}</h1>
            <span class="id-badge">#{{ data.id.slice(0, 8) }}</span>
          </div>
          <span class="status-badge" :class="data.estado">{{ data.estado }}</span>
        </div>
        
        <div class="user-info-card">
          <div class="user-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div class="user-details">
            <h3>{{ data.solicitante?.nombre }}</h3>
            <p>{{ data.solicitante?.email }}</p>
            <p class="date-text">Enviado el {{ new Date(data.createdAt).toLocaleString() }}</p>
          </div>
        </div>

        <!-- Renderizado de los campos agrupados -->
        <div v-for="group in groups" :key="group" class="data-section">
          <h3 class="section-title">{{ group }}</h3>
          <div class="data-grid">
            <template v-for="field in fieldsForGroup(group)" :key="field.name">
              <div class="data-item">
                <span class="data-label">{{ field.label }}</span>
                <span class="data-value">
                  <template v-if="field.type === 'file' && data.payload[field.name]">
                    <a :href="data.payload[field.name]" target="_blank" class="btn-download">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Ver / Descargar
                    </a>
                  </template>
                  <template v-else>
                    {{ data.payload[field.name] || 'N/A' }}
                  </template>
                </span>
              </div>
            </template>
          </div>
        </div>

      </div>

      <!-- Panel Derecho: Acciones e Historial -->
      <div class="action-panel">
        <div class="action-box">
          <h3 class="section-title">Gestión de Estado</h3>
          
          <label class="action-label">Nuevo Estado</label>
          <select v-model="nuevoEstado" class="input-control">
            <option value="">Selecciona un estado...</option>
            <option v-for="est in data.formDefinition.schemaJson.transiciones[data.estado] ?? []" :key="est" :value="est">
              Marcar como {{ est }}
            </option>
          </select>
          
          <label class="action-label" style="margin-top: 1rem;">Comentario (Opcional)</label>
          <textarea v-model="comentario" placeholder="Escribe una observación o justificación..." class="input-control" rows="3"></textarea>
          
          <button @click="cambiarEstado" class="btn-primary" :disabled="!nuevoEstado || actualizando">
            {{ actualizando ? 'Procesando...' : 'Aplicar Cambio' }}
          </button>
          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <div class="history-box">
          <h3 class="section-title">Historial</h3>
          <ul class="timeline">
            <li v-for="h in data.historial" :key="h.id" class="timeline-item">
              <div class="timeline-dot" :class="h.estadoNuevo"></div>
              <div class="timeline-content">
                <div class="timeline-date">{{ new Date(h.createdAt).toLocaleString() }}</div>
                
                <!-- TEXTO DEL HISTORIAL (Diferencia entre Evaluacion y Solicitud) -->
                <div class="timeline-text">
                  <template v-if="formTitle.includes('Evaluación')">
                    La evaluación ha sido <strong>{{ h.estadoNuevo }}</strong>
                  </template>
                  <template v-else>
                    La solicitud pasó a estado <strong>{{ h.estadoNuevo }}</strong>
                  </template>
                </div>

                <div v-if="h.comentario" class="timeline-comment">
                  "{{ h.comentario }}"
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

    </div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else class="loading">Cargando solicitud...</p>
  </div>
</template>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 1rem; }

.back { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; color: #64748b; text-decoration: none; font-weight: 500; transition: color 0.2s; }
.back:hover { color: #074E8C; }
.back-icon { width: 1.2rem; height: 1.2rem; }

.detail-layout { display: grid; grid-template-columns: 1fr; gap: 2rem; }
@media (min-width: 1000px) { .detail-layout { grid-template-columns: 2fr 1fr; align-items: start; } }

/* PANEL IZQUIERDO */
.info-panel { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }

.panel-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
.title-area h1 { margin: 0 0 0.5rem 0; color: #074E8C; font-size: 1.8rem; font-weight: 800; line-height: 1.2; }
.id-badge { background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 6px; font-family: monospace; color: #64748b; font-size: 0.85rem; }

.user-info-card { display: flex; gap: 1rem; background: #f8fafc; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 2rem; }
.user-icon { width: 3rem; height: 3rem; background: #e0f2fe; color: #074E8C; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.user-icon svg { width: 1.5rem; height: 1.5rem; }
.user-details h3 { margin: 0 0 0.25rem 0; color: #1e293b; font-size: 1.1rem; }
.user-details p { margin: 0; color: #64748b; font-size: 0.95rem; }
.user-details .date-text { margin-top: 0.5rem; font-size: 0.85rem; color: #94a3b8; }

.data-section { margin-bottom: 2rem; }
.section-title { color: #1e293b; font-size: 1.1rem; font-weight: 700; margin-top: 0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.section-title::before { content: ''; display: block; width: 4px; height: 16px; background: #FBDA05; border-radius: 2px; }

.data-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
@media (min-width: 640px) { .data-grid { grid-template-columns: 1fr 1fr; } }

.data-item { display: flex; flex-direction: column; gap: 0.25rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; }
.data-label { font-size: 0.8rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
.data-value { font-size: 1rem; color: #1e293b; font-weight: 500; }

.btn-download { display: inline-flex; align-items: center; gap: 0.4rem; color: #074E8C; font-weight: 600; text-decoration: none; background: #eff6ff; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #bfdbfe; transition: background 0.2s; width: fit-content; margin-top: 0.25rem; font-size: 0.9rem; }
.btn-download:hover { background: #dbeafe; }
.btn-download svg { width: 1.1rem; height: 1.1rem; }

/* PANEL DERECHO */
.action-panel { display: flex; flex-direction: column; gap: 2rem; }

.action-box, .history-box { background: white; padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }

.action-label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.4rem; }
.input-control { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 0.95rem; box-sizing: border-box; }
.input-control:focus { outline: none; border-color: #074E8C; box-shadow: 0 0 0 3px rgba(7,78,140,0.1); }

.btn-primary { width: 100%; margin-top: 1rem; padding: 0.875rem; background: #074E8C; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #053b6a; }
.btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }

/* Timeline */
.timeline { padding-left: 0; list-style: none; margin: 0; position: relative; }
.timeline::before { content: ''; position: absolute; top: 0; bottom: 0; left: 5px; width: 2px; background: #e2e8f0; }
.timeline-item { position: relative; padding-left: 1.5rem; margin-bottom: 1.5rem; }
.timeline-item:last-child { margin-bottom: 0; }
.timeline-dot { position: absolute; left: 0; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; border: 2px solid white; box-shadow: 0 0 0 2px #e2e8f0; }
.timeline-dot.recibido { background: #eab308; }
.timeline-dot.aprobado { background: #22c55e; }
.timeline-dot.observado { background: #f97316; }
.timeline-dot.finalizado { background: #64748b; }

.timeline-date { font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.2rem; }
.timeline-text { font-size: 0.95rem; color: #334155; }
.timeline-comment { margin-top: 0.5rem; font-size: 0.9rem; color: #475569; background: #f8fafc; padding: 0.75rem; border-radius: 8px; border-left: 3px solid #FBDA05; font-style: italic; }

/* Badges y Estados */
.status-badge { padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.recibido { background: #fef08a; color: #854d0e; }
.observado { background: #fed7aa; color: #9a3412; }
.aprobado { background: #bbf7d0; color: #166534; }
.finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

.loading { text-align: center; padding: 4rem; color: #64748b; }
.error { color: #dc2626; background: #fef2f2; padding: 1rem; border-radius: 8px; border: 1px solid #fecaca; margin-top: 1rem; text-align: center; }
</style>