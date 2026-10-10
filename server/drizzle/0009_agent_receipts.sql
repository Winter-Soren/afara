ALTER TABLE "uploads" ADD COLUMN "agent_export_id" varchar(36);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "artifact_sha256" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX "uploads_agent_export_id" ON "uploads" ("agent_export_id") WHERE "agent_export_id" IS NOT NULL;
