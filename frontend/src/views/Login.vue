<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import dteLogo from '../assets/dte-logo.png';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    if (auth.rol === 'admin') router.push('/admin');
    else if (auth.rol === 'interno') router.push('/interno');
    else router.push('/solicitudes');
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Error de login. Verifica tus credenciales.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Barra azul superior -->
      <div class="card-top-bar"></div>

      <!-- Logo DTE -->
      <div class="logos-container">
        <img :src="dteLogo" alt="Dirección de Tecnología Educativa" class="logo-dte" />
      </div>

      <div class="header-text">
        <h1>Iniciar Sesión</h1>
        <p>Sistema de Solicitudes DTE</p>
      </div>

      <form @submit.prevent="submit" class="login-form">
        <div class="input-group">
          <label>Correo institucional</label>
          <div class="input-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
            <input v-model="email" type="email" placeholder="usuario@uees.edu.sv" required />
          </div>
        </div>

        <div class="input-group">
          <label>Contraseña</label>
          <div class="input-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input v-model="password" type="password" placeholder="••••••••" required />
          </div>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button :disabled="loading" type="submit" class="btn-login">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          {{ loading ? 'Ingresando...' : 'Ingresar al Sistema' }}
        </button>
      </form>
    </div>

    <footer class="login-footer">
      Universidad Evangélica de El Salvador - {{ new Date().getFullYear() }}
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f0f4f8;
  font-family: 'Inter', system-ui, sans-serif;
}

.login-card {
  background: white;
  width: 100%;
  max-width: 420px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  padding: 3rem 2.5rem 2.5rem;
  box-sizing: border-box;
}

.card-top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: #074E8C; /* Azul institucional */
}

.logos-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1.5rem;
}

.logo-dte {
  height: 75px; 
  object-fit: contain;
}

.header-text {
  text-align: center;
  margin-bottom: 2rem;
}

.header-text h1 {
  font-size: 1.5rem;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
}

.header-text p {
  color: #64748b;
  margin: 0;
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-group label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 1rem;
  width: 1.25rem;
  height: 1.25rem;
  color: #94a3b8;
}

.input-wrapper input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #1e293b;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.input-wrapper input:focus {
  border-color: #074E8C;
  box-shadow: 0 0 0 3px rgba(7, 78, 140, 0.1);
}

.btn-login {
  background: #074E8C;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

.btn-login:hover {
  background: #053b6a; /* Un tono mas oscuro del azul */
}

.btn-login:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.error-msg {
  color: #ef4444;
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
}

.login-footer {
  margin-top: 2rem;
  color: #94a3b8;
  font-size: 0.85rem;
}
</style>