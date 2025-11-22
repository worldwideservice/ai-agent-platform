import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

console.log('Проверка базы данных...\n');

try {
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];

  console.log('Таблицы в базе данных:');
  tables.forEach((table: any) => {
    console.log(`  - ${table.name}`);
  });

  if (tables.length === 0) {
    console.log('\n⚠️  База данных пустая! Нужно создать таблицы.');
  }

} catch (error) {
  console.error('Ошибка:', error);
}

db.close();
