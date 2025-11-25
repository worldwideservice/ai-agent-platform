-- Create KommoToken table
CREATE TABLE IF NOT EXISTS "kommo_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "integration_id" TEXT NOT NULL UNIQUE,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "base_domain" TEXT NOT NULL,
  "api_domain" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Create index on integration_id
CREATE INDEX IF NOT EXISTS "kommo_tokens_integration_id_idx" ON "kommo_tokens"("integration_id");
