import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkEmbeddings() {
  try {
    console.log('🔍 Checking embeddings in database...\n');

    // Count by source type
    const countResult = await pool.query(`
      SELECT source_type, COUNT(*) as count
      FROM embeddings
      GROUP BY source_type
    `);

    console.log('📊 Embeddings by source type:');
    if (countResult.rows.length === 0) {
      console.log('  ⚠️  No embeddings found at all!');
    } else {
      countResult.rows.forEach((row: any) => {
        console.log(`  - ${row.source_type}: ${row.count}`);
      });
    }
    console.log('');

    // Get recent kb_article embeddings
    const kbResult = await pool.query(`
      SELECT id, user_id, source_id, metadata, created_at,
             length(embedding::text) as embedding_length
      FROM embeddings
      WHERE source_type = 'kb_article'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('📄 Recent KB article embeddings:');
    if (kbResult.rows.length === 0) {
      console.log('  ⚠️  No KB article embeddings found!');
    } else {
      kbResult.rows.forEach((row: any) => {
        console.log(`  - ID: ${row.id}`);
        console.log(`    User: ${row.user_id}`);
        console.log(`    Source: ${row.source_id}`);
        console.log(`    Metadata: ${JSON.stringify(row.metadata)}`);
        console.log(`    Embedding length: ${row.embedding_length}`);
        console.log(`    Created: ${row.created_at}`);
        console.log('');
      });
    }

    // Check if there are ANY embeddings for the test user
    const testUserId = '778c4bb2-e271-49d8-8899-95ddf680ac73'; // From test script
    const userResult = await pool.query(`
      SELECT source_type, COUNT(*) as count
      FROM embeddings
      WHERE user_id = $1
      GROUP BY source_type
    `, [testUserId]);

    console.log(`📊 Embeddings for test user (${testUserId}):`);
    if (userResult.rows.length === 0) {
      console.log('  ⚠️  No embeddings for this user!');
    } else {
      userResult.rows.forEach((row: any) => {
        console.log(`  - ${row.source_type}: ${row.count}`);
      });
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmbeddings();
