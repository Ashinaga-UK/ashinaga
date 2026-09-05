CREATE TABLE "coordinator_meeting_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_id" uuid NOT NULL,
	"meeting_date" date NOT NULL,
	"notes" text,
	"concern" text,
	"further_action" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coordinator_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coordinator_meeting_updates" ADD CONSTRAINT "coordinator_meeting_updates_scholar_id_scholars_id_fk" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_meeting_updates" ADD CONSTRAINT "coordinator_meeting_updates_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_meeting_updates" ADD CONSTRAINT "coordinator_meeting_updates_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_notes" ADD CONSTRAINT "coordinator_notes_scholar_id_scholars_id_fk" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_notes" ADD CONSTRAINT "coordinator_notes_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinator_notes" ADD CONSTRAINT "coordinator_notes_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coordinator_meeting_updates_scholar_id_meeting_date_idx" ON "coordinator_meeting_updates" USING btree ("scholar_id","meeting_date");--> statement-breakpoint
CREATE INDEX "coordinator_notes_scholar_id_created_at_idx" ON "coordinator_notes" USING btree ("scholar_id","created_at");