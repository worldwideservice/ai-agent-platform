require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const agentId = process.argv[2];
if (!agentId) {
  console.error('Usage: node create-integration.js <agent_id>');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Insert integration
    const result = await pool.query(`
      INSERT INTO integrations (id, agent_id, integration_type, is_connected, connected_at, last_synced, created_at, updated_at)
      VALUES (gen_random_uuid()::text, $1, 'kommo', true, NOW(), NOW(), NOW(), NOW())
      RETURNING id
    `, [agentId]);

    const integrationId = result.rows[0].id;
    console.log('✅ Integration created:', integrationId);

    // Update kommo_tokens to point to new integration
    await pool.query(`
      UPDATE kommo_tokens
      SET integration_id = $1
      WHERE integration_id = '5d11ca96-7a38-43ad-a4b4-674cd6e23d9c'
    `, [integrationId]);

    console.log('✅ Token linked to new integration');
    console.log('🎯 Agent ID:', agentId);
    console.log('🎯 Integration ID:', integrationId);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

run();
