import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('Инициализация базы данных...\n');

try {
  // Read and execute create_database.sql
  const createDbSql = fs.readFileSync(path.join(__dirname, 'create_database.sql'), 'utf-8');
  db.exec(createDbSql);
  console.log('✓ Основные таблицы созданы');

  // Read and execute add-crm-tables.sql
  const addCrmSql = fs.readFileSync(path.join(__dirname, 'add-crm-tables.sql'), 'utf-8');
  db.exec(addCrmSql);
  console.log('✓ CRM таблицы созданы');

  // Add checkBeforeSend field
  const tableInfo = db.prepare("PRAGMA table_info(agents)").all() as any[];
  const columnExists = tableInfo.some((col: any) => col.name === 'checkBeforeSend');

  if (!columnExists) {
    db.exec('ALTER TABLE agents ADD COLUMN checkBeforeSend INTEGER DEFAULT 0');
    console.log('✓ Поле checkBeforeSend добавлено');
  } else {
    console.log('✓ Поле checkBeforeSend уже существует');
  }

  // Show all tables
  console.log('\nСозданные таблицы:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
  tables.forEach((table: any) => {
    console.log(`  - ${table.name}`);
  });

} catch (error) {
  console.error('Ошибка при инициализации:', error);
  process.exit(1);
}

db.close();
console.log('\n✅ База данных успешно инициализирована!');
