ALTER TABLE "jwks" ALTER COLUMN "private_jwk" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jwks" ALTER COLUMN "active" SET DEFAULT false;