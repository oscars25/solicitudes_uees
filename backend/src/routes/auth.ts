import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2),
  password: z.string().min(8),
});

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/register - publico, crea docentes
  app.post('/register', async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Datos invalidos', details: body.error.issues });
    }
    const { email, nombre, password } = body.data;

    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'El email ya esta registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({ 
        email, 
        nombre, 
        passwordHash, 
        rol: 'docente' // <-- Rol por defecto ahora es docente
      })
      .returning();

    return {
      id: created.id,
      email: created.email,
      nombre: created.nombre,
      rol: created.rol,
    };
  });

  // POST /auth/login
  app.post('/login', async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Datos invalidos' });
    }
    const { email, password } = body.data;

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.activo) {
      return reply.code(401).send({ error: 'Credenciales invalidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: 'Credenciales invalidas' });
    }

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        carreraCoordinada: user.carreraCoordinada,
        formularioAsignado: user.formularioAsignado, // <-- NUEVO CAMPO
      },
    };
  });

  // GET /auth/me
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id));
    if (!user) return { error: 'Usuario no encontrado' };
    
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      carreraCoordinada: user.carreraCoordinada,
      formularioAsignado: user.formularioAsignado, // <-- NUEVO CAMPO
    };
  });
}