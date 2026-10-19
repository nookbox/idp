CREATE TABLE "jwks" (
	"kid" text PRIMARY KEY NOT NULL,
	"public_jwk" jsonb NOT NULL,
	"private_jwk" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
