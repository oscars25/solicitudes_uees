<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { formsApi } from '../../api/forms';
import { requestsApi } from '../../api/requests';

const formularios = ref<any[]>([]);
const solicitudes = ref<any[]>([]);
const cargando = ref(true);

const showHistory = ref(false);
const expandedId = ref<string | null>(null);

onMounted(async () => {
  try {
    const [f, s] = await Promise.all([formsApi.list(), requestsApi.list()]);
    formularios.value = f;
    solicitudes.value = s;
  } finally {
    cargando.value = false;
  }
});

function getFormTitle(formDefinitionId: string) {
  const form = formularios.value.find(f => f.id === formDefinitionId);
  return form ? form.titulo : 'Solicitud Académica';
}

function getFormSchema(formDefinitionId: string) {
  const form = formularios.value.find(f => f.id === formDefinitionId);
  return form ? form.schemaJson : { fields: [] };
}

function toggleExpand(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null;
  } else {
    expandedId.value = id;
  }
}

// Formato de fecha mas corto y limpio
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).replace('.', ''); // Quita el punto del mes abreviado
}
</script>

<template>
  <div class="container">
    <div class="header-section">
      <h1>Mis Solicitudes</h1>
      <p class="subtitle">Gestione sus solicitudes y verifique su estado en un mismo lugar.</p>
    </div>

    <!-- Seccion de Nueva Solicitud -->
    <div class="panel">
      <h2 class="panel-title">Crear Nueva Solicitud</h2>
      <div class="grid-cards">
        <router-link v-for="f in formularios" :key="f.id" :to="`/solicitudes/nueva/${f.slug}`" class="request-card">
          <div class="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          </div>
          <h3>{{ f.titulo }}</h3>
          <p>{{ f.descripcion }}</p>
        </router-link>
      </div>
    </div>

    <!-- Historial (Desplegable principal) -->
    <div class="panel">
      
      <div class="panel-header-clickable" @click="showHistory = !showHistory">
        <h2 class="panel-title" style="margin-bottom: 0;">Historial de Solicitudes</h2>
        <div class="toggle-icon" :class="{ 'is-open': showHistory }">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      <div v-show="showHistory" class="history-content">
        
        <div v-if="cargando" class="loading">Cargando tu historial...</div>
        
        <div v-else-if="solicitudes.length" class="accordion-list">
          <div v-for="s in solicitudes" :key="s.id" class="accordion-item" :class="{ 'is-open': expandedId === s.id }">
            
            <div class="accordion-header" @click="toggleExpand(s.id)">
              <div class="header-main">
                <span class="date">{{ formatDate(s.createdAt) }}</span>
                <h3 class="request-type">{{ getFormTitle(s.formDefinitionId) }}</h3>
              </div>
              
              <div class="header-actions">
                <!-- Badge Mejorado con Iconos -->
                <span class="status-badge" :class="s.estado">
                  <svg v-if="s.estado === 'finalizado'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="badge-icon"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>
                  <svg v-else-if="s.estado === 'recibido'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="badge-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" /></svg>
                  {{ s.estado }}
                </span>
                <div class="chevron">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div v-show="expandedId === s.id" class="accordion-body">
              <div class="body-content">
                <h4 class="body-title">Resumen de los datos enviados</h4>
                
                <div class="data-grid">
                  <template v-for="field in getFormSchema(s.formDefinitionId).fields" :key="field.name">
                    <template v-if="field.type !== 'info' && s.payload[field.name]">
                      <div class="data-row">
                        <span class="data-label">{{ field.label }}:</span>
                        <span class="data-value">
                          <template v-if="field.type === 'file'">
                            <a :href="s.payload[field.name]" target="_blank" class="file-link">Ver archivo adjunto</a>
                          </template>
                          <template v-else>
                            {{ s.payload[field.name] }}
                          </template>
                        </span>
                      </div>
                    </template>
                  </template>
                </div>

                <div class="body-footer">
                  <p v-if="s.estado === 'observado'" class="alert-observado">
                    Esta solicitud tiene observaciones. Ingresa al detalle para corregirla.
                  </p>
                  <router-link :to="`/solicitudes/${s.id}`" class="btn-detail">
                    Abrir detalle completo
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <p>Aún no has creado ninguna solicitud.</p>
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

.panel { background: white; border-radius: 16px; padding: 1.5rem 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }

.panel-title { color: #1e293b; font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.75rem; }
.panel-title::before { content: ''; display: block; width: 6px; height: 20px; background: #FBDA05; border-radius: 4px; }

.panel-header-clickable { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding-bottom: 1rem; }
.panel-header-clickable:hover .panel-title { color: #074E8C; }
.toggle-icon { width: 1.5rem; height: 1.5rem; color: #64748b; transition: transform 0.3s; }
.toggle-icon.is-open { transform: rotate(180deg); color: #074E8C; }
.history-content { padding-top: 1rem; border-top: 1px solid #f1f5f9; margin-top: 0.5rem; }

.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; margin-top: 1.5rem; }
.request-card { display: flex; flex-direction: column; padding: 1.5rem; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; text-decoration: none; transition: all 0.2s; }
.request-card:hover { border-color: #074E8C; background: white; transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(7,78,140,0.1); }
.card-icon { width: 2.5rem; height: 2.5rem; background: #e0f2fe; color: #074E8C; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; }
.card-icon svg { width: 1.5rem; height: 1.5rem; }
.request-card h3 { color: #074E8C; font-size: 1.1rem; margin: 0 0 0.5rem 0; }
.request-card p { color: #64748b; font-size: 0.9rem; margin: 0; line-height: 1.4; }

.accordion-list { display: flex; flex-direction: column; gap: 1rem; }
.accordion-item { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: all 0.2s; background: white; }
.accordion-item.is-open { border-color: #074E8C; box-shadow: 0 4px 12px rgba(7,78,140,0.08); }

.accordion-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; cursor: pointer; background: #f8fafc; transition: background 0.2s; }
.accordion-header:hover { background: #f1f5f9; }
.is-open .accordion-header { background: #eff6ff; border-bottom: 1px solid #e2e8f0; }

.header-main { display: flex; flex-direction: column; gap: 0.25rem; }
.date { font-size: 0.8rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.request-type { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 700; }

.header-actions { display: flex; align-items: center; gap: 1.5rem; }
.chevron { width: 1.5rem; height: 1.5rem; color: #94a3b8; transition: transform 0.3s; }
.is-open .chevron { transform: rotate(180deg); color: #074E8C; }

.accordion-body { background: white; }
.body-content { padding: 1.5rem; }
.body-title { font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 0; margin-bottom: 1.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }

.data-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 2rem; }
@media (min-width: 600px) { .data-grid { grid-template-columns: 1fr 1fr; } }

.data-row { display: flex; flex-direction: column; gap: 0.25rem; }
.data-label { font-size: 0.85rem; font-weight: 600; color: #94a3b8; }
.data-value { font-size: 0.95rem; color: #1e293b; }
.file-link { color: #074E8C; font-weight: 600; text-decoration: underline; }

.body-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.alert-observado { margin: 0; color: #b45309; background: #fffbeb; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.9rem; border: 1px solid #fde68a; }

.btn-detail { display: inline-flex; align-items: center; gap: 0.5rem; background: #074E8C; color: white; padding: 0.6rem 1.25rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; }
.btn-detail:hover { background: #053b6a; }
.btn-detail svg { width: 1rem; height: 1rem; }

/* Badges Mejorados */
.status-badge { 
  display: inline-flex; 
  align-items: center; 
  gap: 0.35rem;
  padding: 0.35rem 0.8rem; 
  border-radius: 20px; 
  font-size: 0.75rem; 
  font-weight: 700; 
  text-transform: uppercase; 
  letter-spacing: 0.5px; 
}
.badge-icon { width: 0.9rem; height: 0.9rem; }

.recibido { background: #fef08a; color: #854d0e; }
.observado { background: #fed7aa; color: #9a3412; }
.aprobado { background: #bbf7d0; color: #166534; }
/* Un tono más elegante para finalizado */
.finalizado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

.empty-state { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
.loading { text-align: center; padding: 2rem; color: #64748b; }
</style>