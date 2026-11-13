<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { facultades, carrerasPorFacultad, monitoresPorFacultad } from '../utils/catalogs';
import { api } from '../api/client';
import arancelesImg from '../assets/temas-arancelarios.png';

const props = defineProps<{
  schema: {
    fields: Array<{
      name: string;
      type: string;
      label: string;
      required?: boolean;
      options?: string[];
      group?: string;
      optionsSource?: string;
      dependsOn?: string;
    }>;
  };
  initialData?: Record<string, any>;
  disabledFields?: string[];
  userRol?: string;
  userCarrera?: string | null;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: Record<string, any>): void;
}>();

const values = ref<Record<string, any>>({ ...props.initialData });
const uploading = ref<Record<string, boolean>>({});
const coordinadoresList = ref<any[]>([]);

// 1. Quitamos la restriccion del rol, ahora siempre carga la lista
onMounted(async () => {
  try {
    const res = await api.get('/users/coordinadores');
    coordinadoresList.value = res.data;
  } catch (e) {
    console.error('Error al cargar lista de coordinadores', e);
  }
});

const groups = computed(() => {
  const g = props.schema.fields.map(f => f.group || 'Información');
  return [...new Set(g)];
});

function fieldsForGroup(groupName: string) {
  return props.schema.fields.filter(f => (f.group || 'Información') === groupName);
}

function getOptions(field: any) {
  if (field.optionsSource === 'facultades') return facultades;
  
  if (field.optionsSource === 'carreras' && field.dependsOn) {
    const parentValue = values.value[field.dependsOn];
    return parentValue ? carrerasPorFacultad[parentValue] || [] : [];
  }

  if (field.optionsSource === 'monitores' && field.dependsOn) {
    const parentValue = values.value[field.dependsOn];
    return parentValue ? monitoresPorFacultad[parentValue] || [] : [];
  }
  
  return field.options || [];
}

function isFieldDisabled(fieldName: string) {
  if (props.disabledFields?.includes(fieldName)) return true;
  
  // 2. Si es un campo de coordinador y ya tiene un valor (autocompletado), lo bloqueamos
  if ((fieldName === 'coordinador' || fieldName === 'coordinador_correo' || fieldName === 'coordinador_nombre') && values.value['coordinador']) {
    return true;
  }
  
  if (fieldName === 'cantidad_gafas' && values.value['utiliza_gafas'] === 'No') {
    return true;
  }
  
  return false;
}

async function handleFileUpload(event: Event, fieldName: string) {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;
  
  const file = target.files[0];
  const formData = new FormData();
  formData.append('file', file);

  uploading.value[fieldName] = true;
  try {
    const res = await api.post('/upload', formData);
    values.value[fieldName] = res.data.url;
  } catch (error) {
    alert('Error al subir el archivo');
  } finally {
    uploading.value[fieldName] = false;
  }
}

// Limpiar carrera y monitor al cambiar de facultad
watch(() => values.value['facultad'], (newVal, oldVal) => {
  if (oldVal && newVal !== oldVal) {
    values.value['carrera'] = '';
    values.value['monitor_evaluado'] = '';
  }
});

// 3. Auto-completar coordinador al elegir carrera (SIN importar el rol)
watch(() => values.value['carrera'], (newCarrera) => {
  if (newCarrera) {
    const coord = coordinadoresList.value.find(c => c.carreraCoordinada === newCarrera);
    if (coord) {
      values.value['coordinador'] = coord.nombre;
      values.value['coordinador_correo'] = coord.email;
      values.value['coordinador_nombre'] = coord.nombre;
    } else {
      // Si no hay coordinador para esa carrera, limpiamos el campo
      values.value['coordinador'] = '';
      values.value['coordinador_correo'] = '';
      values.value['coordinador_nombre'] = '';
    }
  } else {
    // Si borran la carrera, limpiamos los datos
    values.value['coordinador'] = '';
    values.value['coordinador_correo'] = '';
    values.value['coordinador_nombre'] = '';
  }
});

// Logica de las Gafas
watch(() => values.value['utiliza_gafas'], (newVal) => {
  if (newVal === 'No') {
    values.value['cantidad_gafas'] = 'N/A';
  } else if (newVal === 'Si' && values.value['cantidad_gafas'] === 'N/A') {
    values.value['cantidad_gafas'] = '';
  }
});

function submit() {
  const out: Record<string, any> = {};
  for (const f of props.schema.fields) {
    if (f.type !== 'info') {
      out[f.name] = values.value[f.name] ?? '';
    }
  }
  emit('submit', out);
}
</script>

<template>
  <form @submit.prevent="submit" class="dynamic-form">
    <div v-for="group in groups" :key="group" class="form-group">
      <h3 class="group-title">{{ group }}</h3>
      
      <div :class="group.includes('Criterios') ? 'likert-list' : 'grid-fields'">
        
        <div v-for="field in fieldsForGroup(group)" :key="field.name" class="field" :class="{ 'full-width': field.type === 'textarea' || field.type === 'file' || field.type === 'info' }">
          
          <label v-if="field.type !== 'info'" class="field-label">
            {{ field.label }} <span v-if="field.required" class="req">*</span>
            <span v-if="isFieldDisabled(field.name)" class="locked-badge">Auto-completado</span>
          </label>

          <input v-if="field.type === 'text'" v-model="values[field.name]" :required="field.required" :disabled="isFieldDisabled(field.name)" type="text" class="input-control" />
          <textarea v-else-if="field.type === 'textarea'" v-model="values[field.name]" :required="field.required" :disabled="isFieldDisabled(field.name)" rows="3" class="input-control" />
          <input v-else-if="field.type === 'number'" v-model.number="values[field.name]" :required="field.required" :disabled="isFieldDisabled(field.name)" type="number" class="input-control" />
          <input v-else-if="field.type === 'date'" v-model="values[field.name]" :required="field.required" :disabled="isFieldDisabled(field.name)" type="date" class="input-control" />
          
          <select 
            v-else-if="field.type === 'select'" 
            v-model="values[field.name]" 
            :required="field.required" 
            class="input-control"
            :disabled="isFieldDisabled(field.name) || (field.dependsOn && !values[field.dependsOn])"
          >
            <option value="">-- Seleccione --</option>
            <option v-for="opt in getOptions(field)" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <div v-else-if="field.type === 'radio'" class="radio-group">
            <label v-for="opt in getOptions(field)" :key="opt" class="radio-label">
              <input type="radio" :name="field.name" :value="opt" v-model="values[field.name]" :required="field.required" />
              <span>{{ opt }}</span>
            </label>
          </div>

          <div v-else-if="field.type === 'file'" class="file-upload-wrapper">
            <input 
              type="file" 
              accept=".pdf,.doc,.docx" 
              @change="handleFileUpload($event, field.name)" 
              :required="field.required && !values[field.name]"
              class="file-input-hidden" 
              :id="`file-${field.name}`"
            />
            <label :for="`file-${field.name}`" class="file-dropzone">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="upload-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Haz clic para subir tu archivo (PDF, DOC, DOCX)</span>
            </label>
            <div v-if="uploading[field.name]" class="upload-status">Subiendo archivo...</div>
            <div v-else-if="values[field.name]" class="upload-status success">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="check-icon"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
              Archivo subido: <a :href="values[field.name]" target="_blank">Ver documento</a>
            </div>
          </div>

          <div v-else-if="field.type === 'info'" class="info-block">
            <p v-if="field.label" class="info-label">{{ field.label }}</p>
            <img 
              v-if="field.name === 'info_aranceles'" 
              :src="arancelesImg" 
              alt="Tabla de Temas Arancelarios" 
              class="aranceles-img"
            />
          </div>

        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn-primary" :disabled="Object.values(uploading).some(Boolean)">
        Enviar solicitud
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="btn-icon">
          <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </form>
</template>

<style scoped>
.dynamic-form { display: flex; flex-direction: column; gap: 2.5rem; width: 100%; }

.form-group { 
  background: white; 
  border: 1px solid #e2e8f0; 
  border-radius: 16px; 
  padding: 2rem; 
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02); 
}

.group-title { 
  margin-top: 0; 
  margin-bottom: 2rem; 
  color: #074E8C; 
  font-size: 1.25rem; 
  font-weight: 700; 
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.group-title::before {
  content: '';
  display: block;
  width: 6px;
  height: 24px;
  background: #FBDA05;
  border-radius: 4px;
}

.grid-fields { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }

@media (min-width: 640px) {
  .grid-fields { grid-template-columns: 1fr 1fr; }
  .full-width { grid-column: 1 / -1; }
}

.field { display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }

.field-label { 
  font-weight: 600; 
  color: #475569; 
  font-size: 0.9rem; 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
}

.req { color: #ef4444; }

.locked-badge { 
  font-size: 0.65rem; 
  background: #e0f2fe; 
  color: #0369a1; 
  padding: 0.15rem 0.5rem; 
  border-radius: 6px; 
  font-weight: 700; 
  text-transform: uppercase; 
  letter-spacing: 0.5px;
}

.input-control { 
  padding: 0.8rem 1rem; 
  border: 1.5px solid #cbd5e1; 
  border-radius: 8px; 
  font-family: inherit; 
  font-size: 0.95rem; 
  color: #1e293b;
  transition: all 0.2s; 
  background: #f8fafc; 
  width: 100%; 
  max-width: 100%; 
  box-sizing: border-box; 
}

.input-control:disabled { 
  background: #f1f5f9; 
  color: #94a3b8; 
  cursor: not-allowed; 
  border-color: #e2e8f0; 
}

.input-control:focus { 
  outline: none; 
  border-color: #074E8C; 
  background: white; 
  box-shadow: 0 0 0 4px rgba(7, 78, 140, 0.1); 
}

.likert-list { display: flex; flex-direction: column; gap: 2rem; }
.radio-group { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }

.radio-label { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  font-weight: 500 !important; 
  cursor: pointer; 
  color: #475569 !important; 
  background: #f8fafc;
  padding: 0.5rem 1rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 20px;
  transition: all 0.2s;
}

.radio-label:has(input:checked) {
  background: #074E8C;
  color: white !important;
  border-color: #074E8C;
}

.radio-label input[type="radio"] { 
  display: none; 
}

.file-input-hidden { display: none; }
.file-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s;
  color: #64748b;
  font-weight: 500;
}
.file-dropzone:hover {
  border-color: #074E8C;
  background: #eff6ff;
  color: #074E8C;
}
.upload-icon { width: 2.5rem; height: 2.5rem; color: #94a3b8; }
.file-dropzone:hover .upload-icon { color: #074E8C; }

.upload-status { font-size: 0.9rem; margin-top: 0.5rem; color: #074E8C; display: flex; align-items: center; gap: 0.4rem; }
.upload-status.success { color: #16a34a; }
.upload-status a { color: #16a34a; font-weight: bold; text-decoration: underline; }
.check-icon { width: 1.2rem; height: 1.2rem; }

.info-block { margin-top: 1rem; width: 100%; }
.info-label { font-weight: 600; color: #0f172a; margin-bottom: 1rem; font-size: 1rem; }
.aranceles-img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

.form-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }
.btn-primary { 
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem; 
  background: #074E8C; 
  color: white; 
  border: none; 
  border-radius: 8px; 
  cursor: pointer; 
  font-weight: 600; 
  font-size: 1rem; 
  transition: all 0.2s; 
  box-shadow: 0 4px 6px rgba(7, 78, 140, 0.2);
}
.btn-primary:hover { 
  background: #053b6a; 
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(7, 78, 140, 0.3);
}
.btn-primary:disabled { background: #93c5fd; cursor: not-allowed; box-shadow: none; transform: none; }
.btn-icon { width: 1.25rem; height: 1.25rem; }
</style>