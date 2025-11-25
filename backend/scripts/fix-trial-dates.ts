import { pool } from '../src/config/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixTrialDates() {
  try {
    console.log('🔧 Fixing trial dates for existing users...');

    // Найти всех пользователей с trial планом
    const result = await pool.query(
      `SELECT id, email, current_plan, trial_ends_at
       FROM users
       WHERE current_plan = 'trial'
       AND (trial_ends_at IS NULL OR trial_ends_at <= NOW())`
    );

    const usersToFix = result.rows;
    console.log(`📊 Found ${usersToFix.length} users with trial plan to fix`);

    // Обновить каждого пользователя
    for (const user of usersToFix) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15); // 15 дней с текущего момента

      await pool.query(
        `UPDATE users
         SET trial_ends_at = $1, responses_limit = $2, responses_used = $3, updated_at = NOW()
         WHERE id = $4`,
        [trialEndsAt, 500, 0, user.id]
      );

      console.log(`✅ Fixed trial for user ${user.email} - expires at ${trialEndsAt.toISOString()}`);
    }

    console.log('\n✅ Trial dates fixed successfully!');
    console.log(`ℹ️  Updated ${usersToFix.length} users with 15-day trial period.`);
  } catch (error) {
    console.error('❌ Error fixing trial dates:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixTrialDates();
