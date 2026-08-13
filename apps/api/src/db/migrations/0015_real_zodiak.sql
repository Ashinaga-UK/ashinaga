CREATE TYPE "public"."resource_category" AS ENUM('LDF', 'Handbook', 'Proposal', 'Support');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('draft', 'live');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('Guide', 'Handbook', 'Template');--> statement-breakpoint
CREATE TABLE "resource_filters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"filter_type" text NOT NULL,
	"filter_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" "resource_type" NOT NULL,
	"category" "resource_category" NOT NULL,
	"url" text NOT NULL,
	"status" "resource_status" DEFAULT 'draft' NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_filters" ADD CONSTRAINT "resource_filters_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;