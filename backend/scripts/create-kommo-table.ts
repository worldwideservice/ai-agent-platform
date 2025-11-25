import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating kommo_tokens table...');

  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS kommo_tokens (
      id TEXT PRIMARY KEY,
      integration_id TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      base_domain TEXT NOT NULL,
      api_domain TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS idx_kommo_tokens_integration_id ON kommo_tokens(integration_id)
  `;

  console.log('✅ kommo_tokens table created successfully!');
}

main()
  .catch((e) => {
    console.error('Error creating table:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
