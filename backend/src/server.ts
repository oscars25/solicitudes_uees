import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import 'dotenv/config';

import authPlugin from './plugins/auth';
import authRoutes from './routes/auth';
import formsRoutes from './routes/forms';
import requestsRoutes from './routes/requests';
import notificationsRoutes from './routes/notifications'; // <-- NUEVO IMPORT

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// Crear la carpeta uploads automaticamente si no existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = Fastify({
  logger: true,
  trustProxy: true, // <-- Necesario para leer X-Forwarded-* detrás del proxy de Railway
});

const port = Number(process.env.PORT ?? 3001);

// Helper para normalizar headers que pueden llegar como string o string[]
function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Construye la URL base pública del backend.
// Prioridad: 1) PUBLIC_BASE_URL (env), 2) headers del proxy, 3) localhost (dev)
function buildBaseUrl(headers: Record<string, string | string[] | undefined>): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const proto = getHeaderValue(headers['x-forwarded-proto']) ?? 'http';
  const host =
    getHeaderValue(headers['x-forwarded-host']) ??
    getHeaderValue(headers['host']) ??
    `localhost:${port}`;

  return `${proto}://${host}`;
}

async function main() {
  await app.register(helmet, { crossOriginResourcePolicy: { policy: "cross-origin" } });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
  });

  await app.register(authPlugin);

  app.get('/health', async () => ({ ok: true }));

  // Ruta para procesar la subida del archivo
  app.post('/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'No se subio ningun archivo' });

    const filename = `${Date.now()}-${data.filename.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadsDir, filename);

    await pipeline(data.file, fs.createWriteStream(filepath));

    const baseUrl = buildBaseUrl(req.headers);
    return { url: `${baseUrl}/uploads/${filename}` };
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(formsRoutes, { prefix: '/forms' });
  await app.register(requestsRoutes, { prefix: '/requests' });
  await app.register(notificationsRoutes, { prefix: '/notifications' }); // <-- NUEVO REGISTRO

  await app.listen({ port, host: '::' }); // <-- Cambiado de '0.0.0.0' a '::'
  console.log(`Backend escuchando en el puerto ${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});