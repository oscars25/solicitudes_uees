CREATE TYPE "public"."request_estado" AS ENUM('recibido', 'observado', 'aprobado', 'finalizado');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('solicitante', 'interno', 'admin');--> statement-breakpoint
CREATE TABLE "form_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"schema_json" jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "request_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"url" text NOT NULL,
	"tipo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"estado_anterior" "request_estado",
	"estado_nuevo" "request_estado" NOT NULL,
	"comentario" text,
	"autor_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_definition_id" uuid NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"asignado_a" uuid,
	"estado" "request_estado" DEFAULT 'recibido' NOT NULL,
	"payload" jsonb NOT NULL,
	"pdf_url" text,
	"email_enviado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "user_role" DEFAULT 'solicitante' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_form_definition_id_form_definitions_id_fk" FOREIGN KEY ("form_definition_id") REFERENCES "public"."form_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_solicitante_id_users_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_asignado_a_users_id_fk" FOREIGN KEY ("asignado_a") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_attach_request" ON "request_attachments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_history_request" ON "request_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_requests_solicitante" ON "requests" USING btree ("solicitante_id");--> statement-breakpoint
CREATE INDEX "idx_requests_estado" ON "requests" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_requests_asignado" ON "requests" USING btree ("asignado_a");--> statement-breakpoint
CREATE INDEX "idx_requests_form_def" ON "requests" USING btree ("form_definition_id");