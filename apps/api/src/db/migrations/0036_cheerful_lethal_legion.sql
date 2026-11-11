CREATE TABLE "resource_category_reviews" (
	"resource_id" uuid PRIMARY KEY NOT NULL,
	"resource_title" text NOT NULL,
	"legacy_category" text NOT NULL,
	"final_category" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_category_reviews_final_category_check" CHECK ("resource_category_reviews"."final_category" IS NULL OR "resource_category_reviews"."final_category" IN ('Guides and Handbooks', 'Workbooks', 'Forms and Templates', 'How-to Videos', 'Presentations', 'Other'))
);
--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "category" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "proposal_context" boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT INTO "resource_category_reviews" ("resource_id", "resource_title", "legacy_category")
SELECT "id", "title", "category"
FROM "resources";--> statement-breakpoint
UPDATE "resources"
SET "proposal_context" = true
WHERE "category" = 'Proposal';--> statement-breakpoint
UPDATE "resources"
SET "category" = 'Other';--> statement-breakpoint
ALTER TABLE "resource_category_reviews" ADD CONSTRAINT "resource_category_reviews_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_category_reviews" ADD CONSTRAINT "resource_category_reviews_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_category_check" CHECK ("resources"."category" IN ('Guides and Handbooks', 'Workbooks', 'Forms and Templates', 'How-to Videos', 'Presentations', 'Other'));--> statement-breakpoint
DROP TYPE "public"."resource_category";