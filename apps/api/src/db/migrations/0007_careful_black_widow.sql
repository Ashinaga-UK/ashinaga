ALTER TABLE "announcements" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "announcements" ADD COLUMN "archived_by" text;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_archived_by_user_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;