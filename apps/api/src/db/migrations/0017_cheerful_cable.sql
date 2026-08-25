CREATE TYPE "public"."program_stage" AS ENUM('prep_year', 'scholar');--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "program_stage" "program_stage" DEFAULT 'scholar' NOT NULL;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "intended_university" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "intended_course" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "degree_pathway" text;--> statement-breakpoint
UPDATE "scholars" SET "program_stage" = 'prep_year' WHERE "year" = 'Pre-University';