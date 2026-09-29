CREATE INDEX "goals_scholar_id_updated_at_idx" ON "goals" USING btree ("scholar_id","updated_at");--> statement-breakpoint
CREATE INDEX "scholars_last_activity_idx" ON "scholars" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX "scholars_program_year_status_idx" ON "scholars" USING btree ("program","year","status");--> statement-breakpoint
CREATE INDEX "scholars_nationality_idx" ON "scholars" USING btree ("nationality");--> statement-breakpoint
CREATE INDEX "tasks_scholar_id_active_idx" ON "tasks" USING btree ("scholar_id") WHERE "tasks"."deleted_at" IS NULL;