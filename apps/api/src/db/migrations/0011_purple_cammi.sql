ALTER TABLE "requests" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
UPDATE "requests" SET "type" = 'extenuating_circumstances' WHERE "type" = 'financial_support';--> statement-breakpoint
UPDATE "requests" SET "type" = 'extenuating_circumstances' WHERE "type" = 'academic_support';--> statement-breakpoint
DROP TYPE "public"."request_type";--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('extenuating_circumstances', 'summer_funding_request', 'summer_funding_report', 'requirement_submission');--> statement-breakpoint
ALTER TABLE "requests" ALTER COLUMN "type" SET DATA TYPE "public"."request_type" USING "type"::"public"."request_type";--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "form_data" text;