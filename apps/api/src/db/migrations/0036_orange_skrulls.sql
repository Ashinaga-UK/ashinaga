-- The previous API image selects account.expires_at. Migrations run before that
-- image is replaced, so this adds the Better Auth 1.6 columns beside it.
-- 1.6 does not map expires_at, and this snapshot does not either.
ALTER TABLE "account" ADD COLUMN "access_token_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "account" SET "access_token_expires_at" = "expires_at";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "refresh_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "scope" text;
