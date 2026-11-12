import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, desc, inArray } from 'drizzle-orm';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/client';
import {
  requests,
  formDefinitions,
  requestHistory,
  users,
  notifications,
} from '../db/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ESTADOS = ['recibido', 'observado', 'aprobado', 'finalizado'] as const;
type Estado = (typeof ESTADOS)[number];

const createRequestSchema = z.object({
  formDefinitionId: z.string().uuid(),
  payload: z.record(z.any()),
});

const changeStatusSchema = z.object({
  estado: z.enum(ESTADOS),
  comentario: z.string().optional(),
});

// Valida el payload contra el schemaJson del formulario
function validarPayload(
  schemaJson: any,
  payload: Record<string, any>
): { ok: true } | { ok: false; faltantes: string[] } {
  const faltantes: string[] = [];
  for (const field of schemaJson.fields ?? []) {
    if (field.required) {
      const v = payload[field.name];
      if (v === undefined || v === null || v === '') {
        faltantes.push(field.name);
      }
    }
  }
  return faltantes.length > 0 ? { ok: false, faltantes } : { ok: true };
}

export default async function requestsRoutes(app: FastifyInstance) {
  // POST /requests - crear solicitud
  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = createRequestSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: 'Datos invalidos', details: body.error.issues });
    }
    const { formDefinitionId, payload } = body.data;

    const [form] = await db
      .select()
      .from(formDefinitions)
      .where(eq(formDefinitions.id, formDefinitionId));
    if (!form || !form.activo) {
      return reply.code(404).send({ error: 'Formulario no encontrado o inactivo' });
    }

    const validacion = validarPayload(form.schemaJson, payload);
    if (!validacion.ok) {
      return reply.code(400).send({
        error: 'Faltan campos requeridos',
        faltantes: validacion.faltantes,
      });
    }

    const bypassApproval = (form.schemaJson as any).bypassApproval === true;
    const estadoInicial = bypassApproval ? 'finalizado' : 'recibido';
    const comentarioInicial = bypassApproval ? 'Evaluación completada y enviada' : 'Solicitud creada';

    const created = await db.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(requests)
        .values({
          formDefinitionId,
          solicitanteId: req.user.id,
          payload,
          estado: estadoInicial,
        })
        .returning();

      await tx.insert(requestHistory).values({
        requestId: nuevo.id,
        estadoAnterior: null,
        estadoNuevo: estadoInicial,
        comentario: comentarioInicial,
        autorId: req.user.id,
      });

      return nuevo;
    });

    // NOTIFICACION: Avisar a internos y admins (si no es bypass)
    if (!bypassApproval) {
      const staff = await db.select().from(users).where(inArray(users.rol, ['interno', 'admin']));
      if (staff.length > 0) {
        await db.insert(notifications).values(
          staff.map(u => ({
            userId: u.id,
            title: 'Nueva Solicitud Recibida',
            message: `Se ha recibido una nueva solicitud: ${form.titulo}`,
            link: `/interno/${created.id}`
          }))
        );
      }
    }

    return reply.code(201).send(created);
  });

  // GET /requests - listar segun rol
  app.get('/', { preHandler: [app.authenticate] }, async (req) => {
    const { rol, id } = req.user;

    if (rol === 'solicitante') {
      return db
        .select()
        .from(requests)
        .where(eq(requests.solicitanteId, id))
        .orderBy(desc(requests.createdAt));
    }

    return db.select().from(requests).orderBy(desc(requests.createdAt));
  });

  // GET /requests/:id - detalle con historial
  app.get('/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const [request] = await db
      .select()
      .from(requests)
      .where(eq(requests.id, id));
    if (!request) return reply.code(404).send({ error: 'No encontrado' });

    if (req.user.rol === 'solicitante' && request.solicitanteId !== req.user.id) {
      return reply.code(403).send({ error: 'Sin permisos' });
    }

    const [form] = await db
      .select()
      .from(formDefinitions)
      .where(eq(formDefinitions.id, request.formDefinitionId));

    const history = await db
      .select()
      .from(requestHistory)
      .where(eq(requestHistory.requestId, id))
      .orderBy(requestHistory.createdAt);

    const [solicitante] = await db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, request.solicitanteId));

    return {
      ...request,
      formDefinition: form,
      historial: history,
      solicitante,
    };
  });

  // PATCH /requests/:id/status - cambiar estado (interno/admin)
  app.patch(
    '/:id/status',
    { preHandler: [app.requireRol(['interno', 'admin'])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = changeStatusSchema.safeParse(req.body);
      if (!body.success) {
        return reply.code(400).send({ error: 'Datos invalidos' });
      }
      const { estado: nuevoEstado, comentario } = body.data;

      const [request] = await db
        .select()
        .from(requests)
        .where(eq(requests.id, id));
      if (!request) return reply.code(404).send({ error: 'No encontrado' });

      const [form] = await db
        .select()
        .from(formDefinitions)
        .where(eq(formDefinitions.id, request.formDefinitionId));
      const transiciones = (form?.schemaJson as any)?.transiciones ?? {};
      const permitidas: string[] = transiciones[request.estado] ?? [];
      
      if (!permitidas.includes(nuevoEstado)) {
        return reply.code(400).send({
          error: `Transicion no permitida: ${request.estado} -> ${nuevoEstado}`,
          permitidas,
        });
      }

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(requests)
          .set({
            estado: nuevoEstado,
            asignadoA: request.asignadoA ?? req.user.id,
            updatedAt: new Date(),
          })
          .where(eq(requests.id, id))
          .returning();

        await tx.insert(requestHistory).values({
          requestId: id,
          estadoAnterior: request.estado,
          estadoNuevo: nuevoEstado,
          comentario: comentario ?? null,
          autorId: req.user.id,
        });

        return row;
      });

      // NOTIFICACION: Avisar al solicitante
      await db.insert(notifications).values({
        userId: request.solicitanteId,
        title: `Solicitud ${nuevoEstado}`,
        message: `Tu solicitud de ${form?.titulo} ha pasado a estado: ${nuevoEstado}`,
        link: `/solicitudes/${id}`
      });

      // Disparar webhook a n8n cuando pasa a aprobado
      if (nuevoEstado === 'aprobado') {
        const webhookUrl = process.env.N8N_WEBHOOK_APROBADO;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: id }),
          }).catch((err) => app.log.error({ err }, 'Fallo webhook n8n'));
        }
      }

      return updated;
    }
  );

  // POST /requests/:id/email-sent
  app.post(
    '/:id/email-sent',
    { preHandler: [app.requireRol(['interno', 'admin'])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const { pdfUrl } = (req.body ?? {}) as { pdfUrl?: string };

      const [updated] = await db
        .update(requests)
        .set({
          emailEnviadoAt: new Date(),
          pdfUrl: pdfUrl ?? null,
        })
        .where(eq(requests.id, id))
        .returning();

      if (!updated) return reply.code(404).send({ error: 'No encontrado' });
      return updated;
    }
  );

  // PATCH /requests/:id/resubmit - Solicitante corrige y reenvia
  app.patch(
    '/:id/resubmit',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = createRequestSchema.pick({ payload: true }).safeParse(req.body);
      
      if (!body.success) {
        return reply.code(400).send({ error: 'Datos invalidos', details: body.error.issues });
      }

      const [request] = await db.select().from(requests).where(eq(requests.id, id));
      if (!request) return reply.code(404).send({ error: 'No encontrado' });

      if (request.solicitanteId !== req.user.id) {
        return reply.code(403).send({ error: 'Sin permisos' });
      }
      if (request.estado !== 'observado') {
        return reply.code(400).send({ error: 'Solo se pueden reenviar solicitudes observadas' });
      }

      const [form] = await db.select().from(formDefinitions).where(eq(formDefinitions.id, request.formDefinitionId));

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(requests)
          .set({
            payload: body.data.payload,
            estado: 'recibido',
            updatedAt: new Date(),
          })
          .where(eq(requests.id, id))
          .returning();

        await tx.insert(requestHistory).values({
          requestId: id,
          estadoAnterior: 'observado',
          estadoNuevo: 'recibido',
          comentario: 'Solicitud corregida y reenviada por el solicitante',
          autorId: req.user.id,
        });

        return row;
      });

      // NOTIFICACION: Avisar a internos y admins que fue corregida
      const staff = await db.select().from(users).where(inArray(users.rol, ['interno', 'admin']));
      if (staff.length > 0) {
        await db.insert(notifications).values(
          staff.map(u => ({
            userId: u.id,
            title: 'Solicitud Corregida',
            message: `El solicitante ha corregido la solicitud de ${form?.titulo}. Requiere revisión de nuevo.`,
            link: `/interno/${id}`
          }))
        );
      }

      return updated;
    }
  );

  // -----------------------------------------------------------
  // GET /requests/:id/pdf - Generar y descargar el PDF
  // -----------------------------------------------------------
  app.get(
    '/:id/pdf',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      const [request] = await db.select().from(requests).where(eq(requests.id, id));
      if (!request) return reply.code(404).send({ error: 'No encontrado' });

      if (req.user.rol === 'solicitante' && request.solicitanteId !== req.user.id) {
        return reply.code(403).send({ error: 'Sin permisos' });
      }

      const [form] = await db.select().from(formDefinitions).where(eq(formDefinitions.id, request.formDefinitionId));
      const [solicitante] = await db.select().from(users).where(eq(users.id, request.solicitanteId));

      const logoPath = path.join(__dirname, '../assets/uees-logo.png');
      let logoBase64 = '';
      if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
      }

      let html = '';

      // 1. PLANTILLA ESPECÍFICA PARA EVALUACIÓN DE MONITORES
      if (form.slug === 'evaluacion-monitor-virtual') {
        const p = request.payload as any;
        
        const criterios = [
          'Los informes y recomendaciones entregados por el monitor virtual son claros, pertinentes y útiles para los tutores y la coordinación de carrera.',
          'El monitor virtual realizó un seguimiento diario constante y efectivo al tutor virtual y a los estudiantes en las aulas asignadas.',
          '¿Cómo evalúa el acompañamiento en informes a las coordinaciones para la prevención de posibles deserciones estudiantiles?',
          'Nivel de comunicación asertiva y oportuna con el tutor y los estudiantes.',
          'Capacidad de resolver incidencias técnicas básicas o las canaliza de forma adecuada a las áreas correspondientes',
          'Promueve en sus informes el uso y adopción de tecnologías a fin de fortalecer los procesos de formación en el Aula virtual',
          'Cumple puntualmente con la entrega de reportes, asistencia a reuniones y tareas asignadas.',
          'Mantiene una actitud colaborativa, ética y profesional en su interacción con tutores, estudiantes y personal de apoyo.'
        ];

        const filasCriterios = criterios.map((texto, index) => `
          <tr>
            <td style="text-align: left; padding: 8px; border: 1px solid black;">${texto}</td>
            <td style="text-align: center; padding: 8px; border: 1px solid black;">${p['crit_' + (index + 1)] || 'N/A'}</td>
          </tr>
        `).join('');

        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: black; font-size: 12px; }
              .header-container { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; position: relative; }
              .logo { position: absolute; left: 0; height: 80px; }
              .header-text { text-align: center; width: 100%; }
              .header-text h2 { margin: 0; font-size: 14px; font-weight: bold; }
              .header-text h3 { margin: 2px 0; font-size: 12px; font-weight: normal; }
              .title { text-align: center; color: #074E8C; font-size: 16px; font-weight: bold; margin: 20px 0 30px 0; }
              
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .table-datos td { padding: 6px; border: 1px solid black; }
              .table-datos .label { width: 25%; font-weight: bold; }
              
              .table-criterios th { padding: 8px; border: 1px solid black; background: #f0f0f0; font-weight: bold; text-align: center; }
              .table-criterios th:first-child { text-align: left; }
              .table-criterios th:last-child { width: 25%; }
              
              .pregunta { font-weight: bold; margin-bottom: 10px; margin-top: 20px; }
              .respuesta { margin-bottom: 40px; line-height: 1.5; }
              .footer { position: absolute; bottom: 30px; left: 0; right: 0; text-align: center; color: #888; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="header-container">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
              <div class="header-text">
                <h2>UNIVERSIDAD EVANGÉLICA DE EL SALVADOR</h2>
                <h3>VICERRECTORÍA DE INNOVACIÓN Y TECNOLOGÍA EDUCATIVA</h3>
                <h3>DIRECCIÓN DE TECNOLOGÍA EDUCATIVA</h3>
              </div>
            </div>

            <div class="title">Resumen de Evaluación de Monitores Virtuales de Aulas no Presenciales</div>

            <table class="table-datos">
              <tr>
                <td class="label">Ciclo</td>
                <td>${p.ciclo || 'N/A'}-${new Date().getFullYear()}</td>
              </tr>
              <tr>
                <td class="label">Nombre del Monitor</td>
                <td>${p.monitor_evaluado || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Evaluado por</td>
                <td>${solicitante.nombre}</td>
              </tr>
            </table>

            <table class="table-criterios">
              <thead>
                <tr>
                  <th>Criterios de Evaluación</th>
                  <th>Resultados escala Likert</th>
                </tr>
              </thead>
              <tbody>
                ${filasCriterios}
              </tbody>
            </table>

            <div class="pregunta">¿Qué aspectos considera que se deben mejorar con relación al desempeño del Monitor Virtual para el próximo ciclo académico?</div>
            <div class="respuesta">${p.aspectos_mejorar || 'N/A'}</div>

            <div class="footer">
              Instrumento de evaluación elaborado por la Dirección de Tecnología Educativa – UEES
            </div>
          </body>
          </html>
        `;
      } 
      // 2. PLANTILLA GENÉRICA (Para OVAS, RV, Contenidistas, etc.)
      else {
        const fields = form.schemaJson.fields.filter((f: any) => f.type !== 'info');
        const groups = [...new Set(fields.map((f: any) => f.group || 'Información General'))] as string[];

        let htmlGroups = '';
        
        for (const group of groups) {
          const groupFields = fields.filter((f: any) => (f.group || 'Información General') === group);
          
          const rows = groupFields.map((f: any) => {
            const value = request.payload[f.name] ? request.payload[f.name] : 'N/A';
            return `
              <tr>
                <td style="font-weight: bold; padding: 6px 0; font-size: 11px; text-transform: uppercase; width: 40%; border-bottom: 1px solid #f0f0f0;">${f.label}:</td>
                <td style="padding: 6px 0; font-size: 12px; border-bottom: 1px solid #f0f0f0;">${value}</td>
              </tr>
            `;
          }).join('');

          htmlGroups += `
            <div style="margin-bottom: 25px;">
              <h3 style="text-align: left; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; color: #000; border-bottom: 2px solid #074E8C; padding-bottom: 5px;">
                ${group}
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          `;
        }

        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #000; font-size: 12px; }
              .header-container { display: flex; align-items: center; justify-content: center; margin-bottom: 30px; position: relative; border-bottom: 3px solid #074E8C; padding-bottom: 20px; }
              .logo { position: absolute; left: 0; height: 70px; }
              .header-text { text-align: center; width: 100%; }
              .header-text h2 { margin: 0; font-size: 14px; font-weight: bold; color: #074E8C; }
              .header-text h3 { margin: 2px 0; font-size: 11px; font-weight: normal; color: #333; }
              .title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0 30px 0; text-transform: uppercase; color: #074E8C; }
            </style>
          </head>
          <body>
            <div class="header-container">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : ''}
              <div class="header-text">
                <h2>UNIVERSIDAD EVANGÉLICA DE EL SALVADOR</h2>
                <h3>VICERRECTORÍA DE INNOVACIÓN Y TECNOLOGÍA EDUCATIVA</h3>
                <h3>DIRECCIÓN DE TECNOLOGÍA EDUCATIVA</h3>
              </div>
            </div>
            
            <div class="title">${form.titulo}</div>

            ${htmlGroups}

            <div style="text-align: center; font-size: 10px; color: #888; margin-top: 50px; border-top: 1px solid #eee; padding-top: 10px;">
              Documento generado automáticamente por el Sistema de Solicitudes DTE - ${new Date().toLocaleString()}
            </div>
          </body>
          </html>
        `;
      }

      // Iniciar Puppeteer
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
      await browser.close();

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="Solicitud-${request.id.slice(0, 8)}.pdf"`)
        .send(pdfBuffer);
    }
  );
}