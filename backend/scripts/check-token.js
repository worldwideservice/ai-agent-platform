import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create direct connection to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkToken() {
  try {
    const result = await pool.query(`
      SELECT * FROM kommo_tokens
      WHERE integration_id = '0ae81a45-b568-44ee-8480-7e72bd1abc1c'
    `);

    if (result.rows.length > 0) {
      const token = result.rows[0];
      console.log('✅ Token found in database:');
      console.log('  Integration ID:', token.integration_id);
      console.log('  Base Domain:', token.base_domain);
      console.log('  API Domain:', token.api_domain);
      console.log('  Token (first 50 chars):', token.access_token.substring(0, 50) + '...');
      console.log('  Expires at:', token.expires_at);

      // Decode JWT to see what's inside
      const tokenParts = token.access_token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('\n📌 Token payload details:');
      console.log('  Account ID:', payload.account_id);
      console.log('  Base domain in token:', payload.base_domain);
      console.log('  API domain in token:', payload.api_domain);
      console.log('  Scopes:', payload.scopes);
    } else {
      console.log('❌ No token found in database');
      console.log('Please reconnect through the HTML page');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkToken();