require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixVectorDimension() {
  try {
    console.log('🔧 Checking current vector dimensions...');
    
    // Проверяем текущую размерность
    const checkQuery = `
      SELECT 
        table_name, 
        column_name,
        udt_name
      FROM information_schema.columns
      WHERE table_name IN ('embeddings', 'memory_nodes')
        AND udt_name = 'vector'
    `;
    
    const result = await pool.query(checkQuery);
    console.log('📊 Current vector columns:');
    console.table(result.rows);
    
    console.log('\n🔄 Updating embeddings table to 1024 dimensions...');
    
    // Удаляем старый столбец и создаём новый с правильной размерностью
    await pool.query('ALTER TABLE embeddings DROP COLUMN IF EXISTS embedding');
    await pool.query('ALTER TABLE embeddings ADD COLUMN embedding vector(1024)');
    
    console.log('✅ embeddings.embedding → vector(1024)');
    
    console.log('\n🔄 Updating memory_nodes table to 1024 dimensions...');
    
    await pool.query('ALTER TABLE memory_nodes DROP COLUMN IF EXISTS embedding');
    await pool.query('ALTER TABLE memory_nodes ADD COLUMN embedding vector(1024)');
    
    console.log('✅ memory_nodes.embedding → vector(1024)');
    
    console.log('\n🎉 Vector dimensions updated successfully!');
    console.log('📏 All vector columns now support 1024 dimensions (Jina AI, Voyage AI, Cohere)');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixVectorDimension();
