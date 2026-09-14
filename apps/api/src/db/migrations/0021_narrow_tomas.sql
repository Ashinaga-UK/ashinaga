CREATE TYPE "public"."platform_setup_status" AS ENUM('yes', 'no', 'pending');--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"signposting_url" text,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "scholar_platform_setups" (
	"scholar_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"status" "platform_setup_status" DEFAULT 'pending' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scholar_platform_setups_scholar_id_platform_id_pk" PRIMARY KEY("scholar_id","platform_id")
);
--> statement-breakpoint
ALTER TABLE "scholar_platform_setups" ADD CONSTRAINT "scholar_platform_setups_scholar_id_scholars_id_fk" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholar_platform_setups" ADD CONSTRAINT "scholar_platform_setups_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholar_platform_setups" ADD CONSTRAINT "scholar_platform_setups_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "platforms" ("id", "slug", "name", "signposting_url", "sort_order", "is_active") VALUES
	('11111111-1111-4111-8111-111111111111', 'ashinaga_connect', 'Ashinaga Connect', NULL, 1, true),
	('22222222-2222-4222-8222-222222222222', 'coursera', 'Coursera', NULL, 2, true),
	('33333333-3333-4333-8333-333333333333', 'duolingo', 'Duolingo', NULL, 3, true),
	('44444444-4444-4444-8444-444444444444', 'email', 'Email', NULL, 4, true);