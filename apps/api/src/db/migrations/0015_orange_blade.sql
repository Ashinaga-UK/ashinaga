CREATE TYPE "public"."annual_update_status" AS ENUM('draft', 'submitted');--> statement-breakpoint
CREATE TABLE "annual_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholar_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"status" "annual_update_status" DEFAULT 'draft' NOT NULL,
	"highlights" text,
	"part_time_jobs" text,
	"extracurriculars" text,
	"leadership_roles_description" text,
	"leadership_roles_count" integer,
	"pay_it_forward_description" text,
	"pay_it_forward_count" integer,
	"sub_saharan_africa_activities_description" text,
	"sub_saharan_africa_activities_count" integer,
	"independent_internships_count" integer,
	"internships_in_africa_summary" text,
	"internships_elsewhere_summary" text,
	"completed_ashinaga_africa_internship" boolean,
	"academic_year_average_classification" text,
	"academic_year_weighted_grade" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "annual_updates" ADD CONSTRAINT "annual_updates_scholar_id_scholars_id_fk" FOREIGN KEY ("scholar_id") REFERENCES "public"."scholars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "annual_updates_scholar_academic_year_unique" ON "annual_updates" USING btree ("scholar_id","academic_year");