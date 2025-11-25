import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create direct connection to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testKommoAPI() {
  try {
    // Get token from database
    const result = await pool.query(`
      SELECT * FROM kommo_tokens
      WHERE integration_id = '0ae81a45-b568-44ee-8480-7e72bd1abc1c'
    `);

    if (result.rows.length === 0) {
      console.log('❌ No token found in database');
      await pool.end();
      process.exit(1);
    }

    const tokenData = result.rows[0];
    console.log('📌 Testing Kommo API with token from database...');
    console.log('  API Domain:', tokenData.api_domain);
    console.log('  Base Domain:', tokenData.base_domain);

    // Decode token to get account ID
    const tokenParts = tokenData.access_token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const accountId = payload.account_id;

    console.log('  Account ID:', accountId);

    // Test with api-g.kommo.com (global endpoint)
    console.log('\n🔍 Testing with api-g.kommo.com...');
    try {
      const globalResponse = await fetch(`https://api-g.kommo.com/api/v4/account`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('  Status:', globalResponse.status);
      if (globalResponse.ok) {
        const data = await globalResponse.json();
        console.log('  ✅ Success! Account name:', data.name);
        console.log('  Subdomain:', data.subdomain);
      } else {
        const error = await globalResponse.text();
        console.log('  ❌ Error:', error);
      }
    } catch (err) {
      console.log('  ❌ Request failed:', err.message);
    }

    // Test with worldwideservices.kommo.com
    console.log('\n🔍 Testing with worldwideservices.kommo.com...');
    try {
      const subdomainResponse = await fetch(`https://worldwideservices.kommo.com/api/v4/account`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('  Status:', subdomainResponse.status);
      if (subdomainResponse.ok) {
        const data = await subdomainResponse.json();
        console.log('  ✅ Success! Account name:', data.name);
      } else {
        const error = await subdomainResponse.text();
        console.log('  ❌ Error:', error);
      }
    } catch (err) {
      console.log('  ❌ Request failed:', err.message);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

testKommoAPI();