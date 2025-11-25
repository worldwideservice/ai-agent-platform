import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  // Remove ?pgbouncer=true for direct connection
  const cleanUrl = databaseUrl.replace('?pgbouncer=true', '');

  const pool = new Pool({
    connectionString: cleanUrl,
  });

  try {
    const migrationPath = path.join(__dirname, '../migrations/add_kb_import_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
