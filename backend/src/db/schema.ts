import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------
// Enums
// ---------------------------------------------------------------
export const userRoleEnum = pgEnum('user_role', [
  'docente',
  'coordinador',
  'interno',
  'admin',
]);

export const requestEstadoEnum = pgEnum('request_estado', [
  'recibido',
  'observado',
  'aprobado',
  'finalizado',
]);

// ---------------------------------------------------------------
// users
// ---------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  passwordHash: text('password_hash').notNull(),
  rol: userRoleEnum('rol').notNull().default('docente'), 
  carreraCoordinada: text('carrera_coordinada'), 
  formularioAsignado: text('formulario_asignado'), // <-- NUEVO CAMPO AGREGADO AQUI
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------
// form_definitions
// ---------------------------------------------------------------
export const formDefinitions = pgTable('form_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion'),
  schemaJson: jsonb('schema_json').notNull(),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------
// requests
// ---------------------------------------------------------------
export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    formDefinitionId: uuid('form_definition_id')
      .notNull()
      .references(() => formDefinitions.id),
    solicitanteId: uuid('solicitante_id')
      .notNull()
      .references(() => users.id),
    asignadoA: uuid('asignado_a').references(() => users.id),
    estado: requestEstadoEnum('estado').notNull().default('recibido'),
    payload: jsonb('payload').notNull(),
    pdfUrl: text('pdf_url'),
    emailEnviadoAt: timestamp('email_enviado_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_requests_solicitante').on(t.solicitanteId),
    index('idx_requests_estado').on(t.estado),
    index('idx_requests_asignado').on(t.asignadoA),
    index('idx_requests_form_def').on(t.formDefinitionId),
  ]
);

// ---------------------------------------------------------------
// request_history
// ---------------------------------------------------------------
export const requestHistory = pgTable(
  'request_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    estadoAnterior: requestEstadoEnum('estado_anterior'),
    estadoNuevo: requestEstadoEnum('estado_nuevo').notNull(),
    comentario: text('comentario'),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_history_request').on(t.requestId)]
);

// ---------------------------------------------------------------
// request_attachments
// ---------------------------------------------------------------
export const requestAttachments = pgTable(
  'request_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    url: text('url').notNull(),
    tipo: text('tipo'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('idx_attach_request').on(t.requestId)]
);

// ---------------------------------------------------------------
// notifications
// ---------------------------------------------------------------
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    message: text('message').notNull(),
    link: text('link').notNull(), 
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_notifications_user').on(t.userId),
  ]
);

// ---------------------------------------------------------------
// Relations
// ---------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  requestsCreados: many(requests, { relationName: 'solicitante' }),
  requestsAsignados: many(requests, { relationName: 'asignado' }),
  historial: many(requestHistory),
  notifications: many(notifications),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  formDefinition: one(formDefinitions, {
    fields: [requests.formDefinitionId],
    references: [formDefinitions.id],
  }),
  solicitante: one(users, {
    fields: [requests.solicitanteId],
    references: [users.id],
    relationName: 'solicitante',
  }),
  asignado: one(users, {
    fields: [requests.asignadoA],
    references: [users.id],
    relationName: 'asignado',
  }),
  historial: many(requestHistory),
  adjuntos: many(requestAttachments),
}));

export const requestHistoryRelations = relations(requestHistory, ({ one }) => ({
  request: one(requests, {
    fields: [requestHistory.requestId],
    references: [requests.id],
  }),
  autor: one(users, {
    fields: [requestHistory.autorId],
    references: [users.id],
  }),
}));

export const requestAttachmentsRelations = relations(
  requestAttachments,
  ({ one }) => ({
    request: one(requests, {
      fields: [requestAttachments.requestId],
      references: [requests.id],
    }),
  })
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));