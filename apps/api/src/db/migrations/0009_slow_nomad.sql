CREATE TYPE "public"."goal_term" AS ENUM('term_1', 'term_2', 'term_3');--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "term" "goal_term";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "assigned_to" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "major_category" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "field_of_study" text;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;