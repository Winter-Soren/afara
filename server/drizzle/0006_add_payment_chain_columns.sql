ALTER TABLE "uploads" ADD COLUMN "payment_chain" varchar(10) NOT NULL DEFAULT 'sol';
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "payment_token" varchar(10) NOT NULL DEFAULT 'SOL';
--> statement-breakpoint

ALTER TABLE "transaction" ADD COLUMN "payment_chain" varchar(10) NOT NULL DEFAULT 'sol';
--> statement-breakpoint
ALTER TABLE "transaction" ADD COLUMN "payment_token" varchar(10) NOT NULL DEFAULT 'SOL';
--> statement-breakpoint
