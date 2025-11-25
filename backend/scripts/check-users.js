const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkUsers() {
  try {
    console.log('🔍 Checking all users in database...\n');

    // Получить всех пользователей
    const result = await pool.query(
      `SELECT id, email, current_plan, trial_ends_at, responses_limit, responses_used, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    console.log(`📊 Total users: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      console.log('Users:');
      result.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Plan: ${user.current_plan}`);
        console.log(`   Trial Ends: ${user.trial_ends_at}`);
        console.log(`   Responses: ${user.responses_used} / ${user.responses_limit}`);
        console.log(`   Created: ${user.created_at}`);

        if (user.trial_ends_at) {
          const now = new Date();
          const trialEnd = new Date(user.trial_ends_at);
          const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          console.log(`   Days Remaining: ${daysRemaining}`);
        }
      });
    } else {
      console.log('⚠️ No users found in database!');
    }
  } catch (error) {
    console.error('❌ Error checking users:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkUsers();
