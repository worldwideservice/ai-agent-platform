import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanOrphans() {
  console.log('🧹 Cleaning orphan records...\n');

  // 1. Clean orphan trigger_actions
  const triggerActions = await pool.query(`
    SELECT COUNT(*) as count FROM trigger_actions ta
    LEFT JOIN triggers t ON ta.trigger_id = t.id
    WHERE t.id IS NULL
  `);
  console.log(`Found ${triggerActions.rows[0].count} orphan trigger_actions`);

  const deletedTriggerActions = await pool.query(`
    DELETE FROM trigger_actions
    WHERE trigger_id NOT IN (SELECT id FROM triggers)
  `);
  console.log(`Deleted ${deletedTriggerActions.rowCount} orphan trigger_actions\n`);

  // 2. Clean orphan chain_conditions
  const chainConditions = await pool.query(`
    SELECT COUNT(*) as count FROM chain_conditions cc
    LEFT JOIN chains c ON cc.chain_id = c.id
    WHERE c.id IS NULL
  `);
  console.log(`Found ${chainConditions.rows[0].count} orphan chain_conditions`);

  const deletedChainConditions = await pool.query(`
    DELETE FROM chain_conditions
    WHERE chain_id NOT IN (SELECT id FROM chains)
  `);
  console.log(`Deleted ${deletedChainConditions.rowCount} orphan chain_conditions\n`);

  // 3. Clean orphan chain_step_actions first (depends on chain_steps)
  const chainStepActions = await pool.query(`
    SELECT COUNT(*) as count FROM chain_step_actions csa
    LEFT JOIN chain_steps cs ON csa.step_id = cs.id
    WHERE cs.id IS NULL
  `);
  console.log(`Found ${chainStepActions.rows[0].count} orphan chain_step_actions`);

  const deletedChainStepActions = await pool.query(`
    DELETE FROM chain_step_actions
    WHERE step_id NOT IN (SELECT id FROM chain_steps)
  `);
  console.log(`Deleted ${deletedChainStepActions.rowCount} orphan chain_step_actions\n`);

  // 4. Clean orphan chain_steps
  const chainSteps = await pool.query(`
    SELECT COUNT(*) as count FROM chain_steps cs
    LEFT JOIN chains c ON cs.chain_id = c.id
    WHERE c.id IS NULL
  `);
  console.log(`Found ${chainSteps.rows[0].count} orphan chain_steps`);

  const deletedChainSteps = await pool.query(`
    DELETE FROM chain_steps
    WHERE chain_id NOT IN (SELECT id FROM chains)
  `);
  console.log(`Deleted ${deletedChainSteps.rowCount} orphan chain_steps\n`);

  // 5. Clean orphan chain_schedules
  const chainSchedules = await pool.query(`
    SELECT COUNT(*) as count FROM chain_schedules cs
    LEFT JOIN chains c ON cs.chain_id = c.id
    WHERE c.id IS NULL
  `);
  console.log(`Found ${chainSchedules.rows[0].count} orphan chain_schedules`);

  const deletedChainSchedules = await pool.query(`
    DELETE FROM chain_schedules
    WHERE chain_id NOT IN (SELECT id FROM chains)
  `);
  console.log(`Deleted ${deletedChainSchedules.rowCount} orphan chain_schedules\n`);

  // 6. Clean orphan article_categories (article side)
  const articleCategoriesArticle = await pool.query(`
    SELECT COUNT(*) as count FROM article_categories ac
    LEFT JOIN kb_articles ka ON ac.article_id = ka.id
    WHERE ka.id IS NULL
  `);
  console.log(`Found ${articleCategoriesArticle.rows[0].count} orphan article_categories (no article)`);

  const deletedArticleCategoriesArticle = await pool.query(`
    DELETE FROM article_categories
    WHERE article_id NOT IN (SELECT id FROM kb_articles)
  `);
  console.log(`Deleted ${deletedArticleCategoriesArticle.rowCount} orphan article_categories (no article)\n`);

  // 7. Clean orphan article_categories (category side)
  const articleCategoriesCategory = await pool.query(`
    SELECT COUNT(*) as count FROM article_categories ac
    LEFT JOIN kb_categories kc ON ac.category_id = kc.id
    WHERE kc.id IS NULL
  `);
  console.log(`Found ${articleCategoriesCategory.rows[0].count} orphan article_categories (no category)`);

  const deletedArticleCategoriesCategory = await pool.query(`
    DELETE FROM article_categories
    WHERE category_id NOT IN (SELECT id FROM kb_categories)
  `);
  console.log(`Deleted ${deletedArticleCategoriesCategory.rowCount} orphan article_categories (no category)\n`);

  // 8. Clean orphan lead_messages
  const leadMessages = await pool.query(`
    SELECT COUNT(*) as count FROM lead_messages lm
    LEFT JOIN lead_conversations lc ON lm.conversation_id = lc.id
    WHERE lc.id IS NULL
  `);
  console.log(`Found ${leadMessages.rows[0].count} orphan lead_messages`);

  const deletedLeadMessages = await pool.query(`
    DELETE FROM lead_messages
    WHERE conversation_id NOT IN (SELECT id FROM lead_conversations)
  `);
  console.log(`Deleted ${deletedLeadMessages.rowCount} orphan lead_messages\n`);

  // 9. Clean orphan scheduled_chain_steps
  const scheduledSteps = await pool.query(`
    SELECT COUNT(*) as count FROM scheduled_chain_steps scs
    LEFT JOIN chain_runs cr ON scs.chain_run_id = cr.id
    WHERE cr.id IS NULL
  `);
  console.log(`Found ${scheduledSteps.rows[0].count} orphan scheduled_chain_steps`);

  const deletedScheduledSteps = await pool.query(`
    DELETE FROM scheduled_chain_steps
    WHERE chain_run_id NOT IN (SELECT id FROM chain_runs)
  `);
  console.log(`Deleted ${deletedScheduledSteps.rowCount} orphan scheduled_chain_steps\n`);

  console.log('✅ Cleanup complete!');
  await pool.end();
}

cleanOrphans().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
