CREATE TABLE "staff_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"scholar_id" uuid,
	"scholar_name" text,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"href" text NOT NULL,
	"request_type" text,
	"dedupe_suffix" text DEFAULT '' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_notifications" ADD CONSTRAINT "staff_notifications_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_notifications_recipient_created_idx" ON "staff_notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "staff_notifications_recipient_unread_idx" ON "staff_notifications" USING btree ("recipient_user_id") WHERE "staff_notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_notifications_recipient_kind_entity_dedupe_unique" ON "staff_notifications" USING btree ("recipient_user_id","kind","entity_id","dedupe_suffix");