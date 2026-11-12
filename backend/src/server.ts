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

const app = Fastify({ logger: true });

async function main() {
  await app.register(helmet, { crossOriginResourcePolicy: { policy: "cross-origin" } });
  
  await app.register(cors, {
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
    
    return { url: `http://localhost:3001/uploads/${filename}` };
  });

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(formsRoutes, { prefix: '/forms' });
  await app.register(requestsRoutes, { prefix: '/requests' });
  await app.register(notificationsRoutes, { prefix: '/notifications' }); // <-- NUEVO REGISTRO

  const port = Number(process.env.PORT ?? 3001);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Backend escuchando en http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});