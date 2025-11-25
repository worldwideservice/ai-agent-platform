import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create direct connection to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addApiDomainColumn() {
  try {
    console.log('🔧 Adding api_domain column to kommo_tokens table...');

    // Добавляем колонку api_domain если её нет
    await pool.query(`
      ALTER TABLE kommo_tokens
      ADD COLUMN IF NOT EXISTS api_domain VARCHAR(255) DEFAULT 'api-g.kommo.com'
    `);

    console.log('✅ Added api_domain column successfully');

    // Проверяем структуру таблицы
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'kommo_tokens'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Current kommo_tokens table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

addApiDomainColumn();