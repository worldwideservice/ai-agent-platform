require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Connecting to Supabase PostgreSQL...');

    const sqlFile = path.join(__dirname, '../migrations/001_initial_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Executing SQL migration...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');

    // Verify tables created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
