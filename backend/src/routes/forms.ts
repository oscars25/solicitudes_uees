import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { formDefinitions } from '../db/schema.js';

const createFormSchema = z.object({
  slug: z.string().min(2),
  titulo: z.string().min(2),
  descripcion: z.string().optional(),
  schemaJson: z.object({
    fields: z.array(z.any()),
    transiciones: z.record(z.array(z.string())).optional(),
  }),
});

const updateFormSchema = z.object({
  titulo: z.string().min(2).optional(),
  descripcion: z.string().optional(),
  schemaJson: z
    .object({
      fields: z.array(z.any()),
      transiciones: z.record(z.array(z.string())).optional(),
    })
    .optional(),
  activo: z.boolean().optional(),
});

export default async function formsRoutes(app: FastifyInstance) {
  // GET /forms - cualquier usuario autenticado (solo activos)
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    return db
      .select()
      .from(formDefinitions)
      .where(eq(formDefinitions.activo, true));
  });

  // GET /forms/:slug
  app.get('/:slug', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const [form] = await db
      .select()
      .from(formDefinitions)
      .where(eq(formDefinitions.slug, slug));
    if (!form) return reply.code(404).send({ error: 'Formulario no encontrado' });
    return form;
  });

  // POST /forms - solo admin
  app.post('/', { preHandler: [app.requireRol(['admin'])] }, async (req, reply) => {
    const body = createFormSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Datos invalidos', details: body.error.issues });
    }
    const { slug, titulo, descripcion, schemaJson } = body.data;

    const existing = await db
      .select()
      .from(formDefinitions)
      .where(eq(formDefinitions.slug, slug));
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'El slug ya existe' });
    }

    const [created] = await db
      .insert(formDefinitions)
      .values({ slug, titulo, descripcion, schemaJson })
      .returning();
    return created;
  });

  // PATCH /forms/:id - solo admin
  app.patch('/:id', { preHandler: [app.requireRol(['admin'])] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateFormSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Datos invalidos' });
    }
    const [updated] = await db
      .update(formDefinitions)
      .set(body.data)
      .where(eq(formDefinitions.id, id))
      .returning();
    if (!updated) return reply.code(404).send({ error: 'No encontrado' });
    return updated;
  });
}