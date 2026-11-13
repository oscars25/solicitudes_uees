<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { usersApi } from '../../api/users';
import { facultades, carrerasPorFacultad } from '../../utils/catalogs';

const usuarios = ref<any[]>([]);
const error = ref('');
const mostrarForm = ref(false);
const editandoId = ref<string | null>(null);

const form = ref({
  nombre: '',
  email: '',
  password: '',
  rol: 'docente',
  facultad: '',
  carreraCoordinada: '',
  formularioAsignado: '', // <-- NUEVO CAMPO
  activo: true,
});

// Obtener las carreras dependiendo de la facultad seleccionada
const carrerasDisponibles = computed(() => {
  if (!form.value.facultad) return [];
  return carrerasPorFacultad[form.value.facultad] || [];
});

async function cargar() {
  try {
    usuarios.value = await usersApi.list();
  } catch (e: any) {
    error.value = 'Error al cargar usuarios';
  }
}

function abrirNuevo() {
  editandoId.value = null;
  form.value = { 
    nombre: '', 
    email: '', 
    password: '', 
    rol: 'docente', 
    facultad: '', 
    carreraCoordinada: '', 
    formularioAsignado: '', 
    activo: true 
  };
  mostrarForm.value = true;
}

function abrirEditar(u: any) {
  editandoId.value = u.id;
  
  // Intentamos adivinar la facultad basándonos en la carrera guardada
  let facultadEncontrada = '';
  if (u.carreraCoordinada) {
    for (const [fac, carreras] of Object.entries(carrerasPorFacultad)) {
      if (carreras.includes(u.carreraCoordinada)) {
        facultadEncontrada = fac;
        break;
      }
    }
  }

  form.value = {
    nombre: u.nombre,
    email: u.email,
    password: '', // No mostramos la contraseña actual
    rol: u.rol,
    facultad: facultadEncontrada,
    carreraCoordinada: u.carreraCoordinada || '',
    formularioAsignado: u.formularioAsignado || '',
    activo: u.activo,
  };
  mostrarForm.value = true;
}

async function guardar() {
  error.value = '';
  try {
    // Preparamos el payload quitando el campo 'facultad' que solo es para la UI
    const { facultad, ...payload } = form.value;

    if (editandoId.value) {
      await usersApi.update(editandoId.value, payload);
    } else {
      if (!payload.password) return alert('La contraseña es obligatoria para nuevos usuarios');
      await usersApi.create(payload);
    }
    mostrarForm.value = false;
    await cargar();
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Error al guardar usuario';
  }
}

onMounted(cargar);
</script>

<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>Gestión de Usuarios</h1>
        <p class="subtitle">Administra los roles de docentes, coordinadores y personal interno.</p>
      </div>
      <button v-if="!mostrarForm" @click="abrirNuevo" class="btn-primary">+ Nuevo Usuario</button>
    </div>

    <!-- Formulario -->
    <div v-if="mostrarForm" class="form-panel">
      <h2>{{ editandoId ? 'Editar Usuario' : 'Crear Usuario' }}</h2>
      
      <div class="grid">
        <div class="input-group">
          <label>Nombre Completo</label>
          <input v-model="form.nombre" type="text" class="input-control" />
        </div>
        <div class="input-group">
          <label>Correo Electrónico</label>
          <input v-model="form.email" type="email" class="input-control" />
        </div>
        <div class="input-group">
          <label>Contraseña {{ editandoId ? '(dejar en blanco para no cambiar)' : '' }}</label>
          <input v-model="form.password" type="password" class="input-control" />
        </div>
        <div class="input-group">
          <label>Rol del Usuario</label>
          <select v-model="form.rol" class="input-control">
            <option value="docente">Docente</option>
            <option value="coordinador">Coordinador</option>
            <option value="interno">Personal Interno (DTE)</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        
        <!-- Campos condicionales para coordinadores -->
        <template v-if="form.rol === 'coordinador'">
          <div class="input-group">
            <label>Facultad</label>
            <select v-model="form.facultad" @change="form.carreraCoordinada = ''" class="input-control">
              <option value="">-- Seleccione Facultad --</option>
              <option v-for="f in facultades" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>Carrera que Coordina</label>
            <select v-model="form.carreraCoordinada" :disabled="!form.facultad" class="input-control">
              <option value="">-- Seleccione Carrera --</option>
              <option v-for="c in carrerasDisponibles" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </template>

        <!-- NUEVO: Campo condicional para Internos -->
        <template v-if="form.rol === 'interno'">
          <div class="input-group full-width">
            <label>Formulario que puede gestionar</label>
            <select v-model="form.formularioAsignado" class="input-control">
              <option value="">-- Seleccione un formulario --</option>
              <option value="solicitud-ovas">Solicitud de OVAS</option>
              <option value="solicitud-realidad-virtual">Solicitud de proyectos RV/RA</option>
              <option value="solicitud-contenidistas">Solicitud de Validación de Contenidistas</option>
            </select>
          </div>
        </template>
      </div>

      <div class="form-actions">
        <button @click="mostrarForm = false" class="btn-cancel">Cancelar</button>
        <button @click="guardar" class="btn-primary">Guardar Usuario</button>
      </div>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <!-- Tabla de Usuarios -->
    <div v-else class="table-panel">
      <table class="modern-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Asignación</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td><strong>{{ u.nombre }}</strong></td>
            <td>{{ u.email }}</td>
            <td><span class="badge" :class="u.rol">{{ u.rol }}</span></td>
            <td>
              <span v-if="u.rol === 'coordinador'">{{ u.carreraCoordinada || '-' }}</span>
              <span v-else-if="u.rol === 'interno'">{{ u.formularioAsignado || 'Sin asignar' }}</span>
              <span v-else>-</span>
            </td>
            <td>
              <span class="status" :class="u.activo ? 'active' : 'inactive'">
                {{ u.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-right">
              <button @click="abrirEditar(u)" class="btn-edit">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; width: 100%; padding: 1rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header h1 { color: #074E8C; font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem 0; }
.subtitle { color: #64748b; margin: 0; }

.btn-primary { padding: 0.75rem 1.5rem; background: #074E8C; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-cancel { padding: 0.75rem 1.5rem; background: transparent; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; cursor: pointer; }

.form-panel, .table-panel { background: white; padding: 2rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); border: 1px solid #e2e8f0; }
.form-panel h2 { margin-top: 0; color: #1e293b; font-size: 1.25rem; margin-bottom: 1.5rem; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
.full-width { grid-column: 1 / -1; }
.input-group { display: flex; flex-direction: column; gap: 0.5rem; }
.input-group label { font-weight: 600; color: #475569; font-size: 0.9rem; }
.input-control { padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; }
.input-control:focus { outline: none; border-color: #074E8C; box-shadow: 0 0 0 3px rgba(7,78,140,0.1); }
.input-control:disabled { background: #f1f5f9; cursor: not-allowed; }

.form-actions { display: flex; justify-content: flex-end; gap: 1rem; }

.modern-table { width: 100%; border-collapse: collapse; }
.modern-table th { text-align: left; padding: 1rem; color: #64748b; font-size: 0.85rem; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
.modern-table td { padding: 1rem; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle; }
.text-right { text-align: right; }

.badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
.docente { background: #e0f2fe; color: #0369a1; }
.coordinador { background: #fef08a; color: #854d0e; }
.interno { background: #fed7aa; color: #9a3412; }
.admin { background: #f3e8ff; color: #7e22ce; }

.status { font-size: 0.85rem; font-weight: 600; }
.status.active { color: #16a34a; }
.status.inactive { color: #dc2626; }

.btn-edit { background: #f8fafc; border: 1px solid #cbd5e1; padding: 0.4rem 1rem; border-radius: 6px; font-weight: 600; color: #074E8C; cursor: pointer; }
.btn-edit:hover { background: #eff6ff; border-color: #074E8C; }
.error { color: #dc2626; margin-top: 1rem; }
</style>