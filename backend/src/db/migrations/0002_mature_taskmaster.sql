ALTER TABLE "users" ALTER COLUMN "rol" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "rol" SET DEFAULT 'docente'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('docente', 'coordinador', 'interno', 'admin');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "rol" SET DEFAULT 'docente'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "rol" SET DATA TYPE "public"."user_role" USING "rol"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "carrera_coordinada" text;