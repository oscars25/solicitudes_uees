<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../api/auth';

const email = ref('');
const nombre = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await authApi.register(email.value, nombre.value, password.value);
    router.push('/login');
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Error al registrar';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="register-card">
    <h1>Crear Cuenta</h1>
    <form @submit.prevent="submit">
      <input v-model="nombre" type="text" placeholder="Nombre completo" required />
      <input v-model="email" type="email" placeholder="Correo electronico" required />
      <input v-model="password" type="password" placeholder="Contrasena (min. 8 caracteres)" required />
      <button :disabled="loading" type="submit">{{ loading ? 'Cargando...' : 'Registrarse' }}</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
    <p class="link">Ya tienes cuenta? <router-link to="/login">Inicia sesion</router-link></p>
  </div>
</template>

<style scoped>
.register-card { max-width: 400px; margin: 4rem auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
input, button { padding: 0.75rem; border-radius: 4px; border: 1px solid #ccc; }
button { background: #18181b; color: white; cursor: pointer; border: none; font-weight: bold; }
.error { color: red; font-size: 0.9rem; }
.link { text-align: center; margin-top: 1rem; font-size: 0.9rem; }
</style>