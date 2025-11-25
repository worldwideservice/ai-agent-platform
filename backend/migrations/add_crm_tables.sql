-- Создаём таблицу контактов
CREATE TABLE IF NOT EXISTS "contacts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "company" TEXT,
  "position" TEXT,
  "tags" TEXT,
  "crm_id" TEXT NOT NULL,
  "crm_type" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("crm_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "contacts_user_id_idx" ON "contacts"("user_id");
CREATE INDEX IF NOT EXISTS "contacts_crm_id_idx" ON "contacts"("crm_id");

-- Создаём таблицу сделок
CREATE TABLE IF NOT EXISTS "deals" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION,
  "currency" TEXT,
  "status" TEXT NOT NULL,
  "stage" TEXT,
  "pipeline_id" TEXT,
  "pipeline_name" TEXT,
  "contact_id" TEXT,
  "tags" TEXT,
  "crm_id" TEXT NOT NULL,
  "crm_type" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("crm_id", "user_id"),
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "deals_user_id_idx" ON "deals"("user_id");
CREATE INDEX IF NOT EXISTS "deals_crm_id_idx" ON "deals"("crm_id");
CREATE INDEX IF NOT EXISTS "deals_contact_id_idx" ON "deals"("contact_id");

-- Добавляем updatedAt в users если его нет
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
