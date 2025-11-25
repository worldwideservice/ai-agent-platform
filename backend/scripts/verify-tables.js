const { Pool } = require('pg');

async function verifyTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Проверка таблиц в Supabase PostgreSQL...\n');

    // Получаем список всех таблиц
    const result = await pool.query(`
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ Таблицы не найдены! Миграция не выполнена.');
      process.exit(1);
    }

    console.log(`✅ Найдено таблиц: ${result.rows.length}\n`);

    const expectedTables = [
      'users', 'agents', 'kb_categories', 'kb_articles', 'article_categories',
      'contacts', 'deals', 'user_settings', 'chat_logs',
      'triggers', 'trigger_actions', 'chains', 'chain_conditions',
      'chain_steps', 'chain_step_actions', 'chain_schedules',
      'integrations', 'agent_advanced_settings',
      'embeddings', 'memory_nodes', 'memory_edges', 'kommo_tokens'
    ];

    console.log('📊 Список таблиц:');
    result.rows.forEach(row => {
      const icon = expectedTables.includes(row.table_name) ? '✅' : '📝';
      console.log(`  ${icon} ${row.table_name} (${row.column_count} columns)`);
    });

    // Проверяем наличие ключевых таблиц
    const tableNames = result.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      console.log('\n⚠️  Отсутствующие таблицы:');
      missingTables.forEach(t => console.log(`  ❌ ${t}`));
    } else {
      console.log('\n🎉 Все необходимые таблицы созданы!');
    }

    // Проверяем расширение pgvector
    const extensionResult = await pool.query(`
      SELECT extname, extversion
      FROM pg_extension
      WHERE extname = 'vector'
    `);

    if (extensionResult.rows.length > 0) {
      console.log(`\n✅ pgvector установлен (версия ${extensionResult.rows[0].extversion})`);
    } else {
      console.log('\n⚠️  pgvector НЕ установлен');
    }

    // Проверяем несколько записей
    console.log('\n🔍 Проверка возможности записи...');

    try {
      await pool.query('SELECT 1');
      console.log('✅ Подключение к БД работает');
    } catch (e) {
      console.log('❌ Ошибка подключения:', e.message);
    }

  } catch (error) {
    console.error('❌ Ошибка проверки:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyTables();
