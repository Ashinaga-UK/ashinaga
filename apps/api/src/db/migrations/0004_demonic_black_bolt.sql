CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "aai_scholar_id" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "address_home_country" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "passport_expiration_date" date;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "visa_expiration_date" date;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "emergency_contact_country_of_study" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "emergency_contact_home_country" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "graduation_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "university_id" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "dietary_information" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "kokorozashi" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "long_term_career_plan" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD COLUMN "post_graduation_plan" text;--> statement-breakpoint
ALTER TABLE "scholars" ADD CONSTRAINT "scholars_aai_scholar_id_unique" UNIQUE("aai_scholar_id");