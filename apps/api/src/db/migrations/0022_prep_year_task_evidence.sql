ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "phase" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignment_group_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "requires_response" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "requires_attachment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "requires_link" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_responses" ADD COLUMN IF NOT EXISTS "link_url" text;--> statement-breakpoint
UPDATE "tasks" SET "requires_attachment" = true WHERE "type" = 'document_upload';--> statement-breakpoint
UPDATE "tasks" SET "requires_response" = true WHERE "type" IN ('feedback_submission', 'form_completion', 'goal_update');
