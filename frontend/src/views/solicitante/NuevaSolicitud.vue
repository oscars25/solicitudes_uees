<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { formsApi } from '../../api/forms';
import { requestsApi } from '../../api/requests';
import { useAuthStore } from '../../stores/auth';
import DynamicForm from '../../components/DynamicForm.vue';

const route = useRoute();
const router = useRouter();

const auth = useAuthStore();
auth.load();

const form = ref<any>(null);
const error = ref('');

const initialData = computed(() => {
  return {
    fecha_solicitud: new Date().toISOString().split('T')[0],
    // OVAS
    docente: auth.user?.nombre || '',
    docente_resp_nombre: auth.user?.nombre || '',
    correo_docente: auth.user?.email || '',
    coordinador: 'Coordinador de Ingeniería',
    // Monitores
    coordinador_nombre: auth.user?.nombre || '',
    coordinador_correo: auth.user?.email || '',
    // RV / RA
    solicitante_nombre: auth.user?.nombre || '',
    solicitante_correo: auth.user?.email || ''
  };
});

const disabledFields = [
  'docente', 
  'docente_resp_nombre', 
  'correo_docente', 
  'coordinador_nombre', 
  'coordinador_correo',
  'solicitante_nombre',
  'solicitante_correo'
];

onMounted(async () => {
  try {
    form.value = await formsApi.get(route.params.slug as string);
  } catch {
    error.value = 'Formulario no encontrado';
  }
});

async function onSubmit(payload: Record<string, any>) {
  try {
    await requestsApi.create(form.value.id, payload);
    router.push('/solicitudes');
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Error al enviar la solicitud';
  }
}
</script>

<template>
  <div class="container">
    <router-link to="/solicitudes" class="back">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="back-icon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Volver a mis solicitudes
    </router-link>
    
    <div v-if="form" class="form-wrapper">
      <div class="form-header">
        <h1>{{ form.titulo }}</h1>
        <p class="desc">{{ form.descripcion }}</p>
      </div>
      
      <p v-if="error" class="error">{{ error }}</p>
      
      <DynamicForm 
        :schema="form.schemaJson" 
        :initialData="initialData"
        :disabledFields="disabledFields"
        @submit="onSubmit" 
      />
    </div>
    
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
    </div>
    <div v-else class="loading-state">
      <p>Cargando formulario...</p>
    </div>
  </div>
</template>

<style scoped>
.container { 
  max-width: 900px; 
  margin: 0 auto; 
  width: 100%; 
  box-sizing: border-box; 
  padding: 2rem 1rem;
}

/* Boton de volver moderno */
.back { 
  display: inline-flex; 
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem; 
  color: #64748b; 
  text-decoration: none; 
  font-weight: 500; 
  font-size: 0.95rem;
  transition: color 0.2s;
}
.back:hover { color: #074E8C; }
.back-icon { width: 1.2rem; height: 1.2rem; }

.form-wrapper {
  width: 100%;
}

/* Encabezado */
.form-header {
  margin-bottom: 2rem;
  text-align: center;
}

.form-header h1 {
  color: #074E8C;
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.5px;
}

.desc { 
  color: #64748b; 
  font-size: 1.1rem; 
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
}

.error { 
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626; 
  padding: 1rem; 
  border-radius: 8px;
  margin-bottom: 2rem;
  text-align: center;
  font-weight: 500;
}

.loading-state, .error-state {
  text-align: center;
  padding: 4rem;
  color: #64748b;
  font-size: 1.1rem;
}
</style>