const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function addKommoToken() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Kommo Token Setup Script\n');

    // Спрашиваем integration_id
    const integrationId = await question('Enter integration_id (from integrations table): ');

    if (!integrationId || integrationId.trim() === '') {
      console.log('❌ Integration ID is required!');
      process.exit(1);
    }

    // Используем токен из переменной окружения или запрашиваем
    const accessToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjY2MDRlMzZlOTZmOTBmNjZiMGY5M2UzMDlkMjI0MDJiNzBkMzliYzlhYjgwNDgwMjFiZDk3YWE2ODQzYzhiODNhMDkwNTRlODQ0NDM0NmQ1In0.eyJhdWQiOiIyYTVjMTQ2My00M2RkLTRjY2MtYWJkMC03OTUxNmY3ODVlNTciLCJqdGkiOiI2NjA0ZTM2ZTk2ZjkwZjY2YjBmOTNlMzA5ZDIyNDAyYjcwZDM5YmM5YWI4MDQ4MDIxYmQ5N2FhNjg0M2M4YjgzYTA5MDU0ZTg0NDQzNDZkNSIsImlhdCI6MTc2MzkxOTIzOCwibmJmIjoxNzYzOTE5MjM4LCJleHAiOjE4MzI5NzYwMDAsInN1YiI6IjEyNzYwMzgzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM0MjEwMzA3LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZDVmYjY3NzAtODdmYS00NDRmLWE3NzgtYTUxODNkNmFjNTVkIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.fBXRqNi-flkydLuuVC_iq4fbCMY0UWaq2ZpH-E4Q-sv_2KjhLQfrbPEAkPbhXGU_EbxG-aEqGx4qgnfEkdlolfhADh3-XuoVEecYyfjqNv69hqpuijP5iF3b-xN-H0w2j_XVeO6M-_QySnsrnFTJiCkIP1hOWUBzhvyz_v-9r2Auf4lkavzxAekiIcHydOpAMviRDoX7Wo0_XH9sQHogpqawwdwTua1hrZQh3PYfKtixBVMuNrD0vCwIV4RozdP640WA4IdYTrECCOQSAvXFTSEpOlXfbHT5Gdal75i6cTBl3Ut2PJ2Z_pEbo0p8ozuWzsfQTOizpKVQrw_wCJ-KEg';
    const refreshToken = 'refresh_token_placeholder';
    const expiresAt = '2028-01-01 00:00:00';
    const baseDomain = 'worldwideservices.kommo.com';

    console.log('\n📝 Token details:');
    console.log(`  Access Token: ${accessToken.substring(0, 50)}...`);
    console.log(`  Base Domain: ${baseDomain}`);
    console.log(`  Expires At: ${expiresAt}`);

    const confirm = await question('\n✅ Add this token to database? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled');
      process.exit(0);
    }

    // Проверяем существует ли уже токен для этой интеграции
    const existingToken = await pool.query(
      'SELECT id FROM kommo_tokens WHERE integration_id = $1',
      [integrationId]
    );

    if (existingToken.rows.length > 0) {
      console.log('\n⚠️  Token already exists for this integration. Updating...');

      await pool.query(`
        UPDATE kommo_tokens
        SET
          access_token = $1,
          refresh_token = $2,
          expires_at = $3,
          base_domain = $4,
          updated_at = NOW()
        WHERE integration_id = $5
      `, [accessToken, refreshToken, expiresAt, baseDomain, integrationId]);

      console.log('✅ Token updated successfully!');
    } else {
      console.log('\n💾 Inserting token into database...');

      await pool.query(`
        INSERT INTO kommo_tokens (
          id, integration_id, access_token, refresh_token,
          expires_at, base_domain, created_at, updated_at
        ) VALUES (
          gen_random_uuid()::text,
          $1, $2, $3, $4, $5, NOW(), NOW()
        )
      `, [integrationId, accessToken, refreshToken, expiresAt, baseDomain]);

      console.log('✅ Token added successfully!');
    }

    // Обновляем интеграцию как подключённую
    await pool.query(`
      UPDATE integrations
      SET
        is_connected = true,
        connected_at = NOW(),
        last_synced = NOW()
      WHERE id = $1
    `, [integrationId]);

    console.log('✅ Integration marked as connected!');

    console.log('\n🎉 Setup complete! You can now test Kommo sync:');
    console.log(`   POST /api/agents/{agentId}/integrations/kommo/sync`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure DATABASE_URL in .env points to your real Supabase database!');
    }
    process.exit(1);
  } finally {
    rl.close();
    await pool.end();
  }
}

addKommoToken();
