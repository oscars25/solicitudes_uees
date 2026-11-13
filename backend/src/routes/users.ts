import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../db/client';
import { users } from '../db/schema';

const userSchema = z.object({
  nombre: z.string().min(2),
  email: z.string().email(),
  password: z.string().optional(), 
  rol: z.enum(['docente', 'coordinador', 'interno', 'admin']),
  carreraCoordinada: z.string().optional().nullable(),
  formularioAsignado: z.string().optional().nullable(), // <-- ESTE ERA EL CAMPO FALTANTE
  activo: z.boolean().optional(),
});

export default async function usersRoutes(app: FastifyInstance) {
  // Obtener todos los usuarios (Solo Admin)
  app.get('/', { preHandler: [app.requireRol(['admin'])] }, async () => {
    return db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        rol: users.rol,
        carreraCoordinada: users.carreraCoordinada,
        formularioAsignado: users.formularioAsignado, // <-- Aseguramos que se devuelva
        activo: users.activo,
        createdAt: users.createdAt,
      })
      .from(users);
  });

  // Obtener solo los coordinadores (Para el auto-completado de formularios)
  app.get('/coordinadores', { preHandler: [app.authenticate] }, async () => {
    return db
      .select({
        nombre: users.nombre,
        email: users.email,
        carreraCoordinada: users.carreraCoordinada,
      })
      .from(users)
      .where(eq(users.rol, 'coordinador'));
  });

  // Crear un usuario (Solo Admin)
  app.post('/', { preHandler: [app.requireRol(['admin'])] }, async (req, reply) => {
    const body = userSchema.safeParse(req.body);
    if (!body.success || !body.data.password) {
      return reply.code(400).send({ error: 'Datos invalidos o falta contraseña' });
    }

    const existing = await db.select().from(users).where(eq(users.email, body.data.email));
    if (existing.length > 0) return reply.code(409).send({ error: 'El email ya existe' });

    const passwordHash = await bcrypt.hash(body.data.password, 10);
    const [created] = await db.insert(users).values({
      nombre: body.data.nombre,
      email: body.data.email,
      passwordHash,
      rol: body.data.rol,
      carreraCoordinada: body.data.carreraCoordinada,
      formularioAsignado: body.data.formularioAsignado, // <-- Guardamos el formulario
    }).returning();

    return { id: created.id, email: created.email };
  });

  // Editar un usuario (Solo Admin)
  app.patch('/:id', { preHandler: [app.requireRol(['admin'])] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = userSchema.partial().safeParse(req.body); 
    
    if (!body.success) return reply.code(400).send({ error: 'Datos invalidos' });

    const updateData: any = { ...body.data };
    
    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 10);
    }
    delete updateData.password;

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    if (!updated) return reply.code(404).send({ error: 'Usuario no encontrado' });
    
    return updated;
  });
}