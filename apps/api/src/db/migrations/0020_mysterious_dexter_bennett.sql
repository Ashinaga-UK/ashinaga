CREATE TABLE "required_document_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"file_key" text NOT NULL,
	"file_name" text NOT NULL,
	"file_mime_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "required_document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "required_document_types_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "required_document_files" ADD CONSTRAINT "required_document_files_scholar_id_scholars_id_fk" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_document_files" ADD CONSTRAINT "required_document_files_type_id_required_document_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."required_document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "required_document_files" ADD CONSTRAINT "required_document_files_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "required_document_files_scholar_type_unique" ON "required_document_files" USING btree ("scholar_id","type_id");--> statement-breakpoint
INSERT INTO "required_document_types" ("id", "slug", "label", "description", "is_active", "sort_order")
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'passport', 'Passport copy', 'A clear copy of the candidate''s passport', true, 1),
  ('a1000000-0000-4000-8000-000000000002', 'transcripts', 'Transcripts', 'Academic transcripts', true, 2),
  ('a1000000-0000-4000-8000-000000000003', 'ielts', 'IELTS results', 'IELTS (or equivalent) test results', true, 3)
ON CONFLICT ("slug") DO NOTHING;