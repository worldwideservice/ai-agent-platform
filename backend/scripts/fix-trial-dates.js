const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixTrialDates() {
  try {
    console.log('🔧 Fixing trial dates for existing users...');

    // Найти всех пользователей с trial планом
    const findResult = await pool.query(
      `SELECT id, email, current_plan, trial_ends_at
       FROM users
       WHERE current_plan = 'trial'
       AND (trial_ends_at IS NULL OR trial_ends_at <= NOW())`
    );

    console.log(`📊 Found ${findResult.rows.length} users with trial plan to fix`);

    if (findResult.rows.length > 0) {
      // Обновить всех найденных пользователей
      const updateResult = await pool.query(
        `UPDATE users
         SET trial_ends_at = NOW() + INTERVAL '15 days',
             responses_limit = 500,
             responses_used = 0,
             updated_at = NOW()
         WHERE current_plan = 'trial'
         AND (trial_ends_at IS NULL OR trial_ends_at <= NOW())
         RETURNING id, email, trial_ends_at`
      );

      console.log('\n✅ Updated users:');
      updateResult.rows.forEach(user => {
        console.log(`  - ${user.email}: expires at ${user.trial_ends_at}`);
      });

      console.log(`\n✅ Trial dates fixed successfully!`);
      console.log(`ℹ️  Updated ${updateResult.rows.length} users with 15-day trial period.`);
    } else {
      console.log('\n✅ No users need fixing!');
    }
  } catch (error) {
    console.error('❌ Error fixing trial dates:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTrialDates();
