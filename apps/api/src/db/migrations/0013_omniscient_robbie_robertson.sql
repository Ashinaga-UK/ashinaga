CREATE TABLE "request_assignees" (
	"request_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_assignees_request_id_user_id_pk" PRIMARY KEY("request_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "request_assignees" ADD CONSTRAINT "request_assignees_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignees" ADD CONSTRAINT "request_assignees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "request_assignees" ("request_id", "user_id", "assigned_at")
SELECT "id", "assigned_to", "created_at"
FROM "requests"
WHERE "assigned_to" IS NOT NULL
ON CONFLICT DO NOTHING;