import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_crm_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying CRM tables migration...');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
