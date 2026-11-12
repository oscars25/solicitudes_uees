import type { FastifyInstance } from 'fastify';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { notifications } from '../db/schema';

export default async function notificationsRoutes(app: FastifyInstance) {
  // GET /notifications - Obtener mis notificaciones
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(20);
  });

  // PATCH /notifications/:id/read - Marcar una como leida
  app.patch('/:id/read', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user.id)))
      .returning();
      
    if (!updated) return reply.code(404).send({ error: 'Notificacion no encontrada' });
    return updated;
  });

  // PATCH /notifications/read-all - Marcar todas como leidas
  app.patch('/read-all', { preHandler: [app.authenticate] }, async (req) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, req.user.id));
    return { ok: true };
  });
}