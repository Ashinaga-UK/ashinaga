ALTER TABLE "proposal_submissions" ADD COLUMN IF NOT EXISTS "file_key" text;
ALTER TABLE "proposal_submissions" ADD COLUMN IF NOT EXISTS "file_name" text;
ALTER TABLE "proposal_submissions" ADD COLUMN IF NOT EXISTS "file_mime_type" text;
ALTER TABLE "proposal_submissions" ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
