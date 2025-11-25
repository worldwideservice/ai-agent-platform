require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkEmbeddingsData() {
  try {
    console.log('📊 Checking embeddings table data...\n');
    
    // Проверяем общее количество записей
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM embeddings');
    console.log(`Total embeddings: ${totalResult.rows[0].total}`);
    
    // Проверяем записи с NULL embedding
    const nullResult = await pool.query('SELECT COUNT(*) as null_count FROM embeddings WHERE embedding IS NULL');
    console.log(`NULL embeddings: ${nullResult.rows[0].null_count}`);
    
    // Проверяем валидные embeddings
    const validResult = await pool.query('SELECT COUNT(*) as valid_count FROM embeddings WHERE embedding IS NOT NULL');
    console.log(`Valid embeddings: ${validResult.rows[0].valid_count}`);
    
    console.log('\n📋 Recent embeddings (last 5):');
    const recentResult = await pool.query(`
      SELECT 
        id, 
        user_id, 
        source_type,
        source_id,
        SUBSTRING(content, 1, 50) as content_preview,
        CASE WHEN embedding IS NULL THEN 'NULL' ELSE 'OK' END as embedding_status,
        created_at
      FROM embeddings 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.table(recentResult.rows);
    
    console.log('\n🔍 Memory nodes (last 5):');
    const nodesResult = await pool.query(`
      SELECT 
        id,
        agent_id,
        user_id,
        node_type,
        SUBSTRING(content, 1, 40) as content_preview,
        importance,
        created_at
      FROM memory_nodes
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.table(nodesResult.rows);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkEmbeddingsData();
