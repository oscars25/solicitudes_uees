<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { requestsApi } from '../../api/requests';
import { formsApi } from '../../api/forms';
import { api } from '../../api/client'; 
import DynamicForm from '../../components/DynamicForm.vue';

const route = useRoute();
const router = useRouter();
const data = ref<any>(null);
const formTitle = ref<string>('Cargando...');
const error = ref('');
const enviando = ref(false);

async function cargar() {
  try {
    data.value = await requestsApi.get(route.params.id as string);
    
    const forms = await formsApi.list();
    const form = forms.find((f: any) => f.id === data.value.formDefinitionId);
    if (form) formTitle.value = form.titulo;

  } catch {
    error.value = 'No se pudo cargar la solicitud';
  }
}

async function reenviar(payload: Record<string, any>) {
  enviando.value = true;
  error.value = '';
  try {
    await requestsApi.resubmit(data.value.id, payload);
    router.push('/solicitudes');
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Error al reenviar';
  } finally {
    enviando.value = false;
  }
}

async function descargarPdf() {
  try {
    const response = await api.get(`/requests/${data.value.id}/pdf`, {
      responseType: 'blob', 
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Solicitud-${data.value.id.slice(0, 8)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    alert('Error al descargar el PDF. Asegúrate de que el backend esté funcionando.');
  }
}

onMounted(cargar);
</script>

<template>
  <div class="container">
    <router-link to="/solicitudes" class="back">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="back-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      Volver a mis solicitudes
    </router-link>
    
    <div v-if="data" class="layout">
      
      <!-- PANEL IZQUIERDO: Historial y Estado -->
      <div class="info-panel">
        <div class="header-title">
          <h1>{{ formTitle }}</h1>
          <span class="id-badge">#{{ data.id.slice(0, 8) }}</span>
        </div>
        
        <!-- Fila del estado y boton PDF (El boton solo se muestra si esta aprobado o finalizado) -->
        <div class="status-row">
          <div class="status-info">
            <span class="status-label">Estado actual:</span>
            <span class="status-badge" :class="data.estado">{{ data.estado }}</span>
          </div>
          
          <button 
            v-if="data.estado === 'aprobado' || data.estado === 'finalizado'"
            @click="descargarPdf" 
            class="btn-pdf"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Descargar PDF
          </button>
        </div>

        <!-- AVISO VERDE DE APROBACION -->
        <div v-if="data.estado === 'aprobado'" class="alert-success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="alert-icon-success"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <h3>¡Tu solicitud ha sido aprobada!</h3>
            <p>El personal de la DTE ha validado tu solicitud. Ya puedes descargar el documento oficial en formato PDF.</p>
          </div>
        </div>

        <div class="divider"></div>
        
        <h3 class="section-title">Historial</h3>
        <ul class="timeline">
          <li v-for="h in data.historial" :key="h.id" class="timeline-item">
            <div class="timeline-dot" :class="h.estadoNuevo"></div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="time">{{ new Date(h.createdAt).toLocaleString() }}</span>
              </div>
              
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
                {{ h.comentario }}
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- PANEL DERECHO: Formulario o Datos Enviados -->
      <div class="action-panel">
        
        <div v-if="data.estado === 'observado'" class="edit-mode">
          <div class="alert-observado">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="alert-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div>
              <h3>Atención requerida</h3>
              <p>Por favor, lee las observaciones en el historial, corrige los datos y vuelve a enviar la solicitud.</p>
            </div>
          </div>
          
          <DynamicForm 
            :schema="data.formDefinition.schemaJson" 
            :initialData="data.payload"
            @submit="reenviar" 
          />
          <p v-if="error" class="error">{{ error }}</p>
        </div>

        <div v-else class="read-mode">
          <h3 class="section-title">Datos Enviados</h3>
          
          <div class="data-grid">
            <template v-for="field in data.formDefinition.schemaJson.fields" :key="field.name">
              <template v-if="field.type !== 'info'">
                <div class="data-item">
                  <span class="data-label">{{ field.label }}</span>
                  <span class="data-value">
                    <template v-if="field.type === 'file' && data.payload[field.name]">
                      <a :href="data.payload[field.name]" target="_blank" class="btn-download">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Descargar archivo
                      </a>
                    </template>
                    <template v-else>
                      {{ data.payload[field.name] || 'N/A' }}
                    </template>
                  </span>
                </div>
              </template>
            </template>
          </div>
        </div>

      </div>
    </div>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else class="loading">Cargando tu solicitud...</p>
  </div>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 1rem; }

.back { display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; color: #64748b; text-decoration: none; font-weight: 500; transition: color 0.2s; }
.back:hover { color: #074E8C; }
.back-icon { width: 1.2rem; height: 1.2rem; }

.layout { display: grid; grid-template-columns: 1fr; gap: 2rem; }
@media (min-width: 900px) { .layout { grid-template-columns: 350px 1fr; } }

.info-panel, .action-panel { 
  background: white; 
  padding: 2rem; 
  border-radius: 16px; 
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); 
  border: 1px solid #e2e8f0; 
}

/* Panel Izquierdo */
.header-title { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
.header-title h1 { color: #074E8C; font-size: 1.5rem; font-weight: 800; margin: 0; line-height: 1.2; }
.id-badge { background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 6px; font-family: monospace; color: #64748b; font-size: 0.8rem; width: fit-content; }

/* Status Row y Boton PDF */
.status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.status-info { display: flex; align-items: center; gap: 1rem; }
.status-label { color: #64748b; font-size: 0.9rem; font-weight: 600; }

.btn-pdf { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.4rem; 
  background: #f8fafc; 
  border: 1px solid #cbd5e1; 
  color: #074E8C; 
  padding: 0.5rem 1rem; 
  border-radius: 8px; 
  font-weight: 600; 
  font-size: 0.85rem; 
  cursor: pointer; 
  transition: all 0.2s; 
}
.btn-pdf:hover { background: #eff6ff; border-color: #074E8C; }
.btn-pdf svg { width: 1.1rem; height: 1.1rem; }

/* Aviso de Aprobado */
.alert-success { display: flex; gap: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1.25rem; border-radius: 12px; color: #15803d; margin-bottom: 1.5rem; }
.alert-icon-success { width: 2rem; height: 2rem; flex-shrink: 0; color: #16a34a; }
.alert-success h3 { margin: 0 0 0.25rem 0; font-size: 1rem; font-weight: 700; }
.alert-success p { margin: 0; font-size: 0.9rem; line-height: 1.5; }

.divider { height: 1px; background: #e2e8f0; margin-bottom: 1.5rem; }

.section-title { color: #1e293b; font-size: 1.1rem; font-weight: 700; margin-top: 0; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
.section-title::before { content: ''; display: block; width: 4px; height: 16px; background: #FBDA05; border-radius: 2px; }

/* Timeline */
.timeline { padding-left: 0; list-style: none; margin: 0; position: relative; }
.timeline::before { content: ''; position: absolute; top: 0; bottom: 0; left: 5px; width: 2px; background: #e2e8f0; }
.timeline-item { position: relative; padding-left: 1.5rem; margin-bottom: 1.5rem; }
.timeline-dot { position: absolute; left: 0; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; border: 2px solid white; box-shadow: 0 0 0 2px #e2e8f0; }
.timeline-dot.recibido { background: #eab308; }
.timeline-dot.aprobado { background: #22c55e; }
.timeline-dot.observado { background: #f97316; }
.timeline-dot.finalizado { background: #64748b; }

.time { font-size: 0.8rem; color: #94a3b8; }
.timeline-text { font-size: 0.95rem; color: #334155; margin-top: 0.25rem; }
.timeline-comment { margin-top: 0.5rem; font-size: 0.9rem; color: #475569; background: #f8fafc; padding: 0.75rem; border-radius: 8px; border-left: 3px solid #FBDA05; font-style: italic; }

/* Panel Derecho (Lectura) */
.data-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
@media (min-width: 640px) { .data-grid { grid-template-columns: 1fr 1fr; } }

.data-item { display: flex; flex-direction: column; gap: 0.3rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem; }
.data-label { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.data-value { font-size: 0.95rem; color: #1e293b; font-weight: 500; }

.btn-download { display: inline-flex; align-items: center; gap: 0.4rem; color: #074E8C; font-weight: 600; text-decoration: none; background: #eff6ff; padding: 0.4rem 0.8rem; border-radius: 6px; border: 1px solid #bfdbfe; transition: background 0.2s; width: fit-content; margin-top: 0.25rem; font-size: 0.9rem; }
.btn-download:hover { background: #dbeafe; }
.btn-download svg { width: 1.1rem; height: 1.1rem; }

/* Panel Derecho (Edicion / Observado) */
.edit-mode { display: flex; flex-direction: column; gap: 2rem; }
.alert-observado { display: flex; gap: 1rem; background: #fffbeb; border: 1px solid #fde68a; padding: 1.25rem; border-radius: 12px; color: #b45309; }
.alert-icon { width: 2rem; height: 2rem; flex-shrink: 0; }
.alert-observado h3 { margin: 0 0 0.25rem 0; font-size: 1rem; font-weight: 700; }
.alert-observado p { margin: 0; font-size: 0.9rem; line-height: 1.5; }

/* Badges */
.status-badge { padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.recibido { background: #fef08a; color: #854d0e; }
.observado { background: #fed7aa; color: #9a3412; }
.aprobado { background: #bbf7d0; color: #166534; }
.finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

.loading { text-align: center; padding: 4rem; color: #64748b; }
.error { color: #dc2626; background: #fef2f2; padding: 1rem; border-radius: 8px; border: 1px solid #fecaca; margin-top: 1rem; text-align: center; }
</style>