-- Add new columns first
ALTER TABLE "goals" ADD COLUMN "related_skills" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "action_plan" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "review_notes" text;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "completion_scale" integer DEFAULT 1 NOT NULL;--> statement-breakpoint

-- Convert category to text and transform old values to new values
ALTER TABLE "goals" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint

-- Map old categories to new ones
UPDATE "goals" SET "category" = 'academic_development' WHERE "category" = 'academic';--> statement-breakpoint
UPDATE "goals" SET "category" = 'personal_development' WHERE "category" = 'personal';--> statement-breakpoint
UPDATE "goals" SET "category" = 'professional_development' WHERE "category" = 'career';--> statement-breakpoint
UPDATE "goals" SET "category" = 'personal_development' WHERE "category" = 'leadership';--> statement-breakpoint
UPDATE "goals" SET "category" = 'personal_development' WHERE "category" = 'community';--> statement-breakpoint

-- Drop old enum and create new one
DROP TYPE "public"."goal_category";--> statement-breakpoint
CREATE TYPE "public"."goal_category" AS ENUM('academic_development', 'personal_development', 'professional_development');--> statement-breakpoint

-- Convert category back to enum
ALTER TABLE "goals" ALTER COLUMN "category" SET DATA TYPE "public"."goal_category" USING "category"::"public"."goal_category";