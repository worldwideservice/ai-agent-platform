require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkKBSchema() {
  try {
    console.log('📚 Checking Knowledge Base schema...\n');
    
    // Проверяем таблицы KB
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'kb%'
      ORDER BY table_name
    `);
    
    console.log('📊 KB Tables:');
    console.table(tables.rows);
    
    if (tables.rows.length > 0) {
      // Проверяем структуру kb_categories
      console.log('\n📁 kb_categories schema:');
      const categoriesSchema = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'kb_categories'
        ORDER BY ordinal_position
      `);
      console.table(categoriesSchema.rows);
      
      // Проверяем структуру kb_articles
      console.log('\n📄 kb_articles schema:');
      const articlesSchema = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'kb_articles'
        ORDER BY ordinal_position
      `);
      console.table(articlesSchema.rows);
      
      // Проверяем данные
      const categoriesCount = await pool.query('SELECT COUNT(*) as count FROM kb_categories');
      const articlesCount = await pool.query('SELECT COUNT(*) as count FROM kb_articles');
      
      console.log(`\n📊 Data:
- Categories: ${categoriesCount.rows[0].count}
- Articles: ${articlesCount.rows[0].count}`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkKBSchema();
