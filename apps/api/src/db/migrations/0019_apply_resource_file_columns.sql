DO $$ BEGIN
  CREATE TYPE "public"."resource_source_type" AS ENUM('url', 'file');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "source_type" "resource_source_type" DEFAULT 'url' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "file_key" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "file_name" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "file_mime_type" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "resources" DROP CONSTRAINT IF EXISTS "resources_source_columns_check";--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_source_columns_check" CHECK ((
        ("resources"."source_type" = 'url' AND "resources"."url" IS NOT NULL AND "resources"."file_key" IS NULL)
        OR
        ("resources"."source_type" = 'file' AND "resources"."file_key" IS NOT NULL AND "resources"."url" IS NULL)
      ));
