UPDATE "uploads" SET "payment_chain" = 'sol', "payment_token" = 'SOL' WHERE "payment_chain" IS NULL;
--> statement-breakpoint
UPDATE "transaction" SET "payment_chain" = 'sol', "payment_token" = 'SOL' WHERE "payment_chain" IS NULL;
--> statement-breakpoint
