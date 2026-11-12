<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { formsApi } from '../../api/forms';

const formularios = ref<any[]>([]);
const error = ref('');
const guardando = ref(false);

// Variables para controlar el editor visual
const mostrarEditor = ref(false);
const editandoId = ref<string | null>(null);

// Estructura base para el formulario
const formData = ref({
  slug: '',
  titulo: '',
  descripcion: '',
  fields: [] as any[],
});

async function cargar() {
  formularios.value = await formsApi.list();
}

// Abrir editor para crear desde cero
function abrirNuevo() {
  editandoId.value = null;
  formData.value = {
    slug: '',
    titulo: '',
    descripcion: '',
    fields: [
      { name: 'nuevo_campo', type: 'text', label: 'Nuevo Campo', required: true, group: 'Información General' }
    ],
  };
  mostrarEditor.value = true;
}

// Abrir editor para modificar uno existente
function abrirEditar(form: any) {
  editandoId.value = form.id;
  formData.value = {
    slug: form.slug,
    titulo: form.titulo,
    descripcion: form.descripcion || '',
    // Copiamos los campos profundamente para no afectar la tabla
    fields: JSON.parse(JSON.stringify(form.schemaJson.fields || [])),
  };
  mostrarEditor.value = true;
}

// Añadir un nuevo campo vacío
function agregarCampo() {
  formData.value.fields.push({
    name: 'campo_' + Date.now(),
    type: 'text',
    label: 'Nuevo Campo',
    required: false,
    group: formData.value.fields[0]?.group || 'Información General'
  });
}

// Eliminar un campo
function eliminarCampo(index: number) {
  formData.value.fields.splice(index, 1);
}

// Guardar los cambios (Crear o Actualizar)
async function guardar() {
  error.value = '';
  guardando.value = true;

  try {
    // Procesamos las opciones de los select/radio
    const processedFields = formData.value.fields.map(field => {
      const newField = { ...field };
      if (newField.options && typeof newField.options === 'string') {
        newField.options = newField.options.split(',').map((o: string) => o.trim()).filter(Boolean);
      }
      return newField;
    });

    const payload = {
      slug: formData.value.slug,
      titulo: formData.value.titulo,
      descripcion: formData.value.descripcion,
      schemaJson: {
        fields: processedFields,
        transiciones: {
          recibido: ['observado', 'aprobado'],
          observado: ['aprobado'],
          aprobado: ['finalizado'],
        }
      }
    };

    if (editandoId.value) {
      await formsApi.update(editandoId.value, payload);
    } else {
      await formsApi.create(payload);
    }

    mostrarEditor.value = false;
    await cargar();
  } catch (e: any) {
    error.value = e.response?.data?.error ?? e.message ?? 'Error al guardar el formulario';
  } finally {
    guardando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>Gestión de Formularios</h1>
        <p class="subtitle">Crea y edita los formularios del sistema.</p>
      </div>
      <button v-if="!mostrarEditor" @click="abrirNuevo" class="btn-primary">
        + Nuevo Formulario
      </button>
    </div>

    <!-- EDITOR VISUAL -->
    <div v-if="mostrarEditor" class="nuevo-panel">
      <div class="editor-header">
        <h2>{{ editandoId ? 'Editar Formulario' : 'Crear Nuevo Formulario' }}</h2>
        <button @click="mostrarEditor = false" class="btn-cancel">Cancelar</button>
      </div>

      <div class="form-grid">
        <div class="input-group">
          <label>Slug (identificador único)</label>
          <input v-model="formData.slug" :disabled="!!editandoId" placeholder="ej: solicitud-becas" class="input" />
        </div>
        <div class="input-group">
          <label>Título Visible</label>
          <input v-model="formData.titulo" placeholder="ej: Solicitud de Becas" class="input" />
        </div>
      </div>
      
      <div class="input-group" style="margin-bottom: 2rem;">
        <label>Descripción</label>
        <input v-model="formData.descripcion" placeholder="Breve descripción del formulario" class="input" />
      </div>

      <div class="fields-header">
        <h3>Campos del Formulario</h3>
        <button @click="agregarCampo" class="btn-add-field">+ Agregar Campo</button>
      </div>

      <div class="fields-list">
        <div v-for="(field, index) in formData.fields" :key="index" class="field-row">
          
          <div class="field-col">
            <label>Nombre (Key)</label>
            <input v-model="field.name" placeholder="ej: nombre_completo" class="input" />
          </div>
          
          <div class="field-col">
            <label>Etiqueta (Visible)</label>
            <input v-model="field.label" placeholder="ej: Nombre Completo" class="input" />
          </div>

          <div class="field-col">
            <label>Tipo</label>
            <select v-model="field.type" class="input">
              <option value="text">Texto corto</option>
              <option value="textarea">Texto largo</option>
              <option value="number">Número</option>
              <option value="date">Fecha</option>
              <option value="select">Lista desplegable</option>
              <option value="radio">Opción múltiple (Radios)</option>
              <option value="file">Archivo adjunto</option>
              <option value="info">Informativo (Imagen)</option>
            </select>
          </div>

          <div class="field-col">
            <label>Sección (Grupo)</label>
            <input v-model="field.group" placeholder="ej: Datos Personales" class="input" />
          </div>

          <div class="field-col" style="flex: 0 0 auto; align-items: center; justify-content: center;">
            <label>Requerido</label>
            <input type="checkbox" v-model="field.required" class="checkbox" />
          </div>

          <!-- Boton de eliminar -->
          <div class="field-col" style="flex: 0 0 auto; justify-content: center;">
            <button @click="eliminarCampo(index)" class="btn-delete" title="Eliminar campo">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>

          <!-- Opciones extra para select o radio -->
          <div v-if="field.type === 'select' || field.type === 'radio'" class="options-row">
            <label>Opciones (separadas por coma)</label>
            <input 
              :value="Array.isArray(field.options) ? field.options.join(', ') : field.options" 
              @input="field.options = ($event.target as HTMLInputElement).value"
              placeholder="ej: Opcion 1, Opcion 2, Opcion 3" 
              class="input" 
            />
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="editor-actions">
        <button @click="guardar" class="btn-primary" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Guardar Formulario' }}
        </button>
      </div>
    </div>

    <!-- TABLA DE FORMULARIOS -->
    <div v-else class="panel">
      <table class="table">
        <thead>
          <tr>
            <th>Slug</th>
            <th>Título</th>
            <th>Campos</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in formularios" :key="f.id">
            <td><code class="badge-slug">{{ f.slug }}</code></td>
            <td><strong>{{ f.titulo }}</strong></td>
            <td>{{ f.schemaJson?.fields?.length || 0 }} campos</td>
            <td>
              <span class="status-badge" :class="f.activo ? 'activo' : 'inactivo'">
                {{ f.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-right">
              <button @click="abrirEditar(f)" class="btn-edit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="icon-sm"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Editar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 1rem; }

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
.header h1 { color: #074E8C; font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem 0; }
.subtitle { color: #64748b; font-size: 1.05rem; margin: 0; }

.btn-primary { padding: 0.75rem 1.5rem; background: #074E8C; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.btn-primary:hover { background: #053b6a; }
.btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }

.panel { background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
.table th { text-align: left; padding: 1.25rem 1.5rem; color: #64748b; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
.table td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle; }
.text-right { text-align: right; }

.badge-slug { background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 6px; font-family: monospace; color: #475569; font-size: 0.85rem; }
.status-badge { display: inline-block; padding: 0.35rem 0.8rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.activo { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.inactivo { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

.btn-edit { display: inline-flex; align-items: center; gap: 0.5rem; background: white; border: 1px solid #cbd5e1; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; color: #074E8C; cursor: pointer; transition: all 0.2s; }
.btn-edit:hover { border-color: #074E8C; background: #eff6ff; }
.icon-sm { width: 1.1rem; height: 1.1rem; }

/* ESTILOS DEL EDITOR VISUAL */
.nuevo-panel { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.editor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 1rem; }
.editor-header h2 { margin: 0; color: #1e293b; font-size: 1.5rem; }
.btn-cancel { background: transparent; border: 1px solid #cbd5e1; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; color: #64748b; font-weight: 600; }
.btn-cancel:hover { background: #f1f5f9; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.input-group { display: flex; flex-direction: column; gap: 0.5rem; }
.input-group label { font-size: 0.9rem; font-weight: 600; color: #475569; }

.input { padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 0.95rem; width: 100%; box-sizing: border-box; }
.input:focus { outline: none; border-color: #074E8C; box-shadow: 0 0 0 3px rgba(7,78,140,0.1); }
.input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

.fields-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; margin-top: 2rem; }
.fields-header h3 { margin: 0; color: #1e293b; font-size: 1.2rem; }
.btn-add-field { background: #eff6ff; color: #074E8C; border: 1px dashed #bfdbfe; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-add-field:hover { background: #dbeafe; }

.fields-list { display: flex; flex-direction: column; gap: 1rem; background: #f8fafc; padding: 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0; }
.field-row { display: flex; gap: 1rem; background: white; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap; align-items: flex-start; }
.field-col { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; min-width: 120px; }
.field-col label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
.checkbox { width: 1.25rem; height: 1.25rem; cursor: pointer; accent-color: #074E8C; margin-top: 0.5rem; }

.btn-delete { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 0.5rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-top: 1.25rem; }
.btn-delete:hover { background: #fee2e2; }
.btn-delete svg { width: 1.2rem; height: 1.2rem; }

.options-row { width: 100%; display: flex; flex-direction: column; gap: 0.25rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #e2e8f0; }
.options-row label { font-size: 0.8rem; color: #074E8C; font-weight: 600; }

.editor-actions { display: flex; justify-content: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }
.error { color: #dc2626; background: #fef2f2; padding: 1rem; border-radius: 8px; border: 1px solid #fecaca; margin-top: 1rem; }
</style>