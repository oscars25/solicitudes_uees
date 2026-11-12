<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { requestsApi } from '../../api/requests';

const solicitudes = ref<any[]>([]);
const cargando = ref(true);

async function cargar() {
  cargando.value = true;
  try {
    solicitudes.value = await requestsApi.list();
  } finally {
    cargando.value = false;
  }
}
onMounted(cargar);
</script>

<template>
  <div>
    <h1>Bandeja de Solicitudes</h1>
    <div class="panel">
      <p v-if="cargando">Cargando...</p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>ID</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in solicitudes" :key="s.id">
            <td>{{ new Date(s.createdAt).toLocaleDateString() }}</td>
            <td>{{ s.id.slice(0, 8) }}</td>
            <td><span class="badge" :class="s.estado">{{ s.estado }}</span></td>
            <td><router-link :to="`/interno/${s.id}`" class="btn">Revisar</router-link></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.panel { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 0.75rem; border-bottom: 1px solid #e4e4e7; text-align: left; }
.badge { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: bold; text-transform: capitalize; }
.recibido { background: #fef08a; color: #854d0e; }
.observado { background: #fed7aa; color: #9a3412; }
.aprobado { background: #bbf7d0; color: #166534; }
.finalizado { background: #e4e4e7; color: #27272a; }
.btn { color: #2563eb; text-decoration: none; font-weight: bold; }
</style>