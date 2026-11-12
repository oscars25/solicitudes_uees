# Sistema de Solicitudes UEES

Aplicacion web para centralizar la creacion, seguimiento y gestion de solicitudes institucionales de la Universidad Evangelica de El Salvador (UEES).

El sistema permite publicar formularios configurables, recibir solicitudes de usuarios, asignarlas a personal interno y administrar su flujo de estados desde una interfaz con permisos por rol.

## Funcionalidades principales

- Registro e inicio de sesion de usuarios.
- Autenticacion mediante JWT y contrasenas almacenadas con hash bcrypt.
- Roles de usuario:
  - **Solicitante:** consulta formularios, crea solicitudes y revisa su historial.
  - **Interno:** consulta y procesa solicitudes asignadas o disponibles.
  - **Administrador:** administra formularios y visualiza metricas generales.
- Formularios dinamicos definidos mediante esquemas JSON.
- Validacion de campos requeridos antes de crear una solicitud.
- Flujo de estados: `recibido`, `observado`, `aprobado` y `finalizado`.
- Historial de cambios y comentarios de cada solicitud.
- Carga de archivos adjuntos y generacion de documentos PDF.
- Notificaciones para los usuarios.
- Formularios iniciales cargados mediante un script de seed.

## Arquitectura

El proyecto esta dividido en dos aplicaciones independientes:

```text
sistema-solicitudes/
├── backend/     API, autenticacion, reglas de negocio y persistencia
└── frontend/    Aplicacion web SPA para los usuarios
```

### Backend

El backend expone una API REST sobre Fastify. Sus responsabilidades principales son:

- Gestionar autenticacion y autorizacion por rol.
- Administrar formularios, solicitudes, historial y notificaciones.
- Validar datos recibidos con Zod.
- Persistir informacion en PostgreSQL.
- Servir archivos cargados desde `/uploads`.
- Generar PDF de solicitudes con Puppeteer.

Las rutas principales estan organizadas bajo los prefijos `/auth`, `/forms`, `/requests` y `/notifications`. Tambien se dispone de `/health` para comprobar el estado del servicio.

### Frontend

El frontend es una SPA desarrollada con Vue. Usa Vue Router para las vistas y Pinia para el estado de autenticacion. Las rutas protegidas validan el token y restringen el acceso de acuerdo con el rol del usuario.

## Tecnologias utilizadas

### Backend

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Drizzle ORM y Drizzle Kit
- Zod
- `@fastify/jwt`
- `bcryptjs`
- `@fastify/multipart`
- `@fastify/static`
- Puppeteer

### Frontend

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios

## Modelo de datos

La base de datos utiliza PostgreSQL y contiene, entre otras, las siguientes entidades:

- `users`: usuarios, credenciales, rol y estado de activacion.
- `form_definitions`: formularios dinamicos y sus esquemas JSON.
- `requests`: solicitudes creadas, payload, estado y asignacion.
- `request_history`: trazabilidad de cambios de estado.
- `request_attachments`: archivos relacionados con una solicitud.
- `notifications`: avisos dirigidos a usuarios.

Las migraciones se encuentran en `backend/src/db/migrations`.

## Requisitos

- Node.js 20 o superior.
- PostgreSQL o una instancia compatible, como Neon.
- npm.

## Configuracion

1. Instalar las dependencias del backend:

   ```bash
   cd backend
   npm install
   ```

2. Instalar las dependencias del frontend:

   ```bash
   cd frontend
   npm install
   ```

3. Crear `backend/.env` a partir de [`backend/.env.example`](backend/.env.example) y completar las variables:

   ```env
   DATABASE_URL="postgresql://..."
   DATABASE_URL_DIRECT="postgresql://..."
   JWT_SECRET="una-clave-segura"
   PORT=3001
   FRONTEND_URL="http://localhost:5173"
   N8N_WEBHOOK_APROBADO="http://localhost:5678/webhook/aprobado"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="una-contrasena-segura"
   ```

   El archivo `.env` contiene informacion sensible y no debe versionarse.

## Base de datos

Desde `backend`:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

El comando `db:seed` crea el administrador inicial y los formularios base definidos por el proyecto.

## Ejecucion en desarrollo

En una terminal, iniciar el backend:

```bash
cd backend
npm run dev
```

En otra terminal, iniciar el frontend:

```bash
cd frontend
npm run dev
```

Por defecto, el backend queda disponible en `http://localhost:3001` y el frontend en `http://localhost:5173`.

## Scripts disponibles

### Backend

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Inicia el backend en modo desarrollo |
| `npm start` | Inicia el backend |
| `npm run db:generate` | Genera migraciones de Drizzle |
| `npm run db:migrate` | Ejecuta migraciones |
| `npm run db:seed` | Carga el administrador y formularios iniciales |
| `npm run db:studio` | Abre Drizzle Studio |

### Frontend

| Comando | Descripcion |
| --- | --- |
| `npm run dev` | Inicia Vite en modo desarrollo |
| `npm run build` | Compila el frontend para produccion |
| `npm run preview` | Sirve localmente la compilacion |

## Seguridad y archivos locales

Las dependencias, variables de entorno, archivos cargados y logs se excluyen mediante `.gitignore`. Antes de desplegar, se deben usar valores seguros para `JWT_SECRET`, `ADMIN_PASSWORD` y las credenciales de la base de datos.
